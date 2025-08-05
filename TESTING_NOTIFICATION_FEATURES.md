# 🧪 PANDUAN PENGUJIAN FITUR NOTIFIKASI TICKET

## 📋 Overview

Panduan ini akan membantu Anda menguji fitur kirim ticket melalui:
- ✅ **Email saja**
- ✅ **WhatsApp saja** 
- ✅ **Email dan WhatsApp bersamaan**
- ✅ **Tanpa notifikasi**

## 🎯 Prerequisites

### 1. **Environment Variables Setup**
Pastikan file `.env` sudah dikonfigurasi dengan benar:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# WhatsApp Business API (untuk notifikasi WhatsApp)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_TEMPLATE_NAME=ticket_beautiful
WHATSAPP_LANGUAGE_CODE=id

# Email Service (untuk notifikasi email)
RESEND_API_KEY=your_resend_api_key
```

### 2. **Database Setup**
Pastikan tabel dan data sudah siap:
- ✅ Tabel `events` dengan kolom `whatsapp_enabled`
- ✅ Tabel `registrations` dengan data test
- ✅ Tabel `tickets` untuk menyimpan ticket
- ✅ Supabase Edge Functions sudah deployed

### 3. **Test Data Preparation**
Siapkan data test dengan berbagai skenario:

```sql
-- Event dengan WhatsApp enabled
INSERT INTO events (name, event_date, location, whatsapp_enabled) 
VALUES ('Test Event WhatsApp', '2024-02-15 19:00:00', 'Jakarta Convention Center', true);

-- Event tanpa WhatsApp
INSERT INTO events (name, event_date, location, whatsapp_enabled) 
VALUES ('Test Event Email Only', '2024-02-16 19:00:00', 'Hotel Indonesia', false);

-- Registration dengan email dan phone
INSERT INTO registrations (participant_name, participant_email, phone_number, event_id, status) 
VALUES ('Test User Complete', 'test@example.com', '6281234567890', 1, 'pending');

-- Registration dengan email saja
INSERT INTO registrations (participant_name, participant_email, phone_number, event_id, status) 
VALUES ('Test User Email Only', 'emailonly@example.com', NULL, 2, 'pending');

