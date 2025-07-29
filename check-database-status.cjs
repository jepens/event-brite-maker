// Script untuk memeriksa status database dan kolom short_code
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

const checkDatabaseStatus = async () => {
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Environment variables not found!');
    console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    return;
  }

  console.log('🔍 Checking Database Status...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check if short_code column exists
    console.log('📋 Step 1: Checking if short_code column exists...');
    
    try {
      const { data: columnCheck, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'tickets' });

      if (columnError) {
        console.log('❌ Failed to check columns:', columnError.message);
        
        // Alternative: Try to select short_code directly
        console.log('\n🔄 Trying alternative method...');
        const { data: testSelect, error: testError } = await supabase
          .from('tickets')
          .select('short_code')
          .limit(1);

        if (testError) {
          console.log('❌ short_code column does not exist:', testError.message);
          console.log('\n🚨 SOLUTION: You need to run the database migration first!');
          console.log('Run: npx supabase db push');
          return;
        } else {
          console.log('✅ short_code column exists');
        }
      } else {
        console.log('✅ Column check successful');
        const hasShortCode = columnCheck.some(col => col.column_name === 'short_code');
        console.log(`✅ short_code column exists: ${hasShortCode}`);
      }
    } catch (error) {
      console.log('❌ Column check failed:', error.message);
    }

    // Step 2: Check tickets table structure
    console.log('\n📊 Step 2: Checking tickets table structure...');
    
    const { data: sampleTicket, error: sampleError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.log('❌ Failed to fetch sample ticket:', sampleError.message);
      return;
    }

    console.log('✅ Sample ticket structure:');
    console.log('📋 Columns in tickets table:');
    Object.keys(sampleTicket).forEach(key => {
      const value = sampleTicket[key];
      const hasValue = value !== null && value !== undefined;
      console.log(`  - ${key}: ${typeof value} ${hasValue ? `(${value})` : '(null)'}`);
    });

    // Step 3: Check for tickets without short codes
    console.log('\n🔍 Step 3: Checking for tickets without short codes...');
    
    const { data: ticketsWithoutShortCode, error: nullCheckError } = await supabase
      .from('tickets')
      .select('id, qr_code, short_code')
      .is('short_code', null);

    if (nullCheckError) {
      console.log('❌ Failed to check null short codes:', nullCheckError.message);
      return;
    }

    console.log(`✅ Found ${ticketsWithoutShortCode.length} tickets without short codes`);

    if (ticketsWithoutShortCode.length > 0) {
      console.log('\n📋 Tickets without short codes:');
      ticketsWithoutShortCode.slice(0, 5).forEach((ticket, index) => {
        console.log(`  ${index + 1}. ID: ${ticket.id}`);
        console.log(`     QR Code: ${ticket.qr_code.substring(0, 30)}...`);
        console.log(`     Short Code: ${ticket.short_code}`);
        console.log('');
      });

      if (ticketsWithoutShortCode.length > 5) {
        console.log(`  ... and ${ticketsWithoutShortCode.length - 5} more tickets`);
      }
    }

    // Step 4: Check for tickets with short codes
    console.log('\n✅ Step 4: Checking for tickets with short codes...');
    
    const { data: ticketsWithShortCode, error: shortCheckError } = await supabase
      .from('tickets')
      .select('id, short_code')
      .not('short_code', 'is', null);

    if (shortCheckError) {
      console.log('❌ Failed to check short codes:', shortCheckError.message);
      return;
    }

    console.log(`✅ Found ${ticketsWithShortCode.length} tickets with short codes`);

    if (ticketsWithShortCode.length > 0) {
      console.log('\n📋 Sample tickets with short codes:');
      ticketsWithShortCode.slice(0, 3).forEach((ticket, index) => {
        console.log(`  ${index + 1}. ID: ${ticket.id}`);
        console.log(`     Short Code: ${ticket.short_code}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📋 DATABASE STATUS SUMMARY:');
    console.log(`✅ Total tickets: ${ticketsWithoutShortCode.length + ticketsWithShortCode.length}`);
    console.log(`✅ Tickets with short codes: ${ticketsWithShortCode.length}`);
    console.log(`❌ Tickets without short codes: ${ticketsWithoutShortCode.length}`);
    
    if (ticketsWithoutShortCode.length > 0) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('Some tickets are missing short codes. Run the migration script:');
      console.log('node add-short-codes-to-existing-tickets.cjs');
    } else {
      console.log('\n🎉 All tickets have short codes!');
    }

  } catch (error) {
    console.error('❌ Database check failed with error:', error);
  }
};

// Run the check
checkDatabaseStatus(); 