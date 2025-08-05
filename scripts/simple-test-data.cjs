#!/usr/bin/env node

/**
 * Simple Test Data Creation untuk Batch Approve Testing
 * 
 * Script ini akan memberikan instruksi manual untuk membuat data test
 */

const fs = require('fs');
const path = require('path');

// Utility Functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function generateTestDataInstructions() {
  log('📋 MANUAL TEST DATA CREATION INSTRUCTIONS');
  log('');
  log('Untuk testing batch approve feature, Anda perlu membuat data test secara manual:');
  log('');
  log('1. Buka aplikasi di: http://localhost:8080');
  log('2. Login sebagai admin');
  log('3. Buat beberapa event test:');
  log('   - Event 1: "Tech Conference 2024"');
  log('   - Event 2: "Business Summit"');
  log('   - Event 3: "Creative Workshop"');
  log('');
  log('4. Untuk setiap event, buat beberapa registrations dengan status "pending":');
  log('   - John Smith (john.smith@example.com)');
  log('   - Jane Doe (jane.doe@example.com)');
  log('   - Michael Johnson (michael.johnson@example.com)');
  log('   - Sarah Wilson (sarah.wilson@example.com)');
  log('   - David Brown (david.brown@example.com)');
  log('');
  log('5. Pastikan ada minimal 5-10 registrations pending untuk testing');
  log('');
  log('ALTERNATIF: Gunakan SQL langsung di Supabase Dashboard');
  log('');
  log('1. Buka Supabase Dashboard');
  log('2. Pilih project Anda');
  log('3. Buka SQL Editor');
  log('4. Jalankan query berikut:');
  log('');
  
  const sqlQueries = `
-- Insert test events
INSERT INTO events (name, description, event_date, location, max_participants, whatsapp_enabled, registration_status, dresscode, created_by)
VALUES 
  ('Tech Conference 2024', 'Test event for batch approve', NOW() + INTERVAL '7 days', 'Test Location 1', 100, true, 'open', 'Business Casual', '00000000-0000-0000-0000-000000000000'),
  ('Business Summit', 'Test event for batch approve', NOW() + INTERVAL '14 days', 'Test Location 2', 100, false, 'open', 'Smart Casual', '00000000-0000-0000-0000-000000000000'),
  ('Creative Workshop', 'Test event for batch approve', NOW() + INTERVAL '21 days', 'Test Location 3', 100, true, 'open', 'Business Casual', '00000000-0000-0000-0000-000000000000');

-- Get the event IDs
WITH event_ids AS (
  SELECT id FROM events WHERE name IN ('Tech Conference 2024', 'Business Summit', 'Creative Workshop')
)
-- Insert test registrations
INSERT INTO registrations (event_id, participant_name, participant_email, phone_number, status, custom_data)
SELECT 
  e.id,
  CASE 
    WHEN rn = 1 THEN 'John Smith'
    WHEN rn = 2 THEN 'Jane Doe'
    WHEN rn = 3 THEN 'Michael Johnson'
    WHEN rn = 4 THEN 'Sarah Wilson'
    WHEN rn = 5 THEN 'David Brown'
    WHEN rn = 6 THEN 'Lisa Garcia'
    WHEN rn = 7 THEN 'Robert Miller'
    WHEN rn = 8 THEN 'Emily Davis'
    WHEN rn = 9 THEN 'James Wilson'
    WHEN rn = 10 THEN 'Maria Rodriguez'
  END,
  CASE 
    WHEN rn = 1 THEN 'john.smith@example.com'
    WHEN rn = 2 THEN 'jane.doe@example.com'
    WHEN rn = 3 THEN 'michael.johnson@example.com'
    WHEN rn = 4 THEN 'sarah.wilson@example.com'
    WHEN rn = 5 THEN 'david.brown@example.com'
    WHEN rn = 6 THEN 'lisa.garcia@example.com'
    WHEN rn = 7 THEN 'robert.miller@example.com'
    WHEN rn = 8 THEN 'emily.davis@example.com'
    WHEN rn = 9 THEN 'james.wilson@example.com'
    WHEN rn = 10 THEN 'maria.rodriguez@example.com'
  END,
  CASE 
    WHEN rn = 1 THEN '081234567890'
    WHEN rn = 2 THEN '081234567891'
    WHEN rn = 3 THEN '081234567892'
    WHEN rn = 4 THEN '081234567893'
    WHEN rn = 5 THEN '081234567894'
    WHEN rn = 6 THEN '081234567895'
    WHEN rn = 7 THEN '081234567896'
    WHEN rn = 8 THEN '081234567897'
    WHEN rn = 9 THEN '081234567898'
    WHEN rn = 10 THEN '081234567899'
  END,
  'pending',
  '{"company": "Test Company", "position": "Test Position", "dietary_restrictions": "None", "special_requests": ""}'
FROM event_ids e
CROSS JOIN generate_series(1, 10) AS rn;
`;

  console.log(sqlQueries);
  
  log('');
  log('6. Setelah menjalankan query, Anda akan memiliki:');
  log('   - 3 events test');
  log('   - 30 registrations pending (10 per event)');
  log('');
  log('7. Sekarang Anda bisa test batch approve feature!');
  log('');
  log('TESTING CHECKLIST:');
  log('✅ Login sebagai admin');
  log('✅ Buka halaman registrations');
  log('✅ Pilih beberapa registrations pending');
  log('✅ Klik "Batch Approve" button');
  log('✅ Pilih notification options');
  log('✅ Klik "Approve" untuk approve batch');
  log('✅ Verifikasi status berubah menjadi "Approved"');
  log('✅ Verifikasi QR tickets ter-generate');
  log('✅ Verifikasi notifications terkirim (jika diaktifkan)');
  log('');
}

function createTestReport() {
  const report = {
    timestamp: new Date().toISOString(),
    instructions: 'Manual test data creation instructions generated',
    testingSteps: [
      '1. Create test events manually or via SQL',
      '2. Create test registrations with pending status',
      '3. Test batch approve feature',
      '4. Verify functionality works correctly'
    ],
    expectedData: {
      events: 3,
      registrationsPerEvent: 10,
      totalRegistrations: 30,
      pendingRegistrations: 30,
      approvedRegistrations: 0
    }
  };
  
  // Save report to file
  const reportPath = './test-data-logs/manual-test-data-instructions.json';
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Test data instructions saved to: ${reportPath}`);
  
  return report;
}

// Main function
async function generateInstructions() {
  log('🚀 Generating Manual Test Data Instructions for Batch Approve Feature');
  log('');
  
  try {
    generateTestDataInstructions();
    const report = createTestReport();
    
    log('');
    log('=== INSTRUCTIONS GENERATION COMPLETE ===');
    log('✅ Manual test data instructions generated');
    log('✅ SQL queries provided for direct database insertion');
    log('✅ Testing checklist created');
    log('');
    log('🎯 Ready for manual test data creation!');
    log('');
    log('Next steps:');
    log('1. Follow the instructions above to create test data');
    log('2. Start development server: npm run dev');
    log('3. Test batch approve feature');
    log('');
    
  } catch (error) {
    log(`❌ Instructions generation failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  generateInstructions().catch(console.error);
}

module.exports = { generateInstructions }; 