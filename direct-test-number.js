import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function directTestNumber() {
  const targetNumber = '628121405897';
  
  console.log('📱 Direct testing number:', targetNumber);
  console.log('=' .repeat(50));
  
  try {
    // 1. Get the campaign info
    console.log('\n📋 1. Getting campaign information...');
    const { data: recipient, error: recipientError } = await supabase
      .from('whatsapp_blast_recipients')
      .select(`
        *,
        whatsapp_blast_campaigns (
          id,
          name,
          template_name,
          status
        )
      `)
      .eq('phone_number', targetNumber)
      .single();
    
    if (recipientError) {
      console.error('❌ Error getting recipient:', recipientError);
      return;
    }
    
    console.log('✅ Found recipient and campaign:');
    console.log(`   Campaign: ${recipient.whatsapp_blast_campaigns.name}`);
    console.log(`   Campaign ID: ${recipient.whatsapp_blast_campaigns.id}`);
    console.log(`   Recipient ID: ${recipient.id}`);
    console.log(`   Current Status: ${recipient.status}`);
    
    // 2. Test direct WhatsApp API call
    console.log('\n📱 2. Testing direct WhatsApp API call...');
    
    // Create a test message
    const testMessage = recipient.whatsapp_blast_campaigns.template_name || 'Test message for number validation';
    
    console.log(`   Message: ${testMessage.substring(0, 50)}...`);
    console.log(`   Target: ${targetNumber}`);
    
    // Call the send-whatsapp-blast function directly
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp-blast', {
      body: {
        campaign_id: recipient.whatsapp_blast_campaigns.id,
        test_mode: true, // Add test mode if available
        specific_recipients: [recipient.id] // Test only this recipient
      }
    });
    
    if (sendError) {
      console.error('❌ Error calling send function:', sendError);
      
      // Try alternative approach - update the recipient to pending and let the system process it
      console.log('\n🔄 3. Alternative: Triggering system processing...');
      
      const { error: updateError } = await supabase
        .from('whatsapp_blast_recipients')
        .update({
          status: 'pending',
          retry_count: 0,
          error_message: null,
          last_retry_at: null
        })
        .eq('id', recipient.id);
      
      if (updateError) {
        console.error('❌ Error updating status:', updateError);
      } else {
        console.log('✅ Updated recipient status to pending');
        console.log('💡 The system should pick this up automatically');
      }
      
      return;
    }
    
    console.log('✅ Send function called successfully');
    console.log('Result:', sendResult);
    
    // 3. Wait and check result
    console.log('\n⏳ 3. Waiting 15 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // 4. Check final status
    console.log('\n📊 4. Checking final status...');
    const { data: finalStatus, error: statusError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('id', recipient.id)
      .single();
    
    if (statusError) {
      console.error('❌ Error checking status:', statusError);
      return;
    }
    
    console.log('📋 Final result:');
    console.log(`   Status: ${finalStatus.status}`);
    console.log(`   Retry count: ${finalStatus.retry_count}`);
    console.log(`   Error: ${finalStatus.error_message || 'None'}`);
    console.log(`   Last attempt: ${finalStatus.last_retry_at || 'Never'}`);
    
    // 5. Detailed analysis
    console.log('\n🔍 5. Detailed Analysis:');
    
    if (finalStatus.status === 'sent' || finalStatus.status === 'delivered') {
      console.log('🎉 SUCCESS! The number is working now!');
      console.log('💡 Previous failures might have been temporary issues.');
    } else if (finalStatus.status === 'failed') {
      const errorMsg = finalStatus.error_message || '';
      console.log('❌ Still failing. Error analysis:');
      console.log(`   Error: ${errorMsg}`);
      
      if (errorMsg.includes('131000')) {
        console.log('\n🚨 Error #131000 Analysis:');
        console.log('   This is a generic WhatsApp API error that can mean:');
        console.log('   1. 🚫 Number is not registered on WhatsApp');
        console.log('   2. 🔒 Number has blocked business messages');
        console.log('   3. ⏰ Temporary WhatsApp server issues');
        console.log('   4. 🚨 Rate limiting or account restrictions');
        console.log('   5. 📱 Number format accepted by our system but rejected by WhatsApp');
        
        console.log('\n✅ Verification Steps:');
        console.log('   1. Check if 628121405897 is active on WhatsApp');
        console.log('   2. Try sending a manual message via WhatsApp Web');
        console.log('   3. Verify the number is not a landline');
        console.log('   4. Check if the number accepts business messages');
        
        console.log('\n💡 Recommendations:');
        console.log('   - If manual WhatsApp works: Contact WhatsApp Business API support');
        console.log('   - If manual WhatsApp fails: Number is invalid/inactive');
        console.log('   - Try again in 24 hours (might be temporary)');
      } else if (errorMsg.includes('rate limit')) {
        console.log('⏰ Rate limiting issue - try again later');
      } else if (errorMsg.includes('invalid')) {
        console.log('📱 Number format issue - despite passing our validation');
      }
    } else if (finalStatus.status === 'pending') {
      console.log('⏳ Still pending - message might be in queue');
      console.log('💡 Check again in 5-10 minutes');
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error);
  }
}

// Run the direct test
directTestNumber();