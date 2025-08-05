-- Add missing columns to registrations table
-- Migration: 20250805000003-add-missing-columns.sql

-- Add phone_number column if it doesn't exist
DO $phone_number_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'phone_number') THEN
        ALTER TABLE public.registrations ADD COLUMN phone_number TEXT;
        CREATE INDEX IF NOT EXISTS idx_registrations_phone_number ON public.registrations(phone_number);
    END IF;
END $phone_number_block$;

-- Add updated_at column if it doesn't exist
DO $updated_at_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'updated_at') THEN
        ALTER TABLE public.registrations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        
        -- Create trigger to automatically update updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $function_block$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $function_block$ language 'plpgsql';

        CREATE TRIGGER update_registrations_updated_at 
            BEFORE UPDATE ON registrations 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $updated_at_block$;

-- Add whatsapp_enabled column to events if it doesn't exist
DO $whatsapp_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'whatsapp_enabled') THEN
        ALTER TABLE public.events ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_events_whatsapp_enabled ON public.events(whatsapp_enabled);
    END IF;
END $whatsapp_block$;

-- Add dresscode column to events if it doesn't exist
DO $dresscode_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'dresscode') THEN
        ALTER TABLE public.events ADD COLUMN dresscode TEXT;
    END IF;
END $dresscode_block$;

-- Add registration_status column to events if it doesn't exist
DO $status_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_status') THEN
        ALTER TABLE public.events ADD COLUMN registration_status TEXT DEFAULT 'open';
    END IF;
END $status_block$; 