// Script untuk check dan hapus registration yang tersisa
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

const checkAndDeleteRemaining = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🔍 Checking and Deleting Remaining Registration...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Get all remaining registrations
    console.log('📋 Step 1: Getting all remaining registrations...');
    
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        *,
        tickets (
          id,
          qr_code,
          short_code,
          qr_image_url,
          status
        )
      `);

    if (regError) {
      console.log('❌ Error fetching registrations:', regError.message);
      return;
    }

    console.log(`✅ Found ${registrations.length} registrations`);
    
    if (registrations.length === 0) {
      console.log('✅ No registrations found - database is clean!');
      return;
    }

    // Display all registrations
    registrations.forEach((reg, index) => {
      console.log(`\n${index + 1}. ${reg.participant_name} (${reg.participant_email})`);
      console.log(`   ID: ${reg.id}`);
      console.log(`   Status: ${reg.status}`);
      console.log(`   Event ID: ${reg.event_id}`);
      console.log(`   Registered: ${reg.registered_at}`);
      console.log(`   Tickets: ${reg.tickets?.length || 0}`);
      
      if (reg.tickets && reg.tickets.length > 0) {
        reg.tickets.forEach((ticket, ticketIndex) => {
          console.log(`     Ticket ${ticketIndex + 1}: ${ticket.id} (${ticket.status})`);
        });
      }
    });

    // Step 2: Delete all registrations and their tickets
    console.log('\n🗑️  Step 2: Deleting all registrations...');
    
    for (const registration of registrations) {
      console.log(`\nDeleting registration: ${registration.participant_name} (${registration.id})`);
      
      // Delete related tickets first
      if (registration.tickets && registration.tickets.length > 0) {
        console.log(`  Deleting ${registration.tickets.length} related tickets...`);
        
        for (const ticket of registration.tickets) {
          const { error: ticketDeleteError } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticket.id);

          if (ticketDeleteError) {
            console.log(`    ❌ Failed to delete ticket ${ticket.id}:`, ticketDeleteError.message);
          } else {
            console.log(`    ✅ Deleted ticket: ${ticket.id}`);
          }
        }
      } else {
        console.log('  No tickets to delete');
      }

      // Delete registration
      const { data: deleteResult, error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registration.id)
        .select();

      if (deleteError) {
        console.log(`  ❌ Failed to delete registration:`, deleteError.message);
      } else {
        console.log(`  ✅ Deleted registration: ${registration.participant_name}`);
        console.log(`     Deleted data:`, deleteResult[0]);
      }
    }

    // Step 3: Verify complete deletion
    console.log('\n🔍 Step 3: Verifying complete deletion...');
    
    const { data: remainingRegistrations, error: remainingRegError } = await supabase
      .from('registrations')
      .select('*');

    if (remainingRegError) {
      console.log('❌ Error checking remaining registrations:', remainingRegError.message);
    } else {
      console.log(`✅ Remaining registrations: ${remainingRegistrations.length}`);
      if (remainingRegistrations.length > 0) {
        console.log('❌ Some registrations still exist:');
        remainingRegistrations.forEach(reg => {
          console.log(`  - ${reg.participant_name} (${reg.id})`);
        });
      } else {
        console.log('✅ All registrations deleted successfully!');
      }
    }

    // Check remaining tickets
    const { data: remainingTickets, error: remainingTicketsError } = await supabase
      .from('tickets')
      .select('*');

    if (remainingTicketsError) {
      console.log('❌ Error checking remaining tickets:', remainingTicketsError.message);
    } else {
      console.log(`✅ Remaining tickets: ${remainingTickets.length}`);
      if (remainingTickets.length > 0) {
        console.log('❌ Some tickets still exist:');
        remainingTickets.forEach(ticket => {
          console.log(`  - Ticket ${ticket.id} (registration_id: ${ticket.registration_id})`);
        });
      } else {
        console.log('✅ All tickets deleted successfully!');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 COMPLETE DELETION SUMMARY:');
    
    const allRegistrationsDeleted = remainingRegistrations.length === 0;
    const allTicketsDeleted = remainingTickets.length === 0;
    
    console.log(`✅ All registrations deleted: ${allRegistrationsDeleted ? 'YES' : 'NO'}`);
    console.log(`✅ All tickets deleted: ${allTicketsDeleted ? 'YES' : 'NO'}`);
    
    if (allRegistrationsDeleted && allTicketsDeleted) {
      console.log('\n🎉 SUCCESS: Database is completely clean!');
      console.log('All registration and ticket data has been removed.');
    } else {
      console.log('\n⚠️  WARNING: Some data still exists in database.');
      if (!allRegistrationsDeleted) {
        console.log('- Some registrations were not deleted');
      }
      if (!allTicketsDeleted) {
        console.log('- Some tickets were not deleted');
      }
    }

  } catch (error) {
    console.error('❌ Check and delete failed with error:', error);
  }
};

// Run the check and delete
checkAndDeleteRemaining(); 