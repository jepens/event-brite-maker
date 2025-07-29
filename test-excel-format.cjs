// Test script untuk memverifikasi format Excel
const XLSX = require('xlsx');

const sampleData = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    participant_name: 'John Doe',
    participant_email: 'john.doe@example.com',
    phone_number: '6281234567890',
    status: 'approved',
    registered_at: '2025-01-29T10:00:00Z',
    event_name: 'Sample Event',
    event_date: '2025-02-05T10:00:00Z',
    event_location: 'Sample Location',
    ticket_code: 'QR_123_1706520000000',
    ticket_short_code: 'SCABC123',
    checkin_at: '2025-01-29T11:00:00Z',
    checkin_location: 'Main Entrance',
    checkin_notes: 'Checked in via QR scanner'
  },
  {
    id: '456e7890-e89b-12d3-a456-426614174001',
    participant_name: 'Jane Smith',
    participant_email: 'jane.smith@example.com',
    phone_number: '6281234567891',
    status: 'pending',
    registered_at: '2025-01-29T11:00:00Z',
    event_name: 'Sample Event',
    event_date: '2025-02-05T10:00:00Z',
    event_location: 'Sample Location',
    ticket_code: '',
    ticket_short_code: '',
    checkin_at: '',
    checkin_location: '',
    checkin_notes: ''
  }
];

const headers = [
  'ID',
  'Nama Peserta',
  'Email',
  'Nomor Telepon',
  'Status',
  'Tanggal Registrasi',
  'Nama Event',
  'Tanggal Event',
  'Lokasi Event',
  'Kode Tiket',
  'Kode Pendek',
  'Waktu Check-in',
  'Lokasi Check-in',
  'Catatan Check-in'
];

// Create mapping from Indonesian headers to English data keys
const headerMapping = {
  'ID': 'id',
  'Nama Peserta': 'participant_name',
  'Email': 'participant_email',
  'Nomor Telepon': 'phone_number',
  'Status': 'status',
  'Tanggal Registrasi': 'registered_at',
  'Nama Event': 'event_name',
  'Tanggal Event': 'event_date',
  'Lokasi Event': 'event_location',
  'Kode Tiket': 'ticket_code',
  'Kode Pendek': 'ticket_short_code',
  'Waktu Check-in': 'checkin_at',
  'Lokasi Check-in': 'checkin_location',
  'Catatan Check-in': 'checkin_notes'
};

console.log('🧪 Testing Excel Format...\n');

console.log('📋 Headers:', headers);
console.log('📊 Sample Data Count:', sampleData.length);
console.log('🔗 Header Mapping:', headerMapping);

// Prepare data for Excel
const excelData = [];

// Add headers as first row
excelData.push(headers);

// Add data rows
sampleData.forEach((row, index) => {
  console.log(`\n🔍 Processing Excel row ${index + 1}:`, row);
  
  const rowData = headers.map(header => {
    const dataKey = headerMapping[header];
    if (!dataKey) {
      console.warn(`⚠️ No mapping found for header: ${header}`);
      return '';
    }
    
    const value = row[dataKey] || '';
    console.log(`  ${header} (${dataKey}): ${value}`);
    return value;
  });
  
  console.log(`📝 Excel row ${index + 1}:`, rowData);
  excelData.push(rowData);
});

console.log('\n📊 Final Excel Data Structure:');
console.log(excelData);

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(excelData);

// Set column widths based on content
const columnWidths = headers.map(header => ({
  wch: Math.max(header.length, 15) // Minimum width 15, or header length
}));

console.log('\n📏 Column Widths:', columnWidths);

// Apply column widths
worksheet['!cols'] = columnWidths;

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

// Generate Excel file
const excelBuffer = XLSX.write(workbook, { 
  bookType: 'xlsx', 
  type: 'array',
  bookSST: false
});

console.log('\n✅ Excel file generated successfully!');
console.log('📊 Buffer size:', excelBuffer.length, 'bytes');
console.log('📋 File type: .xlsx');
console.log('📋 Worksheet name: Registrations');
console.log('📋 Column count:', headers.length);
console.log('📋 Row count:', excelData.length);

// Save to file for testing
const fs = require('fs');
const buffer = Buffer.from(excelBuffer);
fs.writeFileSync('test-registrations.xlsx', buffer);
console.log('\n💾 Test file saved as: test-registrations.xlsx'); 