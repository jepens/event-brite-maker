// Script untuk memverifikasi database bersih setelah deletion
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

const verifyCleanDatabase = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🔍 Verifying Clean Database...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check registrations table
    console.log('📋 Step 1: Checking registrations table...');
    
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('*');

    if (regError) {
      console.log('❌ Error checking registrations:', regError.message);
      return;
    }

    console.log(`✅ Registrations count: ${registrations.length}`);
    if (registrations.length > 0) {
      console.log('📊 Current registrations:');
      registrations.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email}) - ${reg.status}`);
      });
    } else {
      console.log('✅ Registrations table is clean - no data found');
    }

    // Step 2: Check tickets table
    console.log('\n🎫 Step 2: Checking tickets table...');
    
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*');

    if (ticketsError) {
      console.log('❌ Error checking tickets:', ticketsError.message);
      return;
    }

    console.log(`✅ Tickets count: ${tickets.length}`);
    if (tickets.length > 0) {
      console.log('📊 Current tickets:');
      tickets.forEach((ticket, index) => {
        console.log(`  ${index + 1}. Ticket ID: ${ticket.id}`);
        console.log(`     Registration ID: ${ticket.registration_id}`);
        console.log(`     QR Code: ${ticket.qr_code.substring(0, 30)}...`);
        console.log(`     Short Code: ${ticket.short_code || 'N/A'}`);
        console.log(`     Status: ${ticket.status}`);
      });
    } else {
      console.log('✅ Tickets table is clean - no data found');
    }

    // Step 3: Check for orphaned tickets
    console.log('\n🔍 Step 3: Checking for orphaned tickets...');
    
    if (tickets.length > 0) {
      const orphanedTickets = tickets.filter(ticket => {
        // Check if registration_id exists in registrations table
        return !registrations.some(reg => reg.id === ticket.registration_id);
      });

      console.log(`📊 Orphaned tickets found: ${orphanedTickets.length}`);
      if (orphanedTickets.length > 0) {
        console.log('❌ Orphaned tickets detected:');
        orphanedTickets.forEach((ticket, index) => {
          console.log(`  ${index + 1}. Ticket ID: ${ticket.id}`);
          console.log(`     Registration ID: ${ticket.registration_id} (NOT FOUND)`);
          console.log(`     Status: ${ticket.status}`);
        });
      } else {
        console.log('✅ No orphaned tickets found');
      }
    } else {
      console.log('✅ No tickets to check for orphaned data');
    }

    // Step 4: Check events table
    console.log('\n📅 Step 4: Checking events table...');
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');

    if (eventsError) {
      console.log('❌ Error checking events:', eventsError.message);
      return;
    }

    console.log(`✅ Events count: ${events.length}`);
    if (events.length > 0) {
      console.log('📊 Current events:');
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.name} (${event.id})`);
      });
    } else {
      console.log('✅ Events table is clean - no data found');
    }

    // Step 5: Check for orphaned registrations
    console.log('\n🔍 Step 5: Checking for orphaned registrations...');
    
    if (registrations.length > 0) {
      const orphanedRegistrations = registrations.filter(registration => {
        // Check if event_id exists in events table
        return !events.some(event => event.id === registration.event_id);
      });

      console.log(`📊 Orphaned registrations found: ${orphanedRegistrations.length}`);
      if (orphanedRegistrations.length > 0) {
        console.log('❌ Orphaned registrations detected:');
        orphanedRegistrations.forEach((registration, index) => {
          console.log(`  ${index + 1}. ${registration.participant_name} (${registration.participant_email})`);
          console.log(`     Event ID: ${registration.event_id} (NOT FOUND)`);
        });
      } else {
        console.log('✅ No orphaned registrations found');
      }
    } else {
      console.log('✅ No registrations to check for orphaned data');
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 DATABASE CLEANLINESS SUMMARY:');
    
    const hasRegistrations = registrations.length > 0;
    const hasTickets = tickets.length > 0;
    const hasEvents = events.length > 0;
    const hasOrphanedTickets = tickets.length > 0 && tickets.some(ticket => 
      !registrations.some(reg => reg.id === ticket.registration_id)
    );
    const hasOrphanedRegistrations = registrations.length > 0 && registrations.some(registration => 
      !events.some(event => event.id === registration.event_id)
    );
    
    console.log(`✅ Registrations: ${registrations.length} records`);
    console.log(`✅ Tickets: ${tickets.length} records`);
    console.log(`✅ Events: ${events.length} records`);
    console.log(`✅ Orphaned tickets: ${hasOrphanedTickets ? 'YES' : 'NO'}`);
    console.log(`✅ Orphaned registrations: ${hasOrphanedRegistrations ? 'YES' : 'NO'}`);
    
    if (!hasRegistrations && !hasTickets) {
      console.log('\n🎉 PERFECT: Database is completely clean!');
      console.log('All registration and ticket data has been successfully removed.');
    } else if (hasOrphanedTickets || hasOrphanedRegistrations) {
      console.log('\n⚠️  WARNING: Orphaned data detected!');
      console.log('Some records have missing foreign key references.');
    } else {
      console.log('\n✅ GOOD: Database is in a consistent state.');
      console.log('All foreign key relationships are intact.');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (hasOrphanedTickets) {
      console.log('- Clean up orphaned tickets to maintain data integrity');
    }
    if (hasOrphanedRegistrations) {
      console.log('- Clean up orphaned registrations to maintain data integrity');
    }
    if (!hasRegistrations && !hasTickets) {
      console.log('- Database is ready for fresh data');
    }

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  }
};

// Run the verification
verifyCleanDatabase(); 