import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function resetAndRetryNumber() {
  const targetNumber = '628121405897';
  
  console.log('🔄 Resetting and retrying number:', targetNumber);
  console.log('=' .repeat(50));
  
  try {
    // 1. Find the failed record
    console.log('\n📋 1. Finding the failed record...');
    const { data: failedRecord, error: findError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('phone_number', targetNumber)
      .eq('status', 'failed')
      .single();
    
    if (findError) {
      console.error('❌ Error finding record:', findError);
      return;
    }
    
    console.log('✅ Found failed record:', failedRecord.id);
    console.log(`   Current retry count: ${failedRecord.retry_count}`);
    console.log(`   Current error: ${failedRecord.error_message}`);
    
    // 2. Reset the retry count and status
    console.log('\n🔄 2. Resetting retry count and status...');
    const { data: resetData, error: resetError } = await supabase
      .from('whatsapp_blast_recipients')
      .update({
        retry_count: 0,
        status: 'pending',
        error_message: null,
        last_retry_at: null
      })
      .eq('id', failedRecord.id)
      .select();
    
    if (resetError) {
      console.error('❌ Error resetting record:', resetError);
      return;
    }
    
    console.log('✅ Successfully reset the record');
    console.log('   New status: pending');
    console.log('   New retry count: 0');
    
    // 3. Test the number with a single message
    console.log('\n📱 3. Testing the number with retry mechanism...');
    
    // Call the retry function for this specific recipient
    const { data: retryResult, error: retryError } = await supabase.functions.invoke('retry-whatsapp-blast', {
      body: {
        recipient_ids: [failedRecord.id]
      }
    });
    
    if (retryError) {
      console.error('❌ Error calling retry function:', retryError);
      return;
    }
    
    console.log('✅ Retry function called successfully');
    console.log('Result:', retryResult);
    
    // 4. Wait a moment and check the result
    console.log('\n⏳ 4. Waiting 10 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 5. Check the final status
    console.log('\n📊 5. Checking final status...');
    const { data: finalRecord, error: finalError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('*')
      .eq('id', failedRecord.id)
      .single();
    
    if (finalError) {
      console.error('❌ Error checking final status:', finalError);
      return;
    }
    
    console.log('📋 Final status:');
    console.log(`   Status: ${finalRecord.status}`);
    console.log(`   Retry count: ${finalRecord.retry_count}`);
    console.log(`   Error message: ${finalRecord.error_message || 'None'}`);
    console.log(`   Last retry: ${finalRecord.last_retry_at || 'Never'}`);
    
    // 6. Analysis and recommendations
    console.log('\n💡 6. Analysis and Recommendations:');
    
    if (finalRecord.status === 'sent' || finalRecord.status === 'delivered') {
      console.log('🎉 SUCCESS! The number worked after reset!');
      console.log('💡 The issue was likely temporary or related to retry limit.');
    } else if (finalRecord.status === 'failed') {
      console.log('❌ Still failed after reset.');
      console.log(`🔍 New error: ${finalRecord.error_message}`);
      
      if (finalRecord.error_message && finalRecord.error_message.includes('131000')) {
        console.log('\n🚨 Still getting error #131000. Possible causes:');
        console.log('   1. WhatsApp account/number restriction');
        console.log('   2. The number might be invalid on WhatsApp side');
        console.log('   3. WhatsApp API temporary issues');
        console.log('   4. Rate limiting from WhatsApp');
        console.log('\n💡 Recommendations:');
        console.log('   - Try sending manually via WhatsApp Web to test');
        console.log('   - Check if the number is active on WhatsApp');
        console.log('   - Wait 24 hours and try again');
        console.log('   - Contact WhatsApp Business API support');
      }
    } else if (finalRecord.status === 'pending') {
      console.log('⏳ Still pending. The message might be in queue.');
      console.log('💡 Check again in a few minutes.');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the reset and retry
resetAndRetryNumber();