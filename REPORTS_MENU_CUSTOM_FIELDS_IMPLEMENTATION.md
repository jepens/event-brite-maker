# 📊 Reports Menu Custom Fields Implementation

## 🎯 Overview

Implementation untuk menambahkan data "Basic Info" dan "Custom Field" ke dalam fitur download di menu Reports (Check-in Reports). Fitur ini memungkinkan admin untuk mengunduh laporan check-in yang mencakup semua data yang diisi oleh user saat registrasi.

## 🔧 Changes Made

### 1. **Updated CheckinReportData Interface**
- Menambahkan `custom_data?: Record<string, unknown>` untuk menyimpan data custom yang diisi user
- Menambahkan `event_custom_fields?: any[]` untuk menyimpan definisi custom fields dari event

```typescript
export interface CheckinReportData {
  // ... existing fields ...
  custom_data?: Record<string, unknown>;
  event_custom_fields?: any[];
}
```

### 2. **Enhanced fetchCheckinReportData Function**
- Memodifikasi query untuk mengambil data custom dari tabel `registrations`
- Menambahkan join dengan tabel `events` untuk mendapatkan `custom_fields`
- Membuat mapping antara `registration_id` dan custom data

```typescript
// Get registration data with custom fields for each event
const registrationQuery = supabase
  .from('registrations')
  .select(`
    id,
    custom_data,
    events (
      id,
      custom_fields
    )
  `)
  .eq('status', 'approved');
```

### 3. **New flattenCheckinReportData Function**
- Fungsi baru untuk meratakan data check-in report dengan custom fields
- Menggabungkan data dasar check-in dengan data custom yang diisi user

```typescript
export function flattenCheckinReportData(data: CheckinReportData[]): Record<string, unknown>[] {
  return data.map(report => {
    const baseData = {
      participant_name: report.participant_name,
      // ... other basic fields ...
    };

    // Add custom fields
    const customData: Record<string, unknown> = {};
    if (report.custom_data && report.event_custom_fields) {
      report.event_custom_fields.forEach((field: any) => {
        const fieldName = field.name;
        const fieldValue = report.custom_data?.[fieldName] || '';
        customData[field.label || field.name] = fieldValue;
      });
    }

    return { ...baseData, ...customData };
  });
}
```

### 4. **Updated getCheckinReportHeaders Function**
- Mengubah fungsi menjadi dinamis untuk menangani custom fields
- Menambahkan lebih banyak header dasar untuk informasi lengkap
- Menghasilkan header custom berdasarkan `event_custom_fields`

```typescript
export function getCheckinReportHeaders(data?: CheckinReportData[]): string[] {
  const baseHeaders = [
    'Nama Peserta',
    'Email',
    'Nomor Telepon',
    'Status Kehadiran',
    'Waktu Check-in',
    'Lokasi Check-in',
    'Catatan Check-in',
    'Checked-in Oleh',
    'Nama Event',
    'Tanggal Event',
    'Lokasi Event',
    'Kode Tiket',
    'Kode Pendek'
  ];

  if (!data || data.length === 0) {
    return baseHeaders;
  }

  // Get custom fields from the first report
  const firstReport = data[0];
  const customFields = firstReport.event_custom_fields || [];
  const customHeaders = customFields.map((field: any) => field.label || field.name);

  return [...baseHeaders, ...customHeaders];
}
```

### 5. **Enhanced downloadCheckinReport Function**
- Menggunakan dynamic headers dan flattened data
- Menambahkan logging untuk debugging
- Menangani kasus ketika tidak ada data

```typescript
const data = await fetchCheckinReportData(eventId);
const headers = getCheckinReportHeaders(data);
const flattenedData = flattenCheckinReportData(data);
```

## 📋 Data Structure

### **Check-in Report Data Flow:**
1. **Database View**: `checkin_reports` view (existing)
2. **Custom Data**: Diambil dari tabel `registrations.custom_data`
3. **Field Definitions**: Diambil dari tabel `events.custom_fields`
4. **Mapping**: Menggunakan `registration_id` untuk menghubungkan data

### **Report Headers Include:**
- **Basic Info**: Nama Peserta, Email, Nomor Telepon
- **Check-in Info**: Status Kehadiran, Waktu Check-in, Lokasi Check-in, Catatan Check-in, Checked-in Oleh
- **Event Info**: Nama Event, Tanggal Event, Lokasi Event
- **Ticket Info**: Kode Tiket, Kode Pendek
- **Custom Fields**: Semua custom fields yang didefinisikan di event (dinamis)

## 🔄 How It Works

### **Step-by-Step Process:**

1. **Fetch Check-in Data**: Mengambil data dari view `checkin_reports`
2. **Fetch Custom Data**: Mengambil `custom_data` dan `custom_fields` dari tabel terkait
3. **Create Mapping**: Membuat mapping antara registration_id dan custom data
4. **Generate Headers**: Membuat header dinamis berdasarkan custom fields
5. **Flatten Data**: Meratakan data custom ke dalam struktur yang dapat di-download
6. **Download**: Menggunakan fungsi download yang sudah ada (CSV, Excel, PDF)

### **Data Transformation:**
```
Raw Data → Custom Data Mapping → Flattened Data → Download Files
```

## 📁 Modified Files

### **Primary File:**
- `src/lib/download-service.ts`
  - Updated `CheckinReportData` interface
  - Enhanced `fetchCheckinReportData` function
  - Added `flattenCheckinReportData` function
  - Updated `getCheckinReportHeaders` function
  - Enhanced `downloadCheckinReport` function

## ✅ Results

### **Before Implementation:**
- Check-in reports hanya menampilkan data dasar (nama, email, status kehadiran)
- Tidak ada informasi custom fields yang diisi user
- Header statis dan terbatas

### **After Implementation:**
- Check-in reports mencakup semua data "Basic Info" dan "Custom Field"
- Header dinamis berdasarkan custom fields yang didefinisikan di event
- Data lengkap untuk analisis dan pelaporan yang lebih komprehensif

## 🧪 Testing

### **Test Scenarios:**
1. **Event dengan Custom Fields**: Download report untuk event yang memiliki custom fields
2. **Event tanpa Custom Fields**: Download report untuk event tanpa custom fields
3. **Filter by Event**: Download report untuk event tertentu
4. **All Events**: Download report untuk semua event
5. **Empty Data**: Download ketika tidak ada data check-in

### **Expected Results:**
- CSV/Excel/PDF files berisi semua data custom fields
- Header menampilkan label custom fields yang benar
- Data terformat dengan baik dan mudah dibaca

## 📝 Important Notes

### **Performance Considerations:**
- Query tambahan untuk custom data dapat mempengaruhi performa
- Mapping data dilakukan di client-side untuk fleksibilitas
- Caching dapat dipertimbangkan untuk data yang sering diakses

### **Data Consistency:**
- Custom data diambil dari tabel `registrations` yang terhubung dengan check-in
- Field definitions diambil dari tabel `events` untuk memastikan konsistensi
- Mapping menggunakan `registration_id` untuk menghindari data yang tidak sesuai

### **Backward Compatibility:**
- Implementasi tetap kompatibel dengan data lama
- Default values disediakan untuk field yang tidak ada
- Graceful handling untuk event tanpa custom fields

## 🎉 Summary

Implementasi ini berhasil menambahkan fitur download custom fields ke menu Reports, memberikan admin akses lengkap ke semua data yang diisi oleh user saat registrasi. Fitur ini mendukung format CSV, Excel, dan PDF dengan header dinamis yang menyesuaikan dengan custom fields yang didefinisikan di setiap event. 