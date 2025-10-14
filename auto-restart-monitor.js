require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Konfigurasi monitoring
const CHECK_INTERVAL = 5 * 60 * 1000; // Check setiap 5 menit
const STUCK_THRESHOLD = 10 * 60 * 1000; // Campaign dianggap stuck jika tidak ada aktivitas 10 menit
const MAX_AUTO_RESTARTS = 3; // Maksimal auto restart per campaign

class AutoRestartMonitor {
    constructor() {
        this.isRunning = false;
        this.monitoredCampaigns = new Map();
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Monitor already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting Auto-Restart Monitor...');
        console.log(`🔍 Check interval: ${CHECK_INTERVAL/1000/60} minutes`);
        console.log(`⏰ Stuck threshold: ${STUCK_THRESHOLD/1000/60} minutes`);
        console.log(`🔄 Max auto restarts: ${MAX_AUTO_RESTARTS}`);
        console.log('═══════════════════════════════════════\n');

        this.monitorLoop();
    }

    async stop() {
        this.isRunning = false;
        console.log('🛑 Auto-Restart Monitor stopped');
    }

    async monitorLoop() {
        while (this.isRunning) {
            try {
                await this.checkActiveCampaigns();
                await this.sleep(CHECK_INTERVAL);
            } catch (error) {
                console.error('❌ Monitor error:', error);
                await this.sleep(30000); // Wait 30 seconds before retry
            }
        }
    }

    async checkActiveCampaigns() {
        console.log(`🔍 Checking active campaigns... [${new Date().toLocaleString()}]`);

        // Ambil campaign yang sedang berjalan
        const { data: campaigns, error } = await supabase
            .from('whatsapp_blast_campaigns')
            .select('*')
            .in('status', ['sending', 'running', 'batch_processing']);

        if (error) {
            console.error('❌ Error fetching campaigns:', error);
            return;
        }

        if (!campaigns || campaigns.length === 0) {
            console.log('📭 No active campaigns found');
            return;
        }

        for (const campaign of campaigns) {
            await this.checkCampaignStatus(campaign);
        }
    }

    async checkCampaignStatus(campaign) {
        console.log(`\n📋 Checking campaign: ${campaign.name} (${campaign.id})`);

        try {
            // Cek aktivitas terbaru
            const { data: recentActivity, error } = await supabase
                .from('whatsapp_blast_recipients')
                .select('sent_at, created_at, status')
                .eq('campaign_id', campaign.id)
                .not('sent_at', 'is', null)
                .order('sent_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error(`❌ Error checking activity for ${campaign.id}:`, error);
                return;
            }

            const now = new Date();
            let lastActivity = null;
            let isStuck = false;

            if (recentActivity && recentActivity.length > 0) {
                lastActivity = new Date(recentActivity[0].sent_at);
                const timeSinceLastActivity = now - lastActivity;
                isStuck = timeSinceLastActivity > STUCK_THRESHOLD;

                console.log(`   ⏰ Last activity: ${lastActivity.toLocaleString()}`);
                console.log(`   🕐 Time since: ${Math.round(timeSinceLastActivity/1000/60)} minutes`);
            } else {
                // Tidak ada aktivitas pengiriman, cek berdasarkan created_at
                const campaignAge = now - new Date(campaign.created_at);
                isStuck = campaignAge > STUCK_THRESHOLD;
                console.log(`   ⚠️  No sent messages found`);
                console.log(`   🕐 Campaign age: ${Math.round(campaignAge/1000/60)} minutes`);
            }

            if (isStuck) {
                await this.handleStuckCampaign(campaign);
            } else {
                console.log(`   ✅ Campaign is active`);
            }

        } catch (error) {
            console.error(`❌ Error checking campaign ${campaign.id}:`, error);
        }
    }

    async handleStuckCampaign(campaign) {
        const campaignId = campaign.id;
        
        // Cek berapa kali sudah di-restart
        if (!this.monitoredCampaigns.has(campaignId)) {
            this.monitoredCampaigns.set(campaignId, { restartCount: 0 });
        }

        const campaignInfo = this.monitoredCampaigns.get(campaignId);
        
        if (campaignInfo.restartCount >= MAX_AUTO_RESTARTS) {
            console.log(`   ⚠️  Campaign ${campaignId} reached max auto-restart limit (${MAX_AUTO_RESTARTS})`);
            console.log(`   🛑 Marking campaign as failed`);
            
            await supabase
                .from('whatsapp_blast_campaigns')
                .update({ 
                    status: 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', campaignId);
            
            return;
        }

        console.log(`   🔄 Campaign appears stuck. Attempting auto-restart #${campaignInfo.restartCount + 1}`);
        
        try {
            // Restart campaign
            await this.restartCampaign(campaignId);
            campaignInfo.restartCount++;
            
            console.log(`   ✅ Auto-restart successful`);
            
        } catch (error) {
            console.error(`   ❌ Auto-restart failed:`, error);
            campaignInfo.restartCount++;
        }
    }

    async restartCampaign(campaignId) {
        // Reset failed messages to pending
        await supabase
            .from('whatsapp_blast_recipients')
            .update({ 
                status: 'pending',
                error_message: null,
                updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaignId)
            .eq('status', 'failed');

        // Update campaign status
        await supabase
            .from('whatsapp_blast_campaigns')
            .update({ 
                status: 'running',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        // Panggil Edge Function untuk restart
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-blast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_id: campaignId,
                action: 'start'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Jalankan monitor
const monitor = new AutoRestartMonitor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
});

// Start monitoring
monitor.start().catch(error => {
    console.error('❌ Failed to start monitor:', error);
    process.exit(1);
});