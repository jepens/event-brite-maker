-- Fix storage policies for event logos - make them more permissive for authenticated users
DROP POLICY IF EXISTS "Admins can upload event logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update event logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event logos" ON storage.objects;

-- Create more permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload event logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update event logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete event logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-logos' AND auth.role() = 'authenticated');