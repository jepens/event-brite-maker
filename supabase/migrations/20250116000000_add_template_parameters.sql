-- Add template parameters support to WhatsApp blast campaigns
-- This migration adds columns to store template parameters

-- Add template parameters columns to whatsapp_blast_campaigns table
ALTER TABLE whatsapp_blast_campaigns 
ADD COLUMN IF NOT EXISTS template_params JSONB DEFAULT '{
  "participant_name": "Peserta",
  "location": "TBA", 
  "address": "TBA",
  "date": "TBA",
  "time": "TBA"
}'::jsonb;

-- Add comment to explain the template_params structure
COMMENT ON COLUMN whatsapp_blast_campaigns.template_params IS 'Template parameters for WhatsApp message. Expected structure: {"participant_name": "string", "location": "string", "address": "string", "date": "string", "time": "string"}';

-- Create index for template_params for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_blast_campaigns_template_params ON whatsapp_blast_campaigns USING GIN (template_params);

-- Update existing campaigns to have default template parameters
UPDATE whatsapp_blast_campaigns 
SET template_params = '{
  "participant_name": "Peserta",
  "location": "TBA", 
  "address": "TBA",
  "date": "TBA",
  "time": "TBA"
}'::jsonb
WHERE template_params IS NULL;