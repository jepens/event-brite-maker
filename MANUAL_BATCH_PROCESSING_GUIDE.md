# Manual Batch Processing Guide

## Overview
Fitur Manual Batch Processing memungkinkan admin untuk mengirim pesan WhatsApp secara manual dengan kontrol penuh atas proses pengiriman. Fitur ini sangat berguna untuk:

- Mengatasi masalah pengiriman otomatis yang terhenti
- Melanjutkan kampanye yang gagal
- Mengontrol rate limiting secara manual
- Debugging dan troubleshooting

## Fitur Utama

### 1. Kontrol Batch Configuration
- **Batch Size**: Jumlah pesan per batch (1-50)
- **Delay Between Batches**: Jeda antar batch (1-60 detik)
- **Max Retries**: Maksimal percobaan ulang (1-5 kali)

### 2. Real-time Monitoring
- Progress bar dengan persentase
- Statistik sukses/gagal real-time
- Estimasi waktu penyelesaian
- Log aktivitas detail

### 3. Smart Processing
- Hanya memproses recipients dengan status 'pending'
- Auto-retry untuk pesan yang gagal
- Penanganan error yang robust
- Rate limiting protection

## Cara Menggunakan

### 1. Akses Fitur
- Buka WhatsApp Blast Management
- Pilih kampanye dengan status 'sending' atau 'failed'
- Klik "View Details" untuk membuka Campaign Details Dialog

### 2. Manual Batch Processing
- Di tab "Overview", cari card "Manual Batch Processing" (muncul untuk kampanye sending/failed)
- Atau di tab "Recipients", klik tombol "Send Batch Manually"
- Klik "Open Manual Batch Processing"

### 3. Konfigurasi Batch
- Atur **Batch Size** sesuai kebutuhan (default: 10)
- Atur **Delay** antar batch (default: 5 detik)
- Atur **Max Retries** (default: 3)
- Klik "Start Batch Processing"

### 4. Monitoring Progress
- Pantau progress bar dan statistik real-time
- Lihat log aktivitas untuk detail setiap batch
- Tunggu hingga proses selesai atau stop manual jika diperlukan

## Best Practices

### Batch Size Recommendations
- **Small campaigns (< 100 recipients)**: 5-10 per batch
- **Medium campaigns (100-500 recipients)**: 10-20 per batch
- **Large campaigns (> 500 recipients)**: 20-50 per batch

### Delay Recommendations
- **Normal conditions**: 3-5 seconds
- **High traffic periods**: 5-10 seconds
- **Rate limit issues**: 10-30 seconds

### Retry Strategy
- **Stable API**: 2-3 retries
- **Unstable conditions**: 3-5 retries
- **Testing phase**: 1-2 retries

## Troubleshooting

### Common Issues
1. **Rate Limit Exceeded**: Increase delay between batches
2. **High Failure Rate**: Check WhatsApp API status and credentials
3. **Slow Processing**: Reduce batch size or increase delay
4. **Stuck Processing**: Stop and restart with different configuration

### Error Messages
- **"Campaign not found"**: Refresh page and try again
- **"No pending recipients"**: All messages already sent
- **"API Error"**: Check WhatsApp API configuration
- **"Rate limit exceeded"**: Wait and retry with longer delay

## Technical Details

### Components
- `ManualBatchDialog.tsx`: Main UI component
- `CampaignDetailsDialog.tsx`: Integration point
- Supabase Edge Function: `send-whatsapp-blast`

### API Integration
- Uses existing WhatsApp blast infrastructure
- Leverages Supabase real-time subscriptions
- Implements proper error handling and retry logic

### Database Updates
- Real-time recipient status updates
- Campaign statistics tracking
- Audit trail for manual operations