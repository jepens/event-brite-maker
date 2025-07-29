// Test script untuk template ticket_beautiful yang baru
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

const testTicketBeautiful = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Environment variables not found!');
    return;
  }

  try {
    console.log('Testing new ticket_beautiful template...');
    
    // Reset WhatsApp status first
    console.log('Resetting WhatsApp status...');
    const resetResponse = await fetch(`${SUPABASE_URL}/rest/v1/tickets?registration_id=eq.be338e36-f259-4c30-9249-6328c1472fc0`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        whatsapp_sent: false,
        whatsapp_sent_at: null
      })
    });

    if (resetResponse.ok) {
      console.log('✅ WhatsApp status reset successfully');
    } else {
      console.log('⚠️ Could not reset WhatsApp status, continuing anyway...');
    }
    
    // Test dengan template ticket_beautiful yang baru
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        registration_id: 'be338e36-f259-4c30-9249-6328c1472fc0',
        template_name: 'ticket_beautiful', // Template baru yang cantik
        language_code: 'id',
        include_header: true // Dengan header image (QR code)
      })
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error('❌ Error:', result);
    } else {
      console.log('✅ SUCCESS! WhatsApp sent with ticket_beautiful template');
      console.log('Message ID:', result.message_id);
      console.log('Recipient:', result.recipient);
      console.log('Template used:', result.template_used);
    }
    
  } catch (error) {
    console.error('Network Error:', error);
  }
};

// Jalankan test
testTicketBeautiful(); 