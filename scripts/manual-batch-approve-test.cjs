#!/usr/bin/env node

/**
 * Manual Test Script untuk Fitur Batch Approve
 * 
 * Script ini untuk testing cepat tanpa browser automation
 * Menggunakan console.log untuk memberikan instruksi manual
 */

const fs = require('fs');
const path = require('path');

// Test Configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  logFile: './test-logs/manual-batch-approve-test.log'
};

// Test Results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  manualChecks: []
};

// Utility Functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  
  // Ensure log directory exists
  const logDir = path.dirname(TEST_CONFIG.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(TEST_CONFIG.logFile, logMessage + '\n');
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

// Manual Test Functions
async function testLogin() {
  log('=== Test 1: Admin Login ===');
  log('Please open your browser and navigate to: ' + TEST_CONFIG.baseUrl + '/auth');
  log('Login with admin credentials');
  
  const result = await askQuestion('Did you successfully login as admin? (y/n): ');
  testResults.total++;
  
  if (result === 'y' || result === 'yes') {
    testResults.passed++;
    log('✅ Login test PASSED');
  } else {
    testResults.failed++;
    log('❌ Login test FAILED');
  }
}

async function testNavigation() {
  log('=== Test 2: Navigation to Registrations ===');
  log('Navigate to: ' + TEST_CONFIG.baseUrl + '/admin/registrations');
  log('Wait for the registrations table to load');
  
  const result = await askQuestion('Can you see the registrations table with data? (y/n): ');
  testResults.total++;
  
  if (result === 'y' || result === 'yes') {
    testResults.passed++;
    log('✅ Navigation test PASSED');
  } else {
    testResults.failed++;
    log('❌ Navigation test FAILED');
  }
}

async function testCheckboxSelection() {
  log('=== Test 3: Checkbox Selection ===');
  log('Look for checkboxes in the registration table:');
  log('1. Check if there are checkboxes in each row (only for pending registrations)');
  log('2. Check if there is a "Select All" checkbox in the table header');
  log('3. Try clicking individual checkboxes');
  log('4. Try clicking the "Select All" checkbox');
  
  const individualResult = await askQuestion('Do individual checkboxes work? (y/n): ');
  const selectAllResult = await askQuestion('Does "Select All" checkbox work? (y/n): ');
  
  testResults.total++;
  if (individualResult === 'y' && selectAllResult === 'y') {
    testResults.passed++;
    log('✅ Checkbox selection test PASSED');
  } else {
    testResults.failed++;
    log('❌ Checkbox selection test FAILED');
    if (individualResult !== 'y') log('  - Individual checkboxes not working');
    if (selectAllResult !== 'y') log('  - Select All checkbox not working');
  }
}

async function testBatchApproveButton() {
  log('=== Test 4: Batch Approve Button ===');
  log('1. Select at least one registration using checkboxes');
  log('2. Look for a "Batch Approve" button in the top actions area');
  log('3. Check if the button shows the count of selected registrations');
  
  const buttonVisible = await askQuestion('Is the Batch Approve button visible after selection? (y/n): ');
  const buttonCount = await askQuestion('Does the button show the correct count? (y/n): ');
  
  testResults.total++;
  if (buttonVisible === 'y' && buttonCount === 'y') {
    testResults.passed++;
    log('✅ Batch approve button test PASSED');
  } else {
    testResults.failed++;
    log('❌ Batch approve button test FAILED');
    if (buttonVisible !== 'y') log('  - Button not visible');
    if (buttonCount !== 'y') log('  - Count not displayed correctly');
  }
}

async function testBatchApproveDialog() {
  log('=== Test 5: Batch Approve Dialog ===');
  log('1. Click the "Batch Approve" button');
  log('2. Check if a dialog opens');
  log('3. Verify the dialog title contains "Batch Approve"');
  log('4. Check for notification options (Email and WhatsApp checkboxes)');
  log('5. Look for a summary section showing counts');
  
  const dialogOpens = await askQuestion('Does the dialog open when clicking Batch Approve? (y/n): ');
  const dialogTitle = await askQuestion('Is the dialog title correct? (y/n): ');
  const notificationOptions = await askQuestion('Are notification options visible? (y/n): ');
  const summarySection = await askQuestion('Is the summary section visible? (y/n): ');
  
  testResults.total++;
  if (dialogOpens === 'y' && dialogTitle === 'y' && notificationOptions === 'y' && summarySection === 'y') {
    testResults.passed++;
    log('✅ Batch approve dialog test PASSED');
  } else {
    testResults.failed++;
    log('❌ Batch approve dialog test FAILED');
    if (dialogOpens !== 'y') log('  - Dialog does not open');
    if (dialogTitle !== 'y') log('  - Dialog title incorrect');
    if (notificationOptions !== 'y') log('  - Notification options missing');
    if (summarySection !== 'y') log('  - Summary section missing');
  }
}

async function testNotificationOptions() {
  log('=== Test 6: Notification Options ===');
  log('In the batch approve dialog:');
  log('1. Try toggling the Email notification checkbox');
  log('2. Try toggling the WhatsApp notification checkbox');
  log('3. Uncheck both options and see if a warning appears');
  log('4. Check if the approve button is disabled when no notifications selected');
  
  const emailToggle = await askQuestion('Does Email notification toggle work? (y/n): ');
  const whatsappToggle = await askQuestion('Does WhatsApp notification toggle work? (y/n): ');
  const warningShows = await askQuestion('Does warning appear when no notifications selected? (y/n): ');
  const buttonDisabled = await askQuestion('Is approve button disabled when no notifications? (y/n): ');
  
  testResults.total++;
  if (emailToggle === 'y' && whatsappToggle === 'y' && warningShows === 'y' && buttonDisabled === 'y') {
    testResults.passed++;
    log('✅ Notification options test PASSED');
  } else {
    testResults.failed++;
    log('❌ Notification options test FAILED');
    if (emailToggle !== 'y') log('  - Email toggle not working');
    if (whatsappToggle !== 'y') log('  - WhatsApp toggle not working');
    if (warningShows !== 'y') log('  - Warning not showing');
    if (buttonDisabled !== 'y') log('  - Button not disabled');
  }
}

async function testPreviewSection() {
  log('=== Test 7: Preview Section ===');
  log('In the batch approve dialog:');
  log('1. Look for a "Selected Participants" section');
  log('2. Check if it shows the names of selected registrations');
  log('3. Verify it shows email addresses');
  log('4. Check if it shows event names');
  
  const previewVisible = await askQuestion('Is the preview section visible? (y/n): ');
  const showsNames = await askQuestion('Does it show participant names? (y/n): ');
  const showsEmails = await askQuestion('Does it show email addresses? (y/n): ');
  const showsEvents = await askQuestion('Does it show event names? (y/n): ');
  
  testResults.total++;
  if (previewVisible === 'y' && showsNames === 'y' && showsEmails === 'y' && showsEvents === 'y') {
    testResults.passed++;
    log('✅ Preview section test PASSED');
  } else {
    testResults.failed++;
    log('❌ Preview section test FAILED');
    if (previewVisible !== 'y') log('  - Preview section not visible');
    if (showsNames !== 'y') log('  - Names not showing');
    if (showsEmails !== 'y') log('  - Emails not showing');
    if (showsEvents !== 'y') log('  - Events not showing');
  }
}

async function testDialogActions() {
  log('=== Test 8: Dialog Actions ===');
  log('In the batch approve dialog:');
  log('1. Check if there are "Cancel" and "Approve" buttons');
  log('2. Try clicking "Cancel" - dialog should close');
  log('3. Reopen dialog and try clicking "Approve" (with notifications selected)');
  log('4. Check if dialog closes after approve');
  
  const buttonsVisible = await askQuestion('Are Cancel and Approve buttons visible? (y/n): ');
  const cancelWorks = await askQuestion('Does Cancel button close the dialog? (y/n): ');
  const approveWorks = await askQuestion('Does Approve button work? (y/n): ');
  
  testResults.total++;
  if (buttonsVisible === 'y' && cancelWorks === 'y' && approveWorks === 'y') {
    testResults.passed++;
    log('✅ Dialog actions test PASSED');
  } else {
    testResults.failed++;
    log('❌ Dialog actions test FAILED');
    if (buttonsVisible !== 'y') log('  - Buttons not visible');
    if (cancelWorks !== 'y') log('  - Cancel not working');
    if (approveWorks !== 'y') log('  - Approve not working');
  }
}

async function testSuccessFeedback() {
  log('=== Test 9: Success Feedback ===');
  log('After clicking Approve:');
  log('1. Check if a success message appears (toast notification)');
  log('2. Check if the registrations status changed to "Approved"');
  log('3. Check if QR tickets were generated');
  log('4. Check if notifications were sent (if enabled)');
  
  const successMessage = await askQuestion('Does success message appear? (y/n): ');
  const statusChanged = await askQuestion('Did registration status change to Approved? (y/n): ');
  const ticketsGenerated = await askQuestion('Were QR tickets generated? (y/n): ');
  
  testResults.total++;
  if (successMessage === 'y' && statusChanged === 'y' && ticketsGenerated === 'y') {
    testResults.passed++;
    log('✅ Success feedback test PASSED');
  } else {
    testResults.failed++;
    log('❌ Success feedback test FAILED');
    if (successMessage !== 'y') log('  - Success message not showing');
    if (statusChanged !== 'y') log('  - Status not changed');
    if (ticketsGenerated !== 'y') log('  - Tickets not generated');
  }
}

async function testErrorHandling() {
  log('=== Test 10: Error Handling ===');
  log('Test error scenarios:');
  log('1. Try to approve without selecting any registrations');
  log('2. Try to approve with no notification options selected');
  log('3. Check if appropriate error messages appear');
  
  const noSelectionError = await askQuestion('Does error appear when no registrations selected? (y/n): ');
  const noNotificationError = await askQuestion('Does error appear when no notifications selected? (y/n): ');
  
  testResults.total++;
  if (noSelectionError === 'y' && noNotificationError === 'y') {
    testResults.passed++;
    log('✅ Error handling test PASSED');
  } else {
    testResults.failed++;
    log('❌ Error handling test FAILED');
    if (noSelectionError !== 'y') log('  - No selection error not handled');
    if (noNotificationError !== 'y') log('  - No notification error not handled');
  }
}

// Main Test Runner
async function runManualTests() {
  log('Starting Manual Batch Approve Feature Tests...');
  log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  log('This is a manual test - please follow the instructions and answer the questions');
  log('');
  
  try {
    await testLogin();
    await testNavigation();
    await testCheckboxSelection();
    await testBatchApproveButton();
    await testBatchApproveDialog();
    await testNotificationOptions();
    await testPreviewSection();
    await testDialogActions();
    await testSuccessFeedback();
    await testErrorHandling();
    
  } catch (error) {
    log(`Test execution error: ${error.message}`, 'ERROR');
  }
  
  generateTestReport();
}

function generateTestReport() {
  log('');
  log('=== MANUAL BATCH APPROVE FEATURE TEST REPORT ===');
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`);
  log(`Failed: ${testResults.failed}`);
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  log('');
  log('=== TEST COMPLETION ===');
  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED! Batch approve feature is working correctly.');
  } else {
    log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  // Save detailed report
  const reportPath = './test-logs/manual-batch-approve-test-report.json';
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`Detailed report saved to: ${reportPath}`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runManualTests().catch(error => {
    log(`Test runner error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  runManualTests,
  testResults,
  TEST_CONFIG
}; 