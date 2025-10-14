import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const edgeFunctionUrl = process.env.VITE_SUPABASE_EDGE_FUNCTION_URL;

if (!supabaseUrl || !supabaseKey || !edgeFunctionUrl) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class ManualBatchBlast {
  constructor(campaignId, options = {}) {
    this.campaignId = campaignId;
    this.batchSize = options.batchSize || 50;
    this.delayBetweenBatches = options.delay || 2000; // 2 seconds
    this.maxRetries = options.maxRetries || 3;
    this.forceRestart = options.forceRestart || false;
  }

  async getCampaignInfo() {
    console.log('📊 Getting campaign information...');
    
    const { data: campaign, error } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('*')
      .eq('id', this.campaignId)
      .single();

    if (error) throw error;
    
    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`📊 Status: ${campaign.status}`);
    console.log(`👥 Total Recipients: ${campaign.total_recipients}`);
    console.log(`✅ Sent: ${campaign.sent_count}`);
    console.log(`❌ Failed: ${campaign.failed_count}`);
    
    return campaign;
  }

  async getPendingRecipients() {
    console.log('🔍 Getting pending recipients...');
    
    const { data: recipients, error } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('campaign_id', this.campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    console.log(`⏳ Found ${recipients.length} pending recipients`);
    return recipients;
  }

  async sendBatch(recipients) {
    console.log(`🚀 Sending batch of ${recipients.length} recipients...`);
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          campaign_id: this.campaignId,
          recipients: recipients.map(r => ({
            id: r.id,
            phone_number: r.phone_number,
            name: r.name
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Batch sent successfully`);
      console.log(`   📤 Processed: ${result.processed || recipients.length}`);
      console.log(`   ✅ Success: ${result.success || 0}`);
      console.log(`   ❌ Failed: ${result.failed || 0}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Batch send failed: ${error.message}`);
      throw error;
    }
  }

  async processBatches(recipients) {
    const batches = [];
    for (let i = 0; i < recipients.length; i += this.batchSize) {
      batches.push(recipients.slice(i, i + this.batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of ${this.batchSize} recipients each`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length}`);
      
      let retries = 0;
      let success = false;
      
      while (retries < this.maxRetries && !success) {
        try {
          const result = await this.sendBatch(batch);
          totalProcessed += batch.length;
          totalSuccess += result.success || 0;
          totalFailed += result.failed || 0;
          success = true;
        } catch (error) {
          retries++;
          console.log(`⚠️ Retry ${retries}/${this.maxRetries} for batch ${i + 1}`);
          
          if (retries >= this.maxRetries) {
            console.error(`❌ Batch ${i + 1} failed after ${this.maxRetries} retries`);
            totalFailed += batch.length;
          } else {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
          }
        }
      }

      // Delay between batches
      if (i < batches.length - 1) {
        console.log(`⏳ Waiting ${this.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    return { totalProcessed, totalSuccess, totalFailed };
  }

  async run() {
    try {
      console.log('🚀 Starting Manual Batch Blast');
      console.log('═══════════════════════════════════════');
      console.log(`📋 Campaign ID: ${this.campaignId}`);
      console.log(`📦 Batch Size: ${this.batchSize}`);
      console.log(`⏳ Delay: ${this.delayBetweenBatches}ms`);
      console.log(`🔄 Max Retries: ${this.maxRetries}`);
      console.log(`🔧 Force Restart: ${this.forceRestart}`);
      console.log('═══════════════════════════════════════\n');

      // Get campaign info
      const campaign = await this.getCampaignInfo();
      
      if (campaign.status === 'completed' && !this.forceRestart) {
        console.log('✅ Campaign already completed. Use --force to restart.');
        return;
      }

      // Get pending recipients
      const recipients = await this.getPendingRecipients();
      
      if (recipients.length === 0) {
        console.log('✅ No pending recipients found. Campaign may be complete.');
        return;
      }

      // Process batches
      const startTime = Date.now();
      const results = await this.processBatches(recipients);
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      // Final summary
      console.log('\n🎉 Manual Batch Blast Completed!');
      console.log('═══════════════════════════════════════');
      console.log(`⏱️ Duration: ${duration} seconds`);
      console.log(`📤 Total Processed: ${results.totalProcessed}`);
      console.log(`✅ Total Success: ${results.totalSuccess}`);
      console.log(`❌ Total Failed: ${results.totalFailed}`);
      console.log(`📊 Success Rate: ${((results.totalSuccess / results.totalProcessed) * 100).toFixed(2)}%`);
      
      // Get updated campaign info
      console.log('\n📊 Updated Campaign Status:');
      await this.getCampaignInfo();

    } catch (error) {
      console.error('❌ Manual batch blast failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node manual-batch-blast.js <campaign_id> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --batch-size <number>    Batch size (default: 50)');
    console.log('  --delay <ms>            Delay between batches in ms (default: 2000)');
    console.log('  --max-retries <number>  Max retries per batch (default: 3)');
    console.log('  --force                 Force restart completed campaign');
    console.log('');
    console.log('Examples:');
    console.log('  node manual-batch-blast.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e');
    console.log('  node manual-batch-blast.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e --batch-size 100 --delay 1000');
    console.log('  node manual-batch-blast.js 4f2f6c48-d810-45ae-9e3d-a2e1aeb5f85e --force');
    process.exit(1);
  }

  const campaignId = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--delay':
        options.delay = parseInt(args[++i]);
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i]);
        break;
      case '--force':
        options.forceRestart = true;
        break;
    }
  }

  const blaster = new ManualBatchBlast(campaignId, options);
  blaster.run();
}

export default ManualBatchBlast;