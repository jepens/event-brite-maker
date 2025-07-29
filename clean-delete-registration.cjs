// Script untuk menghapus registration secara lengkap dan bersih
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

const cleanDeleteRegistration = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧹 Clean Delete Registration - Complete Data Removal...\n');

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
        event_id,
        tickets (
          id,
          qr_code,
          short_code,
          qr_image_url,
          status
        )
      `);

    if (regError) {
      console.log('❌ Failed to fetch registrations:', regError.message);
      return;
    }

    console.log(`✅ Found ${currentRegistrations.length} registrations`);
    
    if (currentRegistrations.length === 0) {
      console.log('❌ No registrations found to delete');
      return;
    }

    // Display current registrations with their related data
    currentRegistrations.forEach((reg, index) => {
      console.log(`\n${index + 1}. ${reg.participant_name} (${reg.participant_email})`);
      console.log(`   Status: ${reg.status}`);
      console.log(`   Registration ID: ${reg.id}`);
      console.log(`   Event ID: ${reg.event_id}`);
      console.log(`   Related Tickets: ${reg.tickets?.length || 0}`);
      
      if (reg.tickets && reg.tickets.length > 0) {
        reg.tickets.forEach((ticket, ticketIndex) => {
          console.log(`     Ticket ${ticketIndex + 1}:`);
          console.log(`       - ID: ${ticket.id}`);
          console.log(`       - QR Code: ${ticket.qr_code.substring(0, 30)}...`);
          console.log(`       - Short Code: ${ticket.short_code || 'N/A'}`);
          console.log(`       - Status: ${ticket.status}`);
          console.log(`       - QR Image URL: ${ticket.qr_image_url ? 'Yes' : 'No'}`);
        });
      }
    });

    // Step 2: Select registration to delete
    const registrationToDelete = currentRegistrations[0];
    console.log(`\n🗑️  Step 2: Preparing to delete registration: ${registrationToDelete.participant_name}`);
    console.log('📊 Registration to delete:', {
      id: registrationToDelete.id,
      participant_name: registrationToDelete.participant_name,
      participant_email: registrationToDelete.participant_email,
      ticket_count: registrationToDelete.tickets?.length || 0
    });

    // Step 3: Delete related tickets first
    console.log('\n🎫 Step 3: Deleting related tickets...');
    
    if (registrationToDelete.tickets && registrationToDelete.tickets.length > 0) {
      for (const ticket of registrationToDelete.tickets) {
        console.log(`Deleting ticket: ${ticket.id}`);
        
        // Delete ticket
        const { error: ticketDeleteError } = await supabase
          .from('tickets')
          .delete()
          .eq('id', ticket.id);

        if (ticketDeleteError) {
          console.log(`❌ Failed to delete ticket ${ticket.id}:`, ticketDeleteError.message);
        } else {
          console.log(`✅ Successfully deleted ticket: ${ticket.id}`);
        }
      }
    } else {
      console.log('ℹ️  No tickets found for this registration');
    }

    // Step 4: Delete registration
    console.log('\n📝 Step 4: Deleting registration...');
    
    const { data: deleteResult, error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationToDelete.id)
      .select();

    if (deleteError) {
      console.log('❌ Failed to delete registration:', deleteError.message);
      console.log('📊 Error details:', deleteError);
    } else {
      console.log('✅ Registration deleted successfully');
      console.log('📊 Deleted registration data:', deleteResult[0]);
    }

    // Step 5: Verify complete deletion
    console.log('\n🔍 Step 5: Verifying complete deletion...');
    
    // Check if registration still exists
    const { data: checkRegistration, error: checkRegError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationToDelete.id)
      .single();

    if (checkRegError && checkRegError.code === 'PGRST116') {
      console.log('✅ Registration successfully deleted (not found in database)');
    } else if (checkRegError) {
      console.log('❌ Error checking registration:', checkRegError.message);
    } else {
      console.log('❌ Registration still exists after deletion!');
      console.log('📊 Remaining registration:', checkRegistration);
    }

    // Check if related tickets still exist
    const { data: remainingTickets, error: remainingTicketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('registration_id', registrationToDelete.id);

    if (remainingTicketsError) {
      console.log('❌ Error checking remaining tickets:', remainingTicketsError.message);
    } else {
      console.log(`📊 Remaining tickets: ${remainingTickets.length}`);
      if (remainingTickets.length > 0) {
        console.log('❌ Tickets still exist after deletion!');
        remainingTickets.forEach(ticket => {
          console.log(`  - Ticket: ${ticket.id} (${ticket.status})`);
        });
      } else {
        console.log('✅ All related tickets were deleted');
      }
    }

    // Step 6: Check remaining registrations
    console.log('\n📊 Step 6: Checking remaining registrations...');
    
    const { data: remainingRegistrations, error: remainingError } = await supabase
      .from('registrations')
      .select('id, participant_name, participant_email, status');

    if (remainingError) {
      console.log('❌ Error checking remaining registrations:', remainingError.message);
    } else {
      console.log(`✅ Remaining registrations: ${remainingRegistrations.length}`);
      remainingRegistrations.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email}) - ${reg.status}`);
      });
    }

    // Step 7: Clean up any orphaned data
    console.log('\n🧹 Step 7: Cleaning up orphaned data...');
    
    // Check for any tickets without valid registration_id
    const { data: orphanedTickets, error: orphanedError } = await supabase
      .from('tickets')
      .select('id, registration_id')
      .is('registration_id', null);

    if (orphanedError) {
      console.log('❌ Error checking orphaned tickets:', orphanedError.message);
    } else {
      console.log(`📊 Orphaned tickets found: ${orphanedTickets.length}`);
      if (orphanedTickets.length > 0) {
        console.log('🧹 Cleaning up orphaned tickets...');
        for (const ticket of orphanedTickets) {
          const { error: orphanDeleteError } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticket.id);
          
          if (orphanDeleteError) {
            console.log(`❌ Failed to delete orphaned ticket ${ticket.id}:`, orphanDeleteError.message);
          } else {
            console.log(`✅ Deleted orphaned ticket: ${ticket.id}`);
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 CLEAN DELETE REGISTRATION SUMMARY:');
    
    const registrationDeleted = checkRegError && checkRegError.code === 'PGRST116';
    const ticketsDeleted = remainingTickets.length === 0;
    const expectedRemaining = currentRegistrations.length - 1;
    const actualRemaining = remainingRegistrations.length;
    
    console.log(`✅ Registration deletion: ${registrationDeleted ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Related tickets deletion: ${ticketsDeleted ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Expected remaining: ${expectedRemaining}, Actual: ${actualRemaining}`);
    
    if (registrationDeleted && ticketsDeleted && actualRemaining === expectedRemaining) {
      console.log('\n🎉 SUCCESS: Complete clean deletion achieved!');
      console.log('All registration data, tickets, QR codes, and short codes have been removed.');
    } else {
      console.log('\n🚨 ISSUE DETECTED:');
      if (!registrationDeleted) console.log('- Registration still exists');
      if (!ticketsDeleted) console.log('- Related tickets still exist');
      if (actualRemaining !== expectedRemaining) console.log('- Registration count mismatch');
    }

  } catch (error) {
    console.error('❌ Clean delete failed with error:', error);
  }
};

// Run the clean delete
cleanDeleteRegistration(); 