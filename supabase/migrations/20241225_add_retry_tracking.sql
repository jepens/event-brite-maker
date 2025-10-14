-- Add retry tracking columns to whatsapp_blast_recipients table
ALTER TABLE whatsapp_blast_recipients 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_reason TEXT,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_blast_recipients_retry 
ON whatsapp_blast_recipients(status, next_retry_at, retry_count) 
WHERE status = 'failed' AND retry_count < 3;

-- Add index for retry scheduling
CREATE INDEX IF NOT EXISTS idx_whatsapp_blast_recipients_next_retry 
ON whatsapp_blast_recipients(next_retry_at) 
WHERE next_retry_at IS NOT NULL;

-- Update existing failed records to be eligible for retry
UPDATE whatsapp_blast_recipients 
SET 
  retry_count = 0,
  next_retry_at = NOW() + INTERVAL '5 minutes',
  retry_reason = 'Phone validation fix - eligible for retry'
WHERE status = 'failed' 
  AND error_message LIKE '%Invalid phone number format%'
  AND retry_count IS NULL;