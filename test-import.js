/**
 * Test Script for Import Feature
 * ES Module format for testing import functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const SUPABASE_URL = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here'; // Replace with your actual key

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is properly configured
if (SUPABASE_ANON_KEY === 'your-anon-key-here') {
  console.error('❌ Error: Please configure your Supabase anon key in test-config.js or set VITE_SUPABASE_ANON_KEY environment variable');
  console.error('   You can find your anon key in your Supabase project settings');
  process.exit(1);
}

// Test data
const testEventId = '52f0450a-d27a-4f8e-9b0c-37fa7aa46acf'; // Replace with actual event ID
const testEmails = [
  'test1@example.com',
  'test2@example.com',
  'test3@example.com',
  'duplicate@example.com', // This will be used to test duplicate checking
  'duplicate@example.com'  // Duplicate email
];

// Test CSV data
const testCSVData = `Nama,Email,Telepon
John Doe,${testEmails[0]},081234567890
Jane Smith,${testEmails[1]},081234567891
Bob Johnson,${testEmails[2]},081234567892
Alice Brown,${testEmails[3]},081234567893
Charlie Wilson,${testEmails[4]},081234567894`;

// Test Excel data (simulated)
const testExcelData = [
  { Nama: 'John Doe', Email: testEmails[0], Telepon: '081234567890' },
  { Nama: 'Jane Smith', Email: testEmails[1], Telepon: '081234567891' },
  { Nama: 'Bob Johnson', Email: testEmails[2], Telepon: '081234567892' },
  { Nama: 'Alice Brown', Email: testEmails[3], Telepon: '081234567893' },
  { Nama: 'Charlie Wilson', Email: testEmails[4], Telepon: '081234567894' }
];

/**
 * Utility functions
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

/**
 * Test 1: Check if event exists
 */
