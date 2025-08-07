// Debug script for WhatsApp issues
// Run this script to test WhatsApp functionality

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWhatsApp() {
  console.log('🔍 Debugging WhatsApp functionality...\n');

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables:');
    console.log('   VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'NOT SET');
    console.log('');

    // 2. Test Supabase connection
    console.log('2. Testing Supabase connection:');
    const { data: testData, error: testError } = await supabase
      .from('events')
      .select('id, name, whatsapp_enabled')
      .limit(1);

    if (testError) {
      console.error('   ❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('   ✅ Supabase connection successful');
    console.log('');

    // 3. Check events with WhatsApp enabled
    console.log('3. Checking events with WhatsApp enabled:');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, whatsapp_enabled')
      .eq('whatsapp_enabled', true);

    if (eventsError) {
      console.error('   ❌ Failed to fetch events:', eventsError.message);
      return;
    }

    if (events.length === 0) {
      console.log('   ⚠️  No events with WhatsApp enabled found');
      console.log('   💡 Enable WhatsApp in event settings to test');
    } else {
      console.log(`   ✅ Found ${events.length} events with WhatsApp enabled:`);
      events.forEach(event => {
        console.log(`      - ${event.name} (ID: ${event.id})`);
      });
    }
    console.log('');

    // 4. Check registrations with phone numbers
    console.log('4. Checking registrations with phone numbers:');
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        participant_name,
        phone_number,
        status,
        events (
          id,
          name,
          whatsapp_enabled
        )
      `)
      .not('phone_number', 'is', null)
      .limit(5);

    if (regError) {
      console.error('   ❌ Failed to fetch registrations:', regError.message);
      return;
    }

    if (registrations.length === 0) {
      console.log('   ⚠️  No registrations with phone numbers found');
      console.log('   💡 Add phone numbers to registrations to test');
    } else {
      console.log(`   ✅ Found ${registrations.length} registrations with phone numbers:`);
      registrations.forEach(reg => {
        const whatsappEnabled = reg.events?.whatsapp_enabled ? '✅' : '❌';
        console.log(`      - ${reg.participant_name} (${reg.phone_number}) - WhatsApp: ${whatsappEnabled}`);
      });
    }
    console.log('');

    // 5. Test WhatsApp function (if we have valid data)
    if (events.length > 0 && registrations.length > 0) {
      const testRegistration = registrations.find(reg => 
        reg.events?.whatsapp_enabled && reg.status === 'approved'
      );

      if (testRegistration) {
        console.log('5. Testing WhatsApp function:');
        console.log(`   Using registration: ${testRegistration.participant_name} (${testRegistration.id})`);
        
        const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
          body: {
            registration_id: testRegistration.id,
          },
        });

        if (whatsappError) {
          console.error('   ❌ WhatsApp function error:', whatsappError.message);
        } else if (whatsappData && whatsappData.error) {
          console.error('   ❌ WhatsApp function returned error:', whatsappData.error);
        } else {
          console.log('   ✅ WhatsApp function executed successfully');
          console.log('   Response:', whatsappData);
        }
      } else {
        console.log('5. Testing WhatsApp function:');
        console.log('   ⚠️  No approved registrations with WhatsApp enabled found');
        console.log('   💡 Approve a registration with WhatsApp enabled to test');
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug function
debugWhatsApp();
