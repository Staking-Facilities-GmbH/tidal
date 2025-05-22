-- Add on-chain and storage reference fields to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS allowlist_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS walrus_blob_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sui_object_id TEXT; 