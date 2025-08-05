-- Migration: Add Import Templates and History
-- Description: Creates tables for import template management and import history tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Import templates table
CREATE TABLE import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  field_mapping JSONB NOT NULL,
  validation_rules JSONB,
  default_status VARCHAR(50) DEFAULT 'pending',
  is_public BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import history table
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES import_templates(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  skipped_imports INTEGER NOT NULL DEFAULT 0,
  import_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Import history details table for detailed tracking
CREATE TABLE import_history_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_history_id UUID REFERENCES import_history(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  participant_name VARCHAR(255),
  participant_email VARCHAR(255),
  phone_number VARCHAR(50),
  status VARCHAR(50),
  error_message TEXT,
  is_success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_import_templates_event_id ON import_templates(event_id);
CREATE INDEX idx_import_templates_created_by ON import_templates(created_by);
CREATE INDEX idx_import_templates_is_public ON import_templates(is_public);
CREATE INDEX idx_import_history_event_id ON import_history(event_id);
CREATE INDEX idx_import_history_created_by ON import_history(created_by);
CREATE INDEX idx_import_history_status ON import_history(import_status);
CREATE INDEX idx_import_history_started_at ON import_history(started_at);
CREATE INDEX idx_import_history_details_import_id ON import_history_details(import_history_id);

-- RLS Policies for import_templates
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and public templates
CREATE POLICY "Users can view own templates" ON import_templates
  FOR SELECT USING (
    auth.uid() = created_by OR is_public = true
  );

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates" ON import_templates
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON import_templates
  FOR UPDATE USING (
    auth.uid() = created_by
  );

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON import_templates
  FOR DELETE USING (
    auth.uid() = created_by
  );

-- RLS Policies for import_history
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own import history
CREATE POLICY "Users can view own import history" ON import_history
  FOR SELECT USING (
    auth.uid() = created_by
  );

-- Users can insert their own import history
CREATE POLICY "Users can insert own import history" ON import_history
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

-- Users can update their own import history
CREATE POLICY "Users can update own import history" ON import_history
  FOR UPDATE USING (
    auth.uid() = created_by
  );

-- RLS Policies for import_history_details
ALTER TABLE import_history_details ENABLE ROW LEVEL SECURITY;

-- Users can view details of their own imports
CREATE POLICY "Users can view own import details" ON import_history_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM import_history 
      WHERE import_history.id = import_history_details.import_history_id 
      AND import_history.created_by = auth.uid()
    )
  );

-- Users can insert details for their own imports
CREATE POLICY "Users can insert own import details" ON import_history_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM import_history 
      WHERE import_history.id = import_history_details.import_history_id 
      AND import_history.created_by = auth.uid()
    )
  );

-- Function to get import statistics
CREATE OR REPLACE FUNCTION get_import_stats(
  p_event_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_imports BIGINT,
  successful_imports BIGINT,
  failed_imports BIGINT,
  total_records BIGINT,
  avg_records_per_import NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_imports,
    COUNT(*) FILTER (WHERE import_status = 'completed')::BIGINT as successful_imports,
    COUNT(*) FILTER (WHERE import_status = 'failed')::BIGINT as failed_imports,
    COALESCE(SUM(total_records), 0)::BIGINT as total_records,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(AVG(total_records)::NUMERIC, 2)
      ELSE 0
    END as avg_records_per_import,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(
        (COUNT(*) FILTER (WHERE import_status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
      )
      ELSE 0
    END as success_rate
  FROM import_history
  WHERE (p_event_id IS NULL OR event_id = p_event_id)
    AND (p_user_id IS NULL OR created_by = p_user_id)
    AND (p_date_from IS NULL OR started_at >= p_date_from)
    AND (p_date_to IS NULL OR started_at <= p_date_to);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get template statistics
CREATE OR REPLACE FUNCTION get_template_stats(
  p_event_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_templates BIGINT,
  public_templates BIGINT,
  private_templates BIGINT,
  most_used_template UUID,
  most_used_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_templates,
    COUNT(*) FILTER (WHERE is_public = true)::BIGINT as public_templates,
    COUNT(*) FILTER (WHERE is_public = false)::BIGINT as private_templates,
    (SELECT template_id 
     FROM import_history 
     WHERE (p_event_id IS NULL OR event_id = p_event_id)
       AND (p_user_id IS NULL OR created_by = p_user_id)
       AND template_id IS NOT NULL
     GROUP BY template_id 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as most_used_template,
    (SELECT COUNT(*) 
     FROM import_history 
     WHERE (p_event_id IS NULL OR event_id = p_event_id)
       AND (p_user_id IS NULL OR created_by = p_user_id)
       AND template_id = (
         SELECT template_id 
         FROM import_history 
         WHERE (p_event_id IS NULL OR event_id = p_event_id)
           AND (p_user_id IS NULL OR created_by = p_user_id)
           AND template_id IS NOT NULL
         GROUP BY template_id 
         ORDER BY COUNT(*) DESC 
         LIMIT 1
       ))::BIGINT as most_used_count
  FROM import_templates
  WHERE (p_event_id IS NULL OR event_id = p_event_id)
    AND (p_user_id IS NULL OR created_by = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default templates
INSERT INTO import_templates (name, description, field_mapping, validation_rules, is_public, created_by) VALUES
(
  'Default CSV Template',
  'Template default untuk import CSV dengan field standar',
  '{
    "participant_name": "Nama Peserta",
    "participant_email": "Email",
    "phone_number": "Nomor Telepon"
  }',
  '{
    "participant_email": {
      "required": true,
      "type": "email"
    },
    "participant_name": {
      "required": true,
      "minLength": 2
    },
    "phone_number": {
      "required": false,
      "pattern": "^[+]?[0-9\\s\\-()]{8,}$"
    }
  }',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Excel Template with Custom Fields',
  'Template untuk import Excel dengan custom fields',
  '{
    "participant_name": "Nama",
    "participant_email": "Email",
    "phone_number": "Telepon",
    "custom_data.company": "Perusahaan",
    "custom_data.position": "Jabatan"
  }',
  '{
    "participant_email": {
      "required": true,
      "type": "email"
    },
    "participant_name": {
      "required": true,
      "minLength": 2
    },
    "phone_number": {
      "required": false,
      "pattern": "^[+]?[0-9\\s\\-()]{8,}$"
    }
  }',
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_import_templates_updated_at
  BEFORE UPDATE ON import_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 