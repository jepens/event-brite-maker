require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Konfigurasi queue management
const QUEUE_CONFIG = {
    maxConcurrent: 3,           // Maksimal 3 pesan bersamaan
    messageDelay: 2000,         // 2 detik antar pesan
    batchSize: 20,              // 20 pesan per batch
    batchDelay: 30000,          // 30 detik antar batch
    maxRetries: 5,              // Maksimal 5 retry per pesan
    retryDelay: 5000,           // 5 detik antar retry
    healthCheckInterval: 60000, // Health check setiap 1 menit
};

class SmartQueueManager {
    constructor(campaignId) {
        this.campaignId = campaignId;
        this.isRunning = false;
        this.activeWorkers = 0;
        this.processedCount = 0;
        this.successCount = 0;
        this.failedCount = 0;
        this.retryQueue = [];
        this.startTime = null;
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Queue manager already running');
            return;
        }

        this.isRunning = true;
        this.startTime = new Date();
        
        console.log('🚀 Starting Smart Queue Manager...');
        console.log(`📋 Campaign ID: ${this.campaignId}`);
        console.log(`⚙️  Configuration:`);
        console.log(`   📤 Max concurrent: ${QUEUE_CONFIG.maxConcurrent}`);
        console.log(`   ⏱️  Message delay: ${QUEUE_CONFIG.messageDelay}ms`);
        console.log(`   📦 Batch size: ${QUEUE_CONFIG.batchSize}`);
        console.log(`   🔄 Max retries: ${QUEUE_CONFIG.maxRetries}`);
        console.log('═══════════════════════════════════════\n');

        // Update campaign status
        await this.updateCampaignStatus('queue_processing');

        // Start health check
        this.startHealthCheck();

