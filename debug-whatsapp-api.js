// Debug script untuk menguji API WhatsApp
// Jalankan dengan: node debug-whatsapp-api.js

const https = require('https');

// Konfigurasi - ganti dengan nilai yang sesuai
const CONFIG = {
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID',
  WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world',
  TEST_PHONE_NUMBER: process.env.TEST_PHONE_NUMBER || '628123456789' // Nomor test
};

console.log('=== WHATSAPP API DEBUG SCRIPT ===');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// 1. Cek konfigurasi environment variables
console.log('1. CHECKING CONFIGURATION:');
console.log('Access Token exists:', !!CONFIG.WHATSAPP_ACCESS_TOKEN);
console.log('Access Token length:', CONFIG.WHATSAPP_ACCESS_TOKEN.length);
console.log('Access Token preview:', CONFIG.WHATSAPP_ACCESS_TOKEN.substring(0, 20) + '...');
console.log('Phone Number ID:', CONFIG.WHATSAPP_PHONE_NUMBER_ID);
console.log('Template Name:', CONFIG.WHATSAPP_TEMPLATE_NAME);
console.log('Test Phone Number:', CONFIG.TEST_PHONE_NUMBER);
console.log('');

// 2. Test koneksi ke Facebook Graph API
async function testGraphAPIConnection() {
  console.log('2. TESTING GRAPH API CONNECTION:');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v18.0/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('✅ Graph API connection successful');
            resolve(jsonData);
          } else {
            console.log('❌ Graph API connection failed');
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', parseError.message);
          console.log('Raw response:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// 3. Test template availability
async function testTemplateAvailability() {
  console.log('3. TESTING TEMPLATE AVAILABILITY:');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v18.0/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/message_templates`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Available Templates:', JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            const templates = jsonData.data || [];
            const targetTemplate = templates.find(t => t.name === CONFIG.WHATSAPP_TEMPLATE_NAME);
            
            if (targetTemplate) {
              console.log(`✅ Template "${CONFIG.WHATSAPP_TEMPLATE_NAME}" found`);
              console.log('Template status:', targetTemplate.status);
              console.log('Template language:', targetTemplate.language);
              resolve(targetTemplate);
            } else {
              console.log(`❌ Template "${CONFIG.WHATSAPP_TEMPLATE_NAME}" not found`);
              console.log('Available template names:', templates.map(t => t.name));
              reject(new Error(`Template "${CONFIG.WHATSAPP_TEMPLATE_NAME}" not found`));
            }
          } else {
            console.log('❌ Failed to get templates');
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', parseError.message);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// 4. Test sending message
async function testSendMessage() {
  console.log('4. TESTING MESSAGE SENDING:');
  
  const payload = {
    messaging_product: "whatsapp",
    to: CONFIG.TEST_PHONE_NUMBER,
    type: "template",
    template: {
      name: CONFIG.WHATSAPP_TEMPLATE_NAME,
      language: {
        code: "id"
      }
    }
  };
  
  console.log('Message Payload:', JSON.stringify(payload, null, 2));
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v18.0/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('✅ Message sent successfully');
            console.log('Message ID:', jsonData.messages?.[0]?.id);
            console.log('Contact WA ID:', jsonData.contacts?.[0]?.wa_id);
            resolve(jsonData);
          } else {
            console.log('❌ Message sending failed');
            console.log('Error Code:', jsonData.error?.code);
            console.log('Error Type:', jsonData.error?.type);
            console.log('Error Message:', jsonData.error?.message);
            console.log('Error Subcode:', jsonData.error?.error_subcode);
            console.log('FB Trace ID:', jsonData.error?.fbtrace_id);
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', parseError.message);
          console.log('Raw response:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });

    req.setTimeout(15000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// 5. Test phone number validation
function testPhoneNumberValidation() {
  console.log('5. TESTING PHONE NUMBER VALIDATION:');
  
  const testNumbers = [
    '08123456789',
    '628123456789',
    '8123456789',
    '+628123456789',
    '0812-3456-789',
    '62 812 3456 789',
    'invalid',
    '',
    null
  ];
  
  function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return false;
    }
    
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's already in correct format: 628xxxxxxxxxx
    if (digitsOnly.startsWith('62') && (digitsOnly.length === 13 || digitsOnly.length === 11)) {
      return true;
    }
    
    // Check if it can be converted to correct format
    if (digitsOnly.startsWith('08') && (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
      return true;
    }
    
    // Check if it's a local number without prefix
    if (digitsOnly.startsWith('8') && (digitsOnly.length >= 9 && digitsOnly.length <= 12)) {
      return true;
    }
    
    return false;
  }
  
  function formatPhoneNumber(phone) {
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If already in correct format
    if (digitsOnly.startsWith('62')) {
      return digitsOnly;
    }
    
    // Convert 08xxxxxxxxxx to 628xxxxxxxxxx
    if (digitsOnly.startsWith('08')) {
      return '62' + digitsOnly.substring(1);
    }
    
    // Convert 8xxxxxxxxxx to 628xxxxxxxxxx
    if (digitsOnly.startsWith('8')) {
      return '62' + digitsOnly;
    }
    
    return digitsOnly;
  }
  
  testNumbers.forEach(number => {
    try {
      const isValid = validatePhoneNumber(number);
      const formatted = isValid ? formatPhoneNumber(number) : 'N/A';
      console.log(`Input: "${number}" | Valid: ${isValid} | Formatted: "${formatted}"`);
    } catch (error) {
      console.log(`Input: "${number}" | Error: ${error.message}`);
    }
  });
}

// Main execution
async function runDebug() {
  try {
    // Test phone number validation first
    testPhoneNumberValidation();
    console.log('');
    
    // Test Graph API connection
    await testGraphAPIConnection();
    console.log('');
    
    // Test template availability
    await testTemplateAvailability();
    console.log('');
    
    // Test sending message
    await testSendMessage();
    console.log('');
    
    console.log('=== DEBUG COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.log('');
    console.log('=== DEBUG FAILED ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    process.exit(1);
  }
}

// Check if required config is provided
if (!CONFIG.WHATSAPP_ACCESS_TOKEN || CONFIG.WHATSAPP_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
  console.log('❌ WHATSAPP_ACCESS_TOKEN not provided');
  console.log('Please set environment variable or edit the CONFIG object in this script');
  process.exit(1);
}

if (!CONFIG.WHATSAPP_PHONE_NUMBER_ID || CONFIG.WHATSAPP_PHONE_NUMBER_ID === 'YOUR_PHONE_NUMBER_ID') {
  console.log('❌ WHATSAPP_PHONE_NUMBER_ID not provided');
  console.log('Please set environment variable or edit the CONFIG object in this script');
  process.exit(1);
}

runDebug();