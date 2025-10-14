// Script untuk menguji endpoint debugging di Edge Function
// Jalankan dengan: node test-debug-endpoint.js

const https = require('https');

// Konfigurasi Supabase
const SUPABASE_CONFIG = {
  PROJECT_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
};

console.log('=== TESTING DEBUG ENDPOINT ===');
console.log('Timestamp:', new Date().toISOString());
console.log('');

console.log('CONFIGURATION:');
console.log('Project URL:', SUPABASE_CONFIG.PROJECT_URL);
console.log('Service Role Key exists:', !!SUPABASE_CONFIG.SERVICE_ROLE_KEY);
console.log('Service Role Key length:', SUPABASE_CONFIG.SERVICE_ROLE_KEY.length);
console.log('');

// Function untuk memanggil debug endpoint
async function testDebugEndpoint() {
  console.log('CALLING DEBUG ENDPOINT:');
  
  const payload = {
    action: 'debug'
  };
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const url = new URL(SUPABASE_CONFIG.PROJECT_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/functions/v1/send-whatsapp-blast',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_CONFIG.SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('Request URL:', `${url.origin}/functions/v1/send-whatsapp-blast`);
    console.log('Request Payload:', JSON.stringify(payload, null, 2));
    console.log('Request Headers:', options.headers);
    console.log('');

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('RESPONSE RECEIVED:');
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('');
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response Body:');
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('');
            console.log('✅ Debug endpoint responded successfully');
            
            // Analyze debug info
            if (jsonData.debug_info) {
              console.log('');
              console.log('=== ANALYSIS ===');
              
              const debugInfo = jsonData.debug_info;
              
              // Check environment variables
              console.log('Environment Variables Status:');
              Object.entries(debugInfo.environment_variables).forEach(([key, value]) => {
                console.log(`  ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
              });
              
              // Check database connection
              console.log('');
              console.log('Database Connection:', 
                debugInfo.database_connection?.success ? '✅ Success' : '❌ Failed');
              if (!debugInfo.database_connection?.success) {
                console.log('  Error:', debugInfo.database_connection?.error);
              }
              
              // Check WhatsApp API
              console.log('');
              console.log('WhatsApp API Test:', 
                debugInfo.whatsapp_api_test?.success ? '✅ Success' : '❌ Failed');
              if (!debugInfo.whatsapp_api_test?.success) {
                console.log('  Error:', debugInfo.whatsapp_api_test?.error);
              } else {
                console.log('  Status Code:', debugInfo.whatsapp_api_test?.status_code);
              }
              
              // Check rate limits
              console.log('');
              console.log('Rate Limits Configuration:');
              Object.entries(debugInfo.rate_limits).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
              });
              
              // Environment values
              console.log('');
              console.log('Environment Values:');
              Object.entries(debugInfo.environment_values).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
              });
            }
            
            resolve(jsonData);
          } else {
            console.log('');
            console.log('❌ Debug endpoint call failed');
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error || 'Unknown error'}`));
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

    req.setTimeout(30000, () => {
      console.log('❌ Request timeout (30s)');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Function untuk memberikan rekomendasi berdasarkan hasil debug
function provideRecommendations(debugInfo) {
  console.log('');
  console.log('=== RECOMMENDATIONS ===');
  
  const envVars = debugInfo.environment_variables;
  const whatsappTest = debugInfo.whatsapp_api_test;
  const dbTest = debugInfo.database_connection;
  
  let hasIssues = false;
  
  // Check missing environment variables
  if (!envVars.WHATSAPP_ACCESS_TOKEN) {
    console.log('❌ WHATSAPP_ACCESS_TOKEN is missing');
    console.log('   → Set this in Supabase Dashboard > Settings > Edge Functions > Environment Variables');
    hasIssues = true;
  }
  
  if (!envVars.WHATSAPP_PHONE_NUMBER_ID) {
    console.log('❌ WHATSAPP_PHONE_NUMBER_ID is missing');
    console.log('   → Set this in Supabase Dashboard > Settings > Edge Functions > Environment Variables');
    hasIssues = true;
  }
  
  if (envVars.WHATSAPP_TEMPLATE_NAME === 'not_set') {
    console.log('⚠️  WHATSAPP_TEMPLATE_NAME is not set, using default');
    console.log('   → Set this to your approved WhatsApp template name');
  }
  
  // Check database connection
  if (!dbTest.success) {
    console.log('❌ Database connection failed');
    console.log('   → Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.log('   → Verify database tables exist');
    hasIssues = true;
  }
  
  // Check WhatsApp API
  if (!whatsappTest.success) {
    console.log('❌ WhatsApp API test failed');
    if (whatsappTest.error === 'Missing WhatsApp credentials') {
      console.log('   → Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    } else {
      console.log('   → Check if access token is valid and not expired');
      console.log('   → Verify phone number ID is correct');
      console.log('   → Check WhatsApp Business API permissions');
    }
    hasIssues = true;
  }
  
  if (!hasIssues) {
    console.log('✅ All checks passed! WhatsApp integration should work correctly.');
  }
  
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Fix any issues mentioned above');
  console.log('2. Test with a real campaign using a small recipient list');
  console.log('3. Monitor logs during message sending');
  console.log('4. Check WhatsApp Business Manager for delivery status');
}

// Main execution
async function runTest() {
  try {
    const result = await testDebugEndpoint();
    
    if (result.debug_info) {
      provideRecommendations(result.debug_info);
    }
    
    console.log('');
    console.log('=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.log('');
    console.log('=== TEST FAILED ===');
    console.log('Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('');
      console.log('TIMEOUT TROUBLESHOOTING:');
      console.log('1. Check if Edge Function is deployed');
      console.log('2. Verify Supabase project URL is correct');
      console.log('3. Check network connectivity');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('');
      console.log('AUTHENTICATION TROUBLESHOOTING:');
      console.log('1. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
      console.log('2. Check if key has proper permissions');
      console.log('3. Ensure key is not expired');
    }
    
    process.exit(1);
  }
}

// Check if required config is provided
if (!SUPABASE_CONFIG.PROJECT_URL || SUPABASE_CONFIG.PROJECT_URL.includes('your-project')) {
  console.log('❌ SUPABASE_URL not provided');
  console.log('Please set environment variable or edit the SUPABASE_CONFIG object in this script');
  console.log('');
  console.log('Example:');
  console.log('export SUPABASE_URL="https://your-project-id.supabase.co"');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('node test-debug-endpoint.js');
  process.exit(1);
}

if (!SUPABASE_CONFIG.SERVICE_ROLE_KEY || SUPABASE_CONFIG.SERVICE_ROLE_KEY.includes('your-service')) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not provided');
  console.log('Please set environment variable or edit the SUPABASE_CONFIG object in this script');
  process.exit(1);
}

runTest();