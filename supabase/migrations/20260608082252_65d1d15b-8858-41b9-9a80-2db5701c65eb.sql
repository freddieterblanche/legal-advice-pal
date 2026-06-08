ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS services text[];
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS services text[];