        // Start processing
        await this.processQueue();
    }

    async stop() {
        this.isRunning = false;
        console.log('🛑 Smart Queue Manager stopped');
    }

    async processQueue() {
        let batchNumber = 1;

        while (this.isRunning) {
            try {
                // Ambil batch pesan pending
                const { data: pendingMessages, error } = await supabase
                    .from('whatsapp_blast_recipients')
                    .select('*')
                    .eq('campaign_id', this.campaignId)
                    .eq('status', 'pending')
                    .limit(QUEUE_CONFIG.batchSize);

                if (error) {
                    console.error('❌ Error fetching pending messages:', error);
                    await this.sleep(10000);
                    continue;
                }

                // Proses retry queue terlebih dahulu
                if (this.retryQueue.length > 0) {
                    console.log(`\n🔄 Processing retry queue (${this.retryQueue.length} messages)`);
                    await this.processBatch(this.retryQueue, `Retry-${batchNumber}`);
                    this.retryQueue = [];
                }

                if (!pendingMessages || pendingMessages.length === 0) {
                    console.log('\n✅ All messages processed!');
                    break;
                }

                console.log(`\n📦 Processing Batch #${batchNumber}`);
                console.log(`📱 Messages in batch: ${pendingMessages.length}`);
                
                await this.processBatch(pendingMessages, batchNumber);
                
                batchNumber++;

                // Jeda antar batch
                if (pendingMessages.length === QUEUE_CONFIG.batchSize) {
                    console.log(`\n⏳ Waiting ${QUEUE_CONFIG.batchDelay/1000} seconds before next batch...`);
                    await this.sleep(QUEUE_CONFIG.batchDelay);
                }

            } catch (error) {
                console.error('❌ Queue processing error:', error);
                await this.sleep(30000);
            }
        }

        await this.finishProcessing();
    }

    async processBatch(messages, batchId) {
        const workers = [];
        const semaphore = new Semaphore(QUEUE_CONFIG.maxConcurrent);

        for (const message of messages) {
            const worker = this.processMessage(message, semaphore);
            workers.push(worker);
        }

        const results = await Promise.allSettled(workers);
        
        let batchSuccess = 0;
        let batchFailed = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                batchSuccess++;
            } else {
                batchFailed++;
                // Add to retry queue if not exceeded max retries
                const message = messages[index];
                if ((message.retry_count || 0) < QUEUE_CONFIG.maxRetries) {
                    this.retryQueue.push({
                        ...message,
                        retry_count: (message.retry_count || 0) + 1
                    });
                }
            }
        });

        console.log(`✅ Batch ${batchId} completed:`);
        console.log(`   📤 Success: ${batchSuccess}`);
        console.log(`   ❌ Failed: ${batchFailed}`);
        console.log(`   🔄 Added to retry: ${batchFailed}`);
        
        this.logProgress();
    }

    async processMessage(message, semaphore) {
        await semaphore.acquire();
        
        try {
            this.activeWorkers++;
            
            const result = await this.sendMessage(message);
            
            this.processedCount++;
            if (result.success) {
                this.successCount++;
            } else {
                this.failedCount++;
            }

            return result;

        } finally {
            this.activeWorkers--;
            semaphore.release();
            
            // Jeda antar pesan
            await this.sleep(QUEUE_CONFIG.messageDelay);
        }
    }

    async sendMessage(message) {
        const maxRetries = Math.min(QUEUE_CONFIG.maxRetries, 3); // Limit retry dalam satu call
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Update status menjadi processing
                await supabase
                    .from('whatsapp_blast_recipients')
                    .update({ 
                        status: 'processing',
                        retry_count: message.retry_count || 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', message.id);

                // Panggil Edge Function
                const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-blast`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'send_single',
                        recipient: {
                            id: message.id,
                            phone_number: message.phone_number,
                            name: message.name
                        }
                    }),
                    timeout: 30000 // 30 second timeout
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log(`   ✅ ${message.phone_number} - Sent (attempt ${attempt})`);
                        return { success: true, messageId: result.messageId };
                    } else {
                        throw new Error(result.error || 'Unknown error');
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                lastError = error;
                console.log(`   ⚠️  ${message.phone_number} - Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    await this.sleep(QUEUE_CONFIG.retryDelay);
                }
            }
        }

        // Mark as failed setelah semua retry gagal
        await supabase
            .from('whatsapp_blast_recipients')
            .update({ 
                status: 'failed',
                error_message: lastError?.message || 'Unknown error',
                retry_count: (message.retry_count || 0) + maxRetries,
                updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

        console.log(`   ❌ ${message.phone_number} - Failed after ${maxRetries} attempts`);
        return { success: false, error: lastError?.message };
    }

    startHealthCheck() {
        setInterval(() => {
            if (this.isRunning) {
                this.logProgress();
            }
        }, QUEUE_CONFIG.healthCheckInterval);
    }

    logProgress() {
        const runtime = this.startTime ? Math.round((new Date() - this.startTime) / 1000 / 60) : 0;
        const successRate = this.processedCount > 0 ? ((this.successCount / this.processedCount) * 100).toFixed(2) : 0;
        const messagesPerMinute = runtime > 0 ? Math.round(this.processedCount / runtime) : 0;

        console.log(`\n📊 PROGRESS UPDATE:`);
        console.log(`   ⏱️  Runtime: ${runtime} minutes`);
        console.log(`   📤 Processed: ${this.processedCount}`);
        console.log(`   ✅ Success: ${this.successCount}`);
        console.log(`   ❌ Failed: ${this.failedCount}`);
        console.log(`   🎯 Success rate: ${successRate}%`);
        console.log(`   ⚡ Speed: ${messagesPerMinute} msg/min`);
        console.log(`   👷 Active workers: ${this.activeWorkers}`);
        console.log(`   🔄 Retry queue: ${this.retryQueue.length}`);
    }

    async updateCampaignStatus(status) {
        await supabase
            .from('whatsapp_blast_campaigns')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.campaignId);
    }

    async finishProcessing() {
        await this.updateCampaignStatus('completed');
        
        console.log('\n🎉 QUEUE PROCESSING COMPLETED!');
        console.log('═══════════════════════════════════════');
        this.logProgress();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Semaphore untuk mengontrol concurrency
class Semaphore {
    constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
    }

    async acquire() {
        return new Promise(resolve => {
            if (this.current < this.max) {
                this.current++;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    release() {
        this.current--;
        if (this.queue.length > 0) {
            this.current++;
            const resolve = this.queue.shift();
            resolve();
        }
    }
}

// Jalankan script
const campaignId = process.argv[2];
if (!campaignId) {
    console.error('❌ Usage: node smart-queue-manager.js <campaign-id>');
    process.exit(1);
}

const queueManager = new SmartQueueManager(campaignId);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await queueManager.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await queueManager.stop();
    process.exit(0);
});

// Start queue manager
queueManager.start().catch(error => {
    console.error('❌ Failed to start queue manager:', error);
    process.exit(1);
});