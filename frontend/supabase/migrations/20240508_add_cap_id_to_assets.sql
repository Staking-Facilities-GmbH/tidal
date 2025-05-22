-- Add cap_id column to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS cap_id TEXT; 