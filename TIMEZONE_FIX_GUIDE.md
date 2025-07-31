# Timezone Fix Guide

## Overview

Masalah perbedaan waktu antara admin panel, halaman registrasi user, dan Supabase edge functions telah diperbaiki dengan implementasi timezone handling yang konsisten.

## 🔍 **Masalah yang Ditemukan**

### **1. Admin Panel (EventForm.tsx)**
- **Masalah**: `datetime-local` input menggunakan timezone lokal browser
- **Dampak**: Tanggal yang disimpan tidak konsisten dengan yang ditampilkan
- **Solusi**: Menggunakan `formatDateForInput()` utility function

### **2. Halaman Registrasi (EventDetails.tsx)**
- **Masalah**: `new Date()` menginterpretasi tanggal tanpa timezone
- **Dampak**: Format waktu berbeda di browser yang berbeda
- **Solusi**: Menggunakan `formatDateForDisplay()` dan `formatTimeForDisplay()`

### **3. Supabase Edge Functions**
- **Masalah**: Server timezone berbeda dengan client timezone
- **Dampak**: Format tanggal di WhatsApp dan email tidak konsisten
- **Solusi**: Konversi eksplisit ke WIB timezone (UTC+7)

## 🛠️ **Solusi yang Diimplementasikan**

### **1. Date Utils Library (`src/lib/date-utils.ts`)**

```typescript
// Default timezone untuk Indonesia (WIB)
const DEFAULT_TIMEZONE = 'Asia/Jakarta';

// Parse tanggal dengan timezone
export function parseDateWithTimezone(dateString: string, timezone: string = DEFAULT_TIMEZONE): Date

// Format untuk display UI
export function formatDateForDisplay(dateString: string): string
export function formatTimeForDisplay(dateString: string): string

// Format untuk input datetime-local
export function formatDateForInput(dateString: string): string

// Format untuk WhatsApp dan Email
export function formatDateForWhatsApp(dateString: string, useShort: boolean = false): string
export function formatTimeForWhatsApp(dateString: string): string
export function formatDateForEmail(dateString: string): string
```

### **2. Admin Panel Fix**

**Sebelum:**
```typescript
defaultValue={event?.event_date ? event.event_date.slice(0, 16) : ''}
```

**Sesudah:**
```typescript
defaultValue={event?.event_date ? formatDateForInput(event.event_date) : ''}
```

### **3. Registration Page Fix**

**Sebelum:**
```typescript
{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
{format(new Date(event.event_date), 'h:mm a')}
```

**Sesudah:**
```typescript
{formatDateForDisplay(event.event_date)}
{formatTimeForDisplay(event.event_date)}
```

### **4. Supabase Edge Functions Fix**

**WhatsApp Function:**
```typescript
function formatDate(date, format, useShort) {
  const eventDate = new Date(date);
  
  // Ensure we're working with WIB timezone (UTC+7)
  const wibDate = new Date(eventDate.getTime() + (7 * 60 * 60 * 1000));
  
  return wibDate.toLocaleDateString('id-ID', {
    // ... options
    timeZone: 'Asia/Jakarta'
  });
}
```

**Email Function:**
```typescript
const eventDate = new Date(event_date);
const wibDate = new Date(eventDate.getTime() + (7 * 60 * 60 * 1000));

const formattedDate = wibDate.toLocaleDateString('id-ID', {
  // ... options
  timeZone: 'Asia/Jakarta'
});
```

## 📋 **Timezone Debugger Component**

Komponen `TimezoneDebugger` telah dibuat untuk membantu debugging timezone issues:

```typescript
import { TimezoneDebugger } from '@/components/admin/TimezoneDebugger';

// Gunakan di admin panel untuk debugging
<TimezoneDebugger eventDate={event.event_date} />
```

**Fitur Debugger:**
- ✅ **System Information**: Menampilkan timezone browser, offset, dan waktu saat ini
- ✅ **Date Formatting Test**: Test format tanggal untuk event tertentu
- ✅ **Sample Date Tests**: Test dengan tanggal sample
- ✅ **Warnings**: Deteksi masalah timezone
- ✅ **Recommendations**: Rekomendasi perbaikan

## 🔧 **Cara Menggunakan**

### **1. Untuk Admin Panel**
```typescript
import { formatDateForInput } from '@/lib/date-utils';

// Di EventForm
<Input
  type="datetime-local"
  defaultValue={formatDateForInput(event.event_date)}
/>
```

