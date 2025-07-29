// Script untuk test generate-qr-ticket function dengan short code
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

const testGenerateQRTicket = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Generate QR Ticket Function with Short Code...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check existing registrations
    console.log('📋 Step 1: Checking existing registrations...');
    
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        participant_name,
        participant_email,
        phone_number,
        status,
        events (
          name,
          whatsapp_enabled
        )
      `)
      .eq('status', 'pending');

    if (regError) {
      console.log('❌ Error fetching registrations:', regError.message);
      return;
    }

    console.log(`✅ Found ${registrations.length} pending registrations`);
    
    if (registrations.length === 0) {
      console.log('❌ No pending registrations found to test with');
      console.log('Please create a registration first');
      return;
    }

    // Display registrations
    registrations.forEach((reg, index) => {
      console.log(`\n${index + 1}. Registration ID: ${reg.id}`);
      console.log(`   Name: ${reg.participant_name} (${reg.participant_email})`);
      console.log(`   Phone: ${reg.phone_number || 'No phone'}`);
      console.log(`   Event: ${reg.events?.name}`);
      console.log(`   WhatsApp Enabled: ${reg.events?.whatsapp_enabled}`);
    });

    // Step 2: Select a registration for testing
    const testRegistration = registrations[0];
    console.log(`\n🎯 Step 2: Testing with registration: ${testRegistration.id}`);
    console.log(`   Name: ${testRegistration.participant_name}`);
    console.log(`   Event: ${testRegistration.events?.name}`);

    // Step 3: Check if ticket already exists
    console.log('\n🔍 Step 3: Checking existing tickets...');
    
    const { data: existingTickets, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('registration_id', testRegistration.id);

    if (ticketError) {
      console.log('❌ Error checking tickets:', ticketError.message);
      return;
    }

    if (existingTickets.length > 0) {
      console.log(`⚠️  Registration already has ${existingTickets.length} ticket(s)`);
      existingTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. Ticket ID: ${ticket.id}`);
        console.log(`      QR Code: ${ticket.qr_code?.substring(0, 30)}...`);
        console.log(`      Short Code: ${ticket.short_code || 'NULL'}`);
        console.log(`      Status: ${ticket.status}`);
      });
      
      console.log('\n⚠️  Skipping ticket generation - registration already has tickets');
      console.log('   To test new ticket generation, please create a new registration');
      return;
    }

    // Step 4: Test generate-qr-ticket function
    console.log('\n🚀 Step 4: Testing generate-qr-ticket function...');
    
    try {
      const { data: qrData, error: qrError } = await supabase.functions.invoke('generate-qr-ticket', {
        body: {
          registration_id: testRegistration.id
        }
      });

      if (qrError) {
        console.log('❌ Generate QR ticket error:', qrError.message);
        console.log('📊 Error details:', qrError);
        return;
      }

      console.log('✅ Generate QR ticket executed successfully!');
      console.log('📊 Response data:', {
        success: qrData.success,
        ticket_id: qrData.ticket?.id,
        qr_image_url: qrData.qr_image_url ? 'Generated' : 'Not generated'
      });

      // Step 5: Verify ticket was created with short code
      console.log('\n🔍 Step 5: Verifying ticket creation...');
      
      const { data: newTickets, error: newTicketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('registration_id', testRegistration.id);

      if (newTicketError) {
        console.log('❌ Error fetching new tickets:', newTicketError.message);
        return;
      }

      if (newTickets.length === 0) {
        console.log('❌ No tickets found after generation');
        return;
      }

      const newTicket = newTickets[0];
      console.log('✅ New ticket created successfully!');
      console.log(`   Ticket ID: ${newTicket.id}`);
      console.log(`   QR Code: ${newTicket.qr_code?.substring(0, 30)}...`);
      console.log(`   Short Code: ${newTicket.short_code || 'NULL'}`);
      console.log(`   QR Image URL: ${newTicket.qr_image_url ? 'Generated' : 'Not generated'}`);
      console.log(`   Status: ${newTicket.status}`);

      // Step 6: Test WhatsApp if phone number exists
      if (testRegistration.phone_number && testRegistration.events?.whatsapp_enabled) {
        console.log('\n📱 Step 6: Testing WhatsApp notification...');
        
        // Wait a moment for ticket to be fully processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-ticket', {
            body: {
              registration_id: testRegistration.id,
              template_name: 'ticket_confirmation',
              language_code: 'id',
              include_header: true
            }
          });

          if (whatsappError) {
            console.log('❌ WhatsApp error:', whatsappError.message);
            console.log('📊 Error details:', whatsappError);
          } else {
            console.log('✅ WhatsApp notification sent successfully!');
            console.log('📊 WhatsApp response:', {
              success: whatsappData.success,
              recipient: whatsappData.recipient,
              template_used: whatsappData.template_used
            });
            
            // Check if short code was used
            console.log('\n🎯 Expected ticket code in WhatsApp:');
            console.log(`   Should be: ${newTicket.short_code}`);
            console.log(`   Not: ${newTicket.qr_code?.substring(0, 30)}...`);
          }
        } catch (whatsappInvokeError) {
          console.log('❌ WhatsApp invocation failed:', whatsappInvokeError.message);
        }
      } else {
        console.log('\n⚠️  Skipping WhatsApp test - no phone number or WhatsApp not enabled');
      }

      // Summary
      console.log('\n' + '='.repeat(60) + '\n');
      console.log('📋 GENERATE QR TICKET TEST SUMMARY:');
      console.log(`✅ Registration: ${testRegistration.participant_name}`);
      console.log(`✅ Event: ${testRegistration.events?.name}`);
      console.log(`✅ Ticket created: ${newTicket.id}`);
      console.log(`✅ Short code generated: ${newTicket.short_code ? 'YES ✅' : 'NO ❌'}`);
      console.log(`✅ QR image generated: ${newTicket.qr_image_url ? 'YES ✅' : 'NO ❌'}`);
      
      if (newTicket.short_code) {
        console.log('\n🎉 SUCCESS: Short code generation is working correctly!');
        console.log(`   Short code: ${newTicket.short_code}`);
        console.log('   WhatsApp template will use this short code.');
      } else {
        console.log('\n❌ ISSUE: Short code was not generated!');
        console.log('   Check the generate-qr-ticket function implementation.');
      }

    } catch (invokeError) {
      console.log('❌ Function invocation failed:', invokeError.message);
      console.log('📊 Invoke error details:', invokeError);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testGenerateQRTicket(); 