# 🔧 **Perbaikan Masalah Download CSV Kosong**

## 📋 **Masalah yang Ditemukan**

Berdasarkan screenshot yang Anda berikan, file CSV yang didownload hanya berisi header tanpa data registrasi. Ini menunjukkan bahwa:

1. **Query database tidak mengembalikan data** - Kemungkinan tidak ada data registrasi di database
2. **Filter yang terlalu ketat** - Filter event atau status mungkin tidak cocok dengan data yang ada
3. **Masalah RLS (Row Level Security)** - Kemungkinan ada pembatasan akses data

## 🔍 **Diagnosis yang Dilakukan**

### **1. Logging yang Ditambahkan**
Saya telah menambahkan logging yang komprehensif di `src/lib/download-service.ts`:

```typescript
// Di fetchRegistrationData()
console.log('🔍 Fetching registration data with options:', options);
console.log('📊 Raw data from database:', data?.length || 0, 'records');
console.log('✅ Mapped data count:', mappedData.length);

// Di downloadRegistrations()
console.log('🔍 Downloading registrations with options:', options);
console.log('📊 Fetched data count:', data?.length || 0);
console.log('📋 Headers:', headers);
```

### **2. Penanganan Data Kosong**
Sekarang sistem akan menangani kasus ketika tidak ada data:

```typescript
// Check if we have data
if (!data || data.length === 0) {
  console.log('⚠️ No data found, creating CSV with headers only');
  // Create CSV with headers only
  const csvHeaders = headers.join(',');
  const csv = csvHeaders + '\n'; // Add empty row to show headers
  
  // Download empty CSV with headers
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  // ... download logic
}
```

### **3. Perbaikan CSV Conversion**
Fungsi `convertToCSV` sekarang menangani data kosong dengan lebih baik:

```typescript
if (!data || data.length === 0) {
  console.log('⚠️ No data to convert, returning headers only');
  return csvHeaders + '\n'; // Return headers with empty row
}
```

## 🛠️ **Langkah-langkah Perbaikan**

### **1. Jalankan Aplikasi dengan Logging**
```bash
npm run dev
```

### **2. Buka Browser Developer Tools**
- Tekan F12
- Buka tab Console
- Coba download CSV dari Admin Dashboard

### **3. Periksa Log Output**
Anda akan melihat log seperti:
```
🔍 Downloading registrations with options: {eventId: "all", status: "all", format: "csv"}
🔍 Fetching registration data with options: {eventId: "all", status: "all", format: "csv"}
📊 Raw data from database: 0 records
✅ Mapped data count: 0
⚠️ No data found, creating CSV with headers only
✅ Downloaded empty CSV with headers
```

### **4. Jika Tidak Ada Data, Buat Sample Data**
Jalankan script untuk membuat data sample:

```bash
# Pastikan Supabase local berjalan
npx supabase start

# Jalankan script untuk membuat sample data
node create-sample-data.cjs
```

## 📊 **Struktur Data yang Diharapkan**

### **Registrations Table**
```sql
- id (UUID)
- participant_name (TEXT)
- participant_email (TEXT)
- phone_number (TEXT, optional)
- status (ENUM: 'pending', 'approved', 'rejected')
- registered_at (TIMESTAMP)
- event_id (UUID, foreign key)
- custom_data (JSONB)
```

### **Events Table**
```sql
- id (UUID)
- name (TEXT)
- description (TEXT)
- event_date (TIMESTAMP)
- location (TEXT)
- max_participants (INTEGER)
- branding_config (JSONB)
- custom_fields (JSONB)
```

### **Tickets Table**
```sql
- id (UUID)
- registration_id (UUID, foreign key)
- qr_code (TEXT)
- short_code (TEXT)
- status (ENUM: 'unused', 'used')
- checkin_at (TIMESTAMP, optional)
- checkin_location (TEXT, optional)
- checkin_notes (TEXT, optional)
```

## 🔧 **Troubleshooting**

### **Jika Masih Kosong:**

1. **Periksa Database Connection**
   ```bash
   npx supabase status
   ```

2. **Periksa Data di Database**
   ```bash
   npx supabase db reset
   node create-sample-data.cjs
   ```

3. **Periksa RLS Policies**
   - Pastikan user yang login memiliki akses ke data
   - Periksa policy di tabel registrations, events, tickets

