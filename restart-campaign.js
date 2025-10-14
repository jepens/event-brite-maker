import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getSuccessfulRecipients, filterDuplicateRecipients } from './prevent-duplicate-blast.js';

// Supabase configuration
const supabaseUrl = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

// Get campaign ID from command line arguments
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Usage: node restart-campaign.js <campaign-id>');
  console.error('   Example: node restart-campaign.js f7169041-7938-4899-aa80-6e09541f4eda');
  process.exit(1);
}

async function restartCampaign(campaignId) {
  console.log('🔄 === RESTARTING WHATSAPP BLAST CAMPAIGN ===\n');
  console.log(`🎯 Campaign ID: ${campaignId}\n`);

  try {
    // First, get campaign details
    console.log('📋 Fetching campaign details...');
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select(`
        *,
        whatsapp_blast_recipients(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('❌ Error fetching campaign:', campaignError.message);
      return;
    }

    if (!campaign) {
      console.error('❌ Campaign not found');
      return;
    }

    console.log(`✅ Found campaign: ${campaign.name}`);
    
    const recipients = campaign.whatsapp_blast_recipients || [];
    const pendingRecipients = recipients.filter(r => r.status === 'pending');
    const failedRecipients = recipients.filter(r => r.status === 'failed');
    
    console.log(`📊 Total recipients: ${recipients.length}`);
    console.log(`⏳ Pending: ${pendingRecipients.length}`);
    console.log(`❌ Failed: ${failedRecipients.length}`);

    // Check for successful recipients to prevent duplicates
    console.log('\n🔍 Checking for duplicate prevention...');
    const successfulNumbers = await getSuccessfulRecipients(campaignId);
    
    // Filter out recipients who have already successfully received messages
    const validPendingRecipients = pendingRecipients.filter(r => !successfulNumbers.has(r.phone_number));
    const validFailedRecipients = failedRecipients.filter(r => !successfulNumbers.has(r.phone_number));
    
    const duplicatePending = pendingRecipients.length - validPendingRecipients.length;
    const duplicateFailed = failedRecipients.length - validFailedRecipients.length;
    
    if (duplicatePending > 0 || duplicateFailed > 0) {
      console.log(`🚫 Found ${duplicatePending + duplicateFailed} recipients who already received messages`);
      console.log(`   - Pending duplicates: ${duplicatePending}`);
      console.log(`   - Failed duplicates: ${duplicateFailed}`);
      
      // Mark duplicates as 'skipped' to avoid reprocessing
      if (duplicatePending > 0 || duplicateFailed > 0) {
        const duplicateIds = [
          ...pendingRecipients.filter(r => successfulNumbers.has(r.phone_number)).map(r => r.id),
          ...failedRecipients.filter(r => successfulNumbers.has(r.phone_number)).map(r => r.id)
        ];
        
        if (duplicateIds.length > 0) {
          console.log(`🏷️ Marking ${duplicateIds.length} duplicates as 'skipped'...`);
          const { error: skipError } = await supabase
            .from('whatsapp_blast_recipients')
            .update({
              status: 'skipped',
              error_message: 'Already received message successfully',
              failed_at: new Date().toISOString()
            })
            .in('id', duplicateIds);
          
          if (skipError) {
            console.error('❌ Error marking duplicates as skipped:', skipError.message);
          } else {
            console.log('✅ Duplicates marked as skipped');
          }
        }
      }
    }

    console.log(`\n📊 After duplicate check:`);
    console.log(`⏳ Valid pending: ${validPendingRecipients.length}`);
    console.log(`❌ Valid failed: ${validFailedRecipients.length}`);

    if (validPendingRecipients.length === 0 && validFailedRecipients.length === 0) {
      console.log('✅ No valid pending or failed messages to restart (all duplicates filtered)');
      return;
    }

    // Reset valid failed messages to pending for retry
    if (validFailedRecipients.length > 0) {
      console.log(`\n🔄 Resetting ${validFailedRecipients.length} valid failed messages to pending...`);
      
      const validFailedIds = validFailedRecipients.map(r => r.id);
      
      const { error: resetError } = await supabase
        .from('whatsapp_blast_recipients')
        .update({
          status: 'pending',
          error_message: null,
          failed_at: null,
          retry_count: 0
        })
        .in('id', validFailedIds);

      if (resetError) {
        console.error('❌ Error resetting failed messages:', resetError.message);
        return;
      }

      console.log('✅ Valid failed messages reset to pending');
    }

    // Update campaign status to sending
  console.log('\n📤 Updating campaign status to sending...');
  const { error: updateError } = await supabase
    .from('whatsapp_blast_campaigns')
    .update({ 
      status: 'sending',
      started_at: new Date().toISOString()
    })
    .eq('id', campaignId);

    if (updateError) {
      console.error('❌ Error updating campaign status:', updateError.message);
      return;
    }

    console.log('✅ Campaign status updated to running');

    // Call the Supabase function to restart the blast
    console.log('\n📡 Calling WhatsApp blast function...');
    
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('send-whatsapp-blast', {
      body: {
        campaignId: campaignId,
        restart: true
      }
    });

    if (functionError) {
      console.error('❌ Error calling blast function:', functionError.message);
      return;
    }

    console.log('✅ WhatsApp blast function called successfully');
    console.log('📊 Function result:', functionResult);

    console.log('\n🎉 === CAMPAIGN RESTART COMPLETED ===');
    console.log(`✅ Campaign ${campaignId} has been restarted`);
    console.log('📊 Monitor progress with: node check-blast-status.js');

  } catch (error) {
    console.error('❌ Error restarting campaign:', error.message);
  }
}

// Validate configuration
if (supabaseKey === 'your-service-role-key-here') {
  console.error('❌ Please configure VITE_SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Run the restart
restartCampaign(campaignId).catch(console.error);