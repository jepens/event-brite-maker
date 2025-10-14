-- WhatsApp Blast Feature Migration
-- This migration adds tables for WhatsApp blast campaigns and recipients

-- Create whatsapp_blast_campaigns table
CREATE TABLE whatsapp_blast_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_name VARCHAR(100) NOT NULL DEFAULT 'event_details_reminder_duage',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create whatsapp_blast_recipients table
CREATE TABLE whatsapp_blast_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES whatsapp_blast_campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    message_id VARCHAR(255), -- WhatsApp message ID from API response
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_blast_campaigns_status ON whatsapp_blast_campaigns(status);
CREATE INDEX idx_whatsapp_blast_campaigns_created_by ON whatsapp_blast_campaigns(created_by);
CREATE INDEX idx_whatsapp_blast_campaigns_created_at ON whatsapp_blast_campaigns(created_at);

CREATE INDEX idx_whatsapp_blast_recipients_campaign_id ON whatsapp_blast_recipients(campaign_id);
CREATE INDEX idx_whatsapp_blast_recipients_status ON whatsapp_blast_recipients(status);
CREATE INDEX idx_whatsapp_blast_recipients_phone_number ON whatsapp_blast_recipients(phone_number);
CREATE INDEX idx_whatsapp_blast_recipients_message_id ON whatsapp_blast_recipients(message_id);

-- Create RLS policies
ALTER TABLE whatsapp_blast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_blast_recipients ENABLE ROW LEVEL SECURITY;

-- Policy for whatsapp_blast_campaigns: Only authenticated users can access
CREATE POLICY "Users can view all campaigns" ON whatsapp_blast_campaigns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create campaigns" ON whatsapp_blast_campaigns
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own campaigns" ON whatsapp_blast_campaigns
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own campaigns" ON whatsapp_blast_campaigns
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policy for whatsapp_blast_recipients: Access through campaign relationship
CREATE POLICY "Users can view recipients of accessible campaigns" ON whatsapp_blast_recipients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM whatsapp_blast_campaigns 
            WHERE id = whatsapp_blast_recipients.campaign_id
        )
    );

CREATE POLICY "Users can insert recipients for accessible campaigns" ON whatsapp_blast_recipients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM whatsapp_blast_campaigns 
            WHERE id = whatsapp_blast_recipients.campaign_id
        )
    );

CREATE POLICY "Users can update recipients of accessible campaigns" ON whatsapp_blast_recipients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM whatsapp_blast_campaigns 
            WHERE id = whatsapp_blast_recipients.campaign_id
        )
    );

CREATE POLICY "Users can delete recipients of accessible campaigns" ON whatsapp_blast_recipients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM whatsapp_blast_campaigns 
            WHERE id = whatsapp_blast_recipients.campaign_id
        )
    );

-- Create function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign statistics when recipient status changes
    UPDATE whatsapp_blast_campaigns 
    SET 
        sent_count = (
            SELECT COUNT(*) FROM whatsapp_blast_recipients 
            WHERE campaign_id = NEW.campaign_id AND status IN ('sent', 'delivered', 'read')
        ),
        delivered_count = (
            SELECT COUNT(*) FROM whatsapp_blast_recipients 
            WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'read')
        ),
        failed_count = (
            SELECT COUNT(*) FROM whatsapp_blast_recipients 
            WHERE campaign_id = NEW.campaign_id AND status = 'failed'
        )
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update campaign statistics
CREATE TRIGGER trigger_update_campaign_statistics
    AFTER UPDATE OF status ON whatsapp_blast_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_statistics();

-- Create function to get campaign summary
CREATE OR REPLACE FUNCTION get_campaign_summary(campaign_uuid UUID)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    template_name VARCHAR,
    status VARCHAR,
    total_recipients BIGINT,
    sent_count BIGINT,
    delivered_count BIGINT,
    failed_count BIGINT,
    pending_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.template_name,
        c.status,
        COUNT(r.id) as total_recipients,
        COUNT(CASE WHEN r.status IN ('sent', 'delivered', 'read') THEN 1 END) as sent_count,
        COUNT(CASE WHEN r.status IN ('delivered', 'read') THEN 1 END) as delivered_count,
        COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_count,
        c.created_at,
        c.started_at,
        c.completed_at
    FROM whatsapp_blast_campaigns c
    LEFT JOIN whatsapp_blast_recipients r ON c.id = r.campaign_id
    WHERE c.id = campaign_uuid
    GROUP BY c.id, c.name, c.template_name, c.status, c.created_at, c.started_at, c.completed_at;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON whatsapp_blast_campaigns TO authenticated;
GRANT ALL ON whatsapp_blast_recipients TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_summary TO authenticated;