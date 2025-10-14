# 📱 Panduan WhatsApp Blast Feature

## 🚀 Fitur WhatsApp Blast

Fitur WhatsApp Blast memungkinkan Anda mengirim pesan WhatsApp secara massal kepada daftar kontak yang telah ditentukan menggunakan WhatsApp Business API.

## 📋 Prasyarat

### 1. WhatsApp Business API Setup
- WhatsApp Business Account yang sudah diverifikasi
- Access Token dari Meta Developer Console
- Phone Number ID dari WhatsApp Business API
- Template pesan yang sudah disetujui oleh Meta

### 2. Konfigurasi Environment Variables
Pastikan variabel berikut sudah diset di Supabase Secrets:

```
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_TEMPLATE_NAME=event_details_reminder_duage
```

## 🎯 Cara Menggunakan

### 1. Akses Fitur WhatsApp Blast
1. Login ke Admin Dashboard
2. Pilih tab "WhatsApp Blast Management"
3. Klik tombol "Create New Campaign"

### 2. Membuat Campaign Baru

#### Step 1: Campaign Details
- Masukkan nama campaign yang deskriptif
- Klik "Next" untuk melanjutkan

#### Step 2: Upload Recipients
- Download template CSV dari tombol "Download Template"
- Isi template dengan data:
  - `phone_number`: Nomor WhatsApp (format: 628xxxxxxxxxx)
  - `name`: Nama penerima (opsional)
- Upload file CSV yang sudah diisi
- Sistem akan memvalidasi format nomor telepon

#### Step 3: Preview & Validation
- Review daftar penerima yang valid
- Periksa error validation jika ada
- Perbaiki nomor yang tidak valid jika diperlukan

#### Step 4: Create Campaign
- Klik "Create Campaign" untuk membuat
- Campaign akan dibuat dengan status "pending"

### 3. Menjalankan Campaign
1. Pilih campaign yang ingin dijalankan
2. Klik tombol "Send" atau "Start Campaign"
3. Sistem akan memproses pengiriman secara bertahap
4. Monitor progress melalui progress bar

### 4. Monitoring Campaign
- **Status Campaign**: pending, sending, completed, failed
- **Statistics**: Total recipients, sent count, delivered count, failed count
- **Recipient Details**: Status per recipient, error messages
- **Real-time Updates**: Progress tracking selama pengiriman

## 📊 Status dan Tracking

### Status Campaign
- **Pending**: Campaign dibuat, belum dimulai
- **Sending**: Sedang dalam proses pengiriman
- **Completed**: Semua pesan berhasil diproses
- **Failed**: Campaign gagal karena error

### Status Recipient
- **Pending**: Belum diproses
- **Sent**: Pesan berhasil dikirim ke WhatsApp API
- **Delivered**: Pesan berhasil diterima oleh penerima
- **Read**: Pesan sudah dibaca oleh penerima
- **Failed**: Gagal mengirim pesan

## 🔧 Format Nomor Telepon

### Format yang Diterima
- `628xxxxxxxxxx` (format internasional Indonesia)
- `08xxxxxxxxxx` (akan dikonversi ke 628xxxxxxxxxx)
- `8xxxxxxxxxx` (akan dikonversi ke 628xxxxxxxxxx)

### Contoh Valid
- `628123456789`
- `08123456789`
- `8123456789`

### Contoh Tidak Valid
- `+628123456789` (mengandung +)
- `0628123456789` (format salah)
- `123456789` (terlalu pendek)

## 📁 Template CSV

Template CSV harus memiliki kolom berikut:

```csv
phone_number,name
628123456789,John Doe
628987654321,Jane Smith
628555666777,Bob Johnson
```

### Download Template
Template CSV tersedia di:
- Admin Dashboard → WhatsApp Blast → Create Campaign → Download Template
- File: `whatsapp-blast-template.csv`

## ⚡ Rate Limiting

Sistem menerapkan rate limiting untuk mematuhi batasan WhatsApp API:
- **2 pesan per detik**
- **80 pesan per menit**
- **400 pesan per jam**
- **Delay 1.5 detik** antar pesan
- **Retry maksimal 3 kali** untuk pesan yang gagal

## 🛠️ Troubleshooting

### Error Umum

#### 1. "WhatsApp API error"
- **Penyebab**: Access token tidak valid atau expired
- **Solusi**: Perbarui WHATSAPP_ACCESS_TOKEN di Supabase Secrets

#### 2. "Template not found"
- **Penyebab**: Template name tidak ditemukan atau belum disetujui
- **Solusi**: Pastikan template sudah disetujui di Meta Business Manager

#### 3. "Invalid phone number"
- **Penyebab**: Format nomor telepon tidak sesuai
- **Solusi**: Gunakan format yang benar (628xxxxxxxxxx)

#### 4. "Rate limit exceeded"
- **Penyebab**: Terlalu banyak request dalam waktu singkat
- **Solusi**: Tunggu beberapa menit sebelum mencoba lagi

### Debug Tools

#### 1. Debug Script
Jalankan script debug untuk memeriksa konfigurasi:
```bash
node debug-whatsapp.js
```

#### 2. Environment Check
Periksa environment variables:
```bash
node check-env.js
```

## 🔒 Keamanan

### Best Practices
1. **Jangan commit** access token ke repository
2. **Gunakan Supabase Secrets** untuk menyimpan credentials
3. **Rotate access token** secara berkala
4. **Monitor usage** untuk mendeteksi aktivitas mencurigakan

### Data Privacy
- Data recipient hanya disimpan selama campaign aktif
- Nomor telepon di-hash untuk keamanan
- Log error tidak menyimpan data sensitif

## 📈 Analytics & Reporting

### Metrics yang Tersedia
- **Delivery Rate**: Persentase pesan yang berhasil dikirim
- **Read Rate**: Persentase pesan yang dibaca
- **Error Rate**: Persentase pesan yang gagal
- **Response Time**: Waktu rata-rata pengiriman

### Export Data
- Export recipient list dengan status
- Export campaign statistics
- Export error logs untuk debugging

## 🔄 API Integration

### Webhook Support
Sistem mendukung webhook untuk update status real-time dari WhatsApp:
- Delivery status updates
- Read receipts
- Error notifications

### Custom Integration
Fitur dapat diintegrasikan dengan sistem eksternal melalui:
- REST API endpoints
- Database triggers
- Custom webhooks

## 📞 Support

Jika mengalami masalah:
1. Periksa dokumentasi troubleshooting
2. Jalankan debug tools
3. Periksa log error di Supabase Dashboard
4. Hubungi tim support dengan detail error

---

**Note**: Fitur ini menggunakan WhatsApp Business API yang memerlukan approval dari Meta. Pastikan semua template pesan sudah disetujui sebelum digunakan dalam production.