-- Registration dengan phone saja
INSERT INTO registrations (participant_name, participant_email, phone_number, event_id, status) 
VALUES ('Test User Phone Only', NULL, '6281234567891', 1, 'pending');
```

## 🧪 Test Scenarios

### **Test Case 1: Email Only**
**Tujuan**: Menguji pengiriman ticket via email saja

**Setup**:
- Registration dengan email valid
- Event dengan WhatsApp disabled atau phone number kosong

**Steps**:
1. Login sebagai admin
2. Buka halaman Registrations Management
3. Cari registration dengan email valid
4. Klik "Approve"
5. Di dialog Approve:
   - ✅ Check "Send Email Ticket"
   - ❌ Uncheck "Send WhatsApp Ticket"
6. Klik "Approve Registration"

**Expected Result**:
- ✅ Status registration berubah ke "approved"
- ✅ Ticket ter-generate dengan QR code
- ✅ Email terkirim ke participant
- ✅ WhatsApp tidak terkirim
- ✅ Success message: "Registration approved and email ticket sent"

**Verification**:
- Check email inbox participant
- Check Supabase logs untuk email function
- Check database untuk ticket record

---

### **Test Case 2: WhatsApp Only**
**Tujuan**: Menguji pengiriman ticket via WhatsApp saja

**Setup**:
- Registration dengan phone number valid
- Event dengan WhatsApp enabled
- Email kosong atau tidak valid

**Steps**:
1. Login sebagai admin
2. Buka halaman Registrations Management
3. Cari registration dengan phone valid
4. Klik "Approve"
5. Di dialog Approve:
   - ❌ Uncheck "Send Email Ticket"
   - ✅ Check "Send WhatsApp Ticket"
6. Klik "Approve Registration"

**Expected Result**:
- ✅ Status registration berubah ke "approved"
- ✅ Ticket ter-generate dengan QR code
- ✅ WhatsApp message terkirim ke participant
- ✅ Email tidak terkirim
- ✅ Success message: "Registration approved and WhatsApp ticket sent"

**Verification**:
- Check WhatsApp participant
- Check Supabase logs untuk WhatsApp function
- Check database untuk ticket record dengan `whatsapp_sent = true`

---

### **Test Case 3: Email + WhatsApp**
**Tujuan**: Menguji pengiriman ticket via email dan WhatsApp bersamaan

**Setup**:
- Registration dengan email dan phone valid
- Event dengan WhatsApp enabled

**Steps**:
1. Login sebagai admin
2. Buka halaman Registrations Management
3. Cari registration dengan email dan phone valid
4. Klik "Approve"
5. Di dialog Approve:
   - ✅ Check "Send Email Ticket"
   - ✅ Check "Send WhatsApp Ticket"
6. Klik "Approve Registration"

**Expected Result**:
- ✅ Status registration berubah ke "approved"
- ✅ Ticket ter-generate dengan QR code
- ✅ Email terkirim ke participant
- ✅ WhatsApp message terkirim ke participant
- ✅ Success message: "Registration approved and notifications sent"

**Verification**:
- Check email inbox participant
- Check WhatsApp participant
- Check Supabase logs untuk kedua function
- Check database untuk ticket record

---

### **Test Case 4: No Notifications**
**Tujuan**: Menguji approve tanpa mengirim notifikasi

**Setup**:
- Registration dengan data lengkap

**Steps**:
1. Login sebagai admin
2. Buka halaman Registrations Management
3. Cari registration
4. Klik "Approve"
5. Di dialog Approve:
   - ❌ Uncheck "Send Email Ticket"
   - ❌ Uncheck "Send WhatsApp Ticket"
6. Klik "Approve Registration"

**Expected Result**:
- ✅ Status registration berubah ke "approved"
- ✅ Ticket ter-generate dengan QR code
- ✅ Tidak ada email terkirim
- ✅ Tidak ada WhatsApp terkirim
- ✅ Success message: "Registration approved"

**Verification**:
- Check bahwa tidak ada email terkirim
- Check bahwa tidak ada WhatsApp terkirim
- Check database untuk ticket record

---

### **Test Case 5: Validation Scenarios**
**Tujuan**: Menguji validasi otomatis pada dialog

**Setup**: Berbagai kombinasi data registration

**Test Scenarios**:

#### 5.1 No Email Available
- Registration tanpa email
- Expected: Email checkbox disabled dengan text "(No email)"

#### 5.2 No Phone Available
- Registration tanpa phone number
- Expected: WhatsApp checkbox disabled dengan text "(No phone)"

#### 5.3 WhatsApp Not Enabled
- Registration dengan phone tapi event WhatsApp disabled
- Expected: WhatsApp checkbox disabled dengan text "(Not enabled)"

#### 5.4 No Notifications Selected
- Uncheck semua notifikasi
- Expected: Approve button disabled dengan warning message

---

## 🔧 Manual Testing dengan Edge Functions

### **Test Email Function Langsung**

```bash
# Test send-ticket-email function
curl -X POST https://your-project.supabase.co/functions/v1/send-ticket-email \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_email": "test@example.com",
    "participant_name": "Test User",
    "event_name": "Test Event",
    "event_date": "2024-02-15T19:00:00Z",
    "event_location": "Jakarta",
    "qr_code_data": "ABC123",
    "short_code": "ABC123",
    "qr_image_url": "https://example.com/qr.png"
  }'
```

### **Test WhatsApp Function Langsung**

```bash
# Test send-whatsapp-ticket function
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-ticket \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_id": "your_registration_id"
  }'
```

### **Test Generate QR Ticket Function**

```bash
# Test generate-qr-ticket function dengan notification options
curl -X POST https://your-project.supabase.co/functions/v1/generate-qr-ticket \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_id": "your_registration_id",
    "notification_options": {
      "sendEmail": true,
      "sendWhatsApp": false
    }
  }'
