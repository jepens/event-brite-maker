-- Test export with proper custom data
-- Run this in Supabase SQL Editor

-- First, let's add some test data with the exact field names that should work
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
  'Test User Jabatan',
  'test.jabatan@example.com',
  '081234567890',
  'approved',
  '{
    "jabatan": "Manager",
    "instansi": "PT Test Jabatan",
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
  'Test User Position',
  'test.position@example.com',
  '081234567891',
  'approved',
  '{
    "position": "Director",
    "company": "PT Test Position",
    "member_number": "2024000002",
    "address": "Jl. Test No. 2",
    "city": "Bandung"
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
  'Test User Mixed',
  'test.mixed@example.com',
  '081234567892',
  'pending',
  '{
    "Jabatan": "CEO",
    "Instansi": "PT Test Mixed",
    "Nomor Anggota": "2024000003",
    "Alamat": "Jl. Test No. 3",
    "Kota": "Surabaya"
  }'::jsonb
FROM events e 
WHERE e.name = 'AFTER HOURS by PWMII CONNECT'
LIMIT 1;

-- Now let's verify the data was created
SELECT 'Test data created:' as info;
SELECT 
  r.id,
  r.participant_name,
  r.participant_email,
  r.phone_number,
  r.status,
  r.custom_data,
  e.name as event_name
FROM registrations r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.participant_email LIKE 'test.%@example.com'
ORDER BY r.participant_name;

-- Test the extraction logic that the export service uses
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
WHERE r.participant_email LIKE 'test.%@example.com'
ORDER BY r.participant_name;
