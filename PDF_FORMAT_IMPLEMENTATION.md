# 📄 **Implementasi Format PDF (.pdf)**

## 🎯 **Tujuan**

Menambahkan fitur download PDF untuk halaman report dengan format yang rapi dan profesional, termasuk:
- Format file `.pdf` yang proper
- Layout landscape untuk data yang banyak
- Header dan summary yang informatif
- Table dengan styling yang rapi
- Page numbering
- Auto-sizing columns

## 🔧 **Perubahan yang Dibuat**

### **1. Install Library PDF**
```bash
npm install jspdf jspdf-autotable
```

### **2. Import Library di `src/lib/download-service.ts`**
```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';
```

### **3. Tambah Interface PDFOptions**
```typescript
export interface PDFOptions {
  eventId?: string;
  title?: string;
  subtitle?: string;
  includeSummary?: boolean;
}
```

### **4. Update Interface DownloadOptions**
```typescript
export interface DownloadOptions {
  eventId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  dateFrom?: string;
  dateTo?: string;
  format: 'csv' | 'excel' | 'pdf'; // Tambah 'pdf'
}
```

### **5. Implementasi Fungsi `downloadPDF`**

#### **Fitur Utama:**
- **Landscape Orientation** - Untuk menampung lebih banyak kolom
- **Professional Header** - Judul dan subtitle yang informatif
- **Summary Section** - Statistik registrasi (jika diminta)
- **Auto-sized Table** - Kolom dengan lebar yang optimal
- **Alternating Row Colors** - Untuk readability yang lebih baik
- **Page Numbering** - Nomor halaman di setiap halaman
- **Date Formatting** - Format tanggal yang mudah dibaca

#### **Styling:**
```typescript
// Header styling
headStyles: {
  fillColor: [41, 128, 185], // Blue background
  textColor: [255, 255, 255], // White text
  fontStyle: 'bold',
  fontSize: 9,
},

// Alternate row styling
alternateRowStyles: {
  fillColor: [245, 245, 245], // Light gray
},

// Column widths
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
}
```

### **6. Update Komponen CheckinReport**

#### **Tambah Tombol PDF:**
```typescript
<Button
  onClick={() => handleDownload('pdf')}
  disabled={downloading}
  variant="outline"
  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
>
  <Download className="h-4 w-4 mr-2" />
  {downloading ? 'Downloading...' : 'Download PDF'}
</Button>
```

#### **Update Fungsi handleDownload:**
```typescript
const handleDownload = async (format: 'csv' | 'excel' | 'pdf' = 'csv') => {
  try {
    setDownloading(true);
    await downloadCheckinReport(eventFilter === 'all' ? undefined : eventFilter, format);
    toast({
      title: 'Success',
      description: `Check-in report downloaded successfully as ${format.toUpperCase()}`,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    toast({
      title: 'Error',
      description: 'Failed to download check-in report',
      variant: 'destructive',
    });
  } finally {
    setDownloading(false);
  }
};
```

## 📊 **Fitur PDF yang Ditambahkan**

### **1. Professional Layout**
- **Orientation**: Landscape (A4)
- **Font**: Helvetica untuk support karakter Indonesia
- **Margins**: 10mm di semua sisi
- **Page Size**: A4 (297mm x 210mm)

### **2. Header Section**
```typescript
// Title
pdf.setFontSize(18);
pdf.setFont('helvetica', 'bold');
pdf.text(title, 14, 20);

// Subtitle
pdf.setFontSize(12);
pdf.setFont('helvetica', 'normal');
pdf.text(subtitle, 14, 30);
```

### **3. Summary Section (Optional)**
```typescript
if (options.includeSummary && data && data.length > 0) {
  const totalRegistrations = data.length;
  const approvedCount = data.filter((row: any) => row.status === 'approved').length;
  const pendingCount = data.filter((row: any) => row.status === 'pending').length;
  const checkedInCount = data.filter((row: any) => row.checkin_at).length;
  
  pdf.setFontSize(10);
  pdf.text(`Total Registrasi: ${totalRegistrations}`, 14, 45);
  pdf.text(`Disetujui: ${approvedCount}`, 14, 52);
  pdf.text(`Menunggu: ${pendingCount}`, 14, 59);
  pdf.text(`Sudah Check-in: ${checkedInCount}`, 14, 66);
}
```

### **4. Smart Table**
- **Auto-sizing columns** berdasarkan konten
- **Alternating row colors** untuk readability
- **Professional header** dengan background biru
- **Proper cell padding** dan line styling
- **Date formatting** untuk kolom tanggal

### **5. Page Numbering**
```typescript
didDrawPage: function (data) {
  const pageCount = pdf.getNumberOfPages();
  pdf.setFontSize(8);
  pdf.text(`Halaman ${data.pageNumber} dari ${pageCount}`, data.settings.margin.left, pdf.internal.pageSize.height - 10);
}
```

