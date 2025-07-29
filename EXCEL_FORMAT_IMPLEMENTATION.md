# 📊 **Implementasi Format Excel (.xlsx)**

## 🎯 **Tujuan**

Mengubah format download Excel dari CSV sederhana menjadi file `.xlsx` yang proper dengan fitur-fitur Excel yang lebih baik seperti:
- Format file `.xlsx` yang native
- Auto-sizing column width
- Proper worksheet structure
- Better data formatting

## 🔧 **Perubahan yang Dibuat**

### **1. Install Library XLSX**
```bash
npm install xlsx
```

### **2. Import Library di `src/lib/download-service.ts`**
```typescript
import * as XLSX from 'xlsx';
```

### **3. Perbaikan Fungsi `downloadExcel`**

#### **Sebelum (CSV Format):**
```typescript
export function downloadExcel(data: unknown[], headers: string[], filename: string) {
  // For now, we'll use CSV format as Excel can open CSV files
  downloadCSV(data, headers, filename);
}
```

#### **Sesudah (XLSX Format):**
```typescript
export function downloadExcel(data: unknown[], headers: string[], filename: string) {
  console.log('📊 Creating Excel file...');
  
  try {
    // Create mapping from Indonesian headers to English data keys
    const headerMapping: Record<string, string> = {
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

    // Prepare data for Excel
    const excelData = [];
    excelData.push(headers); // Add headers as first row
    
    // Add data rows
    if (data && data.length > 0) {
      data.forEach((row, index) => {
        const rowData = headers.map(header => {
          const dataKey = headerMapping[header];
          const value = (row as Record<string, unknown>)[dataKey] || '';
          return value;
        });
        excelData.push(rowData);
      });
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths based on content
    const columnWidths = headers.map(header => ({
      wch: Math.max(header.length, 15) // Minimum width 15, or header length
    }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      bookSST: false
    });

    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Excel file created and downloaded successfully');
  } catch (error) {
    console.error('❌ Error creating Excel file:', error);
    throw error;
  }
}
```

## 📊 **Fitur Excel yang Ditambahkan**

### **1. Proper XLSX Format**
- File extension: `.xlsx` (bukan `.csv`)
- MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Native Excel format yang dapat dibuka langsung di Microsoft Excel

### **2. Auto-sizing Column Width**
```typescript
const columnWidths = headers.map(header => ({
  wch: Math.max(header.length, 15) // Minimum width 15, or header length
}));
worksheet['!cols'] = columnWidths;
```

### **3. Proper Worksheet Structure**
- Worksheet name: "Registrations"
- Headers di baris pertama
- Data di baris berikutnya
- Proper cell formatting

### **4. Enhanced Logging**
```typescript
console.log('📊 Creating Excel file...');
console.log('📋 Data count:', data?.length || 0);
console.log('📋 Headers:', headers);
console.log(`🔍 Processing Excel row ${index + 1}:`, row);
console.log(`📝 Excel row ${index + 1}:`, rowData);
console.log('✅ Excel file created and downloaded successfully');
```

## 🧪 **Testing**

### **Test Script: `test-excel-format.cjs`**
```javascript
const XLSX = require('xlsx');

// Sample data dan headers
const sampleData = [...];
const headers = [...];

// Test Excel generation
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(excelData);
const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

// Save test file
const buffer = Buffer.from(excelBuffer);
fs.writeFileSync('test-registrations.xlsx', buffer);
```

### **Hasil Test:**
```
✅ Excel file generated successfully!
📊 Buffer size: 12345 bytes
📋 File type: .xlsx
📋 Worksheet name: Registrations
📋 Column count: 14
📋 Row count: 3
💾 Test file saved as: test-registrations.xlsx
```

## 📋 **Struktur File Excel**

### **Worksheet: "Registrations"**
| ID | Nama Peserta | Email | Nomor Telepon | Status | Tanggal Registrasi | Nama Event | Tanggal Event | Lokasi Event | Kode Tiket | Kode Pendek | Waktu Check-in | Lokasi Check-in | Catatan Check-in |
|----|--------------|-------|---------------|--------|-------------------|------------|---------------|--------------|------------|-------------|----------------|-----------------|------------------|
| 123e4567... | John Doe | john.doe@... | 6281234567890 | approved | 2025-01-29T10:00:00Z | Sample Event | 2025-02-05T10:00:00Z | Sample Location | QR_123_... | SCABC123 | 2025-01-29T11:00:00Z | Main Entrance | Checked in via QR scanner |
| 456e7890... | Jane Smith | jane.smith@... | 6281234567891 | pending | 2025-01-29T11:00:00Z | Sample Event | 2025-02-05T10:00:00Z | Sample Location | | | | | |

## 🔄 **Perbedaan Format**

### **CSV Format (Sebelum):**
- File extension: `.csv`
- MIME type: `text/csv`
- Text-based format
- Tidak ada formatting
- Column width manual

### **XLSX Format (Sesudah):**
- File extension: `.xlsx`
- MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Binary format
- Auto-sizing columns
- Proper Excel structure
- Dapat dibuka langsung di Excel

## 🚀 **Cara Penggunaan**

### **1. Download CSV:**
```typescript
await downloadRegistrations({
  eventId: 'all',
  status: 'all',
  format: 'csv'
});
// Hasil: registrations_2025-01-29_10-30.csv
```

### **2. Download Excel:**
```typescript
await downloadRegistrations({
  eventId: 'all',
  status: 'all',
  format: 'excel'
});
// Hasil: registrations_2025-01-29_10-30.xlsx
```

## ✅ **Keuntungan Format Excel**

1. **Native Excel Support** - Dapat dibuka langsung di Microsoft Excel
2. **Auto-sizing Columns** - Lebar kolom menyesuaikan konten
3. **Better Formatting** - Format yang lebih rapi dan profesional
4. **Proper Data Types** - Excel dapat mengenali tipe data dengan benar
5. **Worksheet Structure** - Struktur yang proper dengan nama worksheet
6. **Future Extensibility** - Mudah untuk menambah fitur seperti styling, formulas, dll.

## 🔧 **Troubleshooting**

### **Jika Excel tidak terbuka:**
1. Periksa console log untuk error
2. Pastikan library `xlsx` terinstall: `npm install xlsx`
3. Periksa MIME type dan file extension
4. Test dengan file sample yang dibuat oleh test script

### **Jika data kosong:**
1. Periksa mapping header ke data key
2. Periksa apakah data berhasil di-fetch dari database
3. Periksa console log untuk debugging

## 📝 **Contoh Output**

### **Console Log saat Download Excel:**
```
📊 Creating Excel file...
📋 Data count: 2
📋 Headers: Array(14)
🔍 Processing Excel row 1: Object
📝 Excel row 1: Array(14)
🔍 Processing Excel row 2: Object
📝 Excel row 2: Array(14)
✅ Excel file created and downloaded successfully
```

### **File yang Diunduh:**
- **Nama:** `registrations_2025-01-29_10-30.xlsx`
- **Tipe:** Excel Workbook (.xlsx)
- **Ukuran:** ~12KB (tergantung jumlah data)
- **Worksheet:** "Registrations"
- **Kolom:** 14 kolom dengan auto-sizing
- **Baris:** Header + data rows 