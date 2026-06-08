ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS featured_since timestamptz;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS featured_since timestamptz;
CREATE INDEX IF NOT EXISTS service_providers_featured_idx ON public.service_providers (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS firms_featured_idx ON public.firms (is_featured) WHERE is_featured = true;