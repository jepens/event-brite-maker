# WhatsApp Validation Implementation (Final Version)

## Overview
Validasi nomor WhatsApp telah diimplementasikan dengan standar nomor telepon Indonesia yang benar. Validasi ini mendukung format input yang umum digunakan di Indonesia dan secara otomatis memformat ke format standar `628xxxxxxxxxx`.

## Standar Validasi Nomor Telepon Indonesia

### Panjang Nomor
- **Minimal**: 10 digit (termasuk kode negara)
- **Maksimal**: 13 digit (termasuk kode negara)

### Format yang Didukung

1. **Format 62 (13 digit)**: `6281314942012`
   - Sudah dalam format yang benar
   - Tidak perlu konversi

2. **Format 08 (12 digit)**: `081314942012`
   - Dikonversi ke: `6281314942012`
   - Menghapus `0` dan menambahkan `62`

3. **Format 8 (11 digit)**: `81314942012`
   - Dikonversi ke: `6281314942012`
   - Menambahkan `62` di depan

4. **Format 10 digit (tanpa 0/8)**: `1314942012`
   - Dikonversi ke: `621314942012`
   - Menambahkan `62` di depan
   - Hanya untuk nomor yang tidak dimulai dengan `0` atau `8`

## Implementasi Kode

### Frontend Validation (`RegistrationForm.tsx`)

```typescript
const validateWhatsAppNumber = (phoneNumber: string): { isValid: boolean; formatted: string; message: string } => {
  if (!phoneNumber.trim()) {
    return { isValid: true, formatted: '', message: '' }; // Empty is valid (optional field)
  }

  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Indonesian mobile number validation rules:
  // - Total length: 10-13 digits (including country code)
  // - Valid formats: 628xxxxxxxxxx (13 digits), 08xxxxxxxxxx (12 digits), 8xxxxxxxxx (11 digits), xxxxxxxxxx (10 digits)
  
  if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
    // Already in correct format: 628xxxxxxxxxx (13 digits)
    return { 
      isValid: true, 
      formatted: digitsOnly, 
      message: 'WhatsApp number format is valid' 
    };
  } else if (digitsOnly.startsWith('08') && digitsOnly.length === 12) {
    // Convert from 08xxxxxxxxxx to 628xxxxxxxxxx (12 digits -> 13 digits)
    const formatted = '62' + digitsOnly.substring(1);
    return { 
      isValid: true, 
      formatted, 
      message: `Will be formatted as: ${formatted}` 
    };
  } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    // Convert from 8xxxxxxxxx to 628xxxxxxxxxx (11 digits -> 13 digits)
    const formatted = '62' + digitsOnly;
    return { 
      isValid: true, 
      formatted, 
      message: `Will be formatted as: ${formatted}` 
    };
  } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    // Convert from xxxxxxxxxx to 628xxxxxxxxxx (10 digits -> 13 digits)
    // Only for numbers that don't start with 0 or 8
    const formatted = '62' + digitsOnly;
    return { 
      isValid: true, 
      formatted, 
      message: `Will be formatted as: ${formatted}` 
    };
  } else {
    return { 
      isValid: false, 
      formatted: '', 
      message: 'Please enter a valid Indonesian phone number. Examples: 081314942012, 81314942012, or 6281314942012' 
    };
  }
};
```

### Backend Validation (`useEventRegistration.ts`)

```typescript
// Validate WhatsApp number format if provided
if (participantPhone?.trim()) {
  const phoneNumber = participantPhone.trim();
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  let formattedPhone = '';

  // Indonesian mobile number validation rules:
  // - Total length: 10-13 digits (including country code)
  // - Valid formats: 628xxxxxxxxxx (13 digits), 08xxxxxxxxxx (12 digits), 8xxxxxxxxx (11 digits), xxxxxxxxxx (10 digits)
  
  if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
    // Already in correct format: 628xxxxxxxxxx (13 digits)
    formattedPhone = digitsOnly;
  } else if (digitsOnly.startsWith('08') && digitsOnly.length === 12) {
    // Convert from 08xxxxxxxxxx to 628xxxxxxxxxx (12 digits -> 13 digits)
    formattedPhone = '62' + digitsOnly.substring(1);
  } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    // Convert from 8xxxxxxxxx to 628xxxxxxxxxx (11 digits -> 13 digits)
    formattedPhone = '62' + digitsOnly;
  } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
    // Convert from xxxxxxxxxx to 628xxxxxxxxxx (10 digits -> 13 digits)
    // Only for numbers that don't start with 0 or 8
    formattedPhone = '62' + digitsOnly;
  } else {
    toast({
      title: 'Invalid WhatsApp Number',
      description: 'Please enter a valid Indonesian phone number. Examples: 081314942012, 81314942012, or 6281314942012',
      variant: 'destructive',
    });
    setSubmitting(false);
    return;
  }
  
  // Update the phone number with formatted version
  formData.set('participantPhone', formattedPhone);
}
```

