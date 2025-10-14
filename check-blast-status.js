import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

// Validate configuration
if (supabaseKey === 'your-service-role-key-here') {
  console.error('❌ Please configure VITE_SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

async function checkBlastStatus() {
  console.log('🔍 === CHECKING WHATSAPP BLAST STATUS ===\n');

  try {
    // Get all campaigns, sorted by most recent
    console.log('📋 Fetching all campaigns...');
    const { data: campaigns, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError.message);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('📭 No campaigns found');
      return;
    }

    console.log(`✅ Found ${campaigns.length} campaigns\n`);

    // Show campaign overview
    console.log('📊 CAMPAIGN OVERVIEW:');
    console.log('═'.repeat(80));
    campaigns.forEach((campaign, index) => {
      const createdAt = new Date(campaign.created_at).toLocaleString('id-ID');
      console.log(`${index + 1}. ${campaign.name}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Template: ${campaign.template_name}`);
      console.log(`   Created: ${createdAt}`);
      console.log(`   Total Recipients: ${campaign.total_recipients || 'N/A'}`);
      console.log(`   Sent: ${campaign.sent_count || 0}`);
      console.log(`   Failed: ${campaign.failed_count || 0}`);
      console.log('   ' + '─'.repeat(60));
    });

    // Ask user which campaign to check in detail
    console.log('\n🔍 DETAILED STATUS CHECK');
    console.log('Enter campaign number to check details (1-' + campaigns.length + '):');
    
    // For automation, let's check the most recent campaign
    const latestCampaign = campaigns[0];
    console.log(`\n🎯 Checking latest campaign: ${latestCampaign.name}\n`);
    
    await checkCampaignDetails(latestCampaign.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkCampaignDetails(campaignId) {
  try {
    // Get campaign with recipients
    console.log('📊 Fetching campaign details...');
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select(`
        *,
        whatsapp_blast_recipients(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('❌ Error fetching campaign details:', campaignError.message);
      return;
    }

    const recipients = campaign.whatsapp_blast_recipients || [];
    
    // Calculate statistics
    const stats = {
      total: recipients.length,
      pending: recipients.filter(r => r.status === 'pending').length,
      sent: recipients.filter(r => r.status === 'sent').length,
      delivered: recipients.filter(r => r.status === 'delivered').length,
      failed: recipients.filter(r => r.status === 'failed').length,
      read: recipients.filter(r => r.status === 'read').length
    };

    // Display detailed status
    console.log('📈 DETAILED CAMPAIGN STATUS:');
    console.log('═'.repeat(60));
    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`🆔 ID: ${campaign.id}`);
    console.log(`📅 Created: ${new Date(campaign.created_at).toLocaleString('id-ID')}`);
    console.log(`📊 Status: ${campaign.status}`);
    console.log(`📝 Template: ${campaign.template_name}`);
    console.log(`🎯 Dry Run: ${campaign.dry_run ? 'Yes' : 'No'}`);
    
    console.log('\n📊 RECIPIENT STATISTICS:');
    console.log('─'.repeat(40));
    console.log(`📦 Total Recipients: ${stats.total}`);
    console.log(`⏳ Pending: ${stats.pending}`);
    console.log(`✅ Sent: ${stats.sent}`);
    console.log(`📨 Delivered: ${stats.delivered}`);
    console.log(`👁️ Read: ${stats.read}`);
    console.log(`❌ Failed: ${stats.failed}`);
    
    const successRate = stats.total > 0 ? ((stats.sent + stats.delivered + stats.read) / stats.total * 100).toFixed(2) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);

    // Check for stuck/problematic recipients
    console.log('\n🔍 PROBLEM ANALYSIS:');
    console.log('─'.repeat(40));
    
    if (stats.pending > 0 && campaign.status === 'running') {
      console.log(`⚠️ Campaign is RUNNING but ${stats.pending} messages are still PENDING`);
      console.log('   This might indicate the process is stuck or rate-limited');
    } else if (stats.pending > 0 && campaign.status === 'completed') {
      console.log(`⚠️ Campaign is COMPLETED but ${stats.pending} messages are still PENDING`);
      console.log('   This indicates incomplete processing');
    } else if (stats.pending === 0 && campaign.status === 'running') {
      console.log('✅ All messages processed, campaign should be completed');
    } else if (campaign.status === 'draft') {
      console.log('📝 Campaign is in DRAFT status - not started yet');
    }

    // Show recent failed messages
    const failedRecipients = recipients.filter(r => r.status === 'failed');
    if (failedRecipients.length > 0) {
      console.log('\n❌ RECENT FAILED MESSAGES:');
      console.log('─'.repeat(40));
      failedRecipients.slice(0, 5).forEach((recipient, index) => {
        console.log(`${index + 1}. ${recipient.phone_number} (${recipient.name})`);
        console.log(`   Error: ${recipient.error_message || 'Unknown error'}`);
        console.log(`   Failed at: ${recipient.failed_at ? new Date(recipient.failed_at).toLocaleString('id-ID') : 'N/A'}`);
        console.log(`   Retry count: ${recipient.retry_count || 0}`);
      });
      if (failedRecipients.length > 5) {
        console.log(`   ... and ${failedRecipients.length - 5} more failed messages`);
      }
    }

    // Show recent successful messages
    const sentRecipients = recipients.filter(r => r.status === 'sent' || r.status === 'delivered');
    if (sentRecipients.length > 0) {
      console.log('\n✅ RECENT SUCCESSFUL MESSAGES:');
      console.log('─'.repeat(40));
      sentRecipients.slice(-5).forEach((recipient, index) => {
        console.log(`${index + 1}. ${recipient.phone_number} (${recipient.name})`);
        console.log(`   Status: ${recipient.status}`);
        console.log(`   Sent at: ${recipient.sent_at ? new Date(recipient.sent_at).toLocaleString('id-ID') : 'N/A'}`);
        if (recipient.message_id) {
          console.log(`   Message ID: ${recipient.message_id}`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(40));
    
    if (stats.pending > 0 && campaign.status === 'running') {
      console.log('🔄 Campaign appears to be stuck. Try:');
      console.log('   1. Check if the Supabase function is still running');
      console.log('   2. Restart the campaign if needed');
      console.log('   3. Check WhatsApp API rate limits');
    } else if (stats.failed > stats.sent) {
      console.log('⚠️ High failure rate detected. Check:');
      console.log('   1. WhatsApp API credentials');
      console.log('   2. Phone number formats');
      console.log('   3. Message template compliance');
    } else if (stats.sent > 0) {
      console.log('✅ Campaign is progressing normally');
      if (stats.pending > 0) {
        console.log('   Wait for remaining messages to be processed');
      }
    }

    // Show command to restart if needed
    if (stats.pending > 0) {
      console.log('\n🔧 TO RESTART CAMPAIGN:');
      console.log('─'.repeat(40));
      console.log(`node restart-campaign.js ${campaignId}`);
    }

  } catch (error) {
    console.error('❌ Error checking campaign details:', error.message);
  }
}

// Run the status check
checkBlastStatus().catch(console.error);