```

## 📊 Monitoring dan Logs

### **Supabase Logs**
Monitor logs di Supabase Dashboard:
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Buka "Edge Functions"
4. Pilih function yang ingin di-monitor
5. Buka tab "Logs"

### **Key Log Messages to Monitor**

#### Email Function:
```
"Starting email ticket send for participant: test@example.com"
"Email sent successfully"
"Email sending failed: [error details]"
```

#### WhatsApp Function:
```
"Starting WhatsApp ticket send for registration: [id]"
"WhatsApp message sent successfully"
"WhatsApp sending failed: [error details]"
```

#### Generate QR Ticket Function:
```
"Starting QR ticket generation for registration: [id]"
"Notification options: {sendEmail: true, sendWhatsApp: false}"
"Email notification skipped (disabled or no email)"
"WhatsApp notification skipped (disabled, not enabled, or no phone)"
```

## 🐛 Troubleshooting

### **Common Issues**

#### 1. Email Not Sending
**Symptoms**: Email tidak terkirim
**Possible Causes**:
- RESEND_API_KEY tidak valid
- Domain email belum diverifikasi di Resend
- Email address tidak valid

**Solutions**:
- Check RESEND_API_KEY di environment variables
- Verify domain di resend.com/domains
- Test dengan email address yang valid

#### 2. WhatsApp Not Sending
**Symptoms**: WhatsApp tidak terkirim
**Possible Causes**:
- WHATSAPP_ACCESS_TOKEN tidak valid
- WHATSAPP_PHONE_NUMBER_ID tidak valid
- Template name tidak sesuai
- Phone number format tidak valid

**Solutions**:
- Check WhatsApp credentials di environment variables
- Verify template name di Meta Developer Console
- Ensure phone number format: 6281234567890

#### 3. Dialog Not Showing
**Symptoms**: ApproveDialog tidak muncul
**Possible Causes**:
- Component tidak ter-import dengan benar
- Props tidak dikirim dengan benar

**Solutions**:
- Check import statement
- Verify props structure
- Check console untuk errors

#### 4. Checkbox States Incorrect
**Symptoms**: Checkbox enabled/disabled tidak sesuai
**Possible Causes**:
- Data registration tidak lengkap
- Logic validation tidak bekerja

**Solutions**:
- Check registration data completeness
- Verify validation logic di ApproveDialog

## ✅ Checklist Testing

### **Pre-Testing**
- [ ] Environment variables sudah dikonfigurasi
- [ ] Test data sudah disiapkan
- [ ] Edge functions sudah deployed
- [ ] Database schema sudah sesuai

### **Email Testing**
- [ ] Email terkirim dengan template yang benar
- [ ] QR code image terlampir
- [ ] Email content sesuai dengan event details
- [ ] Error handling bekerja saat email gagal

### **WhatsApp Testing**
- [ ] WhatsApp message terkirim dengan template yang benar
- [ ] Template parameters terisi dengan benar
- [ ] QR code image terlampir (jika supported)
- [ ] Error handling bekerja saat WhatsApp gagal

### **Combined Testing**
- [ ] Email dan WhatsApp terkirim bersamaan
- [ ] Success message menampilkan notifikasi yang dikirim
- [ ] Database records terupdate dengan benar
- [ ] Logs menampilkan aktivitas yang benar

### **Validation Testing**
- [ ] Checkbox disabled sesuai kondisi data
- [ ] Warning message muncul saat tidak ada notifikasi
- [ ] Approve button disabled saat tidak valid
- [ ] UI responsive di mobile dan desktop

## 🎉 Success Criteria

Fitur dianggap berhasil jika:
1. ✅ Semua test scenarios berjalan dengan baik
2. ✅ Email dan WhatsApp terkirim sesuai pilihan
3. ✅ Error handling bekerja dengan baik
4. ✅ UI/UX intuitive dan user-friendly
5. ✅ Logs memberikan informasi yang jelas
6. ✅ Performance acceptable (response time < 5 detik)

## 📝 Test Report Template

Setelah testing selesai, buat report dengan format:

```markdown
# Test Report - Notification Features

## Test Date: [Date]
## Tester: [Name]
## Environment: [Dev/Staging/Prod]

## Test Results Summary
- Total Test Cases: [Number]
- Passed: [Number]
- Failed: [Number]
- Success Rate: [Percentage]

## Detailed Results
### Test Case 1: Email Only
- Status: ✅ PASS / ❌ FAIL
- Notes: [Details]

### Test Case 2: WhatsApp Only
- Status: ✅ PASS / ❌ FAIL
- Notes: [Details]

### Test Case 3: Email + WhatsApp
- Status: ✅ PASS / ❌ FAIL
- Notes: [Details]

### Test Case 4: No Notifications
- Status: ✅ PASS / ❌ FAIL
- Notes: [Details]

### Test Case 5: Validation Scenarios
- Status: ✅ PASS / ❌ FAIL
- Notes: [Details]

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Overall Assessment
[Overall assessment of the feature]
```

---

**Selamat menguji! 🚀** 