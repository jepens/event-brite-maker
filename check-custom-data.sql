-- Check custom data in registrations
-- Run this in Supabase SQL Editor

-- First, let's see what registrations have custom_data
SELECT 'Registrations with custom_data:' as info;
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
WHERE r.custom_data IS NOT NULL
ORDER BY r.registered_at DESC
LIMIT 10;

-- Check for specific field variations
SELECT 'Checking for Jabatan/Position fields:' as info;
SELECT 
  r.participant_name,
  r.participant_email,
  r.custom_data->>'jabatan' as jabatan,
  r.custom_data->>'Jabatan' as "Jabatan",
  r.custom_data->>'position' as position,
  r.custom_data->>'Position' as "Position"
FROM registrations r
WHERE r.custom_data IS NOT NULL
  AND (r.custom_data ? 'jabatan' OR r.custom_data ? 'Jabatan' OR r.custom_data ? 'position' OR r.custom_data ? 'Position')
ORDER BY r.registered_at DESC;

SELECT 'Checking for Instansi/Company fields:' as info;
SELECT 
  r.participant_name,
  r.participant_email,
  r.custom_data->>'instansi' as instansi,
  r.custom_data->>'Instansi' as "Instansi",
  r.custom_data->>'company' as company,
  r.custom_data->>'Company' as "Company",
  r.custom_data->>'perusahaan' as perusahaan,
  r.custom_data->>'Perusahaan' as "Perusahaan"
FROM registrations r
WHERE r.custom_data IS NOT NULL
  AND (r.custom_data ? 'instansi' OR r.custom_data ? 'Instansi' OR r.custom_data ? 'company' OR r.custom_data ? 'Company' OR r.custom_data ? 'perusahaan' OR r.custom_data ? 'Perusahaan')
ORDER BY r.registered_at DESC;

-- Check all unique keys in custom_data
SELECT 'All unique keys in custom_data:' as info;
SELECT DISTINCT jsonb_object_keys(custom_data) as key_name
FROM registrations 
WHERE custom_data IS NOT NULL
ORDER BY key_name;

-- Check for the specific registrations mentioned in the screenshot
SELECT 'Checking specific registrations from screenshot:' as info;
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
WHERE r.participant_email IN ('arts7.creative@gmail.com', 'atlastitried@gmail.com')
ORDER BY r.registered_at DESC;