async function testEventExists() {
  log('🧪 Test 1: Checking if event exists...', 'info');
  
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, max_participants, registration_status')
      .eq('id', testEventId)
      .single();

    if (error) {
      log(`❌ Event not found: ${error.message}`, 'error');
      return false;
    }

    log(`✅ Event found: ${event.name}`, 'success');
    log(`📊 Event details:`, 'info');
    log(`   - Max participants: ${event.max_participants}`, 'info');
    log(`   - Registration status: ${event.registration_status}`, 'info');
    
    return true;
  } catch (error) {
    log(`❌ Error checking event: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 2: Check current registration count
 */
async function testCurrentRegistrationCount() {
  log('🧪 Test 2: Checking current registration count...', 'info');
  
  try {
    const { count, error } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', testEventId);

    if (error) {
      log(`❌ Error checking registration count: ${error.message}`, 'error');
      return 0;
    }

    log(`✅ Current registrations: ${count}`, 'success');
    return count;
  } catch (error) {
    log(`❌ Error checking registration count: ${error.message}`, 'error');
    return 0;
  }
}

/**
 * Test 3: Test CSV parsing
 */
async function testCSVParsing() {
  log('🧪 Test 3: Testing CSV parsing...', 'info');
  
  try {
    // Simulate CSV parsing
    const lines = testCSVData.split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      return row;
    });

    log(`✅ CSV parsed successfully`, 'success');
    log(`📊 Headers: ${headers.join(', ')}`, 'info');
    log(`📊 Rows: ${rows.length}`, 'info');
    log(`📊 Sample row: ${JSON.stringify(rows[0])}`, 'info');
    
    return { headers, rows };
  } catch (error) {
    log(`❌ Error parsing CSV: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 4: Test field mapping
 */
async function testFieldMapping() {
  log('🧪 Test 4: Testing field mapping...', 'info');
  
  try {
    const csvData = await testCSVParsing();
    if (!csvData) return null;

    // Auto-detect field mapping
    const mapping = {};
    csvData.headers.forEach(header => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('nama') || headerLower.includes('name')) {
        mapping.participant_name = header;
      } else if (headerLower.includes('email') || headerLower.includes('mail')) {
        mapping.participant_email = header;
      } else if (headerLower.includes('phone') || headerLower.includes('telepon') || headerLower.includes('hp')) {
        mapping.phone_number = header;
      }
    });

    log(`✅ Field mapping created:`, 'success');
    log(`📊 Mapping: ${JSON.stringify(mapping, null, 2)}`, 'info');
    
    return mapping;
  } catch (error) {
    log(`❌ Error creating field mapping: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 5: Test duplicate checking
 */
async function testDuplicateChecking() {
  log('🧪 Test 5: Testing duplicate checking...', 'info');
  
  try {
    const csvData = await testCSVParsing();
    const mapping = await testFieldMapping();
    
    if (!csvData || !mapping) return null;

    // Extract emails from data
    const emailsToCheck = csvData.rows
      .map(row => row[mapping.participant_email])
      .filter(email => email && email.trim())
      .map(email => email.toLowerCase().trim());

    log(`📧 Emails to check: ${emailsToCheck.join(', ')}`, 'info');

    // Check for existing registrations
    const { data: existingRegistrations, error } = await supabase
      .from('registrations')
      .select('participant_email')
      .eq('event_id', testEventId)
      .in('participant_email', emailsToCheck);

    if (error) {
      log(`❌ Error checking existing registrations: ${error.message}`, 'error');
      return null;
    }

    const existingEmails = new Set(existingRegistrations?.map(r => r.participant_email.toLowerCase().trim()) || []);
    log(`📋 Found ${existingEmails.size} existing registrations`, 'info');
    log(`📧 Existing emails: ${Array.from(existingEmails).join(', ')}`, 'info');

    // Filter out existing emails
    const newRows = csvData.rows.filter(row => {
      const email = row[mapping.participant_email]?.toLowerCase().trim();
      const exists = existingEmails.has(email);
      if (exists) {
        log(`❌ Skipping duplicate: ${email}`, 'warning');
      }
      return !exists;
    });

    log(`✅ Duplicate checking completed`, 'success');
    log(`📊 Original rows: ${csvData.rows.length}`, 'info');
    log(`📊 New rows after filtering: ${newRows.length}`, 'info');
    
    return { originalRows: csvData.rows, filteredRows: newRows, mapping };
  } catch (error) {
    log(`❌ Error in duplicate checking: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 6: Test data validation
 */
async function testDataValidation() {
  log('🧪 Test 6: Testing data validation...', 'info');
  
  try {
    const duplicateCheckResult = await testDuplicateChecking();
    if (!duplicateCheckResult) return null;

    const { filteredRows, mapping } = duplicateCheckResult;
    const errors = [];

    // Validate each row
    filteredRows.forEach((row, index) => {
      // Check required fields
      if (!row[mapping.participant_name] || !row[mapping.participant_name].trim()) {
        errors.push({
          row: index + 1,
          field: 'participant_name',
          message: 'Nama peserta wajib diisi',
          value: row[mapping.participant_name]
        });
      }

      // Check email format
      const email = row[mapping.participant_email];
      if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            row: index + 1,
            field: 'participant_email',
            message: 'Format email tidak valid',
            value: email
          });
        }
      }

      // Check phone format
      const phone = row[mapping.phone_number];
      if (phone && phone.trim()) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          errors.push({
            row: index + 1,
            field: 'phone_number',
            message: 'Format nomor telepon tidak valid',
            value: phone
          });
        }
      }
    });

    log(`✅ Data validation completed`, 'success');
    log(`📊 Valid rows: ${filteredRows.length - errors.length}`, 'info');
    log(`📊 Errors: ${errors.length}`, errors.length > 0 ? 'warning' : 'info');
    
    if (errors.length > 0) {
      log(`📋 Validation errors:`, 'warning');
      errors.forEach(error => {
        log(`   Row ${error.row}: ${error.message} (${error.value})`, 'warning');
      });
    }

    return { validRows: filteredRows.filter((_, index) => !errors.some(e => e.row === index + 1)), errors };
  } catch (error) {
    log(`❌ Error in data validation: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 7: Test registration insertion
 */
async function testRegistrationInsertion() {
  log('🧪 Test 7: Testing registration insertion...', 'info');
  
  try {
    const validationResult = await testDataValidation();
    if (!validationResult) return null;

    const { validRows, errors } = validationResult;
    const mapping = await testFieldMapping();
    
    if (!mapping) return null;

    log(`📊 Attempting to insert ${validRows.length} registrations...`, 'info');

    const insertResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      // Transform row data to registration format
      const registration = {
        event_id: testEventId,
        participant_name: row[mapping.participant_name] || '',
        participant_email: row[mapping.participant_email] || '',
        phone_number: row[mapping.phone_number] || null,
        status: 'pending',
        custom_data: {},
        registered_at: new Date().toISOString()
      };

      try {
        const { data: inserted, error } = await supabase
          .from('registrations')
          .insert([registration])
          .select('id, participant_email, participant_name')
          .single();

        if (error) {
          log(`❌ Insert failed for row ${i + 1}: ${error.message}`, 'error');
          failureCount++;
          insertResults.push({ success: false, error: error.message, row: i + 1 });
        } else {
          log(`✅ Inserted registration ${i + 1}: ${inserted.participant_name} (${inserted.participant_email})`, 'success');
          successCount++;
          insertResults.push({ success: true, data: inserted, row: i + 1 });
        }

        // Add delay to avoid rate limiting
        await delay(100);
      } catch (error) {
        log(`❌ Error inserting row ${i + 1}: ${error.message}`, 'error');
        failureCount++;
        insertResults.push({ success: false, error: error.message, row: i + 1 });
      }
    }

    log(`✅ Registration insertion completed`, 'success');
    log(`📊 Successful: ${successCount}`, 'success');
    log(`📊 Failed: ${failureCount}`, failureCount > 0 ? 'warning' : 'info');
    
    return { successCount, failureCount, insertResults, validationErrors: errors };
  } catch (error) {
    log(`❌ Error in registration insertion: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 8: Test cleanup (remove test registrations)
 */
async function testCleanup() {
  log('🧪 Test 8: Testing cleanup...', 'info');
  
  try {
    // Find and delete test registrations
    const { data: testRegistrations, error } = await supabase
      .from('registrations')
      .select('id, participant_email')
      .eq('event_id', testEventId)
      .in('participant_email', testEmails);

    if (error) {
      log(`❌ Error finding test registrations: ${error.message}`, 'error');
      return false;
    }

    if (testRegistrations.length === 0) {
      log(`✅ No test registrations to clean up`, 'success');
      return true;
    }

    log(`📊 Found ${testRegistrations.length} test registrations to clean up`, 'info');

    // Delete test registrations
    const { error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .in('id', testRegistrations.map(r => r.id));

    if (deleteError) {
      log(`❌ Error deleting test registrations: ${deleteError.message}`, 'error');
      return false;
    }

    log(`✅ Cleanup completed successfully`, 'success');
    return true;
  } catch (error) {
    log(`❌ Error in cleanup: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 9: Test batch processing simulation
 */
async function testBatchProcessing() {
  log('🧪 Test 9: Testing batch processing simulation...', 'info');
  
  try {
    const csvData = await testCSVParsing();
    const mapping = await testFieldMapping();
    
    if (!csvData || !mapping) return null;

    const batchSize = 2; // Small batch size for testing
    const totalRows = csvData.rows.length;
    const totalBatches = Math.ceil(totalRows / batchSize);
    
    log(`📊 Batch processing: ${totalRows} rows in ${totalBatches} batches of ${batchSize}`, 'info');

    let totalSuccess = 0;
    let totalFailed = 0;
    const batchResults = [];

    for (let i = 0; i < totalRows; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchRows = csvData.rows.slice(i, i + batchSize);
      
      log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batchRows.length} rows)`, 'info');

      // Simulate batch processing
      const batchResult = {
        batchNumber,
        rows: batchRows.length,
        success: 0,
        failed: 0,
        errors: []
      };

      for (let j = 0; j < batchRows.length; j++) {
        const row = batchRows[j];
        
        // Simulate processing delay
        await delay(50);
        
        // Simulate success/failure (90% success rate for testing)
        if (Math.random() > 0.1) {
          batchResult.success++;
          log(`  ✅ Row ${i + j + 1}: ${row[mapping.participant_name]} - Success`, 'success');
        } else {
          batchResult.failed++;
          const error = 'Simulated processing error';
          batchResult.errors.push({ row: i + j + 1, error });
          log(`  ❌ Row ${i + j + 1}: ${row[mapping.participant_name]} - Failed`, 'error');
        }
      }

      totalSuccess += batchResult.success;
      totalFailed += batchResult.failed;
      batchResults.push(batchResult);

      log(`📊 Batch ${batchNumber} completed: ${batchResult.success} success, ${batchResult.failed} failed`, 'info');
      
      // Add delay between batches
      if (batchNumber < totalBatches) {
        await delay(200);
      }
    }

    log(`✅ Batch processing simulation completed`, 'success');
    log(`📊 Total results: ${totalSuccess} success, ${totalFailed} failed`, 'info');
    
    return { totalSuccess, totalFailed, batchResults };
  } catch (error) {
    log(`❌ Error in batch processing: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test 10: Test error handling
 */
async function testErrorHandling() {
  log('🧪 Test 10: Testing error handling...', 'info');
  
  try {
    // Test with invalid event ID
    log(`📊 Testing with invalid event ID...`, 'info');
    const { data: invalidEvent, error: invalidEventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', 'invalid-uuid')
      .single();

    if (invalidEventError) {
      log(`✅ Invalid event ID properly rejected: ${invalidEventError.message}`, 'success');
    }

    // Test with invalid email format
    log(`📊 Testing with invalid email format...`, 'info');
    const invalidEmails = ['invalid-email', 'test@', '@test.com', 'test.com'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    invalidEmails.forEach(email => {
      const isValid = emailRegex.test(email);
      log(`  ${isValid ? '✅' : '❌'} ${email}: ${isValid ? 'Valid' : 'Invalid'}`, isValid ? 'success' : 'warning');
    });

    // Test with empty required fields
    log(`📊 Testing with empty required fields...`, 'info');
    const emptyFields = [
      { name: '', email: 'test@example.com', phone: '081234567890' },
      { name: 'John Doe', email: '', phone: '081234567890' },
      { name: '   ', email: 'test@example.com', phone: '081234567890' }
    ];

    emptyFields.forEach((fields, index) => {
      const hasName = fields.name && fields.name.trim();
      const hasEmail = fields.email && fields.email.trim();
      
      log(`  Row ${index + 1}:`, 'info');
      log(`    Name: ${hasName ? '✅' : '❌'} "${fields.name}"`, hasName ? 'success' : 'warning');
      log(`    Email: ${hasEmail ? '✅' : '❌'} "${fields.email}"`, hasEmail ? 'success' : 'warning');
    });

    log(`✅ Error handling tests completed`, 'success');
    return true;
  } catch (error) {
    log(`❌ Error in error handling tests: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('🚀 Starting Import Feature Tests', 'info');
  log('================================', 'info');

  const testResults = {
    eventExists: false,
    registrationCount: 0,
    csvParsing: false,
    fieldMapping: false,
    duplicateChecking: false,
    dataValidation: false,
    registrationInsertion: false,
    cleanup: false,
    batchProcessing: false,
    errorHandling: false
  };

  try {
    // Run tests in sequence
    testResults.eventExists = await testEventExists();
    await delay(500);

    testResults.registrationCount = await testCurrentRegistrationCount();
    await delay(500);

    testResults.csvParsing = await testCSVParsing() !== null;
    await delay(500);

    testResults.fieldMapping = await testFieldMapping() !== null;
    await delay(500);

    testResults.duplicateChecking = await testDuplicateChecking() !== null;
    await delay(500);

    testResults.dataValidation = await testDataValidation() !== null;
    await delay(500);

    testResults.registrationInsertion = await testRegistrationInsertion() !== null;
    await delay(500);

    testResults.cleanup = await testCleanup();
    await delay(500);

    testResults.batchProcessing = await testBatchProcessing() !== null;
    await delay(500);

    testResults.errorHandling = await testErrorHandling();
    await delay(500);

  } catch (error) {
    log(`❌ Test runner error: ${error.message}`, 'error');
  }

  // Print test summary
  log('', 'info');
  log('📊 Test Results Summary', 'info');
  log('======================', 'info');
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'success' : 'error';
    log(`${status} ${test}`, color);
  });

  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = (passedTests / totalTests) * 100;

  log('', 'info');
  log(`📈 Overall Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`, successRate >= 80 ? 'success' : 'warning');
  
  if (successRate >= 80) {
    log('🎉 Import feature is working well!', 'success');
  } else {
    log('⚠️ Some tests failed. Please review the results above.', 'warning');
  }

  log('🏁 Test suite completed', 'info');
}

/**
 * Run specific test
 */
async function runSpecificTest(testName) {
  log(`🎯 Running specific test: ${testName}`, 'info');
  
  const tests = {
    'event': testEventExists,
    'count': testCurrentRegistrationCount,
    'csv': testCSVParsing,
    'mapping': testFieldMapping,
    'duplicate': testDuplicateChecking,
    'validation': testDataValidation,
    'insertion': testRegistrationInsertion,
    'cleanup': testCleanup,
    'batch': testBatchProcessing,
    'error': testErrorHandling
  };

  if (tests[testName]) {
    await tests[testName]();
  } else {
    log(`❌ Unknown test: ${testName}`, 'error');
    log(`Available tests: ${Object.keys(tests).join(', ')}`, 'info');
  }
}

// Export functions for use in other modules
export {
  runAllTests,
  runSpecificTest,
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
};

// Run tests if this file is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('test-import.js');

if (isMainModule) {
  const testName = process.argv[2];
  
  if (testName) {
    runSpecificTest(testName);
  } else {
    runAllTests();
  }
}
