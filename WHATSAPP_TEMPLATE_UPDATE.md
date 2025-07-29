# 📱 WhatsApp Template Update with Dresscode

## 📋 Overview

Template WhatsApp ticket telah diupdate untuk menggunakan format baru dengan 7 parameter, termasuk dresscode. Template baru ini memberikan informasi yang lebih lengkap dan terstruktur.

## 🆕 New Template Format

### Template Name: `ticket_confirmation`

```
✅ Your Event Registration is Confirmed!

Hello {{1}},

We are pleased to confirm your participation in the {{2}} event. Thank you for registering!

ℹ️ Event Information:
━━━━━━━━━━━━━━━━━
📅 Date: {{3}}
🕒 Time: {{4}}
📍 Location: {{5}}
🎟️ Ticket Code: {{6}}
👗 Dresscode: {{7}}
━━━━━━━━━━━━━━━━━

💡 Please Note:
• Kindly arrive 15 minutes before the event begins.
• Present this message for easy entry.
• Invite your friends to join the fun!

We look forward to welcoming you to the event.
```

### Parameter Mapping

| Parameter | Variable | Description |
|-----------|----------|-------------|
| {{1}} | `customerName` | Nama peserta |
| {{2}} | `eventName` | Nama event |
| {{3}} | `formattedDate` | Tanggal event (format lengkap) |
| {{4}} | `formattedTime` | Waktu event (HH:mm) |
| {{5}} | `location` | Lokasi event |
| {{6}} | `ticketCode` | Kode tiket (short_code atau qr_code) |
| {{7}} | `dresscode` | Dresscode event |

## 🗄️ Database Changes

### New Column: `dresscode`

**Table:** `public.events`

```sql
ALTER TABLE public.events ADD COLUMN dresscode TEXT;
COMMENT ON COLUMN public.events.dresscode IS 'Dresscode for the event (e.g., "Smart Casual", "Formal", "Casual")';
```

### Default Dresscode Logic

Jika dresscode tidak di-set manual, sistem akan menggunakan logika default berdasarkan waktu event:

```javascript
function getDresscode(eventData) {
  // Check if dresscode is defined in event data
  if (eventData.dresscode) {
    return eventData.dresscode;
  }
  
  // Default dresscode based on event time
  const eventDate = new Date(eventData.event_date);
  const hour = eventDate.getHours();
  
  if (hour >= 18 || hour < 6) {
    // Evening/Night events
    return "Smart Casual / Semi Formal";
  } else if (hour >= 12 && hour < 18) {
    // Afternoon events
    return "Casual / Smart Casual";
  } else {
    // Morning events
    return "Casual / Comfortable";
  }
}
```

## 🔧 Implementation Details

### 1. Edge Function Updates

**File:** `supabase/functions/send-whatsapp-ticket/index.ts`

#### Key Changes:
- **New function:** `formatTime()` - Memisahkan waktu dari tanggal
- **New function:** `getDresscode()` - Logika dresscode otomatis
- **Updated query:** Menambahkan `dresscode` ke select events
- **Updated payload:** 7 parameter untuk template baru
- **Priority short_code:** Menggunakan `short_code` jika tersedia

#### Parameter Structure:
```javascript
whatsappPayload.template.components.push({
  type: "body",
  parameters: [
    { type: "text", text: customerName },      // {{1}}
    { type: "text", text: eventName },         // {{2}}
    { type: "text", text: formattedDate },     // {{3}}
    { type: "text", text: formattedTime },     // {{4}}
    { type: "text", text: location },          // {{5}}
    { type: "text", text: ticketCode },        // {{6}}
    { type: "text", text: dresscode }          // {{7}}
  ]
});
```

### 2. Database Migration

**File:** `supabase/migrations/20250728000000-add-dresscode-to-events.sql`

