-- Create storage bucket for event logos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-logos', 'event-logos', true);

-- Create policies for event logos storage
CREATE POLICY "Anyone can view event logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-logos');

CREATE POLICY "Admins can upload event logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can update event logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can delete event logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-logos' AND (storage.foldername(name))[1] = auth.uid()::text);