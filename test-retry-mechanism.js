import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRetryMechanism() {
  console.log('\n🔄 TESTING RETRY MECHANISM');
  console.log('='.repeat(50));

  try {
    // 1. Check failed recipients that are eligible for retry
    console.log('\n1️⃣ Checking failed recipients eligible for retry...');
    
    const { data: failedRecipients, error: fetchError } = await supabase
      .from('whatsapp_blast_recipients')
      .select(`
        id,
        phone_number,
        status,
        error_message,
        retry_count,
        last_retry_at,
        retry_reason,
        next_retry_at,
        whatsapp_blast_campaigns!inner(name)
      `)
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .or('next_retry_at.is.null,next_retry_at.lte.now()')
      .order('created_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching failed recipients:', fetchError);
      return;
    }

    console.log(`📊 Found ${failedRecipients.length} recipients eligible for retry`);
    
    if (failedRecipients.length === 0) {
      console.log('✅ No recipients need retry at this time');
      return;
    }

    // Display details of failed recipients
    console.log('\n📋 Failed Recipients Details:');
    failedRecipients.forEach((recipient, index) => {
      console.log(`\n${index + 1}. Phone: ${recipient.phone_number}`);
      console.log(`   Campaign: ${recipient.whatsapp_blast_campaigns.name}`);
      console.log(`   Status: ${recipient.status}`);
      console.log(`   Error: ${recipient.error_message}`);
      console.log(`   Retry Count: ${recipient.retry_count || 0}`);
      console.log(`   Last Retry: ${recipient.last_retry_at || 'Never'}`);
      console.log(`   Next Retry: ${recipient.next_retry_at || 'Not scheduled'}`);
    });

    // 2. Test retry function
    console.log('\n2️⃣ Testing retry function...');
    
    const { data: retryResult, error: retryError } = await supabase.functions.invoke('retry-whatsapp-blast', {
      body: {
        action: 'retry_failed',
        limit: 5
      }
    });

    if (retryError) {
      console.error('❌ Error calling retry function:', retryError);
      return;
    }

    console.log('✅ Retry function response:', retryResult);

    // 3. Check updated status
    console.log('\n3️⃣ Checking updated recipient status...');
    
    const recipientIds = failedRecipients.slice(0, 5).map(r => r.id);
    
    const { data: updatedRecipients, error: updateCheckError } = await supabase
      .from('whatsapp_blast_recipients')
      .select('id, phone_number, status, retry_count, last_retry_at, next_retry_at')
      .in('id', recipientIds);

    if (updateCheckError) {
      console.error('❌ Error checking updated recipients:', updateCheckError);
      return;
    }

    console.log('\n📊 Updated Recipients Status:');
    updatedRecipients.forEach((recipient, index) => {
      console.log(`\n${index + 1}. Phone: ${recipient.phone_number}`);
      console.log(`   Status: ${recipient.status}`);
      console.log(`   Retry Count: ${recipient.retry_count || 0}`);
      console.log(`   Last Retry: ${recipient.last_retry_at || 'Never'}`);
      console.log(`   Next Retry: ${recipient.next_retry_at || 'Not scheduled'}`);
    });

    // 4. Test retry statistics
    console.log('\n4️⃣ Getting retry statistics...');
    
    const { data: retryStats, error: statsError } = await supabase.functions.invoke('retry-whatsapp-blast', {
      body: {
        action: 'get_stats'
      }
    });

    if (statsError) {
      console.error('❌ Error getting retry stats:', statsError);
      return;
    }

    console.log('📈 Retry Statistics:', retryStats);

    console.log('\n✅ RETRY MECHANISM TEST COMPLETED');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
  }
}

// Run the test
testRetryMechanism();