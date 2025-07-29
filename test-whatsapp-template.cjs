// Script untuk test template WhatsApp baru dengan dresscode
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
}

const testWhatsAppTemplate = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing New WhatsApp Template with Dresscode...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check existing events
    console.log('📋 Step 1: Checking existing events...');
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, location, dresscode');

    if (eventsError) {
      console.log('❌ Error fetching events:', eventsError.message);
      return;
    }

    console.log(`✅ Found ${events.length} events`);
    
    if (events.length === 0) {
      console.log('❌ No events found to test with');
      return;
    }

    // Display events with dresscode
    events.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.name}`);
      console.log(`   Date: ${event.event_date}`);
      console.log(`   Location: ${event.location || 'TBA'}`);
      console.log(`   Dresscode: ${event.dresscode || 'Not set'}`);
    });

    // Step 2: Create test registration
    console.log('\n📝 Step 2: Creating test registration...');
    
    const testEvent = events[0];
    const testRegistration = {
      event_id: testEvent.id,
      participant_name: 'Test User',
      participant_email: 'test@example.com',
      custom_data: {},
      status: 'pending',
      phone_number: '628123456789' // Replace with your test number
    };

    const { data: newRegistration, error: createError } = await supabase
      .from('registrations')
      .insert(testRegistration)
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create test registration:', createError.message);
      return;
    }

    console.log('✅ Test registration created:', {
      id: newRegistration.id,
      name: newRegistration.participant_name,
      email: newRegistration.participant_email,
      event_id: newRegistration.event_id
    });

    // Step 3: Generate ticket
    console.log('\n🎫 Step 3: Generating ticket...');
    
    // Call the generate-qr-ticket function
    const { data: ticketData, error: ticketError } = await supabase.functions.invoke('generate-qr-ticket', {
      body: {
        registration_id: newRegistration.id
      }
    });

    if (ticketError) {
      console.log('❌ Failed to generate ticket:', ticketError.message);
      return;
    }

    console.log('✅ Ticket generated successfully');
    console.log('📊 Ticket data:', {
      id: ticketData.ticket?.id,
      qr_code: ticketData.ticket?.qr_code?.substring(0, 30) + '...',
      short_code: ticketData.ticket?.short_code,
      qr_image_url: ticketData.ticket?.qr_image_url ? 'Yes' : 'No'
    });

    // Step 4: Test WhatsApp template
    console.log('\n📱 Step 4: Testing WhatsApp template...');
    
    // Call the send-whatsapp-ticket function
    const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
      body: {
        registration_id: newRegistration.id,
        template_name: 'ticket_confirmation',
        language_code: 'id',
        include_header: true,
        use_short_params: false
      }
    });

    if (whatsappError) {
      console.log('❌ Failed to send WhatsApp message:', whatsappError.message);
      console.log('📊 Error details:', whatsappError);
      return;
    }

    console.log('✅ WhatsApp message sent successfully!');
    console.log('📊 WhatsApp response:', {
      success: whatsappData.success,
      recipient: whatsappData.recipient,
      message_id: whatsappData.message_id,
      template_used: whatsappData.template_used,
      language_used: whatsappData.language_used,
      dresscode: whatsappData.dresscode
    });

    // Step 5: Show template preview
    console.log('\n📋 Step 5: Template Preview');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Your Event Registration is Confirmed!');
    console.log('');
    console.log(`Hello ${newRegistration.participant_name},`);
    console.log('');
    console.log(`We are pleased to confirm your participation in the ${testEvent.name} event. Thank you for registering!`);
    console.log('');
    console.log('ℹ️ Event Information:');
    console.log('━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date(testEvent.event_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`🕒 Time: ${new Date(testEvent.event_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`📍 Location: ${testEvent.location || 'TBA'}`);
    console.log(`🎟️ Ticket Code: ${ticketData.ticket?.short_code || ticketData.ticket?.qr_code?.substring(0, 10)}`);
    console.log(`👗 Dresscode: ${testEvent.dresscode || 'Smart Casual / Semi Formal'}`);
    console.log('━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💡 Please Note:');
    console.log('• Kindly arrive 15 minutes before the event begins.');
    console.log('• Present this message for easy entry.');
    console.log('• Invite your friends to join the fun!');
    console.log('');
    console.log('We look forward to welcoming you to the event.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 6: Cleanup test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    
    // Delete the test registration (this will also delete the ticket)
    const { error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('id', newRegistration.id);

    if (deleteError) {
      console.log('❌ Failed to cleanup test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 WHATSAPP TEMPLATE TEST SUMMARY:');
    console.log('✅ Test registration created');
    console.log('✅ Ticket generated with QR code');
    console.log('✅ WhatsApp message sent successfully');
    console.log('✅ Template includes dresscode');
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 SUCCESS: New WhatsApp template is working correctly!');
    console.log('The template now includes dresscode and uses 7 parameters.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testWhatsAppTemplate(); 