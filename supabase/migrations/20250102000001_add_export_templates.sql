-- Add export templates table for saving export configurations
CREATE TABLE public.export_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'excel',
  include_custom_fields BOOLEAN NOT NULL DEFAULT true,
  include_tickets BOOLEAN NOT NULL DEFAULT true,
  include_checkin_data BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_export_templates_event_id ON public.export_templates(event_id);
CREATE INDEX idx_export_templates_created_by ON public.export_templates(created_by);
CREATE INDEX idx_export_templates_updated_at ON public.export_templates(updated_at);

-- Add RLS policies for export templates
ALTER TABLE public.export_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view all export templates
CREATE POLICY "Admins can view all export templates" 
ON public.export_templates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admins can insert export templates
CREATE POLICY "Admins can insert export templates" 
ON public.export_templates 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admins can update export templates
CREATE POLICY "Admins can update export templates" 
ON public.export_templates 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admins can delete export templates
CREATE POLICY "Admins can delete export templates" 
ON public.export_templates 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add function to get export statistics
CREATE OR REPLACE FUNCTION get_export_stats(event_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  total_exports INTEGER,
  last_export_at TIMESTAMP WITH TIME ZONE,
  most_used_format TEXT,
  most_used_template TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    COUNT(et.id) as total_exports,
    MAX(et.updated_at) as last_export_at,
    MODE() WITHIN GROUP (ORDER BY et.format) as most_used_format,
    MODE() WITHIN GROUP (ORDER BY et.name) as most_used_template
  FROM public.events e
  LEFT JOIN public.export_templates et ON e.id = et.event_id
  WHERE (event_id_param IS NULL OR e.id = event_id_param)
  GROUP BY e.id, e.name
  ORDER BY e.name;
END;
$$;

-- Insert some default templates
INSERT INTO public.export_templates (name, description, fields, filters, format, include_custom_fields, include_tickets, include_checkin_data) VALUES
(
  'Semua Data',
  'Export semua data registrasi dengan semua field',
  '["id", "participant_name", "participant_email", "phone_number", "status", "registered_at", "event_name"]',
  '{"status": "all"}',
  'excel',
  true,
  true,
  true
),
(
  'Data Check-in',
  'Export hanya data yang sudah check-in',
  '["participant_name", "participant_email", "checkin_at", "checkin_location"]',
  '{"checkinStatus": "checked_in"}',
  'csv',
  false,
  false,
  true
),
(
  'Data Pending',
  'Export data yang masih pending',
  '["participant_name", "participant_email", "phone_number", "registered_at"]',
  '{"status": "pending"}',
  'excel',
  true,
  false,
  false
); 