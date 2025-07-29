// Script untuk test dan demo fungsi delete registration
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
      .select('id, participant_name, participant_email, status');

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
      console.log(`  ${index + 1}. ${reg.participant_name} (${reg.participant_email}) - ${reg.status}`);
    });

    // Step 2: Test delete function
    console.log('\n🗑️  Step 2: Testing delete function...');
    
    const registrationToDelete = currentRegistrations[0];
    console.log(`Testing delete for: ${registrationToDelete.participant_name} (${registrationToDelete.id})`);

    // Test the delete function
    const { data: deleteResult, error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationToDelete.id)
      .select();

    if (deleteError) {
      console.log('❌ Delete failed:', deleteError.message);
      console.log('📊 Error details:', deleteError);
    } else {
      console.log('✅ Delete operation completed successfully');
      console.log('📊 Deleted registration:', deleteResult[0]);
    }

    // Step 3: Verify deletion
    console.log('\n🔍 Step 3: Verifying deletion...');
    
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

    // Step 4: Check remaining registrations
    console.log('\n📊 Step 4: Checking remaining registrations...');
    
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

    // Summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📋 DELETE REGISTRATION TEST SUMMARY:');
    
    const registrationDeleted = checkRegError && checkRegError.code === 'PGRST116';
    const expectedRemaining = currentRegistrations.length - 1;
    const actualRemaining = remainingRegistrations.length;
    
    console.log(`✅ Registration deletion: ${registrationDeleted ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Expected remaining: ${expectedRemaining}, Actual: ${actualRemaining}`);
    
    if (registrationDeleted && actualRemaining === expectedRemaining) {
      console.log('\n🎉 SUCCESS: Delete registration function is working correctly!');
      console.log('The issue might be in the frontend not refreshing the data properly.');
    } else {
      console.log('\n🚨 ISSUE DETECTED:');
      console.log('Delete registration function has problems.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test
testDeleteRegistration(); 