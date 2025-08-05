# Import Feature User Guide 📚

## 📋 Overview

Fitur Import Data Peserta memungkinkan Anda untuk mengimpor data peserta dari file CSV atau Excel ke dalam sistem event management. Fitur ini dilengkapi dengan wizard multi-step, template management, dan advanced validation untuk memastikan data yang akurat dan konsisten.

## 🚀 Getting Started

### Prerequisites
- File CSV atau Excel dengan format yang sesuai
- Akses admin ke event
- Data yang sudah divalidasi dan bersih

### Supported File Formats
- **CSV** (.csv) - Comma Separated Values
- **Excel** (.xlsx, .xls) - Microsoft Excel files
- **Maximum file size**: 10MB
- **Maximum records**: 10,000 per import

## 📖 Step-by-Step Guide

### Step 1: Access Import Feature

1. Login ke admin dashboard
2. Navigasi ke halaman event yang ingin Anda kelola
3. Klik tombol **"Import Data"** di bagian registrations
4. Dialog Import Wizard akan terbuka

### Step 2: Upload File

1. **Drag & Drop**: Seret file ke area upload atau klik untuk memilih file
2. **File Validation**: Sistem akan memvalidasi format dan ukuran file
3. **Auto-detection**: Sistem akan mencoba mendeteksi template yang sesuai secara otomatis

**Tips:**
- Pastikan file memiliki header row
- Gunakan encoding UTF-8 untuk karakter khusus
- Hindari spasi atau karakter khusus di nama file

### Step 3: Select Template

1. **Choose Template**: Pilih template yang sesuai dengan struktur data Anda
2. **Template Info**: Lihat deskripsi dan field mapping template
3. **Create New**: Jika tidak ada template yang sesuai, buat template baru

**Template Categories:**
- **Basic**: Template sederhana untuk data umum
- **Advanced**: Template dengan validasi kompleks
- **Custom**: Template yang dibuat khusus

### Step 4: Field Mapping

1. **Map Fields**: Hubungkan kolom file dengan field database
2. **Required Fields**: Field wajib ditandai dengan asterisk (*)
3. **Custom Fields**: Tambahkan field kustom jika diperlukan
4. **Validation**: Sistem akan memvalidasi mapping

**Common Field Mappings:**
- `Nama` → `name`
- `Email` → `email`
- `Telepon` → `phone`
- `Alamat` → `address`

### Step 5: Data Preview

1. **Review Data**: Periksa data yang akan diimport
2. **Error Highlighting**: Error akan ditandai dengan warna merah
3. **Statistics**: Lihat statistik valid dan invalid records
4. **Export Preview**: Export preview untuk analisis lebih lanjut

### Step 6: Validation & Configuration

1. **Error Review**: Periksa dan perbaiki error validasi
2. **Import Settings**: Konfigurasi pengaturan import
3. **Duplicate Handling**: Pilih cara menangani data duplikat
4. **Status Assignment**: Tentukan status default untuk records

**Import Settings:**
- **Default Status**: Status awal untuk records (pending, registered, confirmed)
- **Skip Duplicates**: Skip records yang sudah ada
- **Batch Size**: Jumlah records per batch (default: 100)
- **Validate Only**: Hanya validasi tanpa import

### Step 7: Import Process

1. **Start Import**: Klik "Start Import" untuk memulai proses
2. **Progress Tracking**: Monitor progress real-time
3. **Error Handling**: Sistem akan menangani error secara otomatis
4. **Completion**: Lihat hasil import dan statistik

## 🔧 Advanced Features

### Template Library

**Access**: Klik tombol "Template Library" di header Import Wizard

**Features:**
- **Browse Templates**: Lihat semua template yang tersedia
- **Search & Filter**: Cari template berdasarkan nama, kategori, atau deskripsi
- **Template Management**: Duplicate, edit, delete, atau export template
- **Template Details**: Lihat detail lengkap field mapping dan validation rules
- **Import History**: Lihat riwayat penggunaan template

**Template Operations:**
- **Use Template**: Pilih template untuk digunakan
- **Duplicate Template**: Buat salinan template
- **Export Template**: Export template ke file JSON
- **Import Template**: Import template dari file JSON
- **Delete Template**: Hapus template (hanya untuk template custom)

### Import History

**Access**: Klik tombol "Import History" di header Import Wizard

**Features:**
- **Complete History**: Riwayat lengkap semua import
- **Filtering**: Filter berdasarkan status, tanggal, atau nama file
- **Sorting**: Urutkan berdasarkan berbagai kriteria
- **Statistics**: Statistik import (total, berhasil, gagal)
- **Export Details**: Export detail import ke CSV

**History Information:**
- **File Name**: Nama file yang diimport
- **Status**: Status import (completed, failed, in_progress)
- **Records**: Jumlah total, berhasil, dan gagal
- **Success Rate**: Persentase keberhasilan
- **Duration**: Waktu yang dibutuhkan
- **Created By**: User yang melakukan import

### Batch Processor

**Access**: Klik tombol "Batch Processor" di header Import Wizard

**Features:**
- **Large File Support**: Handle file besar dengan efisien
- **Progress Tracking**: Real-time progress dengan ETA
- **Pause/Resume**: Pause dan resume import process
- **Error Handling**: Robust error handling dengan retry
- **Performance Monitoring**: Monitor speed dan performance

**Batch Settings:**
- **Batch Size**: Jumlah records per batch (10-1000)
- **Delay Between Batches**: Delay antar batch (0-10000ms)
- **Auto Retry**: Otomatis retry untuk batch yang gagal
- **Max Retries**: Maksimal jumlah retry (1-10)

## 📊 Data Validation

### Built-in Validation Rules

