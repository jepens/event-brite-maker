-- Add check-in tracking capabilities
-- Migration: 20250101000001-add-checkin-tracking.sql

-- Add check-in tracking columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN checkin_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN checkin_by UUID REFERENCES auth.users(id),
ADD COLUMN checkin_location TEXT,
ADD COLUMN checkin_notes TEXT;

-- Add index for check-in queries
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

-- Create function to get check-in statistics
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

-- Grant permissions
GRANT SELECT ON checkin_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_checkin_stats(UUID) TO authenticated; 