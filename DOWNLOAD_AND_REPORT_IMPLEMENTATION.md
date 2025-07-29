# 📊 Download & Report Implementation Guide

## 🎯 Overview

Implementasi fitur download data registrasi dan report check-in untuk sistem event management. Fitur ini memungkinkan panitia untuk:

1. **Download Data Registrasi** - Mengunduh data registrasi dalam format CSV/Excel
2. **Check-in Report** - Melihat statistik kehadiran dan laporan detail check-in
3. **Enhanced QR Scanner** - Tracking check-in dengan informasi lengkap

## 🗄️ Database Schema Updates

### **Migration: `20250101000001-add-checkin-tracking.sql`**

```sql
-- Add check-in tracking columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN checkin_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN checkin_by UUID REFERENCES auth.users(id),
ADD COLUMN checkin_location TEXT,
ADD COLUMN checkin_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_checkin_at ON public.tickets(checkin_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status_checkin ON public.tickets(status, checkin_at);

-- Create view for check-in reports
CREATE OR REPLACE VIEW checkin_reports AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.event_date,
  e.location as event_location,
  r.id as registration_id,
  r.participant_name,
  r.participant_email,
  r.phone_number,
  r.status as registration_status,
  r.registered_at,
  t.id as ticket_id,
  t.qr_code,
  t.short_code,
  t.status as ticket_status,
  t.checkin_at,
  t.checkin_by,
  t.checkin_location,
  t.checkin_notes,
  p.full_name as checked_in_by_name,
  CASE 
    WHEN t.checkin_at IS NOT NULL THEN 'checked_in'
    WHEN t.status = 'used' THEN 'checked_in'
    ELSE 'not_checked_in'
  END as attendance_status
FROM public.events e
JOIN public.registrations r ON e.id = r.event_id
LEFT JOIN public.tickets t ON r.id = t.registration_id
LEFT JOIN public.profiles p ON t.checkin_by = p.user_id
WHERE r.status = 'approved';

-- Create function for check-in statistics
CREATE OR REPLACE FUNCTION get_checkin_stats(event_id_param UUID DEFAULT NULL)
RETURNS TABLE(
  event_id UUID,
  event_name TEXT,
  total_registrations BIGINT,
  checked_in BIGINT,
  not_checked_in BIGINT,
  attendance_rate NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    COUNT(r.id) as total_registrations,
    COUNT(CASE WHEN t.checkin_at IS NOT NULL OR t.status = 'used' THEN 1 END) as checked_in,
    COUNT(CASE WHEN t.checkin_at IS NULL AND t.status != 'used' THEN 1 END) as not_checked_in,
    ROUND(
      (COUNT(CASE WHEN t.checkin_at IS NOT NULL OR t.status = 'used' THEN 1 END)::NUMERIC / COUNT(r.id)::NUMERIC) * 100, 
      2
    ) as attendance_rate
  FROM public.events e
  JOIN public.registrations r ON e.id = r.event_id
  LEFT JOIN public.tickets t ON r.id = t.registration_id
  WHERE r.status = 'approved'
    AND (event_id_param IS NULL OR e.id = event_id_param)
  GROUP BY e.id, e.name;
END;
$$;
```

## 📁 File Structure

### **New Files Created:**

1. **`src/lib/download-service.ts`** - Service untuk download data
2. **`src/components/admin/CheckinReport.tsx`** - Component report check-in
3. **`supabase/migrations/20250101000001-add-checkin-tracking.sql`** - Database migration

### **Files Modified:**

1. **`src/integrations/supabase/types.ts`** - Updated type definitions
2. **`src/components/admin/RegistrationsManagement.tsx`** - Added download buttons
3. **`src/pages/AdminDashboard.tsx`** - Added Reports tab
4. **`src/components/admin/QRScanner.tsx`** - Enhanced check-in tracking

## 🔧 Implementation Details

### **1. Download Service (`src/lib/download-service.ts`)**

**Features:**
- Download registrations dengan filter (event, status, tanggal)
- Download check-in reports
- Support format CSV dan Excel
- Proper CSV escaping untuk data kompleks

**Key Functions:**
```typescript
// Download registrations with filters
export async function downloadRegistrations(options: DownloadOptions)

// Download check-in reports
export async function downloadCheckinReport(eventId?: string, format: 'csv' | 'excel' = 'csv')

// Fetch registration data
export async function fetchRegistrationData(options: DownloadOptions): Promise<RegistrationData[]>

// Fetch check-in report data
export async function fetchCheckinReportData(eventId?: string): Promise<CheckinReportData[]>
```

### **2. Check-in Report Component (`src/components/admin/CheckinReport.tsx`)**

