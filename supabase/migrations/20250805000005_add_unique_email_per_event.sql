-- Add unique constraint for email per event
-- Migration: 20250805000005-add-unique-email-per-event.sql

-- Add unique constraint for participant_email per event_id if it doesn't exist
DO $unique_email_per_event_block$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_email_per_event' 
        AND conrelid = 'public.registrations'::regclass
    ) THEN
        -- Add the unique constraint
        ALTER TABLE public.registrations 
        ADD CONSTRAINT unique_email_per_event 
        UNIQUE (event_id, participant_email);
        
        RAISE NOTICE 'Added unique_email_per_event constraint to registrations table';
    ELSE
        RAISE NOTICE 'unique_email_per_event constraint already exists';
    END IF;
END $unique_email_per_event_block$;

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_registrations_event_email 
ON public.registrations(event_id, participant_email);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_email_per_event ON public.registrations 
IS 'Ensures each email can only be registered once per event';
