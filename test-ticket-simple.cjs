// Test script untuk template ticket_simple yang baru
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

const testTicketSimple = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Environment variables not found!');
    return;
  }

  try {
    console.log('Testing new ticket_simple template...');
    
    // Test dengan template ticket_simple yang baru
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        registration_id: 'be338e36-f259-4c30-9249-6328c1472fc0',
        template_name: 'ticket_simple', // Template baru
        language_code: 'id',
        include_header: true // Dengan header image (QR code)
      })
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error('❌ Error:', result);
      
      // Jika gagal, coba tanpa header image
      console.log('\n=== Trying without header image ===');
      
      const response2 = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          registration_id: 'be338e36-f259-4c30-9249-6328c1472fc0',
          template_name: 'ticket_simple',
          language_code: 'id',
          include_header: false // Tanpa header image
        })
      });

      const result2 = await response2.json();
      console.log('Response 2 Status:', response2.status);
      console.log('Response 2 Body:', JSON.stringify(result2, null, 2));
      
      if (response2.ok) {
        console.log('✅ SUCCESS without header image!');
      } else {
        console.log('❌ Still failed:', result2);
      }
      
    } else {
      console.log('✅ SUCCESS! WhatsApp sent with ticket_simple template');
      console.log('Message ID:', result.message_id);
      console.log('Recipient:', result.recipient);
      console.log('Template used:', result.template_used);
    }
    
  } catch (error) {
    console.error('Network Error:', error);
  }
};

// Jalankan test
testTicketSimple(); 