```sql
-- Add dresscode column to events table
ALTER TABLE public.events ADD COLUMN dresscode TEXT;

-- Add comment to explain the dresscode column
COMMENT ON COLUMN public.events.dresscode IS 'Dresscode for the event (e.g., "Smart Casual", "Formal", "Casual")';

-- Update existing events with default dresscodes based on event time
UPDATE public.events 
SET dresscode = CASE 
  WHEN EXTRACT(HOUR FROM event_date) >= 18 OR EXTRACT(HOUR FROM event_date) < 6 THEN 'Smart Casual / Semi Formal'
  WHEN EXTRACT(HOUR FROM event_date) >= 12 AND EXTRACT(HOUR FROM event_date) < 18 THEN 'Casual / Smart Casual'
  ELSE 'Casual / Comfortable'
END
WHERE dresscode IS NULL;
```

### 3. TypeScript Types Update

**File:** `src/integrations/supabase/types.ts`

```typescript
events: {
  Row: {
    // ... existing fields
    dresscode: string | null
  }
  Insert: {
    // ... existing fields
    dresscode?: string | null
  }
  Update: {
    // ... existing fields
    dresscode?: string | null
  }
}
```

## 🎯 Dresscode Recommendations

### Manual Dresscode Options

Anda dapat mengatur dresscode manual untuk setiap event:

#### **Formal Events:**
- "Formal / Business Attire"
- "Black Tie"
- "White Tie"
- "Semi Formal"

#### **Semi-Formal Events:**
- "Smart Casual"
- "Business Casual"
- "Cocktail Attire"
- "Semi Formal"

#### **Casual Events:**
- "Casual / Comfortable"
- "Smart Casual"
- "Business Casual"
- "Relaxed"

#### **Theme Events:**
- "Traditional / Batik"
- "All White"
- "All Black"
- "Colorful / Vibrant"
- "Hawaiian / Tropical"

### Automatic Dresscode Logic

Jika tidak di-set manual, sistem akan menggunakan:

| Time Range | Default Dresscode |
|------------|-------------------|
| 18:00 - 05:59 | Smart Casual / Semi Formal |
| 12:00 - 17:59 | Casual / Smart Casual |
| 06:00 - 11:59 | Casual / Comfortable |

## 🚀 Deployment Steps

### 1. Deploy Database Migration
```bash
npx supabase db push
```

### 2. Deploy Updated Edge Function
```bash
npx supabase functions deploy send-whatsapp-ticket
```

### 3. Update WhatsApp Template
Di WhatsApp Business Manager:
1. Buat template baru bernama `ticket_confirmation`
2. Gunakan format template di atas
3. Set 7 parameter variables
4. Approve template

### 4. Update Environment Variables
```env
WHATSAPP_TEMPLATE_NAME=ticket_confirmation
```

## 🧪 Testing

### Test Script
```bash
node test-whatsapp-template.cjs
```

### Manual Testing
1. Buat event baru dengan dresscode custom
2. Register peserta
3. Approve registration
4. Send WhatsApp ticket
5. Verify template format dan dresscode

## 📊 Benefits

### ✅ **Improved User Experience**
- Informasi lebih lengkap dan terstruktur
- Dresscode membantu peserta mempersiapkan diri
- Format yang lebih mudah dibaca

### ✅ **Better Event Management**
- Dresscode dapat diatur per event
- Logika otomatis untuk dresscode default
- Fleksibilitas dalam pengaturan

### ✅ **Enhanced Professionalism**
- Template yang lebih profesional
- Informasi yang lebih detail
- Branding yang lebih baik

## 🔄 Backward Compatibility

- Template lama masih dapat digunakan dengan parameter `template_name`
- Sistem akan fallback ke template lama jika template baru tidak tersedia
- Existing events akan otomatis mendapat dresscode default

## 📝 Notes

1. **Template Approval:** Template baru perlu diapprove di WhatsApp Business Manager
2. **Parameter Limit:** WhatsApp template maksimal 10 parameter
3. **Character Limits:** Setiap parameter maksimal 1024 karakter
4. **Language Support:** Template mendukung multiple language codes

---

**Status:** Ready for deployment
**Template Name:** `ticket_confirmation`
**Parameters:** 7 (customer_name, event_name, date, time, location, ticket_code, dresscode) 