**Required Fields:**
- Nama (minimal 2 karakter)
- Email (format email valid)
- Telepon (format nomor telepon)

**Format Validation:**
- **Email**: Format email standar
- **Phone**: Format nomor telepon Indonesia
- **Date**: Format tanggal (YYYY-MM-DD)
- **Number**: Format angka
- **Text**: Teks dengan panjang tertentu

**Custom Validation:**
- **Min/Max Length**: Panjang minimal/maksimal
- **Pattern**: Regex pattern untuk validasi
- **Custom Rules**: Aturan validasi kustom

### Error Types

**Validation Errors:**
- **Required**: Field wajib tidak diisi
- **Format**: Format data tidak sesuai
- **Length**: Panjang data tidak sesuai
- **Pattern**: Data tidak sesuai pattern

**System Errors:**
- **File Format**: Format file tidak didukung
- **File Size**: Ukuran file terlalu besar
- **Network**: Error koneksi network
- **Database**: Error database

## 🎯 Best Practices

### Data Preparation

1. **Clean Data**: Bersihkan data sebelum import
2. **Consistent Format**: Gunakan format yang konsisten
3. **Remove Duplicates**: Hapus data duplikat
4. **Validate Email**: Pastikan email valid
5. **Standardize Phone**: Standardisasi format nomor telepon

### File Structure

1. **Header Row**: Selalu sertakan header row
2. **Consistent Columns**: Gunakan kolom yang konsisten
3. **No Empty Rows**: Hapus baris kosong
4. **Proper Encoding**: Gunakan UTF-8 encoding
5. **Reasonable Size**: Jaga ukuran file tetap reasonable

### Template Management

1. **Create Templates**: Buat template untuk format data yang sering digunakan
2. **Document Templates**: Dokumentasikan template dengan baik
3. **Share Templates**: Share template dengan tim
4. **Version Control**: Kelola versi template
5. **Regular Updates**: Update template secara berkala

### Import Process

1. **Test Import**: Test import dengan data sample terlebih dahulu
2. **Validate Data**: Validasi data sebelum import besar
3. **Monitor Progress**: Monitor progress import
4. **Handle Errors**: Tangani error dengan baik
5. **Verify Results**: Verifikasi hasil import

## 🚨 Troubleshooting

### Common Issues

**File Upload Issues:**
- **Problem**: File tidak bisa diupload
- **Solution**: Periksa format file dan ukuran
- **Prevention**: Gunakan format yang didukung dan jaga ukuran file

**Template Issues:**
- **Problem**: Template tidak terdeteksi
- **Solution**: Periksa field mapping dan buat template baru
- **Prevention**: Gunakan nama kolom yang konsisten

**Validation Errors:**
- **Problem**: Banyak error validasi
- **Solution**: Periksa dan perbaiki data
- **Prevention**: Validasi data sebelum import

**Import Failures:**
- **Problem**: Import gagal
- **Solution**: Periksa log error dan coba lagi
- **Prevention**: Test dengan data sample terlebih dahulu

### Error Messages

**"File format not supported"**
- Pastikan file dalam format CSV atau Excel
- Periksa ekstensi file

**"File too large"**
- Kurangi ukuran file
- Split file menjadi beberapa bagian

**"Invalid email format"**
- Periksa format email
- Pastikan tidak ada spasi atau karakter khusus

**"Required field missing"**
- Isi semua field wajib
- Periksa field mapping

**"Duplicate data found"**
- Periksa data duplikat
- Gunakan opsi skip duplicates

## 📈 Performance Tips

### Optimization Strategies

1. **Batch Processing**: Gunakan batch processor untuk file besar
2. **Template Caching**: Gunakan template yang sudah ada
3. **Data Cleanup**: Bersihkan data sebelum import
4. **Network Optimization**: Gunakan koneksi yang stabil
5. **Resource Management**: Tutup aplikasi lain saat import besar

### Monitoring Performance

1. **Progress Tracking**: Monitor progress import
2. **Speed Monitoring**: Perhatikan speed import
3. **Memory Usage**: Monitor penggunaan memory
4. **Error Rate**: Perhatikan tingkat error
5. **Success Rate**: Monitor tingkat keberhasilan

## 🔒 Security Considerations

### Data Protection

1. **File Validation**: Validasi file sebelum upload
2. **Access Control**: Kontrol akses ke fitur import
3. **Audit Trail**: Log semua aktivitas import
4. **Data Encryption**: Enkripsi data sensitif
5. **Backup**: Backup data sebelum import besar

### Best Practices

1. **Test Environment**: Test di environment test terlebih dahulu
2. **Data Backup**: Backup data sebelum import
3. **Access Logging**: Log semua akses ke fitur import
4. **Error Handling**: Tangani error dengan aman
5. **Data Validation**: Validasi data secara menyeluruh

## 📞 Support

### Getting Help

1. **Documentation**: Baca dokumentasi ini dengan teliti
2. **Error Messages**: Perhatikan pesan error yang muncul
3. **Log Files**: Periksa log file untuk detail error
4. **Community**: Tanyakan di forum komunitas
5. **Support Team**: Hubungi tim support jika diperlukan

### Contact Information

- **Email**: support@eventbrite-maker.com
- **Documentation**: https://docs.eventbrite-maker.com
- **Community**: https://community.eventbrite-maker.com
- **GitHub**: https://github.com/eventbrite-maker

---

**Happy Importing! 🎉**

Fitur Import Data Peserta dirancang untuk memudahkan Anda mengelola data peserta dengan efisien dan akurat. Ikuti panduan ini untuk hasil terbaik dan jangan ragu untuk menghubungi tim support jika memerlukan bantuan. 