**Features:**
- Statistik kehadiran real-time
- Filter berdasarkan event
- Search functionality
- Download reports
- Visual indicators untuk status kehadiran

**Statistics Display:**
- Total registrations
- Checked in count
- Not checked in count
- Attendance rate percentage
- Event-specific statistics

### **3. Enhanced QR Scanner**

**Updates:**
- Record check-in time
- Track who performed check-in
- Store check-in location
- Add check-in notes

```typescript
// Enhanced ticket update
const { error: updateError } = await supabase
  .from('tickets')
  .update({
    status: 'used',
    used_at: new Date().toISOString(),
    checkin_at: new Date().toISOString(),
    checkin_by: (await supabase.auth.getUser()).data.user?.id,
    checkin_location: 'QR Scanner',
    checkin_notes: 'Checked in via QR scanner'
  })
  .eq('id', ticket.id);
```

## 🎨 UI/UX Features

### **Registrations Management:**
- Download buttons (CSV/Excel) di header
- Filter-aware downloads
- Loading states
- Success/error notifications

### **Check-in Report:**
- Dashboard-style statistics cards
- Event-specific breakdown
- Detailed participant table
- Search and filter capabilities
- Download functionality

### **Admin Dashboard:**
- New "Reports" tab
- Integrated check-in report
- Consistent navigation

## 📊 Data Structure

### **Registration Download Data:**
```typescript
interface RegistrationData {
  id: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  status: string;
  registered_at: string;
  event_name: string;
  event_date?: string;
  event_location?: string;
  ticket_code?: string;
  ticket_short_code?: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  custom_data?: any;
}
```

### **Check-in Report Data:**
```typescript
interface CheckinReportData {
  event_id: string;
  event_name: string;
  event_date?: string;
  event_location?: string;
  participant_name: string;
  participant_email: string;
  phone_number?: string;
  ticket_code?: string;
  ticket_short_code?: string;
  attendance_status: string;
  checkin_at?: string;
  checkin_location?: string;
  checkin_notes?: string;
  checked_in_by_name?: string;
}
```

## 🚀 Usage Guide

### **Untuk Panitia:**

1. **Download Data Registrasi:**
   - Buka tab "Registrations"
   - Gunakan filter untuk mempersempit data
   - Klik "Download CSV" atau "Download Excel"
   - File akan otomatis terdownload

2. **Lihat Report Check-in:**
   - Buka tab "Reports"
   - Lihat statistik kehadiran di cards
   - Filter berdasarkan event
   - Search peserta tertentu
   - Download report jika diperlukan

3. **Check-in Peserta:**
   - Buka tab "QR Scanner"
   - Scan QR code atau input manual
   - Data check-in otomatis tercatat

### **Data yang Tercatat:**
- Waktu check-in
- Siapa yang melakukan check-in
- Lokasi check-in
- Catatan tambahan

## 🔍 Troubleshooting

### **Database Migration Issues:**
```bash
# Jika migration gagal, jalankan manual:
npx supabase db reset
npx supabase db push
```

### **Download Issues:**
- Pastikan browser mengizinkan download
- Check console untuk error details
- Verify data exists sebelum download

### **Report Loading Issues:**
- Check database connection
- Verify view `checkin_reports` exists
- Check function `get_checkin_stats` exists

## 📈 Future Enhancements

### **Planned Features:**
1. **Real-time Updates** - WebSocket untuk live data
2. **Advanced Analytics** - Charts dan graphs
3. **Email Reports** - Automated report delivery
4. **Bulk Operations** - Mass check-in/check-out
5. **Mobile App** - Native mobile check-in

### **Performance Optimizations:**
1. **Pagination** - Untuk data besar
2. **Caching** - Redis untuk statistik
3. **Background Jobs** - Async report generation
4. **CDN** - Untuk file downloads

## 🎉 Benefits

### **Untuk Panitia:**
- ✅ Data registrasi mudah diunduh
- ✅ Report kehadiran real-time
- ✅ Tracking check-in yang detail
- ✅ Filter dan search yang powerful

### **Untuk Event Organizer:**
- ✅ Analisis kehadiran yang akurat
- ✅ Data untuk evaluasi event
- ✅ Dokumentasi lengkap
- ✅ Efisiensi operasional

### **Untuk Peserta:**
- ✅ Check-in yang cepat dan akurat
- ✅ Data yang terjamin keamanannya
- ✅ Transparansi proses

## 🔐 Security Considerations

1. **Data Privacy** - Hanya admin yang bisa akses
2. **Audit Trail** - Semua check-in tercatat
3. **Access Control** - Role-based permissions
4. **Data Export** - Sanitized data untuk download

---

**Status:** ✅ Implementation Complete
**Last Updated:** January 2025
**Version:** 1.0.0 