ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.firm_branches ADD COLUMN IF NOT EXISTS email text;