// Test script untuk memverifikasi format PDF
const jsPDF = require('jspdf');
require('jspdf-autotable');

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

console.log('🧪 Testing PDF Format...\n');

console.log('📋 Headers:', headers);
console.log('📊 Sample Data Count:', sampleData.length);
console.log('🔗 Header Mapping:', headerMapping);

// Initialize PDF
const pdf = new jsPDF('landscape', 'mm', 'a4');

// Set font for better Indonesian character support
pdf.setFont('helvetica');

// Add title
const title = 'Laporan Registrasi Event';
const subtitle = `Dibuat pada: ${new Date().toLocaleDateString('id-ID', { 
  day: '2-digit', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}`;

pdf.setFontSize(18);
pdf.setFont('helvetica', 'bold');
pdf.text(title, 14, 20);

pdf.setFontSize(12);
pdf.setFont('helvetica', 'normal');
pdf.text(subtitle, 14, 30);

// Add summary
const totalRegistrations = sampleData.length;
const approvedCount = sampleData.filter(row => row.status === 'approved').length;
const pendingCount = sampleData.filter(row => row.status === 'pending').length;
const checkedInCount = sampleData.filter(row => row.checkin_at).length;

pdf.setFontSize(10);
pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 45);
pdf.text(`Disetujui: ${approvedCount}`, 14, 52);
pdf.text(`Menunggu: ${pendingCount}`, 14, 59);
pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 66);

console.log('\n📊 Summary:');
console.log(`  Total Registrasi: ${totalRegistrations}`);
console.log(`  Disetujui: ${approvedCount}`);
console.log(`  Menunggu: ${pendingCount}`);
console.log(`  Sudah Check-in: ${checkedInCount}`);

// Prepare table data
const tableData = [];
sampleData.forEach((row, index) => {
  console.log(`\n🔍 Processing PDF row ${index + 1}:`, row);
  
  const rowData = headers.map(header => {
    const dataKey = headerMapping[header];
    if (!dataKey) {
      console.warn(`⚠️ No mapping found for header: ${header}`);
      return '';
    }
    
    const value = row[dataKey] || '';
    console.log(`  ${header} (${dataKey}): ${value}`);
    
    // Format dates for better readability
    if (header.includes('Tanggal') || header.includes('Waktu')) {
      if (value && typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return value;
        }
      }
    }
    
    return value;
  });
  
  console.log(`📝 PDF row ${index + 1}:`, rowData);
  tableData.push(rowData);
});

console.log('\n📊 Final Table Data:');
console.log(tableData);

// Create table
pdf.autoTable({
  head: [headers],
  body: tableData,
  startY: 80,
  styles: {
    fontSize: 8,
    cellPadding: 2,
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    textColor: [0, 0, 0],
  },
  headStyles: {
    fillColor: [41, 128, 185],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 9,
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245],
  },
  columnStyles: {
    0: { cellWidth: 25 }, // ID
    1: { cellWidth: 30 }, // Nama Peserta
    2: { cellWidth: 35 }, // Email
    3: { cellWidth: 25 }, // Nomor Telepon
    4: { cellWidth: 20 }, // Status
    5: { cellWidth: 25 }, // Tanggal Registrasi
    6: { cellWidth: 35 }, // Nama Event
    7: { cellWidth: 25 }, // Tanggal Event
    8: { cellWidth: 30 }, // Lokasi Event
    9: { cellWidth: 25 }, // Kode Tiket
    10: { cellWidth: 20 }, // Kode Pendek
    11: { cellWidth: 25 }, // Waktu Check-in
    12: { cellWidth: 25 }, // Lokasi Check-in
    13: { cellWidth: 30 }, // Catatan Check-in
  },
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  didDrawPage: function (data) {
    // Add page number
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.text(`Halaman ${data.pageNumber} dari ${pageCount}`, data.settings.margin.left, pdf.internal.pageSize.height - 10);
  }
});

// Save PDF
const fs = require('fs');
const pdfBuffer = pdf.output('arraybuffer');
fs.writeFileSync('test-registrations.pdf', Buffer.from(pdfBuffer));

console.log('\n✅ PDF file generated successfully!');
console.log('📄 File type: .pdf');
console.log('📋 Orientation: Landscape');
console.log('📋 Page size: A4');
console.log('📋 Column count:', headers.length);
console.log('📋 Row count:', tableData.length);
console.log('💾 Test file saved as: test-registrations.pdf'); 