# Export Mapping Debug Guide 🔍

## Masalah yang Ditemukan

Data Jabatan dan Instansi masih kosong setelah export, padahal saat import sudah dimasukkan. Ini menunjukkan ada masalah dalam mapping antara data yang diimport dan data yang diexport.

## Analisis Masalah

### 1. **Proses Import**
- Import service menyimpan field-field custom dengan nama asli dari file CSV/Excel
- Field "Jabatan" disimpan sebagai `custom_data.jabatan` atau `custom_data.Jabatan`
- Field "Instansi" disimpan sebagai `custom_data.instansi` atau `custom_data.Instansi`

### 2. **Proses Export**
- Export service mencari field dengan berbagai variasi nama
- Untuk Jabatan: `position`, `jabatan`, `Jabatan`
- Untuk Instansi: `company`, `instansi`, `perusahaan`, `Perusahaan`, `Instansi`

### 3. **Kemungkinan Penyebab**
1. **Field name mismatch** - nama field di import berbeda dengan yang dicari di export
2. **Data tidak tersimpan** - field tidak masuk ke `custom_data`
3. **Mapping logic error** - logic di export service tidak mencakup semua variasi

## Solusi

### Langkah 1: **Jalankan Script Debug**

Jalankan script `check-custom-data.sql` di Supabase SQL Editor untuk melihat:
- Data apa yang ada di database
- Field names apa yang digunakan
- Apakah data benar-benar tersimpan

### Langkah 2: **Jalankan Script Test**

Jalankan script `test-export-with-data.sql` untuk:
- Menambahkan data test dengan field names yang benar
- Test extraction logic yang sama dengan export service
- Verifikasi bahwa mapping berfungsi

### Langkah 3: **Jalankan Script Fix**

Jalankan script `fix-export-mapping.sql` untuk:
- Menambahkan data test dengan berbagai variasi field names
- Test extraction logic secara menyeluruh
- Identifikasi masalah spesifik

## Template Import yang Benar

### **Format 1: Indonesian Field Names (Recommended)**
```csv
Nama,Email,Telepon,Jabatan,Instansi,Nomor Anggota,Alamat,Kota
Ahmad Rahman,ahmad@test.com,081234567890,Manager,PT Maju Bersama,2024000001,Jl. Sudirman 123,Jakarta
Siti Nurhaliza,siti@test.com,081234567891,Director,CV Sukses Mandiri,2024000002,Jl. Thamrin 456,Bandung
```

### **Format 2: English Field Names**
```csv
Name,Email,Phone,Position,Company,Member Number,Address,City
Ahmad Rahman,ahmad@test.com,081234567890,Manager,PT Maju Bersama,2024000001,Jl. Sudirman 123,Jakarta
Siti Nurhaliza,siti@test.com,081234567891,Director,CV Sukses Mandiri,2024000002,Jl. Thamrin 456,Bandung
```

### **Format 3: Mixed Field Names**
```csv
Nama,Email,Phone,Jabatan,Instansi,Member Number,Address,City
Ahmad Rahman,ahmad@test.com,081234567890,Manager,PT Maju Bersama,2024000001,Jl. Sudirman 123,Jakarta
Siti Nurhaliza,siti@test.com,081234567891,Director,CV Sukses Mandiri,2024000002,Jl. Thamrin 456,Bandung
```

## Field Mapping yang Didukung

### **Jabatan/Position**
- ✅ `jabatan` → akan diextract sebagai position
- ✅ `Jabatan` → akan diextract sebagai position  
- ✅ `position` → akan diextract sebagai position
- ✅ `Position` → akan diextract sebagai position

### **Instansi/Company**
- ✅ `instansi` → akan diextract sebagai company
- ✅ `Instansi` → akan diextract sebagai company
- ✅ `company` → akan diextract sebagai company
- ✅ `Company` → akan diextract sebagai company
- ✅ `perusahaan` → akan diextract sebagai company
- ✅ `Perusahaan` → akan diextract sebagai company

## Testing Steps

### 1. **Check Existing Data**
```sql
-- Run this in Supabase SQL Editor
SELECT 
  r.participant_name,
  r.participant_email,
  r.custom_data->>'jabatan' as jabatan,
  r.custom_data->>'instansi' as instansi
FROM registrations r
WHERE r.custom_data IS NOT NULL
ORDER BY r.registered_at DESC;
```

### 2. **Add Test Data**
```sql
-- Add test data with correct field names
INSERT INTO registrations (
  event_id, participant_name, participant_email, phone_number, status, custom_data
) 
SELECT 
  e.id,
  'Test Export User',
  'test.export@example.com',
  '081234567890',
  'approved',
  '{
    "jabatan": "Manager",
    "instansi": "PT Test Export",
    "nomor_anggota": "2024000001"
  }'::jsonb
FROM events e 
WHERE e.name = 'AFTER HOURS by PWMII CONNECT'
LIMIT 1;
```

### 3. **Test Export**
1. Buka aplikasi dan login sebagai admin
2. Pergi ke Registrations Management
3. Klik Export Data
4. Pilih event "AFTER HOURS by PWMII CONNECT"
5. Pilih format (CSV, Excel, atau PDF)
6. Enable "Include Custom Fields"
7. Klik Export
8. Periksa apakah kolom Jabatan dan Instansi terisi

## Troubleshooting

### **Jika data masih kosong:**

1. **Periksa field mapping saat import**
   - Pastikan field "Jabatan" dan "Instansi" dipetakan dengan benar
   - Field tidak boleh dipetakan ke "participant_name", "participant_email", atau "phone_number"

2. **Periksa data di database**
   - Jalankan script `check-custom-data.sql`
   - Pastikan data tersimpan di `custom_data` JSONB

3. **Periksa export logic**
   - Jalankan script `test-export-with-data.sql`
   - Verifikasi bahwa extraction logic berfungsi

4. **Update data existing jika diperlukan**
   ```sql
   -- Update data existing dengan field names yang benar
   UPDATE registrations 
   SET custom_data = custom_data || '{"jabatan": "Manager", "instansi": "PT Test"}'::jsonb
   WHERE participant_email = 'arts7.creative@gmail.com';
   ```

## Expected Results

Setelah mengikuti langkah-langkah di atas, export seharusnya menampilkan:

| Nama Peserta | Email | Jabatan | Instansi |
|--------------|-------|---------|----------|
| Test Export User | test.export@example.com | Manager | PT Test Export |
| Ahmad Rahman | ahmad@test.com | Manager | PT Maju Bersama |
| Siti Nurhaliza | siti@test.com | Director | CV Sukses Mandiri |

## Files yang Disediakan

1. **`check-custom-data.sql`** - Script untuk mengecek data existing
2. **`test-export-with-data.sql`** - Script untuk test export dengan data baru
3. **`fix-export-mapping.sql`** - Script untuk fix dan debug mapping
4. **`EXPORT_MAPPING_DEBUG_GUIDE.md`** - Panduan lengkap ini

## Kesimpulan

Masalah export data kosong kemungkinan disebabkan oleh:
1. **Field name mismatch** antara import dan export
2. **Data tidak tersimpan** dengan field names yang benar
3. **Mapping logic** yang tidak mencakup semua variasi

**Solusi:**
1. ✅ Jalankan script debug untuk identifikasi masalah
2. ✅ Gunakan template import yang benar
3. ✅ Test dengan data baru
4. ✅ Update data existing jika diperlukan

Setelah mengikuti panduan ini, export seharusnya menampilkan data Jabatan dan Instansi dengan benar! 🎉
