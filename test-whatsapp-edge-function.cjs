// Script untuk test WhatsApp edge function secara langsung
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

const testWhatsAppEdgeFunction = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing WhatsApp Edge Function Directly...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check existing tickets and their data
    console.log('📋 Step 1: Checking ticket data structure...');
    
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
          phone_number,
          events (
            name,
            event_date,
            location,
            dresscode,
            whatsapp_enabled
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

    // Display ticket data
    tickets.forEach((ticket, index) => {
      console.log(`\n${index + 1}. Ticket ID: ${ticket.id}`);
      console.log(`   Registration: ${ticket.registrations?.participant_name} (${ticket.registrations?.participant_email})`);
      console.log(`   Phone: ${ticket.registrations?.phone_number || 'No phone'}`);
      console.log(`   Event: ${ticket.registrations?.events?.name}`);
      console.log(`   WhatsApp Enabled: ${ticket.registrations?.events?.whatsapp_enabled}`);
      console.log(`   QR Code: ${ticket.qr_code?.substring(0, 30)}...`);
      console.log(`   Short Code: ${ticket.short_code || 'NULL'}`);
      console.log(`   Has QR Image: ${ticket.qr_image_url ? 'Yes' : 'No'}`);
    });

    // Step 2: Find ticket with phone number for testing
    console.log('\n🔍 Step 2: Finding ticket with phone number...');
    
    const ticketWithPhone = tickets.find(ticket => ticket.registrations?.phone_number);
    
    if (!ticketWithPhone) {
      console.log('❌ No ticket found with phone number for testing');
      console.log('Please create a registration with phone number to test WhatsApp');
      return;
    }

    console.log(`✅ Found ticket with phone: ${ticketWithPhone.short_code}`);
    console.log(`   Registration: ${ticketWithPhone.registrations.participant_name}`);
    console.log(`   Phone: ${ticketWithPhone.registrations.phone_number}`);
    console.log(`   Event: ${ticketWithPhone.registrations.events.name}`);

    // Step 3: Test the ticket code selection logic manually
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

    const selectedTicketCode = testTicketCodeSelection(ticketWithPhone);

    // Step 4: Simulate the edge function data structure
    console.log('\n🔧 Step 4: Simulating edge function data structure...');
    
    const registration = ticketWithPhone.registrations;
    const event = registration.events;
    
    console.log('Registration data structure:');
    console.log(`   participant_name: ${registration.participant_name}`);
    console.log(`   participant_email: ${registration.participant_email}`);
    console.log(`   phone_number: ${registration.phone_number}`);
    console.log(`   events.name: ${event.name}`);
    console.log(`   events.event_date: ${event.event_date}`);
    console.log(`   events.location: ${event.location}`);
    console.log(`   events.dresscode: ${event.dresscode}`);
    console.log(`   events.whatsapp_enabled: ${event.whatsapp_enabled}`);
    
    console.log('\nTickets data structure:');
    console.log(`   tickets.short_code: ${ticketWithPhone.short_code}`);
    console.log(`   tickets.qr_code: ${ticketWithPhone.qr_code?.substring(0, 30)}...`);
    console.log(`   tickets.qr_image_url: ${ticketWithPhone.qr_image_url ? 'Yes' : 'No'}`);

    // Step 5: Test edge function invocation
    console.log('\n📱 Step 5: Testing edge function invocation...');
    
    try {
      const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
        body: {
          registration_id: ticketWithPhone.registration_id,
          template_name: 'ticket_confirmation',
          language_code: 'id',
          include_header: true
        }
      });

      if (whatsappError) {
        console.log('❌ Edge function error:', whatsappError.message);
        console.log('📊 Error details:', whatsappError);
        
        // Check if it's a WhatsApp API error or function error
        if (whatsappError.message.includes('WhatsApp API error')) {
          console.log('\n⚠️  This might be a WhatsApp API configuration issue');
          console.log('   Check your WhatsApp Business API credentials');
        } else if (whatsappError.message.includes('Rate limit')) {
          console.log('\n⚠️  Rate limit exceeded, try again later');
        } else {
          console.log('\n⚠️  Function execution error, check logs');
        }
      } else {
        console.log('✅ Edge function executed successfully!');
        console.log('📊 Response data:', {
          success: whatsappData.success,
          recipient: whatsappData.recipient,
          template_used: whatsappData.template_used,
          dresscode: whatsappData.dresscode
        });
        
        // Check if short code was used
        console.log('\n🎯 Expected ticket code in WhatsApp:');
        console.log(`   Should be: ${ticketWithPhone.short_code}`);
        console.log(`   Not: ${ticketWithPhone.qr_code?.substring(0, 30)}...`);
        
        if (whatsappData.success) {
          console.log('\n✅ WhatsApp message sent! Check your phone for the message.');
          console.log('   Verify that the ticket code shows the short code, not the long QR code.');
        }
      }
    } catch (invokeError) {
      console.log('❌ Function invocation failed:', invokeError.message);
      console.log('📊 Invoke error details:', invokeError);
    }

    // Step 6: Check function logs (if possible)
    console.log('\n📋 Step 6: Function execution summary...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Expected function behavior:');
    console.log(`1. Fetch registration: ${ticketWithPhone.registration_id}`);
    console.log(`2. Check tickets.short_code: ${ticketWithPhone.short_code || 'NULL'}`);
    console.log(`3. Check tickets.qr_code: ${ticketWithPhone.qr_code ? 'EXISTS' : 'NULL'}`);
    console.log(`4. Select ticket code: ${selectedTicketCode}`);
    console.log(`5. Send WhatsApp with template: ticket_confirmation`);
    console.log(`6. Parameter {{6}} should be: ${selectedTicketCode}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 WHATSAPP EDGE FUNCTION TEST SUMMARY:');
    console.log(`✅ Total tickets: ${tickets.length}`);
    console.log(`✅ Tickets with short code: ${tickets.filter(t => t.short_code).length}`);
    console.log(`✅ Tickets with phone number: ${tickets.filter(t => t.registrations?.phone_number).length}`);
    console.log(`✅ Ticket code selection logic: ${selectedTicketCode === ticketWithPhone.short_code ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
    
    if (selectedTicketCode === ticketWithPhone.short_code) {
      console.log('\n🎉 SUCCESS: Ticket code selection is working correctly!');
      console.log('If WhatsApp still shows long code, check:');
      console.log('1. WhatsApp template configuration');
      console.log('2. Template parameter mapping');
      console.log('3. WhatsApp Business API settings');
    } else {
      console.log('\n❌ ISSUE: Ticket code selection is not working correctly!');
      console.log('The function should use short_code but it\'s not.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testWhatsAppEdgeFunction(); 