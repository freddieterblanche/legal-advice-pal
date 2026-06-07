
-- Extend lawyers table with mediator/arbitrator + shared fields
ALTER TABLE public.lawyers
  ADD COLUMN IF NOT EXISTS is_mediator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_arbitrator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mediator_accreditation text,
  ADD COLUMN IF NOT EXISTS mediator_style text,
  ADD COLUMN IF NOT EXISTS mediator_sectors text[],
  ADD COLUMN IF NOT EXISTS arbitrator_accreditation text,
  ADD COLUMN IF NOT EXISTS arbitrator_types text[],
  ADD COLUMN IF NOT EXISTS arbitrator_experience_years integer,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS daily_rate_range text,
  ADD COLUMN IF NOT EXISTS availability_notes text;

-- Expert disciplines lookup
CREATE TABLE IF NOT EXISTS public.expert_disciplines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_category text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.expert_disciplines TO anon, authenticated;
GRANT ALL ON public.expert_disciplines TO service_role;
ALTER TABLE public.expert_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read expert disciplines"
  ON public.expert_disciplines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins manage expert disciplines"
  ON public.expert_disciplines FOR ALL TO authenticated
  USING (get_my_role() = 'platform_admin')
  WITH CHECK (get_my_role() = 'platform_admin');

-- Expert witnesses
CREATE TABLE IF NOT EXISTS public.expert_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  qualifications text,
  registration_body text,
  employer text,
  is_independent boolean NOT NULL DEFAULT true,
  bio text,
  avatar_url text,
  cv_url text,
  city text,
  province text,
  geographic_availability text,
  courts_accepted_in text[],
  languages text[],
  fee_range text,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','pending_payment','suspended','inactive')),
  trial_start_date timestamptz NOT NULL DEFAULT now(),
  trial_end_date timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  profile_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.expert_witnesses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.expert_witnesses TO authenticated;
GRANT ALL ON public.expert_witnesses TO service_role;
ALTER TABLE public.expert_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active/trial experts"
  ON public.expert_witnesses FOR SELECT TO anon, authenticated
  USING (status IN ('trial','active') OR firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin');
CREATE POLICY "Firm admins insert experts in their firm"
  ON public.expert_witnesses FOR INSERT TO authenticated
  WITH CHECK (firm_id = get_my_firm_id() AND get_my_role() IN ('firm_admin','platform_admin'));
CREATE POLICY "Firm admins update experts in their firm"
  ON public.expert_witnesses FOR UPDATE TO authenticated
  USING (firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')
  WITH CHECK (firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin');
CREATE POLICY "Firm admins delete experts in their firm"
  ON public.expert_witnesses FOR DELETE TO authenticated
  USING (firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin');

CREATE TRIGGER update_expert_witnesses_updated_at
  BEFORE UPDATE ON public.expert_witnesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent non-admins changing status
CREATE OR REPLACE FUNCTION public.prevent_expert_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND COALESCE(get_my_role(), '') <> 'platform_admin' THEN
    RAISE EXCEPTION 'Only platform admins can change expert witness status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_expert_status_change
  BEFORE UPDATE ON public.expert_witnesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_expert_status_change();

-- Expert witness ↔ discipline
CREATE TABLE IF NOT EXISTS public.expert_witness_disciplines (
  expert_witness_id uuid NOT NULL REFERENCES public.expert_witnesses(id) ON DELETE CASCADE,
  discipline_id uuid NOT NULL REFERENCES public.expert_disciplines(id) ON DELETE CASCADE,
  PRIMARY KEY (expert_witness_id, discipline_id)
);
GRANT SELECT ON public.expert_witness_disciplines TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.expert_witness_disciplines TO authenticated;
GRANT ALL ON public.expert_witness_disciplines TO service_role;
ALTER TABLE public.expert_witness_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read expert disciplines join"
  ON public.expert_witness_disciplines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Firm admins manage their expert disciplines"
  ON public.expert_witness_disciplines FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.expert_witnesses ew WHERE ew.id = expert_witness_id
      AND (ew.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.expert_witnesses ew WHERE ew.id = expert_witness_id
      AND (ew.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin'))
  );

-- Case ↔ expert witness
CREATE TABLE IF NOT EXISTS public.case_expert_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_witness_id uuid NOT NULL REFERENCES public.expert_witnesses(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'expert_witness',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_expert_witnesses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.case_expert_witnesses TO authenticated;
GRANT ALL ON public.case_expert_witnesses TO service_role;
ALTER TABLE public.case_expert_witnesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read case expert witnesses"
  ON public.case_expert_witnesses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Firm admins manage their case experts"
  ON public.case_expert_witnesses FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.expert_witnesses ew WHERE ew.id = expert_witness_id
      AND (ew.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.expert_witnesses ew WHERE ew.id = expert_witness_id
      AND (ew.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin'))
  );

-- Recreate lawyer_search_view with new flags
DROP VIEW IF EXISTS public.lawyer_search_view;
CREATE VIEW public.lawyer_search_view
WITH (security_invoker = on) AS
SELECT
  l.*,
  f.name as firm_name,
  f.slug as firm_slug
FROM public.lawyers l
LEFT JOIN public.firms f ON f.id = l.firm_id;
GRANT SELECT ON public.lawyer_search_view TO anon, authenticated;
