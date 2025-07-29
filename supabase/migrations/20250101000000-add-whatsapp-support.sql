-- Add WhatsApp support to existing tables

-- Add phone_number column to registrations table
ALTER TABLE public.registrations 
ADD COLUMN phone_number TEXT;

-- Add whatsapp_enabled column to events table
ALTER TABLE public.events 
ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;

-- Add WhatsApp tracking columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_registrations_phone_number ON public.registrations(phone_number);

-- Add index for WhatsApp enabled events
CREATE INDEX IF NOT EXISTS idx_events_whatsapp_enabled ON public.events(whatsapp_enabled); 