-- Add sample data with custom fields for export testing
-- Run this in Supabase SQL Editor

-- First, let's see what events we have
SELECT 'Available Events:' as info;
SELECT id, name FROM events ORDER BY created_at DESC LIMIT 5;

-- Add test registrations with custom fields to the "AFTER HOURS by PWMII CONNECT" event
-- This will help us test the export functionality

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
  'Ahmad Rahman',
  'ahmad.rahman@test.com',
  '081234567890',
  'approved',
  '{
    "member_number": "2024000001",
    "company": "PT Maju Bersama",
    "position": "Manager",
    "department": "IT Department",
    "address": "Jl. Sudirman No. 123",
    "city": "Jakarta",
    "dietary_restrictions": "Vegetarian",
    "special_requests": "Need wheelchair access"
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
  'Siti Nurhaliza',
  'siti.nurhaliza@test.com',
  '081234567891',
  'approved',
  '{
    "nomor_anggota": "2024000002",
    "instansi": "CV Sukses Mandiri",
    "jabatan": "Director",
    "bagian": "Marketing",
    "alamat": "Jl. Thamrin No. 456",
    "kota": "Bandung",
    "pembatasan_diet": "Halal only",
    "permintaan_khusus": "Need prayer room"
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
  'Budi Santoso',
  'budi.santoso@test.com',
  '081234567892',
  'pending',
  '{
    "Nomor Anggota": "2024000003",
    "Perusahaan": "PT Global Solutions",
    "Jabatan": "CEO",
    "Department": "Executive",
    "Alamat": "Jl. Gatot Subroto No. 789",
    "Kota": "Surabaya",
    "Pembatasan Diet": "Vegan",
    "Permintaan Khusus": "Need interpreter"
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
  'Dewi Sartika',
  'dewi.sartika@test.com',
  '081234567893',
  'approved',
  '{
    "member_number": "2024000004",
    "company": "PT Inovasi Digital",
    "position": "Senior Developer",
    "department": "Engineering",
    "address": "Jl. Asia Afrika No. 321",
    "city": "Medan",
    "dietary_restrictions": "No restrictions",
    "special_requests": "Need vegetarian meal"
  }'::jsonb
FROM events e 
WHERE e.name = 'AFTER HOURS by PWMII CONNECT'
LIMIT 1;

-- Verify the data was created
SELECT 'Test Data Created:' as info;
SELECT 
  r.id,
  r.participant_name,
  r.participant_email,
  r.phone_number,
  r.status,
  r.custom_data
FROM registrations r
WHERE r.participant_email LIKE '%@test.com'
ORDER BY r.participant_name;

-- Show summary
SELECT 'Summary:' as info;
SELECT 
  COUNT(*) as total_test_registrations,
  COUNT(CASE WHEN custom_data IS NOT NULL THEN 1 END) as with_custom_data,
  COUNT(CASE WHEN custom_data IS NULL THEN 1 END) as without_custom_data
FROM registrations r
WHERE r.participant_email LIKE '%@test.com';
