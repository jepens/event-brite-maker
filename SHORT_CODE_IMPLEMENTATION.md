# Implementasi Kode Manual Pendek (Short Code)

## Overview

Sistem ini mengimplementasikan kode manual pendek 8 karakter untuk verifikasi tiket, menggantikan kode panjang seperti:
```
TICKET:37fdbe8a-81ce-476c-8b81-e8ee444d16af:1753493456467
```

Menjadi kode pendek seperti:
```
A1B2C3D4
```

## Perubahan Database

### Migration: `20250721092106-dc635758-cfaa-433f-a200-c75021a23a18.sql`

1. **Menambahkan kolom `short_code`** ke tabel `tickets`:
```sql
ALTER TABLE public.tickets ADD COLUMN short_code TEXT UNIQUE;
```

2. **Membuat index** untuk pencarian yang lebih cepat:
```sql
CREATE INDEX idx_tickets_short_code ON public.tickets(short_code);
```

3. **Fungsi generate short code** di database:
```sql
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Generate 8 character code
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE short_code = result) THEN
      RETURN result;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      -- If too many attempts, add timestamp to make it unique
      result := result || substr(encode(sha256(clock_timestamp()::text::bytea), 'hex'), 1, 2);
      RETURN result;
    END IF;
  END LOOP;
END;
$$;
```

## Perubahan Backend

### 1. QR Ticket Generation (`supabase/functions/generate-qr-ticket/index.ts`)

**Fungsi generateShortCode():**
```typescript
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

**Update ticket creation:**
```typescript
const shortCode = generateShortCode();
const { data: ticket, error: ticketError } = await supabase.from('tickets').insert({
  registration_id: registration_id,
  qr_code: qrData,
  short_code: shortCode,  // ← Tambahan ini
  qr_image_url: urlData.publicUrl,
  status: 'unused'
}).select().single();
```

### 2. Email Template (`supabase/functions/send-ticket-email/index.ts`)

**Update interface:**
```typescript
interface SendTicketEmailRequest {
  participant_email: string;
  participant_name: string;
  event_name: string;
  event_date: string;
  event_location: string;
  qr_code_data: string;
  short_code?: string;  // ← Tambahan ini
  qr_image_url?: string;
}
```

**Update email template:**
```html
<div class="info-row">
  <span class="info-label">🎟️ Ticket Code:</span><br>
  <code style="background: #e9ecef; padding: 5px 10px; border-radius: 3px; font-family: monospace;">
    ${short_code || qr_code_data}
  </code>
  ${short_code ? `<br><small style="color: #666;">Manual entry code: ${short_code}</small>` : ''}
</div>
```

### 3. WhatsApp Integration (`supabase/functions/send-whatsapp-ticket/index.ts`)

**Update query untuk fetch short_code:**
```typescript
tickets (
  id,
  qr_code,
  short_code,  // ← Tambahan ini
  qr_image_url,
  whatsapp_sent
)
```

**Update ticket code selection:**
```typescript
let ticketCode = registration.tickets?.short_code || registration.tickets?.qr_code || "";
```

## Perubahan Frontend

### 1. QR Scanner (`src/components/admin/QRScanner.tsx`)

**Update verification logic:**
```typescript
const { data: ticket, error: ticketError } = await supabase
  .from('tickets')
  .select(`
    *,
    registrations (
      participant_name,
      participant_email,
      events (
        name
      )
    )
  `)
  .or(`qr_code.eq.${qrCode},short_code.eq.${qrCode}`)  // ← Support both formats
  .single();
```

### 2. Registrations Management (`src/components/admin/RegistrationsManagement.tsx`)

**Update Ticket interface:**
```typescript
interface Ticket {
  id: string;
  qr_code: string;
  short_code?: string;  // ← Tambahan ini
  qr_image_url: string;
  status: 'unused' | 'used';
  whatsapp_sent?: boolean;
  whatsapp_sent_at?: string;
}
```

**Update display logic:**
```typescript
<div className="font-mono text-lg bg-muted p-2 rounded select-all">
  {ticket.short_code || ticket.qr_code}
</div>
{ticket.short_code && (
  <div className="text-xs text-muted-foreground mt-1">
    Short code: {ticket.short_code} | Full code: {ticket.qr_code}
  </div>
)}
```

### 3. Type Definitions (`src/integrations/supabase/types.ts`)

**Update tickets table types:**
```typescript
tickets: {
  Row: {
    id: string
    issued_at: string
    qr_code: string
    short_code: string | null  // ← Tambahan ini
    qr_image_url: string | null
    registration_id: string
    status: Database["public"]["Enums"]["ticket_status"]
    used_at: string | null
    used_by: string | null
  }
  // ... Insert dan Update types juga diupdate
}
```

## Keuntungan Sistem Baru

### 1. **Kemudahan Penggunaan**
- Kode manual hanya 8 karakter vs 50+ karakter
- Lebih mudah diketik dan diucapkan
- Mengurangi kesalahan input

### 2. **Kompatibilitas**
- Tetap mendukung QR code lengkap untuk scanning
- Backward compatible dengan tiket lama
- Dual verification system

### 3. **Keamanan**
- Kode pendek tetap unik
- Collision detection dan retry mechanism
- Fallback ke timestamp jika diperlukan

### 4. **User Experience**
- Email menampilkan kode pendek sebagai primary
- WhatsApp menggunakan kode pendek
- Admin interface menampilkan kedua format

## Cara Kerja

1. **Saat ticket generation:**
   - Generate QR code lengkap untuk scanning
   - Generate short code 8 karakter untuk manual entry
   - Simpan keduanya di database

2. **Saat verification:**
   - Scanner bisa membaca QR code lengkap
   - Manual entry bisa menggunakan short code
   - System mencari berdasarkan kedua format

3. **Display:**
   - Email menampilkan short code sebagai primary
   - Admin interface menampilkan short code
   - Fallback ke full code jika short code tidak ada

## Testing

Untuk test implementasi ini:

1. **Deploy migration:**
```bash
npx supabase db push
```

2. **Deploy edge functions:**
```bash
npx supabase functions deploy generate-qr-ticket
npx supabase functions deploy send-ticket-email
npx supabase functions deploy send-whatsapp-ticket
```

3. **Test scenarios:**
   - Generate ticket baru → cek apakah short_code ter-generate
   - Scan QR code → verifikasi berhasil
   - Manual entry dengan short_code → verifikasi berhasil
   - Manual entry dengan full code → verifikasi berhasil
   - Email delivery → cek apakah short_code ditampilkan
   - WhatsApp delivery → cek apakah short_code digunakan

## Migration Notes

- Tiket lama tetap berfungsi dengan full code
- Tiket baru akan memiliki short_code
- System backward compatible
- Tidak ada breaking changes 