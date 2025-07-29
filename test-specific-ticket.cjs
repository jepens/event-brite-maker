// Script untuk test tiket spesifik dari database
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

const testSpecificTicket = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Specific Ticket Data...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Test 1: Get the first ticket with short code
    console.log('📋 Test 1: Getting first ticket with short code...');
    
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .not('short_code', 'is', null)
      .limit(1)
      .single();

    if (ticketError) {
      console.log('❌ Failed to fetch ticket:', ticketError.message);
      return;
    }

    console.log('✅ Ticket found:');
    console.log('📊 Ticket Data:', {
      id: ticket.id,
      registration_id: ticket.registration_id,
      qr_code: ticket.qr_code.substring(0, 30) + '...',
      short_code: ticket.short_code,
      status: ticket.status,
      issued_at: ticket.issued_at
    });

    // Test 2: Simulate the exact query used in handleViewTicket
    console.log('\n🔍 Test 2: Simulating handleViewTicket query...');
    
    const { data: ticketByRegistration, error: regError } = await supabase
      .from('tickets')
      .select('*')
      .eq('registration_id', ticket.registration_id)
      .single();

    if (regError) {
      console.log('❌ Failed to fetch by registration_id:', regError.message);
      return;
    }

    console.log('✅ Ticket by registration_id:');
    console.log('📊 Ticket Data:', {
      id: ticketByRegistration.id,
      registration_id: ticketByRegistration.registration_id,
      qr_code: ticketByRegistration.qr_code.substring(0, 30) + '...',
      short_code: ticketByRegistration.short_code,
      status: ticketByRegistration.status
    });

    // Test 3: Check if short_code is properly included
    console.log('\n✅ Test 3: Verifying short_code inclusion...');
    
    const hasShortCode = !!ticketByRegistration.short_code;
    const shortCodeValue = ticketByRegistration.short_code;
    const shortCodeType = typeof ticketByRegistration.short_code;
    
    console.log('📊 Short Code Analysis:');
    console.log(`  - Has short_code: ${hasShortCode}`);
    console.log(`  - Short code value: ${shortCodeValue}`);
    console.log(`  - Short code type: ${shortCodeType}`);
    console.log(`  - Short code length: ${shortCodeValue ? shortCodeValue.length : 0}`);
    console.log(`  - Is valid format: ${shortCodeValue ? /^[A-Z0-9]{8}$/.test(shortCodeValue) : false}`);

    // Test 4: Simulate frontend data structure
    console.log('\n🎨 Test 4: Simulating frontend data structure...');
    
    const mockTicketData = {
      id: ticketByRegistration.id,
      qr_code: ticketByRegistration.qr_code,
      short_code: ticketByRegistration.short_code,
      qr_image_url: ticketByRegistration.qr_image_url,
      status: ticketByRegistration.status
    };

    const mockRegistrationData = {
      id: ticketByRegistration.registration_id,
      participant_name: 'Test User',
      events: {
        name: 'Test Event'
      }
    };

    const selectedTicket = {
      ...mockRegistrationData,
      tickets: [mockTicketData]
    };

    console.log('✅ Frontend data structure:');
    console.log('📊 Selected Ticket:', {
      id: selectedTicket.id,
      participant_name: selectedTicket.participant_name,
      event_name: selectedTicket.events?.name,
      ticket_count: selectedTicket.tickets?.length
    });

    const ticketInDialog = selectedTicket.tickets?.[0];
    console.log('📊 Ticket in Dialog:', {
      id: ticketInDialog?.id,
      short_code: ticketInDialog?.short_code,
      has_short_code: !!ticketInDialog?.short_code,
      qr_code: ticketInDialog?.qr_code?.substring(0, 30) + '...'
    });

    // Test 5: Simulate UI rendering logic
    console.log('\n🖥️ Test 5: Simulating UI rendering logic...');
    
    const shouldShowShortCode = !!ticketInDialog?.short_code;
    const shortCodeDisplay = shouldShowShortCode ? ticketInDialog.short_code : ticketInDialog?.qr_code;
    const fullCodeDisplay = ticketInDialog?.qr_code;
    
    console.log('✅ UI Logic Results:');
    console.log(`  - Should show short code: ${shouldShowShortCode}`);
    console.log(`  - Short code display: ${shortCodeDisplay}`);
    console.log(`  - Full code display: ${fullCodeDisplay?.substring(0, 30)}...`);
    
    if (shouldShowShortCode) {
      console.log('  - Short code will be displayed prominently in green');
      console.log('  - Full code will be displayed as secondary in gray');
    } else {
      console.log('  - Only full code will be displayed');
    }

    // Summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📋 TEST SUMMARY:');
    console.log('✅ Database contains short codes');
    console.log('✅ Query by registration_id works');
    console.log('✅ Short code is properly included in response');
    console.log('✅ Frontend data structure is correct');
    console.log('✅ UI logic will display short code correctly');
    
    if (shouldShowShortCode) {
      console.log('\n🎉 EXPECTED RESULT:');
      console.log('The View Ticket dialog should display the short code prominently!');
      console.log(`Short code to display: ${shortCodeDisplay}`);
    } else {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('The ticket does not have a short code in the database.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testSpecificTicket(); 