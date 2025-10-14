import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const execAsync = util.promisify(exec);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class CampaignMonitor {
  constructor(campaignId, options = {}) {
    this.campaignId = campaignId;
    this.checkInterval = options.checkInterval || 60000; // 1 minute default
    this.stuckThreshold = options.stuckThreshold || 300000; // 5 minutes default
    this.maxRestarts = options.maxRestarts || 5;
    this.restartCount = 0;
    this.lastStats = null;
    this.lastUpdateTime = Date.now();
    this.isRunning = false;
  }

  async getCampaignStats() {
    try {
      // Get campaign info
      const { data: campaign, error: campaignError } = await supabase
        .from('whatsapp_blast_campaigns')
        .select('*')
        .eq('id', this.campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get recipient stats
    const { data: stats, error: statsError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('status')
      .eq('campaign_id', this.campaignId);

      if (statsError) throw statsError;

      const statusCounts = stats.reduce((acc, recipient) => {
        acc[recipient.status] = (acc[recipient.status] || 0) + 1;
        return acc;
      }, {});

      return {
        campaign,
        sent: statusCounts.sent || 0,
        pending: statusCounts.pending || 0,
        failed: statusCounts.failed || 0,
        total: stats.length
      };
    } catch (error) {
      console.error('❌ Error getting campaign stats:', error.message);
      return null;
    }
  }

  async restartCampaign() {
    try {
      console.log(`🔄 Attempting restart #${this.restartCount + 1}...`);
      
      const { stdout, stderr } = await execAsync(`node batch-whatsapp-blast.js ${this.campaignId}`);
      
      if (stderr) {
        console.error('⚠️ Restart stderr:', stderr);
      }
      
      console.log('✅ Restart command executed successfully');
      console.log('📋 Output:', stdout.split('\n').slice(-5).join('\n')); // Show last 5 lines
      
      this.restartCount++;
      this.lastUpdateTime = Date.now();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to restart campaign:', error.message);
      return false;
    }
  }

  isStuck(currentStats) {
    if (!this.lastStats) {
      this.lastStats = currentStats;
      return false;
    }

    // Check if sent count hasn't increased
    const sentIncreased = currentStats.sent > this.lastStats.sent;
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    
    if (sentIncreased) {
      this.lastUpdateTime = Date.now();
      this.lastStats = currentStats;
      return false;
    }

    // If no progress and enough time has passed, consider it stuck
    const isStuck = timeSinceLastUpdate > this.stuckThreshold && currentStats.pending > 0;
    
    if (!isStuck) {
      this.lastStats = currentStats;
    }
    
    return isStuck;
  }

  async checkAndRestart() {
    const stats = await this.getCampaignStats();
    
    if (!stats) {
      console.log('⚠️ Could not get campaign stats, skipping check');
      return;
    }

    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] 📊 Campaign Status Check:`);
    console.log(`   ✅ Sent: ${stats.sent}`);
    console.log(`   ⏳ Pending: ${stats.pending}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   🎯 Success Rate: ${((stats.sent / stats.total) * 100).toFixed(2)}%`);

    // Check if campaign is completed
    if (stats.pending === 0) {
      console.log('🎉 Campaign completed! Stopping monitor.');
      this.stop();
      return;
    }

    // Check if campaign is stuck
    if (this.isStuck(stats)) {
      console.log(`⚠️ Campaign appears stuck (no progress for ${Math.round(this.stuckThreshold / 60000)} minutes)`);
      
      if (this.restartCount >= this.maxRestarts) {
        console.log(`❌ Maximum restart attempts (${this.maxRestarts}) reached. Stopping monitor.`);
        this.stop();
        return;
      }

      const restartSuccess = await this.restartCampaign();
      if (!restartSuccess) {
        console.log('❌ Restart failed. Will try again on next check.');
      }
    } else {
      console.log('✅ Campaign is progressing normally');
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Monitor is already running');
      return;
    }

    console.log('🚀 Starting Campaign Auto-Monitor');
    console.log(`📋 Campaign ID: ${this.campaignId}`);
    console.log(`⏱️ Check Interval: ${this.checkInterval / 1000} seconds`);
    console.log(`⏰ Stuck Threshold: ${this.stuckThreshold / 60000} minutes`);
    console.log(`🔄 Max Restarts: ${this.maxRestarts}`);
    console.log('═══════════════════════════════════════\n');

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndRestart();
    }, this.checkInterval);

    // Initial check
    this.checkAndRestart();
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Monitor is not running');
      return;
    }

    console.log('\n🛑 Stopping Campaign Auto-Monitor');
    clearInterval(this.intervalId);
    this.isRunning = false;
  }
}

// Main execution
async function main() {
  const campaignId = process.argv[2];
  
  if (!campaignId) {
    console.error('❌ Usage: node auto-monitor-campaign.js <campaign_id>');
    console.error('📋 Example: node auto-monitor-campaign.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e');
    process.exit(1);
  }

  const options = {
    checkInterval: 60000,    // Check every 1 minute
    stuckThreshold: 300000,  // Consider stuck after 5 minutes
    maxRestarts: 5           // Maximum 5 restart attempts
  };

  const monitor = new CampaignMonitor(campaignId, options);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping monitor...');
    monitor.stop();
    process.exit(0);
  });

  monitor.start();
}

// Check if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv[1] === __filename) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { CampaignMonitor };