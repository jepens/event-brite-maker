// Script untuk menambahkan short code ke tiket yang sudah ada
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

// Function to generate short code
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const addShortCodesToExistingTickets = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🔧 Adding Short Codes to Existing Tickets...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check existing tickets without short codes
    console.log('📋 Step 1: Checking existing tickets without short codes...');
    
    const { data: ticketsWithoutShortCode, error: fetchError } = await supabase
      .from('tickets')
      .select('id, qr_code, short_code, registration_id')
      .is('short_code', null);

    if (fetchError) {
      console.log('❌ Failed to fetch tickets:', fetchError.message);
      return;
    }

    console.log(`✅ Found ${ticketsWithoutShortCode.length} tickets without short codes`);

    if (ticketsWithoutShortCode.length === 0) {
      console.log('🎉 All tickets already have short codes!');
      return;
    }

    // Step 2: Generate and assign short codes
    console.log('\n🔧 Step 2: Generating and assigning short codes...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const ticket of ticketsWithoutShortCode) {
      try {
        // Generate unique short code
        let shortCode;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          shortCode = generateShortCode();
          attempts++;
          
          // Check if code already exists
          const { data: existingTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('short_code', shortCode)
            .single();
            
          if (!existingTicket) break;
          
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
          console.log(`⚠️  Could not generate unique short code for ticket ${ticket.id} after ${maxAttempts} attempts`);
          errorCount++;
          continue;
        }

        // Update ticket with short code
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ short_code: shortCode })
          .eq('id', ticket.id);

        if (updateError) {
          console.log(`❌ Failed to update ticket ${ticket.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Updated ticket ${ticket.id} with short code: ${shortCode}`);
          successCount++;
        }

      } catch (error) {
        console.log(`❌ Error processing ticket ${ticket.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 3: Verify results
    console.log('\n📊 Step 3: Verification...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('tickets')
      .select('id, short_code')
      .is('short_code', null);

    if (finalError) {
      console.log('❌ Failed to verify results:', finalError.message);
    } else {
      console.log(`✅ Verification complete: ${finalCheck.length} tickets still without short codes`);
    }

    // Summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📋 SUMMARY:');
    console.log(`✅ Successfully updated: ${successCount} tickets`);
    console.log(`❌ Failed to update: ${errorCount} tickets`);
    console.log(`📊 Total processed: ${ticketsWithoutShortCode.length} tickets`);
    
    if (successCount > 0) {
      console.log('\n🎉 Short codes have been added to existing tickets!');
      console.log('🔄 Please refresh your admin dashboard to see the changes.');
    }

  } catch (error) {
    console.error('❌ Script failed with error:', error);
  }
};

// Run the script
addShortCodesToExistingTickets(); 