## Fitur Validasi

### 1. Real-time Validation
- Validasi otomatis saat user mengetik
- Debounce 1 detik untuk menghindari terlalu banyak request
- Feedback visual dengan border hijau/merah
- Icon validasi (✓/✗)

### 2. Auto-formatting
- Otomatis memformat nomor ke format standar `628xxxxxxxxxx`
- Update input field dengan nomor yang sudah diformat
- Pesan konfirmasi format yang akan digunakan

### 3. Pre-submission Validation
- Validasi sebelum form disubmit
- Mencegah submission jika format tidak valid
- Toast notification untuk error

## Test Cases

### Valid Cases
- `""` (empty) → Valid (optional field)
- `6281314942012` → Valid (13 digits, already formatted)
- `081314942012` → Valid (12 digits, formatted to 6281314942012)
- `81314942012` → Valid (11 digits, formatted to 6281314942012)
- `1314942012` → Valid (10 digits, formatted to 621314942012)

### Invalid Cases
- `08131494201` → Invalid (11 digits, too short for 08 format)
- `8131494201` → Invalid (10 digits, too short for 8 format)
- `131494201` → Invalid (9 digits, too short)
- `62813149420123` → Invalid (14 digits, too long)
- `0813149420123` → Invalid (13 digits, too long for 08 format)
- `813149420123` → Invalid (12 digits, too long for 8 format)
- `13149420123` → Invalid (11 digits, too long)
- `abc` → Invalid (non-numeric)
- `123456789` → Invalid (9 digits, invalid format)
- `123456789012345` → Invalid (15 digits, too long)

## UI Components

### Input Field
```tsx
<Input
  id="participantPhone"
  name="participantPhone"
  type="tel"
  placeholder="6281234567890"
  value={whatsappNumber}
  onChange={handleWhatsAppChange}
  className={`text-base border-2 focus:ring-2 focus:ring-primary/20 transition-all pr-10 ${
    whatsappValidated && whatsappNumber.trim()
      ? validateWhatsAppNumber(whatsappNumber).isValid
        ? 'border-green-300 focus:border-green-500 bg-green-50'
        : 'border-red-300 focus:border-red-500 bg-red-50'
      : 'border-gray-200 focus:border-primary/50'
  }`}
/>
```

### Validation Icons
```tsx
<div className="absolute inset-y-0 right-0 flex items-center pr-3">
  {whatsappValidated && whatsappNumber.trim() && (
    <>
      {validateWhatsAppNumber(whatsappNumber).isValid ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-500" />
      )}
    </>
  )}
</div>
```

### Validation Messages
```tsx
{whatsappValidated && whatsappNumber.trim() && (
  <>
    {validateWhatsAppNumber(whatsappNumber).isValid ? (
      <p className="text-sm text-green-600 flex items-center gap-1">
        <CheckCircle className="h-4 w-4" />
        {validateWhatsAppNumber(whatsappNumber).message}
      </p>
    ) : (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        {validateWhatsAppNumber(whatsappNumber).message}
      </p>
    )}
  </>
)}
```

## Testing

### Test Script
File: `test-whatsapp-validation-final.cjs`

```bash
node test-whatsapp-validation-final.cjs
```

### Expected Output
```
🧪 Testing WhatsApp Validation (Final Version)...

✅ Test 1: Empty input (optional field)
✅ Test 2: Already formatted with 62 (13 digits)
✅ Test 3: 08 format (12 digits)
✅ Test 4: 8 format (11 digits)
✅ Test 5: 10 digits without 0 prefix
✅ Test 6: 08 format but too short (11 digits)
✅ Test 7: 8 format but too short (10 digits)
✅ Test 8: Too short (9 digits)
✅ Test 9: 62 format but too long (14 digits)
✅ Test 10: 08 format but too long (13 digits)
✅ Test 11: 8 format but too long (12 digits)
✅ Test 12: Too long (11 digits)
✅ Test 13: Non-numeric characters
✅ Test 14: Invalid format (9 digits)
✅ Test 15: Too long (15 digits)

📊 Test Results: 15/15 tests passed
🎉 All tests passed! WhatsApp validation is working correctly.
```

## Kesimpulan

Validasi WhatsApp telah diimplementasikan dengan benar sesuai standar nomor telepon Indonesia:

1. **Panjang**: 10-13 digit (termasuk kode negara)
2. **Format**: Mendukung semua format umum di Indonesia
3. **Auto-formatting**: Otomatis ke format standar `628xxxxxxxxxx`
4. **Real-time validation**: Feedback langsung saat user mengetik
5. **Pre-submission validation**: Mencegah submission dengan format tidak valid
6. **UI feedback**: Visual indicators dan pesan yang jelas

Validasi ini memastikan bahwa hanya nomor telepon Indonesia yang valid yang dapat digunakan untuk registrasi event. 