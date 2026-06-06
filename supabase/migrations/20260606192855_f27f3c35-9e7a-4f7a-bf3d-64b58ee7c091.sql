
ALTER TABLE public.lawyers
  ADD COLUMN IF NOT EXISTS lawyer_type text CHECK (lawyer_type IN ('advocate','attorney')),
  ADD COLUMN IF NOT EXISTS year_of_admission integer CHECK (year_of_admission BETWEEN 1900 AND 2100),
  ADD COLUMN IF NOT EXISTS is_senior_counsel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS designation_code text,
  ADD COLUMN IF NOT EXISTS designation_custom text,
  ADD COLUMN IF NOT EXISTS is_practice_head boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS practice_head_area text,
  ADD COLUMN IF NOT EXISTS is_sector_head boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sector_head_area text;
