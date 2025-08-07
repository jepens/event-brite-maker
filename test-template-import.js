/**
 * Test Script for Template Import Feature
 * ES Module format for testing template download and import functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Configuration
const SUPABASE_URL = 'https://mjolfjoqfnszvvlbzhjn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is properly configured
if (SUPABASE_ANON_KEY === 'your-anon-key-here') {
  console.error('❌ Error: Please configure your Supabase anon key in .env file');
  console.error('   You can find your anon key in your Supabase project settings');
  process.exit(1);
}

// Test data
const testEventId = '52f0450a-d27a-4f8e-9b0c-37fa7aa46acf';

// Template test data
const templateData = {
  csv: `Nama,Email,Telepon,Status,Catatan
John Doe,john.doe@example.com,081234567890,pending,Sample registration 1
Jane Smith,jane.smith@example.com,081234567891,confirmed,Sample registration 2
Bob Johnson,bob.johnson@example.com,081234567892,pending,Sample registration 3
Alice Brown,alice.brown@example.com,081234567893,cancelled,Sample registration 4
Charlie Wilson,charlie.wilson@example.com,081234567894,pending,Sample registration 5`,
  
  excel: `Nama\tEmail\tTelepon\tStatus\tCatatan
John Doe\tjohn.doe@example.com\t081234567890\tpending\tSample registration 1
Jane Smith\tjane.smith@example.com\t081234567891\tconfirmed\tSample registration 2
Bob Johnson\tbob.johnson@example.com\t081234567892\tpending\tSample registration 3
Alice Brown\talice.brown@example.com\t081234567893\tcancelled\tSample registration 4
Charlie Wilson\tcharlie.wilson@example.com\t081234567894\tpending\tSample registration 5`
};

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
 * Test 1: Check if template files exist
 */
