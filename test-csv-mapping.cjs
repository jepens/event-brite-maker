// Test script untuk memverifikasi mapping CSV
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

console.log('🧪 Testing CSV Mapping...\n');

console.log('📋 Headers:', headers);
console.log('📊 Sample Data:', JSON.stringify(sampleData[0], null, 2));
console.log('🔗 Header Mapping:', headerMapping);

console.log('\n🔍 Testing mapping for each header:');
headers.forEach(header => {
  const dataKey = headerMapping[header];
  const value = sampleData[0][dataKey] || '';
  console.log(`  ${header} (${dataKey}): ${value}`);
});

console.log('\n📝 Testing CSV row generation:');
const csvHeaders = headers.join(',');
const csvRows = sampleData.map((row, index) => {
  console.log(`\n🔍 Processing row ${index + 1}:`, row);
  
  const rowData = headers.map(header => {
    const dataKey = headerMapping[header];
    if (!dataKey) {
      console.warn(`⚠️ No mapping found for header: ${header}`);
      return '';
    }
    
    const value = row[dataKey] || '';
    console.log(`  ${header} (${dataKey}): ${value}`);
    
    // Escape commas and quotes in CSV
    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
  
  console.log(`📝 Row ${index + 1}:`, rowData);
  return rowData;
});

const csv = [csvHeaders, ...csvRows].join('\n');
console.log('\n✅ Final CSV:');
console.log(csv); 