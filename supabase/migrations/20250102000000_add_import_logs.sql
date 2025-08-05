-- Add import logs table for tracking import operations
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  imported_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL, -- 'csv' or 'excel'
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  import_config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_import_logs_event_id ON public.import_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_imported_by ON public.import_logs(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON public.import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON public.import_logs(started_at);

-- Add RLS policies for import logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all import logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all import logs' AND tablename = 'import_logs'
  ) THEN
    CREATE POLICY "Admins can view all import logs"
    ON public.import_logs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Admins can insert import logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert import logs' AND tablename = 'import_logs'
  ) THEN
    CREATE POLICY "Admins can insert import logs"
    ON public.import_logs
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Admins can update import logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update import logs' AND tablename = 'import_logs'
  ) THEN
    CREATE POLICY "Admins can update import logs"
    ON public.import_logs
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Add function to get import statistics
CREATE OR REPLACE FUNCTION get_import_stats(event_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  total_imports INTEGER,
  total_records INTEGER,
  successful_imports INTEGER,
  failed_imports INTEGER,
  success_rate NUMERIC,
  last_import_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    COUNT(il.id) as total_imports,
    COALESCE(SUM(il.total_records), 0) as total_records,
    COALESCE(SUM(il.successful_imports), 0) as successful_imports,
    COALESCE(SUM(il.failed_imports), 0) as failed_imports,
    CASE 
      WHEN COALESCE(SUM(il.total_records), 0) > 0 
      THEN ROUND((COALESCE(SUM(il.successful_imports), 0)::NUMERIC / COALESCE(SUM(il.total_records), 1)::NUMERIC) * 100, 2)
      ELSE 0 
    END as success_rate,
    MAX(il.started_at) as last_import_at
  FROM public.events e
  LEFT JOIN public.import_logs il ON e.id = il.event_id
  WHERE (event_id_param IS NULL OR e.id = event_id_param)
  GROUP BY e.id, e.name
  ORDER BY e.name;
END;
$$; 