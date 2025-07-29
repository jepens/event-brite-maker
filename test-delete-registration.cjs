// Script untuk test dan debug fungsi delete registration
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

const testDeleteRegistration = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Delete Registration Functionality...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check current registrations
    console.log('📋 Step 1: Checking current registrations...');
    
    const { data: currentRegistrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        participant_name,
        participant_email,
        status,
        registered_at,
        tickets (
          id,
          qr_code,
          short_code,
          status
        )
      `);

    if (regError) {
      console.log('❌ Failed to fetch registrations:', regError.message);
      return;
    }

    console.log(`✅ Found ${currentRegistrations.length} registrations`);
    
    if (currentRegistrations.length === 0) {
      console.log('❌ No registrations found to test with');
      return;
    }

    // Display current registrations
    currentRegistrations.forEach((reg, index) => {
      console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email})`);
      console.log(`     Status: ${reg.status}, Tickets: ${reg.tickets?.length || 0}`);
      if (reg.tickets && reg.tickets.length > 0) {
        reg.tickets.forEach(ticket => {
          console.log(`       - Ticket: ${ticket.id} (${ticket.status})`);
        });
      }
    });

    // Step 2: Select a registration to delete (use the first one)
    const registrationToDelete = currentRegistrations[0];
    console.log(`\n🗑️  Step 2: Testing delete for registration: ${registrationToDelete.participant_name}`);
    console.log('📊 Registration to delete:', {
      id: registrationToDelete.id,
      participant_name: registrationToDelete.participant_name,
      participant_email: registrationToDelete.participant_email,
      ticket_count: registrationToDelete.tickets?.length || 0
    });

    // Step 3: Check related tickets before deletion
    console.log('\n🎫 Step 3: Checking related tickets before deletion...');
    
    const { data: relatedTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('registration_id', registrationToDelete.id);

    if (ticketsError) {
      console.log('❌ Failed to fetch related tickets:', ticketsError.message);
    } else {
      console.log(`✅ Found ${relatedTickets.length} related tickets`);
      relatedTickets.forEach(ticket => {
        console.log(`  - Ticket: ${ticket.id} (${ticket.status})`);
      });
    }

    // Step 4: Test the current delete function
    console.log('\n🔧 Step 4: Testing current delete function...');
    
    try {
      const { data: deleteResult, error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationToDelete.id)
        .select();

      if (deleteError) {
        console.log('❌ Delete failed:', deleteError.message);
        console.log('📊 Error details:', deleteError);
      } else {
        console.log('✅ Delete operation completed');
        console.log('📊 Delete result:', deleteResult);
      }
    } catch (deleteException) {
      console.log('❌ Delete exception:', deleteException.message);
    }

    // Step 5: Check if registration was actually deleted
    console.log('\n🔍 Step 5: Verifying deletion...');
    
    const { data: checkRegistration, error: checkRegError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationToDelete.id)
      .single();

    if (checkRegError && checkRegError.code === 'PGRST116') {
      console.log('✅ Registration successfully deleted (not found)');
    } else if (checkRegError) {
      console.log('❌ Error checking registration:', checkRegError.message);
    } else {
      console.log('❌ Registration still exists after deletion!');
      console.log('📊 Remaining registration:', checkRegistration);
    }

    // Step 6: Check if related tickets were deleted
    console.log('\n🎫 Step 6: Checking if related tickets were deleted...');
    
    const { data: remainingTickets, error: remainingTicketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('registration_id', registrationToDelete.id);

    if (remainingTicketsError) {
      console.log('❌ Error checking remaining tickets:', remainingTicketsError.message);
    } else {
      console.log(`📊 Remaining tickets: ${remainingTickets.length}`);
      if (remainingTickets.length > 0) {
        console.log('❌ Tickets still exist after registration deletion!');
        remainingTickets.forEach(ticket => {
          console.log(`  - Ticket: ${ticket.id} (${ticket.status})`);
        });
      } else {
        console.log('✅ All related tickets were deleted');
      }
    }

    // Step 7: Check database constraints
    console.log('\n🗄️ Step 7: Checking database constraints...');
    
    try {
      // Try to get table information
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'registrations' });

      if (tableError) {
        console.log('❌ Could not get table info:', tableError.message);
      } else {
        console.log('✅ Table info retrieved');
        console.log('📊 Table info:', tableInfo);
      }
    } catch (constraintError) {
      console.log('❌ Constraint check failed:', constraintError.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📋 DELETE REGISTRATION TEST SUMMARY:');
    
    const registrationDeleted = checkRegError && checkRegError.code === 'PGRST116';
    const ticketsDeleted = remainingTickets.length === 0;
    
    console.log(`✅ Registration deletion: ${registrationDeleted ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Related tickets deletion: ${ticketsDeleted ? 'SUCCESS' : 'FAILED'}`);
    
    if (!registrationDeleted) {
      console.log('\n🚨 ISSUE DETECTED:');
      console.log('Registration deletion is not working properly.');
      console.log('Possible causes:');
      console.log('1. Foreign key constraints preventing deletion');
      console.log('2. Row Level Security (RLS) policies blocking deletion');
      console.log('3. Insufficient permissions');
      console.log('4. Database triggers interfering with deletion');
    }
    
    if (!ticketsDeleted) {
      console.log('\n🚨 ISSUE DETECTED:');
      console.log('Related tickets are not being deleted automatically.');
      console.log('This suggests missing CASCADE DELETE constraint.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testDeleteRegistration(); 