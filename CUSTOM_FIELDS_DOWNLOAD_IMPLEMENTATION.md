# Custom Fields Download Implementation

## 📋 Overview

Implementasi ini menambahkan dukungan untuk menampilkan data dari "Basic Info" dan "Custom Fields" dalam laporan download (CSV, Excel, PDF) untuk registrasi event.

## 🔧 Perubahan yang Dilakukan

### 1. **Update Interface RegistrationData**
- Menambahkan field `event_custom_fields?: any[]` untuk menyimpan definisi custom fields dari event

### 2. **Update Query Database**
- Memodifikasi `fetchRegistrationData()` untuk mengambil `custom_fields` dari tabel events
- Menambahkan `custom_fields` ke dalam select query

### 3. **Fungsi Baru yang Ditambahkan**

#### `flattenRegistrationData(data: RegistrationData[])`
- Mengflatten data registration dengan custom fields
- Menggabungkan data basic info dengan custom fields
- Menggunakan field label sebagai key untuk custom fields

#### `getRegistrationHeaders(data?: RegistrationData[])`
- Menggenerate headers dinamis berdasarkan custom fields
- Menambahkan custom field labels ke dalam headers
- Fallback ke base headers jika tidak ada data

#### `generateColumnStyles(headers: string[])`
- Menggenerate column widths untuk PDF secara dinamis
- Mengatur width yang optimal untuk setiap jenis header
- Menangani custom fields dengan width yang reasonable

### 4. **Update Fungsi Download**

#### CSV Download
- Mengupdate `convertToCSV()` untuk menangani custom fields
- Menggunakan header sebagai key langsung jika tidak ada mapping

#### Excel Download
- Mengupdate `downloadExcel()` untuk menangani custom fields
- Mengatur column widths yang optimal untuk custom fields

#### PDF Download
- Mengupdate `downloadPDF()` untuk menangani custom fields
- Menggunakan `generateColumnStyles()` untuk column widths dinamis

### 5. **Update Main Download Function**
- Mengupdate `downloadRegistrations()` untuk menggunakan data yang di-flatten
- Menggunakan headers dinamis berdasarkan custom fields

## 📊 Struktur Data

### Basic Info (Data Dasar)
```typescript
{
  id: string;
  participant_name: string;        // Nama Peserta
  participant_email: string;       // Email
  phone_number?: string;          // Nomor Telepon/WhatsApp
  status: string;                 // Status Registrasi
  registered_at: string;          // Tanggal Registrasi
  event_name: string;             // Nama Event
  event_date?: string;            // Tanggal Event
  event_location?: string;        // Lokasi Event
  ticket_code?: string;           // Kode Tiket
  ticket_short_code?: string;     // Kode Pendek
  checkin_at?: string;            // Waktu Check-in
  checkin_location?: string;      // Lokasi Check-in
  checkin_notes?: string;         // Catatan Check-in
}
```

### Custom Fields (Data Dinamis)
```typescript
{
  custom_data: Record<string, unknown>;  // Data custom fields dari user
  event_custom_fields: any[];            // Definisi custom fields dari event
}
```

## 🚀 Cara Kerja

### 1. **Data Fetching**
```typescript
// Query mengambil custom_fields dari events
const query = supabase
  .from('registrations')
  .select(`
    ...,
    events (
      ...,
      custom_fields  // ← Ditambahkan
    )
  `);
```

### 2. **Data Flattening**
```typescript
// Menggabungkan basic info dengan custom fields
const flattenedData = data.map(registration => {
  const baseData = { /* basic info */ };
  const customData = {};
  
  // Extract custom fields data
  registration.event_custom_fields.forEach(field => {
    const fieldName = field.name;
    const fieldValue = registration.custom_data?.[fieldName] || '';
    customData[field.label || field.name] = fieldValue;
  });
  
  return { ...baseData, ...customData };
});
```