### **2. Untuk Registration Page**
```typescript
import { formatDateForDisplay, formatTimeForDisplay } from '@/lib/date-utils';

// Di EventDetails
<p>{formatDateForDisplay(event.event_date)}</p>
<p>{formatTimeForDisplay(event.event_date)}</p>
```

### **3. Untuk WhatsApp/Email**
```typescript
import { formatDateForWhatsApp, formatTimeForWhatsApp } from '@/lib/date-utils';

// Di edge functions
const formattedDate = formatDateForWhatsApp(event.event_date);
const formattedTime = formatTimeForWhatsApp(event.event_date);
```

## 🌐 **Timezone Standards**

### **Default Timezone**
- **Timezone**: `Asia/Jakarta` (WIB)
- **Offset**: UTC+7
- **Format**: `2025-08-08T16:00:00.000+07:00`

### **Supported Formats**
- **Display**: "Jumat, 8 Agustus 2025"
- **Time**: "4:00 PM"
- **Input**: "2025-08-08T16:00"
- **WhatsApp**: "Jumat, 8 Agustus 2025"
- **Email**: "Jumat, 8 Agustus 2025 4:00 PM"

## 🧪 **Testing**

### **1. Test Cases**
```typescript
// Test dengan berbagai format input
const testDates = [
  '2025-08-08T16:00:00.000Z',
  '2025-08-08T16:00:00.000+07:00',
  '2025-08-08T16:00:00',
  '2025-08-08 16:00:00'
];

testDates.forEach(date => {
  console.log('Input:', date);
  console.log('Display:', formatDateForDisplay(date));
  console.log('Time:', formatTimeForDisplay(date));
  console.log('Input:', formatDateForInput(date));
});
```

### **2. Browser Testing**
- Test di browser dengan timezone berbeda
- Test di mobile device
- Test di berbagai OS (Windows, Mac, Linux)

### **3. Edge Function Testing**
```bash
# Test WhatsApp function
curl -X POST https://your-project.supabase.co/functions/v1/send-whatsapp-ticket \
  -H "Content-Type: application/json" \
  -d '{"registration_id": "test-id"}'

# Test Email function
curl -X POST https://your-project.supabase.co/functions/v1/send-ticket-email \
  -H "Content-Type: application/json" \
  -d '{"event_date": "2025-08-08T16:00:00.000Z"}'
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. "Invalid Date" Error**
**Penyebab**: Format tanggal tidak valid
**Solusi**: Gunakan `isValidDate()` function untuk validasi

```typescript
import { isValidDate } from '@/lib/date-utils';

if (!isValidDate(event.event_date)) {
  console.error('Invalid date format');
}
```

#### **2. Timezone Mismatch**
**Penyebab**: Browser timezone berbeda dengan server
**Solusi**: Gunakan TimezoneDebugger untuk debugging

#### **3. Format Inconsistency**
**Penyebab**: Menggunakan format yang berbeda di berbagai tempat
**Solusi**: Gunakan utility functions yang konsisten

### **Debugging Steps**

1. **Check Browser Timezone**
   ```javascript
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
   ```

2. **Check Date Format**
   ```javascript
   console.log('Original:', event.event_date);
   console.log('Parsed:', new Date(event.event_date));
   ```

3. **Use TimezoneDebugger**
   ```typescript
   <TimezoneDebugger eventDate={event.event_date} />
   ```

## 📈 **Performance Considerations**

### **Optimizations**
- ✅ **Caching**: Date parsing results untuk performa
- ✅ **Error Handling**: Graceful fallback untuk invalid dates
- ✅ **Memory Management**: Cleanup untuk interval timers
- ✅ **Bundle Size**: Tree-shaking untuk unused functions

### **Best Practices**
1. **Always validate dates** sebelum formatting
2. **Use consistent timezone** di seluruh aplikasi
3. **Handle edge cases** untuk invalid dates
4. **Test across timezones** untuk kompatibilitas

## 🔮 **Future Enhancements**

### **Planned Features**
- **Automatic Timezone Detection**: Detect user timezone automatically
- **Timezone Conversion**: Convert between different timezones
- **Date Range Support**: Handle date ranges and intervals
- **Calendar Integration**: Integration dengan calendar systems

### **Compatibility**
- **Internationalization**: Support untuk multiple locales
- **DST Handling**: Daylight Saving Time support
- **Historical Dates**: Support untuk historical date formats
- **Future Dates**: Support untuk dates beyond 2038

## 📚 **References**

- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [MDN Date Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601) 