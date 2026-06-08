ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS profile_url text;