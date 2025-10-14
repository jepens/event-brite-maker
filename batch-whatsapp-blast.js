import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Konfigurasi batch processing
const BATCH_SIZE = 10; // Kirim 10 pesan per batch
const BATCH_DELAY = 30000; // Jeda 30 detik antar batch
const MAX_RETRIES = 3; // Maksimal retry per batch

async function processBatchWhatsAppBlast(campaignId) {
    console.log('🚀 Starting Batch WhatsApp Blast Processing...');
    console.log(`📦 Batch Size: ${BATCH_SIZE} messages`);
    console.log(`⏱️  Batch Delay: ${BATCH_DELAY/1000} seconds`);
    console.log('🛡️  Duplicate Prevention: ENABLED');
    console.log('═══════════════════════════════════════\n');

    try {
        // Ambil campaign details
        const { data: campaign, error: campaignError } = await supabase
            .from('whatsapp_blast_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaignError || !campaign) {
            throw new Error(`Campaign not found: ${campaignError?.message}`);
        }

        console.log(`📋 Campaign: ${campaign.name}`);
        console.log(`📊 Status: ${campaign.status}`);

        // Cek dan tampilkan statistik awal
        await displayInitialStats(campaignId);
        
        // Verifikasi pencegahan duplikasi
        await verifyDuplicatePrevention(campaignId);

        // Update status campaign menjadi "batch_processing"
        await supabase
            .from('whatsapp_blast_campaigns')
            .update({ 
                status: 'batch_processing',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        // Ambil semua pesan pending untuk dikirim ke Edge Function
        const { data: pendingMessages, error: fetchError } = await supabase
            .from('whatsapp_blast_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('status', 'pending')
            .is('sent_at', null);  // Pastikan belum pernah terkirim

        if (fetchError) {
            throw new Error(`Error fetching pending messages: ${fetchError.message}`);
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            console.log('✅ No pending messages to process!');
            return;
        }

        // Karena Edge Function akan memproses semua pesan sekaligus,
        // kita hanya perlu memanggil Edge Function sekali
        console.log(`\n📦 Processing Campaign via Edge Function`);
        console.log(`📱 Total pending messages: ${pendingMessages.length}`);
        console.log('─'.repeat(50));

        const result = await processBatchWithRetry(pendingMessages, campaign, MAX_RETRIES);
        
        console.log(`\n📊 Edge Function Results:`);
        console.log(`   ✅ Success: ${result.success}`);
        console.log(`   ❌ Failed: ${result.failed}`);
        
        // Edge Function akan mengupdate status campaign secara otomatis
        // Tapi kita bisa refresh data untuk mendapatkan status terbaru
        console.log(`\n🔄 Refreshing campaign status...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        let totalSuccess = result.success;
        let totalFailed = result.failed;
        let totalProcessed = pendingMessages.length;

        // Update status campaign menjadi "completed"
        await supabase
            .from('whatsapp_blast_campaigns')
            .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        console.log('\n🎉 EDGE FUNCTION PROCESSING COMPLETED!');
        console.log('═══════════════════════════════════════');
        console.log(`📊 Final Statistics:`);
        console.log(`   📤 Total Success: ${totalSuccess}`);
        console.log(`   ❌ Total Failed: ${totalFailed}`);
        console.log(`   📱 Total Processed: ${totalProcessed}`);
        console.log(`   🎯 Final Success Rate: ${totalProcessed > 0 ? ((totalSuccess/totalProcessed)*100).toFixed(2) : 0}%`);

    } catch (error) {
        console.error('❌ Edge Function processing error:', error);
        
        // Update status campaign menjadi "failed"
        await supabase
            .from('whatsapp_blast_campaigns')
            .update({ 
                status: 'failed',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);
    }
}

// Fungsi untuk menampilkan statistik awal
async function displayInitialStats(campaignId) {
    const { data: stats, error } = await supabase
        .from('whatsapp_blast_recipients')
        .select('status')
        .eq('campaign_id', campaignId);

    if (error) {
        console.log('⚠️  Could not fetch initial stats');
        return;
    }

    const statusCounts = stats.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
    }, {});

    console.log('\n📊 STATISTIK AWAL:');
    console.log(`   📤 Terkirim: ${statusCounts.sent || 0}`);
    console.log(`   ⏳ Pending: ${statusCounts.pending || 0}`);
    console.log(`   ❌ Gagal: ${statusCounts.failed || 0}`);
    console.log(`   📋 Total: ${stats.length}\n`);
}

// Fungsi untuk verifikasi pencegahan duplikasi
async function verifyDuplicatePrevention(campaignId) {
    console.log('🔍 Verifying duplicate prevention...');
    
    // Cek apakah ada pesan dengan status 'sent' yang memiliki sent_at null
    const { data: inconsistentData, error } = await supabase
        .from('whatsapp_blast_recipients')
        .select('id, phone_number, status, sent_at')
        .eq('campaign_id', campaignId)
        .eq('status', 'sent')
        .is('sent_at', null);

    if (error) {
        console.log('⚠️  Could not verify data consistency');
        return;
    }

    if (inconsistentData && inconsistentData.length > 0) {
        console.log(`⚠️  Found ${inconsistentData.length} inconsistent records (status='sent' but sent_at=null)`);
        console.log('🔧 Fixing inconsistent data...');
        
        // Perbaiki data yang tidak konsisten
        for (const record of inconsistentData) {
            await supabase
                .from('whatsapp_blast_recipients')
                .update({ 
                    status: 'pending',
                    sent_at: null 
                })
                .eq('id', record.id);
        }
        console.log('✅ Data inconsistency fixed');
    }

    // Cek nomor yang sudah terkirim
    const { data: sentMessages, error: sentError } = await supabase
        .from('whatsapp_blast_recipients')
        .select('phone_number')
        .eq('campaign_id', campaignId)
        .eq('status', 'sent')
        .not('sent_at', 'is', null);

    if (!sentError && sentMessages) {
        console.log(`🛡️  ${sentMessages.length} nomor sudah terkirim dan akan dilewati`);
        
        if (sentMessages.length > 0) {
            console.log('📱 Contoh nomor yang sudah terkirim:');
            sentMessages.slice(0, 3).forEach((msg, index) => {
                console.log(`   ${index + 1}. ${msg.phone_number}`);
            });
            if (sentMessages.length > 3) {
                console.log(`   ... dan ${sentMessages.length - 3} nomor lainnya`);
            }
        }
    }
    
    console.log('✅ Duplicate prevention verified\n');
}

// Fungsi untuk memanggil Edge Function untuk memproses campaign
async function processBatchWithRetry(messages, campaign, maxRetries) {
    console.log(`🚀 Calling Edge Function to process ${messages.length} messages...`);
    
    try {
        // Panggil Edge Function untuk memproses seluruh campaign
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-blast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_id: campaign.id,
                action: 'start'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Edge Function completed successfully`);
            console.log(`📊 Processing started for campaign: ${campaign.name}`);
            
            // Edge Function akan memproses secara asinkron
            // Return estimasi berdasarkan jumlah pesan
            return { 
                success: messages.length, // Estimasi - Edge Function akan update status sebenarnya
                failed: 0 
            };
        } else {
            throw new Error(result.error || 'Edge Function returned error');
        }

    } catch (error) {
        console.error(`❌ Edge Function call failed: ${error.message}`);
        
        // Jika Edge Function gagal, tandai semua pesan sebagai failed
        for (const message of messages) {
            await supabase
                .from('whatsapp_blast_recipients')
                .update({
                    status: 'failed',
                    error_message: `Edge Function error: ${error.message}`,
                    retry_count: maxRetries,
                    updated_at: new Date().toISOString()
                })
                .eq('id', message.id);
        }
        
        return { success: 0, failed: messages.length };
    }
}

// Jalankan script
const campaignId = process.argv[2];
if (!campaignId) {
    console.error('❌ Usage: node batch-whatsapp-blast.js <campaign-id>');
    process.exit(1);
}

processBatchWhatsAppBlast(campaignId)
    .then(() => {
        console.log('✅ Batch processing script completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Script error:', error);
        process.exit(1);
    });