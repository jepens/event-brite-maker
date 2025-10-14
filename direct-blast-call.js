import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function callWhatsAppBlast(campaignId) {
  console.log('🚀 === DIRECT WHATSAPP BLAST CALL ===\n');
  console.log(`📱 Campaign ID: ${campaignId}\n`);

  try {
    console.log('📞 Calling WhatsApp blast Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('send-whatsapp-blast', {
      body: { 
        campaign_id: campaignId,
        action: 'start'
      }
    });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ Edge Function Response:', data);
    console.log('\n🎉 WhatsApp blast function called successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Please provide campaign ID');
  console.log('Usage: node direct-blast-call.js <campaign-id>');
  process.exit(1);
}

callWhatsAppBlast(campaignId).catch(console.error);