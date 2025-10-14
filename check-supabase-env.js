// Script untuk memeriksa environment variables di Supabase Edge Functions
// Jalankan dengan: node check-supabase-env.js

const https = require('https');

// Konfigurasi Supabase
const SUPABASE_CONFIG = {
  PROJECT_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
};

console.log('=== SUPABASE ENVIRONMENT VARIABLES CHECK ===');
console.log('Timestamp:', new Date().toISOString());
console.log('');

console.log('1. SUPABASE CONFIGURATION:');
console.log('Project URL:', SUPABASE_CONFIG.PROJECT_URL);
console.log('Anon Key exists:', !!SUPABASE_CONFIG.ANON_KEY);
console.log('Service Role Key exists:', !!SUPABASE_CONFIG.SERVICE_ROLE_KEY);
console.log('');

// Function untuk memanggil Edge Function dan memeriksa environment variables
async function checkEdgeFunctionEnv() {
  console.log('2. CHECKING EDGE FUNCTION ENVIRONMENT:');
  
  // Buat payload untuk test function
  const payload = {
    action: 'check_env'
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

    console.log('Calling Edge Function:', `${url.origin}/functions/v1/send-whatsapp-blast`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

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
            console.log('✅ Edge Function responded successfully');
            resolve(jsonData);
          } else {
            console.log('❌ Edge Function call failed');
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

    req.setTimeout(15000, () => {
      console.log('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Function untuk memeriksa database connection
async function checkDatabaseConnection() {
  console.log('3. CHECKING DATABASE CONNECTION:');
  
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_CONFIG.PROJECT_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/whatsapp_blast_campaigns?select=count',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_CONFIG.SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_CONFIG.ANON_KEY
      }
    };

    console.log('Testing database connection...');

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response:', JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('✅ Database connection successful');
            resolve(jsonData);
          } else {
            console.log('❌ Database connection failed');
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || 'Unknown error'}`));
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

// Main execution
async function runCheck() {
  try {
    // Check database connection
    await checkDatabaseConnection();
    console.log('');
    
    // Check edge function environment
    await checkEdgeFunctionEnv();
    console.log('');
    
    console.log('=== CHECK COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.log('');
    console.log('=== CHECK FAILED ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    
    console.log('');
    console.log('TROUBLESHOOTING TIPS:');
    console.log('1. Make sure SUPABASE_URL is correct');
    console.log('2. Make sure SUPABASE_SERVICE_ROLE_KEY is valid');
    console.log('3. Make sure Edge Function is deployed');
    console.log('4. Check Supabase project settings');
    
    process.exit(1);
  }
}

// Check if required config is provided
if (!SUPABASE_CONFIG.PROJECT_URL || SUPABASE_CONFIG.PROJECT_URL.includes('your-project')) {
  console.log('❌ SUPABASE_URL not provided');
  console.log('Please set environment variable or edit the SUPABASE_CONFIG object in this script');
  process.exit(1);
}

if (!SUPABASE_CONFIG.SERVICE_ROLE_KEY || SUPABASE_CONFIG.SERVICE_ROLE_KEY.includes('your-service')) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not provided');
  console.log('Please set environment variable or edit the SUPABASE_CONFIG object in this script');
  process.exit(1);
}

runCheck();