### 3. **Dynamic Headers**
```typescript
// Generate headers berdasarkan custom fields
const headers = [
  // Base headers
  'ID', 'Nama Peserta', 'Email', 'Nomor Telepon', 'Status',
  'Tanggal Registrasi', 'Nama Event', 'Tanggal Event', 'Lokasi Event',
  'Kode Tiket', 'Kode Pendek', 'Waktu Check-in', 'Lokasi Check-in', 'Catatan Check-in',
  
  // Custom field headers (dinamis)
  ...customFields.map(field => field.label || field.name)
];
```

### 4. **Download Processing**
```typescript
// Semua format download menggunakan data yang sudah di-flatten
downloadCSV(flattenedData, headers, filename);
downloadExcel(flattenedData, headers, filename);
downloadPDF(flattenedData, headers, filename, options);
```

## 📁 File yang Dimodifikasi

### `src/lib/download-service.ts`
- ✅ Update interface `RegistrationData`
- ✅ Update `fetchRegistrationData()`
- ✅ Tambah `flattenRegistrationData()`
- ✅ Update `getRegistrationHeaders()`
- ✅ Tambah `generateColumnStyles()`
- ✅ Update `convertToCSV()`
- ✅ Update `downloadExcel()`
- ✅ Update `downloadPDF()`
- ✅ Update `downloadRegistrations()`

## 🎯 Hasil Implementasi

### Sebelum Implementasi
```
CSV/Excel/PDF hanya menampilkan:
- ID, Nama Peserta, Email, Nomor Telepon, Status
- Tanggal Registrasi, Nama Event, Tanggal Event, Lokasi Event
- Kode Tiket, Kode Pendek, Waktu Check-in, Lokasi Check-in, Catatan Check-in
```

### Setelah Implementasi
```
CSV/Excel/PDF menampilkan:
- Semua data basic info (seperti sebelumnya)
- PLUS semua custom fields yang didefinisikan per event
- Contoh: "Member Number", "Company", "Position", "Dietary Requirements", dll.
```

## 🔍 Testing

### Test Case 1: Event dengan Custom Fields
1. Buat event dengan custom fields:
   - Member Number (required)
   - Company
   - Position
   - Dietary Requirements

2. Register beberapa peserta dengan data custom fields

3. Download laporan dalam format CSV/Excel/PDF

4. Verifikasi custom fields muncul di laporan

### Test Case 2: Event tanpa Custom Fields
1. Buat event tanpa custom fields

2. Register beberapa peserta

3. Download laporan

4. Verifikasi hanya basic info yang muncul

### Test Case 3: Mixed Events
1. Download laporan untuk multiple events dengan custom fields berbeda

2. Verifikasi custom fields muncul sesuai dengan event masing-masing

## 🚨 Catatan Penting

1. **Custom fields hanya berlaku untuk registrations, bukan check-in reports**
2. **Column widths diatur secara dinamis berdasarkan jenis header**
3. **Custom fields menggunakan field label sebagai header**
4. **Data custom fields diambil dari field `custom_data` di database**
5. **Implementasi backward compatible dengan data lama**

## 🔧 Troubleshooting

### Jika custom fields tidak muncul:
1. Periksa apakah event memiliki custom fields yang didefinisikan
2. Periksa apakah data tersimpan di field `custom_data`
3. Periksa console log untuk debugging

### Jika column widths tidak optimal:
1. Periksa fungsi `generateColumnStyles()`
2. Sesuaikan width untuk custom fields jika diperlukan

### Jika data tidak ter-flatten dengan benar:
1. Periksa fungsi `flattenRegistrationData()`
2. Periksa mapping antara field name dan field label

## ✅ Status Implementasi

- [x] Update database query
- [x] Implement flattening function
- [x] Implement dynamic headers
- [x] Update CSV download
- [x] Update Excel download
- [x] Update PDF download
- [x] Update column styles
- [x] Testing dan dokumentasi

**Status: ✅ COMPLETE** 