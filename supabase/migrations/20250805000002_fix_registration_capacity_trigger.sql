-- Fix the registration capacity check function to resolve ambiguous column reference
-- Migration: 20250805000002-fix-registration-capacity-trigger.sql

-- Drop the existing problematic trigger
DROP TRIGGER IF EXISTS check_registration_capacity_trigger ON registrations;

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
    
    -- Get maximum participants for this event - use explicit table alias
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

-- Recreate the trigger with the fixed function
CREATE TRIGGER check_registration_capacity_trigger
    BEFORE INSERT ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION check_registration_capacity();

-- Add comment to explain the trigger
COMMENT ON TRIGGER check_registration_capacity_trigger ON registrations IS 
'Prevents registration when event has reached maximum capacity - Fixed version'; 