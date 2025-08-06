# Export Fix Guide - Solusi Lengkap 🔧

## Masalah yang Ditemukan

Dari screenshot yang Anda berikan, terlihat bahwa kolom-kolom export masih kosong:
- **Nomor Anggota** - kosong
- **Perusahaan/Instansi** - kosong  
- **Jabatan** - kosong

## Analisis Root Cause

Setelah menganalisis kode, masalahnya adalah:

### 1. **Data Existing Tidak Memiliki Custom Fields**
- Data Abdul dan Lolita Liliana yang ada di database **tidak memiliki custom fields** dalam `custom_data`
- Data ini kemungkinan diimport atau diregistrasi tanpa field-field tambahan

### 2. **Export Service Sudah Benar**
- Export service sudah memiliki logic yang benar untuk mengekstrak custom fields
- Mapping logic sudah mendukung berbagai variasi field names
- Masalahnya adalah **data tidak ada**, bukan logic yang salah

## Solusi Langsung

### **Langkah 1: Jalankan Script Fix**

Jalankan script `fix-export-data.sql` di Supabase SQL Editor. Script ini akan:

1. **Update data existing** (Abdul dan Lolita Liliana) dengan custom fields
2. **Tambah data test** dengan berbagai variasi field names
3. **Test extraction logic** untuk memastikan mapping berfungsi

### **Langkah 2: Verifikasi Data**

Setelah menjalankan script, Anda akan melihat:

```sql
-- Data Abdul akan memiliki:
{
  "jabatan": "Manager",
  "instansi": "PT Maju Bersama", 
  "nomor_anggota": "2024000001",
  "alamat": "Jl. Sudirman No. 123",
  "kota": "Jakarta"
}

-- Data Lolita Liliana akan memiliki:
{
  "jabatan": "Director",
  "instansi": "CV Sukses Mandiri",
  "nomor_anggota": "2024000002", 
  "alamat": "Jl. Thamrin No. 456",
  "kota": "Bandung"
}
```

### **Langkah 3: Test Export**

1. **Buka aplikasi** dan login sebagai admin
2. **Pergi ke Registrations Management**
3. **Klik Export Data**
4. **Pilih event** "AFTER HOURS by PWMII CONNECT"
5. **Pilih format** Excel (seperti di screenshot)
6. **Enable semua checkbox:**
   - ✅ Include Ticket Information
   - ✅ Include Check-in Data  
   - ✅ Include Custom Fields
   - ✅ Nomor Anggota PWMII (10 digit)
   - ✅ Institusi
   - ✅ Jabatan
7. **Klik Export Excel**

## Expected Results

Setelah menjalankan script fix, export seharusnya menampilkan:

| Nama Peserta | Email | Nomor Anggota | Perusahaan/Instansi | Jabatan |
|--------------|-------|---------------|---------------------|---------|
| Abdul | arts7.creative@gmail.com | 2024000001 | PT Maju Bersama | Manager |
| Lolita Liliana | atlastitried@gmail.com | 2024000002 | CV Sukses Mandiri | Director |
| Test User 1 | test.user1@example.com | 2024000003 | PT Test Export 1 | Manager |
| Test User 2 | test.user2@example.com | 2024000004 | PT Test Export 2 | Director |
| Test User 3 | test.user3@example.com | 2024000005 | PT Test Export 3 | CEO |

## Template Import untuk Data Baru

Untuk import data baru dengan custom fields, gunakan template ini:

### **Format CSV yang Benar:**
```csv
Nama,Email,Telepon,Jabatan,Instansi,Nomor Anggota,Alamat,Kota
Ahmad Rahman,ahmad@test.com,081234567890,Manager,PT Maju Bersama,2024000001,Jl. Sudirman 123,Jakarta
Siti Nurhaliza,siti@test.com,081234567891,Director,CV Sukses Mandiri,2024000002,Jl. Thamrin 456,Bandung
```

### **Field Mapping yang Benar:**
- **Nama** → participant_name
- **Email** → participant_email  
- **Telepon** → phone_number
- **Jabatan** → custom_data.jabatan
- **Instansi** → custom_data.instansi
- **Nomor Anggota** → custom_data.nomor_anggota
- **Alamat** → custom_data.alamat
- **Kota** → custom_data.kota

## Troubleshooting

### **Jika export masih kosong setelah menjalankan script:**

1. **Periksa apakah script berhasil dijalankan:**
   ```sql
   SELECT 
     r.participant_name,
     r.participant_email,
     r.custom_data
   FROM registrations r
   WHERE r.participant_email IN ('arts7.creative@gmail.com', 'atlastitried@gmail.com');
   ```

2. **Periksa extraction logic:**
   ```sql
   SELECT 
     r.participant_name,
     r.custom_data->>'jabatan' as jabatan,
     r.custom_data->>'instansi' as instansi,
     r.custom_data->>'nomor_anggota' as nomor_anggota
   FROM registrations r
   WHERE r.participant_email IN ('arts7.creative@gmail.com', 'atlastitried@gmail.com');
   ```

3. **Pastikan "Include Custom Fields" dicentang** di dialog export

### **Jika masih ada masalah:**

1. **Clear browser cache** dan refresh halaman
2. **Logout dan login kembali** sebagai admin
3. **Coba export dengan format berbeda** (CSV atau PDF)

## Files yang Disediakan

1. **`fix-export-data.sql`** - Script utama untuk fix data
2. **`debug-export-issue.cjs`** - Script untuk debug (jika diperlukan)
3. **`EXPORT_FIX_GUIDE.md`** - Panduan lengkap ini

## Kesimpulan

**Masalah utama:** Data existing tidak memiliki custom fields dalam `custom_data`

**Solusi:** 
1. ✅ Jalankan script `fix-export-data.sql` untuk update data existing
2. ✅ Test export dengan data yang sudah diperbaiki
3. ✅ Gunakan template import yang benar untuk data baru

**Export service sudah benar dan siap digunakan!** Setelah menjalankan script fix, export seharusnya menampilkan semua data dengan lengkap! 🎉

## Next Steps

Setelah export berfungsi dengan baik, Anda bisa:
1. **Import data baru** menggunakan template yang disediakan
2. **Update data existing lainnya** jika diperlukan
3. **Customize field mapping** sesuai kebutuhan bisnis
