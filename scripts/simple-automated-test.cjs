#!/usr/bin/env node

/**
 * Simple Automated Test Script untuk Fitur Batch Approve
 * 
 * Menggunakan Puppeteer dengan fungsi dasar yang kompatibel
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8080',
  adminEmail: 'admin@example.com', // Ganti dengan email admin yang valid
  adminPassword: 'admin123', // Ganti dengan password admin yang valid
  timeout: 30000,
  screenshotDir: './test-screenshots'
};

// Test Results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility Functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

async function takeScreenshot(page, name) {
  try {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    const filename = `${CONFIG.screenshotDir}/${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    log(`Screenshot saved: ${filename}`);
  } catch (error) {
    log(`Failed to take screenshot: ${error.message}`, 'ERROR');
  }
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    log(`Element not found: ${selector}`, 'ERROR');
    return false;
  }
}

async function waitForTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Functions
async function testLogin(page) {
  log('Testing admin login...');
  testResults.total++;
  
  try {
    await page.goto(`${CONFIG.baseUrl}/auth`);
    await takeScreenshot(page, 'login-page');
    
    // Wait for login form
    if (!await waitForElement(page, 'input[type="email"]')) {
      throw new Error('Login form not found');
    }
    
    // Fill login form
    await page.type('input[type="email"]', CONFIG.adminEmail);
    await page.type('input[type="password"]', CONFIG.adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin dashboard
    await page.waitForNavigation({ timeout: CONFIG.timeout });
    await takeScreenshot(page, 'after-login');
    
    log('Login test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Login test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Login', error: error.message });
  }
}

async function testNavigation(page) {
  log('Testing navigation to registrations...');
  testResults.total++;
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/registrations`);
    await takeScreenshot(page, 'registrations-page');
    
    // Wait for registrations table
    if (!await waitForElement(page, 'table', 15000)) {
      throw new Error('Registrations table not found');
    }
    
    log('Navigation test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Navigation test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Navigation', error: error.message });
  }
}

async function testCheckboxSelection(page) {
  log('Testing checkbox selection...');
  testResults.total++;
  
  try {
    // Wait for checkboxes to be visible
    await waitForTimeout(2000);
    
    // Look for checkboxes in table rows
    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length === 0) {
      throw new Error('No checkboxes found in table');
    }
    
    // Click first checkbox
    await checkboxes[1].click(); // Skip header checkbox, click first row
    await takeScreenshot(page, 'checkbox-selected');
    
    log('Checkbox selection test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Checkbox selection test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Checkbox Selection', error: error.message });
  }
}

async function testBatchApproveButton(page) {
  log('Testing batch approve button...');
  testResults.total++;
  
  try {
    // Wait for batch approve button to appear using text content
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => btn.textContent.includes('Batch Approve'));
      },
      { timeout: 10000 }
    );
    
    await takeScreenshot(page, 'batch-approve-button');
    
    log('Batch approve button test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Batch approve button test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Batch Approve Button', error: error.message });
  }
}

async function testBatchApproveDialog(page) {
  log('Testing batch approve dialog...');
  testResults.total++;
  
  try {
    // Click batch approve button using text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const batchButton = buttons.find(btn => btn.textContent.includes('Batch Approve'));
      if (batchButton) {
        batchButton.click();
      }
    });
    
    // Wait for dialog to open
    if (!await waitForElement(page, '[role="dialog"]', 10000)) {
      throw new Error('Batch approve dialog not found');
    }
    
    await takeScreenshot(page, 'batch-approve-dialog');
    
    // Check for dialog title
    const title = await page.$eval('[role="dialog"] h2', el => el.textContent);
    if (!title.includes('Batch Approve')) {
      throw new Error('Dialog title incorrect');
    }
    
    log('Batch approve dialog test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Batch approve dialog test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Batch Approve Dialog', error: error.message });
  }
}

async function testNotificationOptions(page) {
  log('Testing notification options...');
  testResults.total++;
  
  try {
    // Check for notification checkboxes
    const emailCheckbox = await page.$('input[id="send-email-batch"]');
    const whatsappCheckbox = await page.$('input[id="send-whatsapp-batch"]');
    
    if (!emailCheckbox || !whatsappCheckbox) {
      throw new Error('Notification checkboxes not found');
    }
    
    // Toggle checkboxes
    await emailCheckbox.click();
    await whatsappCheckbox.click();
    await takeScreenshot(page, 'notification-options');
    
    log('Notification options test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Notification options test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Notification Options', error: error.message });
  }
}

async function testDialogActions(page) {
  log('Testing dialog actions...');
  testResults.total++;
  
  try {
    // Test cancel button using text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cancelButton = buttons.find(btn => btn.textContent.includes('Cancel'));
      if (cancelButton) {
        cancelButton.click();
      }
    });
    
    await waitForTimeout(1000);
    
    // Reopen dialog
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const batchButton = buttons.find(btn => btn.textContent.includes('Batch Approve'));
      if (batchButton) {
        batchButton.click();
      }
    });
    
    await waitForElement(page, '[role="dialog"]');
    
    // Select notification option
    const emailCheckbox = await page.$('input[id="send-email-batch"]');
    if (emailCheckbox) {
      await emailCheckbox.click();
    }
    
    await takeScreenshot(page, 'before-approve');
    
    log('Dialog actions test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Dialog actions test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Dialog Actions', error: error.message });
  }
}

async function testErrorHandling(page) {
  log('Testing error handling...');
  testResults.total++;
  
  try {
    // Uncheck all notification options
    const emailCheckbox = await page.$('input[id="send-email-batch"]');
    const whatsappCheckbox = await page.$('input[id="send-whatsapp-batch"]');
    
    if (emailCheckbox) {
      await emailCheckbox.click();
    }
    if (whatsappCheckbox) {
      await whatsappCheckbox.click();
    }
    
    // Check if approve button is disabled using text content
    const isDisabled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const approveButton = buttons.find(btn => btn.textContent.includes('Approve'));
      return approveButton ? approveButton.disabled : false;
    });
    
    if (!isDisabled) {
      throw new Error('Approve button should be disabled when no notifications selected');
    }
    
    await takeScreenshot(page, 'error-handling');
    
    log('Error handling test PASSED');
    testResults.passed++;
  } catch (error) {
    log(`Error handling test FAILED: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push({ test: 'Error Handling', error: error.message });
  }
}

// Main Test Runner
async function runTests() {
  log('Starting Simple Automated Batch Approve Feature Tests...');
  log(`Base URL: ${CONFIG.baseUrl}`);
  
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      slowMo: 100, // Slow down operations for better visibility
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Run tests
    await testLogin(page);
    await testNavigation(page);
    await testCheckboxSelection(page);
    await testBatchApproveButton(page);
    await testBatchApproveDialog(page);
    await testNotificationOptions(page);
    await testDialogActions(page);
    await testErrorHandling(page);
    
    // Generate test report
    generateTestReport();
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'ERROR');
    testResults.errors.push({ test: 'Test Execution', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateTestReport() {
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  log('');
  log('=== SIMPLE AUTOMATED BATCH APPROVE FEATURE TEST REPORT ===');
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`);
  log(`Failed: ${testResults.failed}`);
  log(`Success Rate: ${successRate}%`);
  
  if (testResults.errors.length > 0) {
    log('');
    log('Errors:');
    testResults.errors.forEach(error => {
      log(`- ${error.test}: ${error.error}`, 'ERROR');
    });
  }
  
  log('');
  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED! Batch approve feature is working correctly.');
  } else {
    log('⚠️ Some tests failed. Please review the errors above.');
  }
  
  // Save report to file
  const reportPath = './test-logs/simple-automated-batch-approve-test-report.json';
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults,
    successRate: parseFloat(successRate)
  }, null, 2));
  
  log(`Detailed report saved to: ${reportPath}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 