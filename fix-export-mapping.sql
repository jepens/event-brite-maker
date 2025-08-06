-- Fix export mapping issue
-- Run this in Supabase SQL Editor

-- First, let's see what data we have
SELECT 'Current registrations with custom_data:' as info;
SELECT 
  r.id,
  r.participant_name,
  r.participant_email,
  r.custom_data,
  e.name as event_name
FROM registrations r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.custom_data IS NOT NULL
ORDER BY r.registered_at DESC
LIMIT 10;

-- Check for specific field names that might be causing issues
SELECT 'Checking for field name variations:' as info;
SELECT 
  r.participant_name,
  r.participant_email,
  r.custom_data->>'Jabatan' as "Jabatan (exact)",
  r.custom_data->>'jabatan' as "jabatan (lowercase)",
  r.custom_data->>'Position' as "Position (exact)",
  r.custom_data->>'position' as "position (lowercase)",
  r.custom_data->>'Instansi' as "Instansi (exact)",
  r.custom_data->>'instansi' as "instansi (lowercase)",
  r.custom_data->>'Company' as "Company (exact)",
  r.custom_data->>'company' as "company (lowercase)"
FROM registrations r
WHERE r.custom_data IS NOT NULL
  AND (
    r.custom_data ? 'Jabatan' OR r.custom_data ? 'jabatan' OR 
    r.custom_data ? 'Position' OR r.custom_data ? 'position' OR
    r.custom_data ? 'Instansi' OR r.custom_data ? 'instansi' OR
    r.custom_data ? 'Company' OR r.custom_data ? 'company'
  )
ORDER BY r.registered_at DESC;

-- Let's add some test data with the exact field names that should work
INSERT INTO registrations (
  event_id, 
  participant_name, 
  participant_email, 
  phone_number, 
  status, 
  custom_data
) 
SELECT 
  e.id,
  'Test Export Fix 1',
  'test.export.fix1@example.com',
  '081234567890',
  'approved',
  '{
    "jabatan": "Manager",
    "instansi": "PT Test Export Fix 1",
    "nomor_anggota": "2024000001",
    "alamat": "Jl. Test No. 1",
    "kota": "Jakarta"
  }'::jsonb
FROM events e 
WHERE e.name = 'AFTER HOURS by PWMII CONNECT'
LIMIT 1;

INSERT INTO registrations (
  event_id, 
  participant_name, 
  participant_email, 
  phone_number, 
  status, 
  custom_data
) 
SELECT 
  e.id,
  'Test Export Fix 2',
  'test.export.fix2@example.com',
  '081234567891',
  'approved',
  '{
    "position": "Director",
    "company": "PT Test Export Fix 2",
    "member_number": "2024000002",
    "address": "Jl. Test No. 2",
    "city": "Bandung"
  }'::jsonb
FROM events e 
WHERE e.name = 'AFTER HOURS by PWMII CONNECT'
LIMIT 1;

-- Now let's test the exact extraction logic that the export service uses
SELECT 'Testing export extraction logic:' as info;
SELECT 
  r.participant_name,
  r.participant_email,
  -- Test the same logic as in export service
  COALESCE(
    r.custom_data->>'member_number',
    r.custom_data->>'nomor_anggota',
    r.custom_data->>'Nomor Anggota',
    ''
  ) as extracted_member_number,
  COALESCE(
    r.custom_data->>'company',
    r.custom_data->>'instansi',
    r.custom_data->>'perusahaan',
    r.custom_data->>'Perusahaan',
    r.custom_data->>'Instansi',
    ''
  ) as extracted_company,
  COALESCE(
    r.custom_data->>'position',
    r.custom_data->>'jabatan',
    r.custom_data->>'Jabatan',
    ''
  ) as extracted_position,
  COALESCE(
    r.custom_data->>'department',
    r.custom_data->>'bagian',
    r.custom_data->>'Department',
    r.custom_data->>'Bagian',
    ''
  ) as extracted_department,
  COALESCE(
    r.custom_data->>'address',
    r.custom_data->>'alamat',
    r.custom_data->>'Address',
    r.custom_data->>'Alamat',
    ''
  ) as extracted_address,
  COALESCE(
    r.custom_data->>'city',
    r.custom_data->>'kota',
    r.custom_data->>'City',
    r.custom_data->>'Kota',
    ''
  ) as extracted_city
FROM registrations r
WHERE r.participant_email LIKE 'test.export.fix%@example.com'
ORDER BY r.participant_name;

-- If the data exists but export is still not working, let's check if there's a mismatch
-- between what's stored and what's expected
SELECT 'All unique keys in custom_data:' as info;
SELECT DISTINCT jsonb_object_keys(custom_data) as key_name
FROM registrations 
WHERE custom_data IS NOT NULL
ORDER BY key_name;