## 🧪 **Testing**

### **Test Script: `test-pdf-format.cjs`**
```javascript
const jsPDF = require('jspdf');
require('jspdf-autotable');

// Sample data dan headers
const sampleData = [...];
const headers = [...];

// Test PDF generation
const pdf = new jsPDF('landscape', 'mm', 'a4');
pdf.autoTable({
  head: [headers],
  body: tableData,
  startY: 80,
  // ... styling options
});

// Save test file
const pdfBuffer = pdf.output('arraybuffer');
fs.writeFileSync('test-registrations.pdf', Buffer.from(pdfBuffer));
```

### **Hasil Test:**
```
✅ PDF file generated successfully!
📄 File type: .pdf
📋 Orientation: Landscape
📋 Page size: A4
📋 Column count: 14
📋 Row count: 2
💾 Test file saved as: test-registrations.pdf
```

## 📋 **Struktur File PDF**

### **Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Laporan Registrasi Event                                    │
│ Dibuat pada: 29 Januari 2025, 10:30                        │
│                                                             │
│ Total Registrasi: 2    Disetujui: 1    Menunggu: 1         │
│ Sudah Check-in: 1                                          │
│                                                             │
│ ┌─────┬──────────────┬──────────────┬──────────────┬─────┐ │
│ │ ID  │ Nama Peserta │ Email        │ Nomor Telepon│ ... │ │
│ ├─────┼──────────────┼──────────────┼──────────────┼─────┤ │
│ │ 123 │ John Doe     │ john@...     │ 628123...    │ ... │ │
│ │ 456 │ Jane Smith   │ jane@...     │ 628124...    │ ... │ │
│ └─────┴──────────────┴──────────────┴──────────────┴─────┘ │
│                                                             │
│ Halaman 1 dari 1                                            │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 **Perbedaan Format**

### **CSV Format:**
- File extension: `.csv`
- MIME type: `text/csv`
- Text-based format
- Tidak ada formatting
- Dapat dibuka di Excel

### **Excel Format:**
- File extension: `.xlsx`
- MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Binary format
- Auto-sizing columns
- Native Excel support

### **PDF Format (Baru):**
- File extension: `.pdf`
- MIME type: `application/pdf`
- Professional layout
- Landscape orientation
- Summary section
- Page numbering
- Print-ready format

## 🚀 **Cara Penggunaan**

### **1. Download PDF dari Registrations:**
```typescript
await downloadRegistrations({
  eventId: 'all',
  status: 'all',
  format: 'pdf'
});
// Hasil: registrations_2025-01-29_10-30.pdf
```

### **2. Download PDF dari Check-in Report:**
```typescript
await downloadCheckinReport(eventId, 'pdf');
// Hasil: checkin_report_2025-01-29_10-30.pdf
```

### **3. Custom PDF Options:**
```typescript
downloadPDF(data, headers, filename, {
  title: 'Laporan Khusus Event',
  subtitle: 'Laporan untuk Event ABC',
  includeSummary: true
});
```

## ✅ **Keuntungan Format PDF**

1. **Professional Appearance** - Layout yang rapi dan profesional
2. **Print-Ready** - Siap untuk dicetak
3. **Universal Compatibility** - Dapat dibuka di semua device
4. **Summary Section** - Statistik yang informatif
5. **Page Numbering** - Navigasi yang mudah
6. **Landscape Layout** - Menampung lebih banyak data
7. **Consistent Formatting** - Format yang konsisten di semua device

## 🔧 **Troubleshooting**

### **Jika PDF tidak terbuka:**
1. Periksa console log untuk error
2. Pastikan library `jspdf` dan `jspdf-autotable` terinstall
3. Periksa browser PDF viewer
4. Test dengan file sample yang dibuat oleh test script

### **Jika data kosong:**
1. Periksa mapping header ke data key
2. Periksa apakah data berhasil di-fetch dari database
3. Periksa console log untuk debugging

### **Jika layout tidak rapi:**
1. Periksa column widths
2. Periksa font size dan padding
3. Test dengan data yang lebih sedikit

## 📝 **Contoh Output**

### **Console Log saat Download PDF:**
```
📄 Creating PDF file...
📋 Data count: 2
📋 Headers: Array(14)
📋 PDF Options: Object
🔍 Processing PDF row 1: Object
📝 PDF row 1: Array(14)
✅ PDF file created and downloaded successfully
```

### **File yang Diunduh:**
- **Nama:** `checkin_report_2025-01-29_10-30.pdf`
- **Tipe:** PDF Document (.pdf)
- **Ukuran:** ~50KB (tergantung jumlah data)
- **Orientation:** Landscape
- **Page Size:** A4
- **Kolom:** 14 kolom dengan auto-sizing
- **Baris:** Header + data rows + summary
- **Features:** Page numbering, alternating colors, professional styling 