4. **Periksa Filter**
   - Coba download tanpa filter (pilih "All Events" dan "All Status")
   - Periksa apakah event_id yang dipilih ada di database

### **Jika Ada Data Tapi Tidak Terdownload:**

1. **Periksa Console Logs**
   - Lihat apakah ada error di browser console
   - Periksa network tab untuk request ke Supabase

2. **Periksa Query**
   - Log akan menunjukkan query yang dijalankan
   - Periksa apakah join dengan events dan tickets berhasil

## 📝 **Contoh Output CSV yang Benar**

Jika ada data, CSV akan terlihat seperti:
```csv
ID,Nama Peserta,Email,Nomor Telepon,Status,Tanggal Registrasi,Nama Event,Tanggal Event,Lokasi Event,Kode Tiket,Kode Pendek,Waktu Check-in,Lokasi Check-in,Catatan Check-in
123e4567-e89b-12d3-a456-426614174000,John Doe,john.doe@example.com,6281234567890,approved,2025-01-29T10:00:00Z,Sample Event,2025-02-05T10:00:00Z,Sample Location,QR_123_1706520000000,SCABC123,2025-01-29T11:00:00Z,Main Entrance,Checked in via QR scanner
```

## ✅ **Hasil yang Diharapkan**

Setelah perbaikan ini:

1. **Jika ada data**: CSV akan berisi data registrasi lengkap
2. **Jika tidak ada data**: CSV akan berisi header saja dengan pesan yang jelas
3. **Logging yang informatif**: Console akan menunjukkan apa yang terjadi
4. **Error handling yang lebih baik**: Pesan error yang jelas jika ada masalah
5. **Mapping yang benar**: Header Indonesia akan dipetakan ke key data Inggris dengan benar
6. **Format Excel yang proper**: File `.xlsx` dengan auto-sizing columns dan proper structure

## 🔧 **Perbaikan Terbaru (Mapping CSV)**

### **Masalah yang Ditemukan:**
- Header CSV menggunakan bahasa Indonesia: `"Nama Peserta", "Email", "Status", dll.`
- Data object menggunakan key bahasa Inggris: `participant_name`, `participant_email`, `status`, dll.
- Fungsi `convertToCSV` tidak bisa memetakan header ke data dengan benar

### **Solusi yang Diterapkan:**
```typescript
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
```

### **Logging yang Ditambahkan:**
```typescript
console.log(`🔍 Processing row ${index + 1}:`, row);
console.log(`  ${header} (${dataKey}): ${value}`);
console.log(`📝 Row ${index + 1}:`, rowData);
```

## 🚀 **Langkah Selanjutnya**

1. **Test dengan data sample** yang dibuat oleh script
2. **Periksa logging** di browser console
3. **Verifikasi data** di database menggunakan Supabase Studio
4. **Test berbagai filter** untuk memastikan semua berfungsi
5. **Test format Excel** dengan klik tombol "Download Excel"
6. **Buka file Excel** di Microsoft Excel untuk verifikasi format
7. **Test format PDF** dengan klik tombol "Download PDF" di halaman Reports
8. **Buka file PDF** di browser atau PDF viewer untuk verifikasi format

## 📊 **Format Excel yang Baru**

### **Fitur Excel (.xlsx):**
- ✅ File extension: `.xlsx` (bukan `.csv`)
- ✅ Auto-sizing column width
- ✅ Proper worksheet structure
- ✅ Native Excel format
- ✅ Better data formatting

### **Library yang Digunakan:**
- `xlsx` - Library untuk membuat file Excel
- Auto-sizing columns berdasarkan header length
- Proper MIME type untuk Excel files

## 📄 **Format PDF yang Baru**

### **Fitur PDF (.pdf):**
- ✅ File extension: `.pdf`
- ✅ Landscape orientation untuk data yang banyak
- ✅ Professional header dan summary
- ✅ Auto-sizing table dengan styling rapi
- ✅ Page numbering
- ✅ Print-ready format

### **Library yang Digunakan:**
- `jspdf` - Library untuk membuat file PDF
- `jspdf-autotable` - Plugin untuk table di PDF
- Professional styling dengan alternating colors
- Date formatting untuk readability yang lebih baik

Jika masih ada masalah, berikan output dari console log agar saya bisa membantu lebih lanjut. 