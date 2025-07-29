// Script untuk test frontend delete function
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

const testFrontendDelete = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🧪 Testing Frontend Delete Function...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Create a test registration
    console.log('📝 Step 1: Creating test registration...');
    
    const testRegistration = {
      event_id: '52f0450a-d27a-493c-aa92-81072f21078b', // WMII NOBAR
      participant_name: 'Test User',
      participant_email: 'test@example.com',
      custom_data: {},
      status: 'pending',
      phone_number: '628123456789'
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
      status: newRegistration.status
    });

    // Step 2: Test the enhanced deleteRegistration function
    console.log('\n🗑️  Step 2: Testing enhanced deleteRegistration function...');
    
    // Simulate the exact function from client.ts
    const deleteRegistration = async (id) => {
      try {
        console.log('  Deleting related tickets first...');
        // First, delete all related tickets
        const { error: ticketsError } = await supabase
          .from('tickets')
          .delete()
          .eq('registration_id', id);

        if (ticketsError) {
          console.error('    Error deleting related tickets:', ticketsError);
          throw ticketsError;
        }

        console.log('  Related tickets deleted successfully');

        console.log('  Deleting registration...');
        // Then, delete the registration
        const { data, error } = await supabase
          .from('registrations')
          .delete()
          .eq('id', id)
          .select();

        return { data, error };
      } catch (error) {
        console.error('  Error in deleteRegistration:', error);
        return { data: null, error };
      }
    };

    // Test the delete function
    const { data: deleteResult, error: deleteError } = await deleteRegistration(newRegistration.id);

    if (deleteError) {
      console.log('❌ Delete failed:', deleteError.message);
      return;
    }

    console.log('✅ Delete operation completed');
    console.log('📊 Deleted registration:', deleteResult[0]);

    // Step 3: Verify deletion
    console.log('\n🔍 Step 3: Verifying deletion...');
    
    const { data: checkRegistration, error: checkRegError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', newRegistration.id)
      .single();

    if (checkRegError && checkRegError.code === 'PGRST116') {
      console.log('✅ Registration successfully deleted (not found in database)');
    } else if (checkRegError) {
      console.log('❌ Error checking registration:', checkRegError.message);
    } else {
      console.log('❌ Registration still exists after deletion!');
      console.log('📊 Remaining registration:', checkRegistration);
    }

    // Step 4: Check for any remaining registrations
    console.log('\n📊 Step 4: Checking remaining registrations...');
    
    const { data: remainingRegistrations, error: remainingError } = await supabase
      .from('registrations')
      .select('id, participant_name, participant_email, status');

    if (remainingError) {
      console.log('❌ Error checking remaining registrations:', remainingError.message);
    } else {
      console.log(`✅ Remaining registrations: ${remainingRegistrations.length}`);
      if (remainingRegistrations.length > 0) {
        console.log('📊 Current registrations:');
        remainingRegistrations.forEach((reg, index) => {
          console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email}) - ${reg.status}`);
        });
      } else {
        console.log('✅ No registrations remaining');
      }
    }

    // Step 5: Test with multiple registrations
    console.log('\n🔄 Step 5: Testing with multiple registrations...');
    
    // Create multiple test registrations
    const testRegistrations = [
      {
        event_id: '52f0450a-d27a-493c-aa92-81072f21078b',
        participant_name: 'Test User 1',
        participant_email: 'test1@example.com',
        custom_data: {},
        status: 'pending',
        phone_number: '628111111111'
      },
      {
        event_id: '52f0450a-d27a-493c-aa92-81072f21078b',
        participant_name: 'Test User 2',
        participant_email: 'test2@example.com',
        custom_data: {},
        status: 'approved',
        phone_number: '628222222222'
      }
    ];

    console.log('Creating multiple test registrations...');
    const { data: multipleRegistrations, error: multipleCreateError } = await supabase
      .from('registrations')
      .insert(testRegistrations)
      .select();

    if (multipleCreateError) {
      console.log('❌ Failed to create multiple registrations:', multipleCreateError.message);
    } else {
      console.log(`✅ Created ${multipleRegistrations.length} test registrations`);
      
      // Delete them one by one
      for (const registration of multipleRegistrations) {
        console.log(`\nDeleting: ${registration.participant_name} (${registration.id})`);
        
        const { error: multiDeleteError } = await deleteRegistration(registration.id);
        
        if (multiDeleteError) {
          console.log(`❌ Failed to delete ${registration.participant_name}:`, multiDeleteError.message);
        } else {
          console.log(`✅ Successfully deleted ${registration.participant_name}`);
        }
      }
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    
    const { data: finalRegistrations, error: finalError } = await supabase
      .from('registrations')
      .select('id, participant_name, participant_email, status');

    if (finalError) {
      console.log('❌ Error in final verification:', finalError.message);
    } else {
      console.log(`✅ Final registration count: ${finalRegistrations.length}`);
      if (finalRegistrations.length > 0) {
        console.log('📊 Remaining registrations:');
        finalRegistrations.forEach((reg, index) => {
          console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email}) - ${reg.status}`);
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 FRONTEND DELETE FUNCTION TEST SUMMARY:');
    
    const allDeleted = finalRegistrations.length === 0;
    
    console.log(`✅ All test registrations deleted: ${allDeleted ? 'YES' : 'NO'}`);
    
    if (allDeleted) {
      console.log('\n🎉 SUCCESS: Frontend delete function is working correctly!');
      console.log('The enhanced deleteRegistration function properly removes all data.');
    } else {
      console.log('\n⚠️  WARNING: Some registrations were not deleted.');
      console.log('This might indicate an issue with the delete function.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testFrontendDelete(); 