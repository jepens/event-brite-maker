-- Add dresscode column to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'dresscode') THEN
        ALTER TABLE public.events ADD COLUMN dresscode TEXT;
    END IF;
END $$;

-- Add comment to explain the dresscode column
COMMENT ON COLUMN public.events.dresscode IS 'Dresscode for the event (e.g., "Smart Casual", "Formal", "Casual")';

-- Update existing events with default dresscodes based on event time
UPDATE public.events 
SET dresscode = CASE 
  WHEN EXTRACT(HOUR FROM event_date) >= 18 OR EXTRACT(HOUR FROM event_date) < 6 THEN 'Smart Casual / Semi Formal'
  WHEN EXTRACT(HOUR FROM event_date) >= 12 AND EXTRACT(HOUR FROM event_date) < 18 THEN 'Casual / Smart Casual'
  ELSE 'Casual / Comfortable'
END
WHERE dresscode IS NULL; 