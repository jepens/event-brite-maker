# Export Data Mapping Guide 📊

## Masalah yang Ditemukan

Dari screenshot yang Anda berikan, terlihat bahwa kolom-kolom export sudah ada tapi **kosong**:
- **Nomor Anggota** - kosong
- **Perusahaan/Instansi** - kosong  
- **Jabatan** - kosong
- **Department/Bagian** - kosong
- **Alamat** - kosong
- **Kota** - kosong
- **Pembatasan Diet** - kosong
- **Permintaan Khusus** - kosong

## Penyebab Masalah

Data yang ada di database (Abdul dan Lolita Liliana) **tidak memiliki custom fields** dalam `custom_data` JSONB field. Data ini kemungkinan diimport atau diregistrasi tanpa field-field tambahan tersebut.

## Solusi

### 1. **Jalankan SQL Script untuk Menambah Data Test**

Jalankan script `add-custom-fields-data.sql` di Supabase SQL Editor untuk menambahkan data test dengan custom fields:

```sql
-- Script ini akan menambahkan 4 registrasi test dengan custom fields
-- yang berbeda format (member_number, nomor_anggota, Nomor Anggota)
```

### 2. **Cara Import Data dengan Custom Fields**

Saat melakukan import, pastikan file CSV/Excel memiliki kolom-kolom berikut:

#### **Format 1: English Field Names**
```csv
Nama,Email,Phone,Member Number,Company,Position,Department,Address,City,Dietary Restrictions,Special Requests
Ahmad Rahman,ahmad@test.com,081234567890,2024000001,PT Maju Bersama,Manager,IT Department,Jl. Sudirman 123,Jakarta,Vegetarian,Need wheelchair
```

#### **Format 2: Indonesian Field Names**
```csv
Nama,Email,Telepon,Nomor Anggota,Perusahaan,Jabatan,Bagian,Alamat,Kota,Pembatasan Diet,Permintaan Khusus
Siti Nurhaliza,siti@test.com,081234567891,2024000002,CV Sukses Mandiri,Director,Marketing,Jl. Thamrin 456,Bandung,Halal only,Need prayer room
```

#### **Format 3: Mixed Field Names**
```csv
Nama,Email,Phone,Nomor Anggota,Instansi,Jabatan,Department,Alamat,City,Pembatasan Diet,Permintaan Khusus
Budi Santoso,budi@test.com,081234567892,2024000003,PT Global Solutions,CEO,Executive,Jl. Gatot Subroto 789,Surabaya,Vegan,Need interpreter
```

### 3. **Field Mapping yang Didukung**

Export service mendukung berbagai variasi nama field:

| **Field Type** | **Supported Variations** |
|----------------|--------------------------|
| **Member Number** | `member_number`, `nomor_anggota`, `Nomor Anggota` |
| **Company** | `company`, `instansi`, `perusahaan`, `Perusahaan`, `Instansi` |
| **Position** | `position`, `jabatan`, `Jabatan` |
| **Department** | `department`, `bagian`, `Department`, `Bagian` |
| **Address** | `address`, `alamat`, `Address`, `Alamat` |
| **City** | `city`, `kota`, `City`, `Kota` |
| **Dietary Restrictions** | `dietary_restrictions`, `Dietary Restrictions`, `Pembatasan Diet` |
| **Special Requests** | `special_requests`, `Special Requests`, `Permintaan Khusus` |

### 4. **Update Data Existing**

Jika Anda ingin menambahkan custom fields ke data yang sudah ada, jalankan query berikut:

```sql
-- Update data existing dengan custom fields
UPDATE registrations 
SET custom_data = '{
  "member_number": "2024000001",
  "company": "PT Maju Bersama",
  "position": "Manager",
  "department": "IT Department",
  "address": "Jl. Sudirman No. 123",
  "city": "Jakarta",
  "dietary_restrictions": "Vegetarian",
  "special_requests": "Need wheelchair access"
}'::jsonb
WHERE participant_email = 'arts7.creative@gmail.com';

UPDATE registrations 
SET custom_data = '{
  "member_number": "2024000002",
  "company": "PT Sukses Mandiri",
  "position": "Director",
  "department": "Marketing",
  "address": "Jl. Thamrin No. 456",
  "city": "Bandung",
  "dietary_restrictions": "Halal only",
  "special_requests": "Need prayer room"
}'::jsonb
WHERE participant_email = 'atlastitried@gmail.com';
```

### 5. **Testing Export**

Setelah menambahkan data test:

1. **Buka aplikasi** dan login sebagai admin
2. **Pergi ke Registrations Management**
3. **Klik Export Data**
4. **Pilih event** "AFTER HOURS by PWMII CONNECT"
5. **Pilih format** (CSV, Excel, atau PDF)
6. **Enable "Include Custom Fields"**
7. **Klik Export**

Data export sekarang akan menampilkan:
- ✅ **Nomor Anggota** dengan data
- ✅ **Perusahaan/Instansi** dengan data
- ✅ **Jabatan** dengan data
- ✅ **Department/Bagian** dengan data
- ✅ **Alamat** dengan data
- ✅ **Kota** dengan data
- ✅ **Pembatasan Diet** dengan data
- ✅ **Permintaan Khusus** dengan data

### 6. **Template Import**

Buat file CSV dengan template berikut untuk import data yang lengkap:

```csv
Nama,Email,Telepon,Nomor Anggota,Perusahaan,Jabatan,Bagian,Alamat,Kota,Pembatasan Diet,Permintaan Khusus
Ahmad Rahman,ahmad@test.com,081234567890,2024000001,PT Maju Bersama,Manager,IT Department,Jl. Sudirman 123,Jakarta,Vegetarian,Need wheelchair
Siti Nurhaliza,siti@test.com,081234567891,2024000002,CV Sukses Mandiri,Director,Marketing,Jl. Thamrin 456,Bandung,Halal only,Need prayer room
Budi Santoso,budi@test.com,081234567892,2024000003,PT Global Solutions,CEO,Executive,Jl. Gatot Subroto 789,Surabaya,Vegan,Need interpreter
Dewi Sartika,dewi@test.com,081234567893,2024000004,PT Inovasi Digital,Senior Developer,Engineering,Jl. Asia Afrika 321,Medan,No restrictions,Need vegetarian meal
```

## Kesimpulan

Masalah export data kosong terjadi karena:
1. **Data existing tidak memiliki custom fields**
2. **Import dilakukan tanpa field-field tambahan**
3. **Export service sudah benar** tapi tidak ada data untuk diexport

**Solusi:**
1. ✅ Jalankan script SQL untuk menambah data test
2. ✅ Gunakan template import yang lengkap
3. ✅ Update data existing jika diperlukan
4. ✅ Test export functionality

Setelah mengikuti langkah-langkah di atas, export akan menampilkan semua data dengan lengkap! 🎉
