-- Add email tracking support to tickets table
-- Migration: 20250805000004-add-email-tracking.sql

-- Add email tracking columns to tickets table
DO $email_tracking_block$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'email_sent') THEN
        ALTER TABLE public.tickets ADD COLUMN email_sent BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'email_sent_at') THEN
        ALTER TABLE public.tickets ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $email_tracking_block$;

-- Add index for email tracking queries
CREATE INDEX IF NOT EXISTS idx_tickets_email_sent ON public.tickets(email_sent);
CREATE INDEX IF NOT EXISTS idx_tickets_email_sent_at ON public.tickets(email_sent_at);

-- Add comment to explain the new columns
COMMENT ON COLUMN public.tickets.email_sent IS 'Track whether email notification has been sent for this ticket';
COMMENT ON COLUMN public.tickets.email_sent_at IS 'Timestamp when email notification was sent for this ticket'; 