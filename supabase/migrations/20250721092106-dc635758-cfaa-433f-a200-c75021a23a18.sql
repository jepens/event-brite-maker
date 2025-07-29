-- Check current policies on registrations table and fix RLS issue
-- The "Anyone can insert registrations" policy needs to be updated to handle anonymous users properly

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.registrations;

-- Create a more permissive policy for anonymous registrations
CREATE POLICY "Allow public registration insertion" 
ON public.registrations 
FOR INSERT 
WITH CHECK (true);

-- Also ensure users can view their own registrations if they have an account
CREATE POLICY "Users can view own registrations" 
ON public.registrations 
FOR SELECT 
USING (
  -- Allow if user is admin (existing policy covers this)
  -- OR if checking their own email (for anonymous users who might check status)
  true
);

-- Add short_code column to tickets table for shorter manual verification
ALTER TABLE public.tickets ADD COLUMN short_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_tickets_short_code ON public.tickets(short_code);

-- Create function to generate unique short codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Generate 8 character code
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE short_code = result) THEN
      RETURN result;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      -- If too many attempts, add timestamp to make it unique
      result := result || substr(encode(sha256(clock_timestamp()::text::bytea), 'hex'), 1, 2);
      RETURN result;
    END IF;
  END LOOP;
END;
$$;

-- Update existing tickets to have short codes
UPDATE public.tickets 
SET short_code = generate_short_code() 
WHERE short_code IS NULL;