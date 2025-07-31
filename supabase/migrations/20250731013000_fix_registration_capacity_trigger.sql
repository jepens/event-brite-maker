-- Fix the registration capacity check function
CREATE OR REPLACE FUNCTION check_registration_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_participants INTEGER;
BEGIN
    -- Get current registration count for this event
    SELECT COUNT(*) INTO current_count
    FROM registrations
    WHERE event_id = NEW.event_id;
    
    -- Get maximum participants for this event
    SELECT e.max_participants INTO max_participants
    FROM events e
    WHERE e.id = NEW.event_id;
    
    -- Check if adding this registration would exceed capacity
    IF current_count >= max_participants THEN
        RAISE EXCEPTION 'Event has reached maximum capacity. Cannot register more participants.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 