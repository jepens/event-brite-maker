-- Add WhatsApp support to existing tables

-- Add phone_number column to registrations table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'phone_number') THEN
        ALTER TABLE public.registrations ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- Add whatsapp_enabled column to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'whatsapp_enabled') THEN
        ALTER TABLE public.events ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add WhatsApp tracking columns to tickets table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'whatsapp_sent_at') THEN
        ALTER TABLE public.tickets ADD COLUMN whatsapp_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'whatsapp_sent') THEN
        ALTER TABLE public.tickets ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_registrations_phone_number ON public.registrations(phone_number);

-- Add index for WhatsApp enabled events
CREATE INDEX IF NOT EXISTS idx_events_whatsapp_enabled ON public.events(whatsapp_enabled); 