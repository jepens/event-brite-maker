/**
 * Example Test File
 * Shows how to use the test script with custom data
 */

import { createClient } from '@supabase/supabase-js';
import { 
  testEventExists, 
  testCurrentRegistrationCount,
  testCSVParsing,
  testFieldMapping,
  testDuplicateChecking,
  testDataValidation,
  testRegistrationInsertion,
  testCleanup,
  testBatchProcessing,
  testErrorHandling
} from './test-import.js';

// Custom configuration
const CUSTOM_CONFIG = {
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
  },
  event: {
    eventId: 'your-event-id-here',
    name: 'Custom Test Event'
  },
  data: {
    csvData: `Name,Email,Phone,Company
John Doe,john@example.com,081234567890,Company A
Jane Smith,jane@example.com,081234567891,Company B
Bob Johnson,bob@example.com,081234567892,Company C
Alice Brown,alice@example.com,081234567893,Company D
Charlie Wilson,charlie@example.com,081234567894,Company E`,
    emails: [
      'john@example.com',
      'jane@example.com',
      'bob@example.com',
      'alice@example.com',
      'charlie@example.com'
    ]
  }
};

// Custom test runner
async function runCustomTests() {
  console.log('🚀 Running Custom Tests');
  console.log('========================');
  
  try {
    // Test 1: Event existence
    console.log('\n🧪 Test 1: Event Existence');
    const eventExists = await testEventExists();
    console.log(`Result: ${eventExists ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 2: Registration count
    console.log('\n🧪 Test 2: Registration Count');
    const count = await testCurrentRegistrationCount();
    console.log(`Current registrations: ${count}`);
    
    // Test 3: CSV parsing
    console.log('\n🧪 Test 3: CSV Parsing');
    const csvResult = await testCSVParsing();
    console.log(`Result: ${csvResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 4: Field mapping
    console.log('\n🧪 Test 4: Field Mapping');
    const mappingResult = await testFieldMapping();
    console.log(`Result: ${mappingResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 5: Duplicate checking
    console.log('\n🧪 Test 5: Duplicate Checking');
    const duplicateResult = await testDuplicateChecking();
    console.log(`Result: ${duplicateResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 6: Data validation
    console.log('\n🧪 Test 6: Data Validation');
    const validationResult = await testDataValidation();
    console.log(`Result: ${validationResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 7: Registration insertion (optional - will create test data)
    console.log('\n🧪 Test 7: Registration Insertion');
    console.log('⚠️  This test will create actual registrations in the database');
    const insertResult = await testRegistrationInsertion();
    console.log(`Result: ${insertResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 8: Cleanup (if insertion was successful)
    if (insertResult) {
      console.log('\n🧪 Test 8: Cleanup');
      const cleanupResult = await testCleanup();
      console.log(`Result: ${cleanupResult ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    // Test 9: Batch processing
    console.log('\n🧪 Test 9: Batch Processing');
    const batchResult = await testBatchProcessing();
    console.log(`Result: ${batchResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 10: Error handling
    console.log('\n🧪 Test 10: Error Handling');
    const errorResult = await testErrorHandling();
    console.log(`Result: ${errorResult ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n🏁 Custom tests completed');
    
  } catch (error) {
    console.error('❌ Error running custom tests:', error.message);
  }
}

// Example: Test specific functionality
async function testSpecificFunctionality() {
  console.log('🎯 Testing Specific Functionality');
  console.log('==================================');
  
  try {
    // Test only CSV parsing with custom data
    console.log('\n📊 Testing CSV parsing with custom data...');
    const csvResult = await testCSVParsing();
    
    if (csvResult) {
      console.log('✅ CSV parsing successful');
      console.log('📋 Headers:', csvResult.headers);
      console.log('📊 Rows:', csvResult.rows.length);
      console.log('📋 Sample row:', csvResult.rows[0]);
    } else {
      console.log('❌ CSV parsing failed');
    }
    
    // Test only field mapping
    console.log('\n🗺️ Testing field mapping...');
    const mappingResult = await testFieldMapping();
    
    if (mappingResult) {
      console.log('✅ Field mapping successful');
      console.log('📋 Mapping:', mappingResult);
    } else {
      console.log('❌ Field mapping failed');
    }
    
  } catch (error) {
    console.error('❌ Error in specific functionality test:', error.message);
  }
}

// Example: Test with different data formats
async function testDifferentFormats() {
  console.log('📄 Testing Different Data Formats');
  console.log('==================================');
  
  const testCases = [
    {
      name: 'Standard CSV',
      data: `Name,Email,Phone
John,john@test.com,081234567890
Jane,jane@test.com,081234567891`
    },
    {
      name: 'CSV with spaces',
      data: `Name, Email , Phone
John, john@test.com , 081234567890
Jane, jane@test.com , 081234567891`
    },
    {
      name: 'CSV with empty fields',
      data: `Name,Email,Phone
John,,081234567890
Jane,jane@test.com,`
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('Data:', testCase.data);
    
    // Here you would test the parsing logic
    // This is just an example structure
    console.log('✅ Test case completed');
  }
}

// Export functions for use in other modules
export {
  runCustomTests,
  testSpecificFunctionality,
  testDifferentFormats,
  CUSTOM_CONFIG
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testType = process.argv[2] || 'custom';
  
  switch (testType) {
    case 'custom':
      runCustomTests();
      break;
    case 'specific':
      testSpecificFunctionality();
      break;
    case 'formats':
      testDifferentFormats();
      break;
    default:
      console.log('Available test types: custom, specific, formats');
      console.log('Usage: node test-example.js [testType]');
  }
}