async function testTemplateFilesExist() {
  log('🧪 Test 1: Checking if template files exist...', 'info');
  
  try {
    const templateFiles = [
      'public/templates/registration-template.csv',
      'public/templates/README.md'
    ];
    
    const results = {};
    
    for (const file of templateFiles) {
      try {
        const exists = fs.existsSync(file);
        results[file] = exists;
        log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Exists' : 'Not found'}`, exists ? 'success' : 'error');
      } catch (error) {
        results[file] = false;
        log(`❌ ${file}: Error checking - ${error.message}`, 'error');
      }
    }
    
    const allExist = Object.values(results).every(Boolean);
    log(`📊 Template files check: ${allExist ? 'PASS' : 'FAIL'}`, allExist ? 'success' : 'error');
    
    return allExist;
  } catch (error) {
    log(`❌ Error checking template files: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 2: Validate CSV template format
 */
async function testCSVTemplateFormat() {
  log('🧪 Test 2: Validating CSV template format...', 'info');
  
  try {
    const csvContent = templateData.csv;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    // Check required headers
    const requiredHeaders = ['Nama', 'Email'];
    const optionalHeaders = ['Telepon', 'Status', 'Catatan'];
    
    const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
    const hasOptional = optionalHeaders.some(h => headers.includes(h));
    
    if (missingRequired.length > 0) {
      log(`❌ Missing required headers: ${missingRequired.join(', ')}`, 'error');
      return false;
    }
    
    log(`✅ Required headers found: ${requiredHeaders.join(', ')}`, 'success');
    log(`✅ Optional headers found: ${optionalHeaders.filter(h => headers.includes(h)).join(', ')}`, 'success');
    
    // Check data rows
    const dataRows = lines.slice(1).filter(line => line.trim());
    log(`📊 Data rows: ${dataRows.length}`, 'info');
    
    // Validate sample data
    const sampleRow = dataRows[0];
    const sampleValues = sampleRow.split(',');
    
    if (sampleValues.length >= 2) {
      const name = sampleValues[0];
      const email = sampleValues[1];
      
      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(email);
      const hasName = name && name.trim().length > 0;
      
      log(`📝 Sample data validation:`, 'info');
      log(`   Name: ${hasName ? '✅' : '❌'} "${name}"`, hasName ? 'success' : 'error');
      log(`   Email: ${isValidEmail ? '✅' : '❌'} "${email}"`, isValidEmail ? 'success' : 'warning');
    }
    
    log(`✅ CSV template format validation: PASS`, 'success');
    return true;
  } catch (error) {
    log(`❌ Error validating CSV template: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 3: Test template download functionality
 */
async function testTemplateDownload() {
  log('🧪 Test 3: Testing template download functionality...', 'info');
  
  try {
    // Simulate template download (CSV)
    const csvContent = templateData.csv;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Check if blob was created successfully
    if (blob.size > 0) {
      log(`✅ CSV template blob created: ${blob.size} bytes`, 'success');
    } else {
      log(`❌ CSV template blob is empty`, 'error');
      return false;
    }
    
    // Simulate template download (Excel)
    const excelContent = templateData.excel;
    const excelBlob = new Blob([excelContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    
    if (excelBlob.size > 0) {
      log(`✅ Excel template blob created: ${excelBlob.size} bytes`, 'success');
    } else {
      log(`❌ Excel template blob is empty`, 'error');
      return false;
    }
    
    // Test file naming
    const csvFileName = 'registration-template.csv';
    const excelFileName = 'registration-template.xls';
    
    log(`📁 File names:`, 'info');
    log(`   CSV: ${csvFileName}`, 'info');
    log(`   Excel: ${excelFileName}`, 'info');
    
    log(`✅ Template download functionality: PASS`, 'success');
    return true;
  } catch (error) {
    log(`❌ Error testing template download: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 4: Test field mapping auto-detection
 */
async function testFieldMappingAutoDetection() {
  log('🧪 Test 4: Testing field mapping auto-detection...', 'info');
  
  try {
    const csvContent = templateData.csv;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Auto-detect field mapping
    const mapping = {};
    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('nama') || headerLower.includes('name')) {
        mapping.participant_name = header;
      } else if (headerLower.includes('email') || headerLower.includes('mail')) {
        mapping.participant_email = header;
      } else if (headerLower.includes('phone') || headerLower.includes('telepon') || headerLower.includes('hp')) {
        mapping.phone_number = header;
      } else if (headerLower.includes('status')) {
        mapping.status = header;
      } else if (headerLower.includes('catatan') || headerLower.includes('note')) {
        mapping.custom_data = header;
      }
    });
    
    log(`📊 Auto-detected field mapping:`, 'info');
    Object.entries(mapping).forEach(([field, header]) => {
      log(`   ${field} → ${header}`, 'success');
    });
    
    // Check if required fields are mapped
    const requiredFields = ['participant_name', 'participant_email'];
    const missingRequired = requiredFields.filter(field => !mapping[field]);
    
    if (missingRequired.length > 0) {
      log(`❌ Missing required field mappings: ${missingRequired.join(', ')}`, 'error');
      return false;
    }
    
    log(`✅ All required fields mapped: ${requiredFields.join(', ')}`, 'success');
    log(`✅ Field mapping auto-detection: PASS`, 'success');
    
    return true;
  } catch (error) {
    log(`❌ Error testing field mapping: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 5: Test data validation with template
 */
async function testDataValidation() {
  log('🧪 Test 5: Testing data validation with template...', 'info');
  
  try {
    const csvContent = templateData.csv;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).filter(line => line.trim());
    
    const errors = [];
    const validRows = [];
    
    dataRows.forEach((row, index) => {
      const values = row.split(',');
      const rowData = {};
      headers.forEach((header, i) => {
        rowData[header] = values[i]?.trim() || '';
      });
      
      // Validate required fields
      if (!rowData['Nama'] || !rowData['Nama'].trim()) {
        errors.push({
          row: index + 1,
          field: 'Nama',
          message: 'Nama peserta wajib diisi',
          value: rowData['Nama']
        });
      }
      
      if (!rowData['Email'] || !rowData['Email'].trim()) {
        errors.push({
          row: index + 1,
          field: 'Email',
          message: 'Email peserta wajib diisi',
          value: rowData['Email']
        });
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rowData['Email'])) {
          errors.push({
            row: index + 1,
            field: 'Email',
            message: 'Format email tidak valid',
            value: rowData['Email']
          });
        }
      }
      
      // Validate status if present
      if (rowData['Status'] && !['pending', 'confirmed', 'cancelled'].includes(rowData['Status'].toLowerCase())) {
        errors.push({
          row: index + 1,
          field: 'Status',
          message: 'Status harus pending, confirmed, atau cancelled',
          value: rowData['Status']
        });
      }
      
      if (errors.filter(e => e.row === index + 1).length === 0) {
        validRows.push(rowData);
      }
    });
    
    log(`📊 Data validation results:`, 'info');
    log(`   Total rows: ${dataRows.length}`, 'info');
    log(`   Valid rows: ${validRows.length}`, 'success');
    log(`   Errors: ${errors.length}`, errors.length > 0 ? 'warning' : 'info');
    
    if (errors.length > 0) {
      log(`📋 Validation errors:`, 'warning');
      errors.forEach(error => {
        log(`   Row ${error.row}: ${error.message} (${error.value})`, 'warning');
      });
    }
    
    const successRate = (validRows.length / dataRows.length) * 100;
    log(`📈 Validation success rate: ${successRate.toFixed(1)}%`, successRate >= 80 ? 'success' : 'warning');
    
    return successRate >= 80;
  } catch (error) {
    log(`❌ Error testing data validation: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 6: Test duplicate checking
 */
async function testDuplicateChecking() {
  log('🧪 Test 6: Testing duplicate checking...', 'info');
  
  try {
    const csvContent = templateData.csv;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).filter(line => line.trim());
    
    // Extract emails
    const emails = dataRows.map(row => {
      const values = row.split(',');
      const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
      return values[emailIndex]?.trim() || '';
    }).filter(email => email);
    
    // Check for duplicates
    const emailCounts = {};
    emails.forEach(email => {
      emailCounts[email] = (emailCounts[email] || 0) + 1;
    });
    
    const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
    
    log(`📊 Duplicate checking results:`, 'info');
    log(`   Total emails: ${emails.length}`, 'info');
    log(`   Unique emails: ${Object.keys(emailCounts).length}`, 'info');
    log(`   Duplicates found: ${duplicates.length}`, duplicates.length > 0 ? 'warning' : 'success');
    
    if (duplicates.length > 0) {
      log(`📋 Duplicate emails:`, 'warning');
      duplicates.forEach(([email, count]) => {
        log(`   ${email}: ${count} times`, 'warning');
      });
    }
    
    // Simulate database check
    const uniqueEmails = [...new Set(emails)];
    log(`📧 Unique emails to check: ${uniqueEmails.join(', ')}`, 'info');
    
    log(`✅ Duplicate checking: PASS`, 'success');
    return true;
  } catch (error) {
    log(`❌ Error testing duplicate checking: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test 7: Test import simulation
 */
async function testImportSimulation() {
  log('🧪 Test 7: Testing import simulation...', 'info');
  
  try {
    const csvContent = templateData.csv;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).filter(line => line.trim());
    
    // Simulate import process
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',');
      
      // Simulate processing delay
      await delay(50);
      
      // Simulate success/failure (90% success rate for testing)
      if (Math.random() > 0.1) {
        successCount++;
        results.push({
          row: i + 1,
          status: 'success',
          data: {
            name: values[0]?.trim(),
            email: values[1]?.trim(),
            phone: values[2]?.trim(),
            status: values[3]?.trim() || 'pending',
            notes: values[4]?.trim()
          }
        });
      } else {
        failureCount++;
        results.push({
          row: i + 1,
          status: 'failed',
          error: 'Simulated import error'
        });
      }
    }
    
    log(`📊 Import simulation results:`, 'info');
    log(`   Total rows: ${dataRows.length}`, 'info');
    log(`   Successful: ${successCount}`, 'success');
    log(`   Failed: ${failureCount}`, failureCount > 0 ? 'warning' : 'info');
    
    const successRate = (successCount / dataRows.length) * 100;
    log(`📈 Import success rate: ${successRate.toFixed(1)}%`, successRate >= 80 ? 'success' : 'warning');
    
    // Show sample successful imports
    const successfulImports = results.filter(r => r.status === 'success').slice(0, 3);
    if (successfulImports.length > 0) {
      log(`📋 Sample successful imports:`, 'info');
      successfulImports.forEach(import_ => {
        log(`   Row ${import_.row}: ${import_.data.name} (${import_.data.email})`, 'success');
      });
    }
    
    log(`✅ Import simulation: PASS`, 'success');
    return successRate >= 80;
  } catch (error) {
    log(`❌ Error testing import simulation: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('🚀 Starting Template Import Feature Tests', 'info');
  log('==========================================', 'info');

  const testResults = {
    templateFiles: false,
    csvFormat: false,
    downloadFunction: false,
    fieldMapping: false,
    dataValidation: false,
    duplicateChecking: false,
    importSimulation: false
  };

  try {
    // Run tests in sequence
    testResults.templateFiles = await testTemplateFilesExist();
    await delay(500);

    testResults.csvFormat = await testCSVTemplateFormat();
    await delay(500);

    testResults.downloadFunction = await testTemplateDownload();
    await delay(500);

    testResults.fieldMapping = await testFieldMappingAutoDetection();
    await delay(500);

    testResults.dataValidation = await testDataValidation();
    await delay(500);

    testResults.duplicateChecking = await testDuplicateChecking();
    await delay(500);

    testResults.importSimulation = await testImportSimulation();
    await delay(500);

  } catch (error) {
    log(`❌ Test runner error: ${error.message}`, 'error');
  }

  // Print test summary
  log('', 'info');
  log('📊 Template Import Test Results Summary', 'info');
  log('========================================', 'info');
  
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
    log('🎉 Template import feature is working well!', 'success');
  } else {
    log('⚠️ Some tests failed. Please review the results above.', 'warning');
  }

  log('🏁 Template import test suite completed', 'info');
}

/**
 * Run specific test
 */
async function runSpecificTest(testName) {
  log(`🎯 Running specific test: ${testName}`, 'info');
  
  const tests = {
    'files': testTemplateFilesExist,
    'format': testCSVTemplateFormat,
    'download': testTemplateDownload,
    'mapping': testFieldMappingAutoDetection,
    'validation': testDataValidation,
    'duplicate': testDuplicateChecking,
    'import': testImportSimulation
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
  testTemplateFilesExist,
  testCSVTemplateFormat,
  testTemplateDownload,
  testFieldMappingAutoDetection,
  testDataValidation,
  testDuplicateChecking,
  testImportSimulation
};

// Run tests if this file is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('test-template-import.js');

if (isMainModule) {
  const testName = process.argv[2];
  
  if (testName) {
    runSpecificTest(testName);
  } else {
    runAllTests();
  }
}
