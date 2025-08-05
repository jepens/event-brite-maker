-- Test Data untuk Batch Approve Feature Testing
-- Jalankan query ini di Supabase SQL Editor

-- Clean up existing test data first
DELETE FROM registrations WHERE participant_email LIKE '%@example.com';
DELETE FROM events WHERE name LIKE 'Test Event%' OR name IN ('Tech Conference 2024', 'Business Summit', 'Creative Workshop');

-- Insert test events
INSERT INTO events (name, description, event_date, location, max_participants, whatsapp_enabled, registration_status, dresscode, created_by)
VALUES 
  ('Tech Conference 2024', 'Test event for batch approve', NOW() + INTERVAL '7 days', 'Test Location 1', 100, true, 'open', 'Business Casual', '00000000-0000-0000-0000-000000000000'),
  ('Business Summit', 'Test event for batch approve', NOW() + INTERVAL '14 days', 'Test Location 2', 100, false, 'open', 'Smart Casual', '00000000-0000-0000-0000-000000000000'),
  ('Creative Workshop', 'Test event for batch approve', NOW() + INTERVAL '21 days', 'Test Location 3', 100, true, 'open', 'Business Casual', '00000000-0000-0000-0000-000000000000');

-- Get the event IDs and insert test registrations
WITH event_ids AS (
  SELECT id FROM events WHERE name IN ('Tech Conference 2024', 'Business Summit', 'Creative Workshop')
)
INSERT INTO registrations (event_id, participant_name, participant_email, phone_number, status, custom_data)
SELECT 
  e.id,
  CASE 
    WHEN rn = 1 THEN 'John Smith'
    WHEN rn = 2 THEN 'Jane Doe'
    WHEN rn = 3 THEN 'Michael Johnson'
    WHEN rn = 4 THEN 'Sarah Wilson'
    WHEN rn = 5 THEN 'David Brown'
    WHEN rn = 6 THEN 'Lisa Garcia'
    WHEN rn = 7 THEN 'Robert Miller'
    WHEN rn = 8 THEN 'Emily Davis'
    WHEN rn = 9 THEN 'James Wilson'
    WHEN rn = 10 THEN 'Maria Rodriguez'
  END,
  CASE 
    WHEN rn = 1 THEN 'john.smith@example.com'
    WHEN rn = 2 THEN 'jane.doe@example.com'
    WHEN rn = 3 THEN 'michael.johnson@example.com'
    WHEN rn = 4 THEN 'sarah.wilson@example.com'
    WHEN rn = 5 THEN 'david.brown@example.com'
    WHEN rn = 6 THEN 'lisa.garcia@example.com'
    WHEN rn = 7 THEN 'robert.miller@example.com'
    WHEN rn = 8 THEN 'emily.davis@example.com'
    WHEN rn = 9 THEN 'james.wilson@example.com'
    WHEN rn = 10 THEN 'maria.rodriguez@example.com'
  END,
  CASE 
    WHEN rn = 1 THEN '081234567890'
    WHEN rn = 2 THEN '081234567891'
    WHEN rn = 3 THEN '081234567892'
    WHEN rn = 4 THEN '081234567893'
    WHEN rn = 5 THEN '081234567894'
    WHEN rn = 6 THEN '081234567895'
    WHEN rn = 7 THEN '081234567896'
    WHEN rn = 8 THEN '081234567897'
    WHEN rn = 9 THEN '081234567898'
    WHEN rn = 10 THEN '081234567899'
  END,
  'pending',
  '{"company": "Test Company", "position": "Test Position", "dietary_restrictions": "None", "special_requests": ""}'
FROM event_ids e
CROSS JOIN generate_series(1, 10) AS rn;

-- Verify the data was created
SELECT 
  'Events created:' as info,
  COUNT(*) as count
FROM events 
WHERE name IN ('Tech Conference 2024', 'Business Summit', 'Creative Workshop')
UNION ALL
SELECT 
  'Pending registrations created:' as info,
  COUNT(*) as count
FROM registrations 
WHERE participant_email LIKE '%@example.com' AND status = 'pending'; 