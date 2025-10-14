import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSpecificNumber() {
  const targetNumber = '628121405897';
  
  console.log('🔍 Analyzing specific number:', targetNumber);
  console.log('=' .repeat(50));
  
  try {
    // 1. Check all records for this number
    console.log('\n📊 1. Checking all records for this number...');
    const { data: allRecords, error: recordsError } = await supabase
      .from('whatsapp_blast_recipients')
      .select(`
        id,
        phone_number,
        status,
        error_message,
        retry_count,
        last_retry_at,
        created_at,
        whatsapp_blast_campaigns (
          id,
          name,
          status,
          created_at
        )
      `)
      .eq('phone_number', targetNumber)
      .order('created_at', { ascending: false });
    
    if (recordsError) {
      console.error('❌ Error fetching records:', recordsError);
      return;
    }
    
    console.log(`📋 Found ${allRecords.length} records for this number:`);
    allRecords.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`   - ID: ${record.id}`);
      console.log(`   - Campaign: ${record.whatsapp_blast_campaigns?.name || 'Unknown'} (ID: ${record.whatsapp_blast_campaigns?.id})`);
      console.log(`   - Status: ${record.status}`);
      console.log(`   - Error: ${record.error_message || 'None'}`);
      console.log(`   - Retry Count: ${record.retry_count}`);
      console.log(`   - Last Retry: ${record.last_retry_at || 'Never'}`);
      console.log(`   - Created: ${record.created_at}`);
    });
    
    // 2. Phone number validation analysis
    console.log('\n🔍 2. Phone number validation analysis...');
    console.log(`   Original: ${targetNumber}`);
    console.log(`   Length: ${targetNumber.length} digits`);
    console.log(`   Starts with 62: ${targetNumber.startsWith('62')}`);
    console.log(`   After 62: ${targetNumber.substring(2)}`);
    console.log(`   Expected format: 62XXXXXXXXXX (12-13 digits)`);
    
    // Check if it matches Indonesian format
    const isValidLength = targetNumber.length >= 11 && targetNumber.length <= 13;
    const startsWithCountryCode = targetNumber.startsWith('62');
    const afterCountryCode = targetNumber.substring(2);
    const isValidAfterCode = afterCountryCode.length >= 9 && afterCountryCode.length <= 11;
    
    console.log(`   ✅ Valid length (11-13): ${isValidLength}`);
    console.log(`   ✅ Starts with 62: ${startsWithCountryCode}`);
    console.log(`   ✅ Valid after country code: ${isValidAfterCode}`);
    
    // 3. Check current validation function
    console.log('\n🧪 3. Testing with current validation logic...');
    
    // Simulate the validation logic from the Edge Function
    function validatePhoneNumber(phone) {
      // Remove any non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // Check if it's a valid Indonesian number
      if (!cleaned.startsWith('62')) {
        return { valid: false, error: 'Must start with country code 62' };
      }
      
      // Check length (should be 11-13 digits total)
      if (cleaned.length < 11 || cleaned.length > 13) {
        return { valid: false, error: `Invalid length: ${cleaned.length} digits (expected 11-13)` };
      }
      
      // Check if the number after country code is valid
      const numberAfterCode = cleaned.substring(2);
      if (numberAfterCode.length < 9 || numberAfterCode.length > 11) {
        return { valid: false, error: `Invalid number after country code: ${numberAfterCode.length} digits` };
      }
      
      return { valid: true, cleaned };
    }
    
    const validation = validatePhoneNumber(targetNumber);
    console.log(`   Validation result: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    if (!validation.valid) {
      console.log(`   Error: ${validation.error}`);
    } else {
      console.log(`   Cleaned number: ${validation.cleaned}`);
    }
    
    // 4. Check recent campaign activity
    console.log('\n📈 4. Checking recent campaign activity...');
    const { data: recentCampaigns, error: campaignsError } = await supabase
      .from('whatsapp_blast_campaigns')
      .select('id, name, status, created_at, total_recipients, sent_count, failed_count')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!campaignsError && recentCampaigns) {
      console.log('   Recent campaigns:');
      recentCampaigns.forEach((campaign, index) => {
        console.log(`   ${index + 1}. ${campaign.name} (${campaign.status})`);
        console.log(`      - Total: ${campaign.total_recipients}, Sent: ${campaign.sent_count}, Failed: ${campaign.failed_count}`);
        console.log(`      - Created: ${campaign.created_at}`);
      });
    }
    
    // 5. Check if number is eligible for retry
    console.log('\n🔄 5. Checking retry eligibility...');
    const failedRecords = allRecords.filter(r => r.status === 'failed');
    
    if (failedRecords.length > 0) {
      const latestFailed = failedRecords[0];
      const maxRetries = 3;
      const isEligible = latestFailed.retry_count < maxRetries;
      
      console.log(`   Latest failed record:`);
      console.log(`   - Retry count: ${latestFailed.retry_count}/${maxRetries}`);
      console.log(`   - Eligible for retry: ${isEligible ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Error message: ${latestFailed.error_message || 'None'}`);
      
      if (isEligible) {
        console.log('\n🚀 This number can be retried!');
      } else {
        console.log('\n⛔ This number has reached maximum retry attempts');
      }
    } else {
      console.log('   No failed records found for retry analysis');
    }
    
    // 6. Recommendations
    console.log('\n💡 6. Recommendations:');
    
    if (validation.valid) {
      console.log('   ✅ Number format is valid according to our validation logic');
      
      if (failedRecords.length > 0) {
        const latestError = failedRecords[0].error_message;
        console.log(`   🔍 Last error was: "${latestError}"`);
        
        if (latestError && latestError.includes('rate limit')) {
          console.log('   💡 Suggestion: This might be a rate limiting issue. Try again later.');
        } else if (latestError && latestError.includes('invalid')) {
          console.log('   💡 Suggestion: WhatsApp API might have different validation rules.');
        } else if (latestError && latestError.includes('timeout')) {
          console.log('   💡 Suggestion: Network timeout issue. Retry should work.');
        } else {
          console.log('   💡 Suggestion: Check WhatsApp API logs for more details.');
        }
      }
    } else {
      console.log('   ❌ Number format validation failed');
      console.log('   💡 Suggestion: Fix the validation logic or number format');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeSpecificNumber();