# Registration Import Templates

Template untuk import data registrasi event.

## 📋 Format Template

### Required Fields (Wajib)
- **Nama**: Nama lengkap peserta
- **Email**: Email peserta (harus unik per event)

### Optional Fields (Opsional)
- **Telepon**: Nomor telepon peserta
- **Status**: Status registrasi (pending, confirmed, cancelled)
- **Catatan**: Catatan tambahan

## 📁 File Templates

### CSV Template
- **File**: `registration-template.csv`
- **Format**: Comma-separated values
- **Encoding**: UTF-8

### Excel Template
- **File**: `registration-template.xls`
- **Format**: Tab-separated values (bisa dibuka di Excel)

## 🚀 Cara Penggunaan

1. **Download Template**
   - Klik "Download CSV Template" atau "Download Excel Template"
   - Template akan otomatis terdownload

2. **Isi Data**
   - Buka file template di Excel atau text editor
   - Isi data sesuai format
   - Pastikan email unik untuk setiap peserta

3. **Upload File**
   - Klik "Import Data" di aplikasi
   - Upload file yang sudah diisi
   - Field mapping akan otomatis terdeteksi

## 📝 Contoh Data

```csv
Nama,Email,Telepon,Status,Catatan
John Doe,john.doe@example.com,081234567890,pending,Sample registration 1
Jane Smith,jane.smith@example.com,081234567891,confirmed,Sample registration 2
Bob Johnson,bob.johnson@example.com,081234567892,pending,Sample registration 3
```

## ⚠️ Penting

- **Email harus unik** per event
- **Nama dan Email wajib diisi**
- **Status default**: pending
- **Format telepon**: 08xxxxxxxxxx
- **Encoding**: Gunakan UTF-8 untuk karakter khusus

## 🔧 Troubleshooting

### Error "Duplicate Email"
- Pastikan email tidak duplikat dalam file
- Aktifkan opsi "Skip Duplicates" saat import

### Error "Invalid Email Format"
- Pastikan format email valid (contoh: user@domain.com)
- Jangan gunakan spasi di email

### Error "Required Field Missing"
- Pastikan kolom Nama dan Email terisi
- Jangan biarkan cell kosong untuk field wajib
