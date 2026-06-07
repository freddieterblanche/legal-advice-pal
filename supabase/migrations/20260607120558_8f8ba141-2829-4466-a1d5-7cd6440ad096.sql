ALTER TABLE public.expert_witnesses
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS office_phone text,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;