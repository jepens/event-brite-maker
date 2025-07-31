-- Add sequence_number column to existing members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Add unique constraint to sequence_number
ALTER TABLE public.members 
ADD CONSTRAINT members_sequence_number_unique UNIQUE (sequence_number);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_members_sequence_number ON public.members(sequence_number); 