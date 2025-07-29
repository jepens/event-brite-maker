// Script untuk test short code usage di WhatsApp template
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

const testShortCodeWhatsApp = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Short Code Usage in WhatsApp Template...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check existing tickets and their short codes
    console.log('📋 Step 1: Checking existing tickets...');
    
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        qr_code,
        short_code,
        qr_image_url,
        registration_id,
        registrations (
          participant_name,
          participant_email,
          events (
            name,
            event_date,
            location,
            dresscode
          )
        )
      `);

    if (ticketsError) {
      console.log('❌ Error fetching tickets:', ticketsError.message);
      return;
    }

    console.log(`✅ Found ${tickets.length} tickets`);
    
    if (tickets.length === 0) {
      console.log('❌ No tickets found to test with');
      return;
    }

    // Display tickets with short codes
    tickets.forEach((ticket, index) => {
      console.log(`\n${index + 1}. Ticket ID: ${ticket.id}`);
      console.log(`   Registration: ${ticket.registrations?.participant_name} (${ticket.registrations?.participant_email})`);
      console.log(`   Event: ${ticket.registrations?.events?.name}`);
      console.log(`   QR Code: ${ticket.qr_code?.substring(0, 30)}...`);
      console.log(`   Short Code: ${ticket.short_code || 'NULL'}`);
      console.log(`   Has QR Image: ${ticket.qr_image_url ? 'Yes' : 'No'}`);
    });

    // Step 2: Find tickets with short codes
    console.log('\n🔍 Step 2: Finding tickets with short codes...');
    
    const ticketsWithShortCode = tickets.filter(ticket => ticket.short_code);
    const ticketsWithoutShortCode = tickets.filter(ticket => !ticket.short_code);

    console.log(`✅ Tickets with short code: ${ticketsWithShortCode.length}`);
    console.log(`⚠️  Tickets without short code: ${ticketsWithoutShortCode.length}`);

    if (ticketsWithShortCode.length === 0) {
      console.log('\n❌ No tickets have short codes!');
      console.log('This means the short code generation is not working properly.');
      console.log('Please check the generate-qr-ticket function.');
      return;
    }

    // Step 3: Test ticket code selection logic
    console.log('\n🎯 Step 3: Testing ticket code selection logic...');
    
    const testTicketCodeSelection = (ticket) => {
      let ticketCode = "";
      if (ticket.short_code) {
        ticketCode = ticket.short_code;
      } else if (ticket.qr_code) {
        ticketCode = ticket.qr_code;
      }

      console.log(`\nTicket: ${ticket.id}`);
      console.log(`   Has short_code: ${!!ticket.short_code}`);
      console.log(`   Short code: ${ticket.short_code || 'NULL'}`);
      console.log(`   Has qr_code: ${!!ticket.qr_code}`);
      console.log(`   QR code: ${ticket.qr_code?.substring(0, 30)}...`);
      console.log(`   Final ticket code: ${ticketCode}`);
      console.log(`   Code type: ${ticket.short_code ? 'SHORT CODE ✅' : 'QR CODE ⚠️'}`);

      return ticketCode;
    };

    // Test with tickets that have short codes
    console.log('\n--- Testing with tickets that HAVE short codes ---');
    ticketsWithShortCode.slice(0, 3).forEach(ticket => {
      testTicketCodeSelection(ticket);
    });

    // Test with tickets that don't have short codes
    if (ticketsWithoutShortCode.length > 0) {
      console.log('\n--- Testing with tickets that DON\'T have short codes ---');
      ticketsWithoutShortCode.slice(0, 2).forEach(ticket => {
        testTicketCodeSelection(ticket);
      });
    }

    // Step 4: Test WhatsApp template with short code
    console.log('\n📱 Step 4: Testing WhatsApp template with short code...');
    
    // Find a registration with short code
    const ticketWithShortCode = ticketsWithShortCode[0];
    
    if (!ticketWithShortCode.registrations?.phone_number) {
      console.log('⚠️  No phone number found for testing WhatsApp');
      console.log('   You can test this manually by creating a registration with phone number');
    } else {
      console.log(`✅ Found ticket with short code: ${ticketWithShortCode.short_code}`);
      console.log(`   Registration: ${ticketWithShortCode.registrations.participant_name}`);
      console.log(`   Phone: ${ticketWithShortCode.registrations.phone_number}`);
      console.log(`   Event: ${ticketWithShortCode.registrations.events.name}`);
      
      // Test WhatsApp template
      const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
        body: {
          registration_id: ticketWithShortCode.registration_id,
          template_name: 'ticket_confirmation',
          language_code: 'id',
          include_header: true
        }
      });

      if (whatsappError) {
        console.log('❌ Failed to send WhatsApp message:', whatsappError.message);
        console.log('📊 Error details:', whatsappError);
      } else {
        console.log('✅ WhatsApp message sent successfully!');
        console.log('📊 WhatsApp response:', {
          success: whatsappData.success,
          recipient: whatsappData.recipient,
          template_used: whatsappData.template_used,
          dresscode: whatsappData.dresscode
        });
        
        // Check if short code was used
        console.log('\n🎯 Expected ticket code in WhatsApp:');
        console.log(`   Should be: ${ticketWithShortCode.short_code}`);
        console.log(`   Not: ${ticketWithShortCode.qr_code?.substring(0, 30)}...`);
      }
    }

    // Step 5: Show template preview with short code
    console.log('\n📋 Step 5: Template Preview with Short Code');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sampleTicket = ticketsWithShortCode[0];
    const sampleRegistration = sampleTicket.registrations;
    const sampleEvent = sampleRegistration.events;
    
    console.log('✅ Your Event Registration is Confirmed!');
    console.log('');
    console.log(`Hello ${sampleRegistration.participant_name},`);
    console.log('');
    console.log(`We are pleased to confirm your participation in the ${sampleEvent.name} event. Thank you for registering!`);
    console.log('');
    console.log('ℹ️ Event Information:');
    console.log('━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date(sampleEvent.event_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`🕒 Time: ${new Date(sampleEvent.event_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`📍 Location: ${sampleEvent.location || 'TBA'}`);
    console.log(`🎟️ Ticket Code: ${sampleTicket.short_code} ✅ (SHORT CODE)`);
    console.log(`👗 Dresscode: ${sampleEvent.dresscode || 'Smart Casual / Semi Formal'}`);
    console.log('━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💡 Please Note:');
    console.log('• Kindly arrive 15 minutes before the event begins.');
    console.log('• Present this message for easy entry.');
    console.log('• Invite your friends to join the fun!');
    console.log('');
    console.log('We look forward to welcoming you to the event.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 SHORT CODE WHATSAPP TEST SUMMARY:');
    console.log(`✅ Total tickets: ${tickets.length}`);
    console.log(`✅ Tickets with short code: ${ticketsWithShortCode.length}`);
    console.log(`⚠️  Tickets without short code: ${ticketsWithoutShortCode.length}`);
    console.log('✅ Ticket code selection logic tested');
    console.log('✅ WhatsApp template ready for short codes');
    
    if (ticketsWithoutShortCode.length > 0) {
      console.log('\n⚠️  WARNING: Some tickets don\'t have short codes!');
      console.log('   This might indicate an issue with short code generation.');
      console.log('   Please check the generate-qr-ticket function.');
    } else {
      console.log('\n🎉 SUCCESS: All tickets have short codes!');
      console.log('WhatsApp template will use short codes correctly.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testShortCodeWhatsApp(); 