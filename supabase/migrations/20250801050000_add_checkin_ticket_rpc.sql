-- Create RPC function for optimized check-in process
-- This combines ticket lookup and status update into a single database call
-- Reduces API requests from 2 to 1 for each check-in operation

CREATE OR REPLACE FUNCTION checkin_ticket(
  qr_code_param TEXT,
  checkin_location_param TEXT DEFAULT 'QR Scanner',
  checkin_notes_param TEXT DEFAULT 'Checked in via scanner'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_record RECORD;
  registration_record RECORD;
  event_record RECORD;
  result JSON;
BEGIN
  -- Find ticket by QR code or short code (regardless of status)
  SELECT t.*, r.*, e.name as event_name, e.event_date, e.location
  INTO ticket_record
  FROM tickets t
  JOIN registrations r ON t.registration_id = r.id
  JOIN events e ON r.event_id = e.id
  WHERE (t.qr_code = qr_code_param OR t.short_code = qr_code_param)
  LIMIT 1;

  -- Check if ticket exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket tidak ditemukan'
    );
  END IF;

  -- Check if ticket is already used
  IF ticket_record.status = 'used' OR ticket_record.checkin_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket sudah digunakan',
      'ticket_info', json_build_object(
        'used_at', ticket_record.used_at,
        'checkin_at', ticket_record.checkin_at,
        'checkin_location', ticket_record.checkin_location,
        'checkin_notes', ticket_record.checkin_notes
      ),
      'participant', json_build_object(
        'name', ticket_record.participant_name,
        'email', ticket_record.participant_email
      ),
      'event', json_build_object(
        'name', ticket_record.event_name,
        'date', ticket_record.event_date,
        'location', ticket_record.location
      )
    );
  END IF;

  -- Update ticket status to used
  UPDATE tickets
  SET 
    status = 'used',
    checkin_at = NOW(),
    checkin_by = auth.uid(),
    checkin_location = checkin_location_param,
    checkin_notes = checkin_notes_param
  WHERE id = ticket_record.id;

  -- Return success response with ticket and participant info
  RETURN json_build_object(
    'success', true,
    'message', 'Check-in successful',
    'ticket', json_build_object(
      'id', ticket_record.id,
      'qr_code', ticket_record.qr_code,
      'short_code', ticket_record.short_code,
      'status', 'used',
      'checkin_at', NOW()
    ),
    'participant', json_build_object(
      'name', ticket_record.participant_name,
      'email', ticket_record.participant_email
    ),
    'event', json_build_object(
      'name', ticket_record.event_name,
      'date', ticket_record.event_date,
      'location', ticket_record.location
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION checkin_ticket(TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION checkin_ticket(TEXT, TEXT, TEXT) IS 
'Optimized check-in function that combines ticket lookup and status update into a single database call. Reduces API requests from 2 to 1 for each check-in operation.'; 