import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuccessRateIssue() {
  try {
    console.log('🔍 CHECKING SUCCESS RATE ISSUE');
    console.log('=' .repeat(50));

    // Get all campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
    }

    console.log(`📊 Found ${campaigns.length} campaigns\n`);

    for (const campaign of campaigns) {
      console.log(`📋 Campaign: ${campaign.name}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Total Recipients: ${campaign.total_recipients}`);
      console.log(`   Sent Count: ${campaign.sent_count}`);
      console.log(`   Delivered Count: ${campaign.delivered_count}`);
      console.log(`   Failed Count: ${campaign.failed_count}`);

      // Get detailed recipient data
      const { data: recipients, error: recipientsError } = await supabase
        .from('whatsapp_blast_recipients')
        .select('*')
        .eq('campaign_id', campaign.id);

      if (recipientsError) {
        console.log(`   ❌ Error fetching recipients: ${recipientsError.message}`);
        continue;
      }

      // Analyze recipient statuses
      const statusCounts = {
        pending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        read: 0
      };

      recipients.forEach(recipient => {
        statusCounts[recipient.status] = (statusCounts[recipient.status] || 0) + 1;
      });

      console.log(`   📱 Recipients Analysis:`);
      console.log(`      Total: ${recipients.length}`);
      console.log(`      Pending: ${statusCounts.pending}`);
      console.log(`      Sent: ${statusCounts.sent}`);
      console.log(`      Delivered: ${statusCounts.delivered}`);
      console.log(`      Failed: ${statusCounts.failed}`);
      console.log(`      Read: ${statusCounts.read}`);

      // Calculate actual success rate
      const actualSentCount = statusCounts.sent + statusCounts.delivered + statusCounts.read;
      const actualDeliveredCount = statusCounts.delivered + statusCounts.read;
      const actualSuccessRate = actualSentCount > 0 ? ((actualDeliveredCount / actualSentCount) * 100).toFixed(2) : 0;

      console.log(`   📈 Calculated Success Rate: ${actualSuccessRate}%`);

      // Check if campaign counts match recipient counts
      const countsMatch = {
        sent: campaign.sent_count === actualSentCount,
        delivered: campaign.delivered_count === actualDeliveredCount,
        failed: campaign.failed_count === statusCounts.failed
      };

      console.log(`   🔍 Campaign vs Recipients Count Match:`);
      console.log(`      Sent Count Match: ${countsMatch.sent} (${campaign.sent_count} vs ${actualSentCount})`);
      console.log(`      Delivered Count Match: ${countsMatch.delivered} (${campaign.delivered_count} vs ${actualDeliveredCount})`);
      console.log(`      Failed Count Match: ${countsMatch.failed} (${campaign.failed_count} vs ${statusCounts.failed})`);

      // Show some sample recipients with their statuses
      console.log(`   📋 Sample Recipients (first 5):`);
      recipients.slice(0, 5).forEach((recipient, index) => {
        console.log(`      ${index + 1}. ${recipient.phone_number} - Status: ${recipient.status} - Message ID: ${recipient.message_id || 'N/A'}`);
      });

      console.log('');
    }

    // Check if there's a specific issue with status updates
    console.log('🔍 ANALYZING STATUS UPDATE PATTERNS');
    console.log('=' .repeat(50));

    const { data: allRecipients, error: allRecipientsError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('status, sent_at, delivered_at, message_id')
      .not('sent_at', 'is', null);

    if (allRecipientsError) {
      throw new Error(`Failed to fetch all recipients: ${allRecipientsError.message}`);
    }

    const statusDistribution = {};
    allRecipients.forEach(recipient => {
      statusDistribution[recipient.status] = (statusDistribution[recipient.status] || 0) + 1;
    });

    console.log('📊 Overall Status Distribution:');
    Object.entries(statusDistribution).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Check for recipients that have sent_at but status is still 'sent'
    const sentButNotDelivered = allRecipients.filter(r => 
      r.status === 'sent' && r.sent_at && !r.delivered_at
    );

    console.log(`\n🔍 Messages sent but not marked as delivered: ${sentButNotDelivered.length}`);
    
    if (sentButNotDelivered.length > 0) {
      console.log('📋 Sample sent but not delivered (first 5):');
      sentButNotDelivered.slice(0, 5).forEach((recipient, index) => {
        console.log(`   ${index + 1}. Status: ${recipient.status}, Sent: ${recipient.sent_at}, Message ID: ${recipient.message_id || 'N/A'}`);
      });
    }

    console.log('\n✅ SUCCESS RATE ISSUE ANALYSIS COMPLETED');

  } catch (error) {
    console.error('❌ Error checking success rate issue:', error.message);
    throw error;
  }
}

// Execute the check
checkSuccessRateIssue()
  .then(() => {
    console.log('\n🎉 Analysis completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });