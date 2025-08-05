-- Add registration_status column to events table
ALTER TABLE events 
ADD COLUMN registration_status TEXT DEFAULT 'open' CHECK (registration_status IN ('open', 'closed'));

-- Update existing events to have 'open' status
UPDATE events 
SET registration_status = 'open' 
WHERE registration_status IS NULL;

-- Make registration_status NOT NULL after setting default values
ALTER TABLE events 
ALTER COLUMN registration_status SET NOT NULL; 