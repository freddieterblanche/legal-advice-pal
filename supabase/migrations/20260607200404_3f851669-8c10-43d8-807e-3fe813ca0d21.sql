
-- ============================================================
-- Unify lawyers + expert_witnesses into service_providers
-- ============================================================

-- 1. Drop policies on child tables that reference parent tables by name
--    (will be recreated against service_providers at the end)
DROP POLICY IF EXISTS "Firm admin can view enquiries for own lawyers" ON public.enquiries;
DROP POLICY IF EXISTS "Public can view articles of active lawyers" ON public.lawyer_articles;
DROP POLICY IF EXISTS "Firm admin can manage own firm lawyer articles" ON public.lawyer_articles;
DROP POLICY IF EXISTS "Lawyer can manage own articles" ON public.lawyer_articles;
DROP POLICY IF EXISTS "Platform admin full access to lawyer_articles" ON public.lawyer_articles;
DROP POLICY IF EXISTS "Platform admin full access to lawyer_branches" ON public.lawyer_branches;
DROP POLICY IF EXISTS "Public can view lawyer_branches for active lawyers" ON public.lawyer_branches;
DROP POLICY IF EXISTS "Firm admin can manage own firm lawyer branches" ON public.lawyer_branches;
DROP POLICY IF EXISTS "Lawyer can manage own branches" ON public.lawyer_branches;
DROP POLICY IF EXISTS "Public can view lawyer cases" ON public.lawyer_cases;
DROP POLICY IF EXISTS "Firm admin can manage lawyer cases" ON public.lawyer_cases;
DROP POLICY IF EXISTS "Anyone can read lawyer practice areas" ON public.lawyer_practice_areas;
DROP POLICY IF EXISTS "Firm admin can manage lawyer practice areas" ON public.lawyer_practice_areas;
DROP POLICY IF EXISTS "Lawyer can manage own practice areas" ON public.lawyer_practice_areas;
DROP POLICY IF EXISTS "Platform admin full access to lawyer_reported_cases" ON public.lawyer_reported_cases;
DROP POLICY IF EXISTS "Public can view reported cases of active lawyers" ON public.lawyer_reported_cases;
DROP POLICY IF EXISTS "Firm admin can manage own firm reported cases" ON public.lawyer_reported_cases;
DROP POLICY IF EXISTS "Lawyer can manage own reported cases" ON public.lawyer_reported_cases;
DROP POLICY IF EXISTS "Platform admin manages lawyer invites" ON public.lawyer_invites;
DROP POLICY IF EXISTS "Firm admin can manage own firm lawyer invites" ON public.lawyer_invites;
DROP POLICY IF EXISTS "Firm admins manage their case experts" ON public.case_expert_witnesses;
DROP POLICY IF EXISTS "Public read case expert witnesses" ON public.case_expert_witnesses;
DROP POLICY IF EXISTS "Firm admins manage their expert disciplines" ON public.expert_witness_disciplines;
DROP POLICY IF EXISTS "Public read expert disciplines join" ON public.expert_witness_disciplines;
DROP POLICY IF EXISTS "Platform admins manage all samples" ON public.expert_work_samples;
DROP POLICY IF EXISTS "Firm members manage their firm experts samples" ON public.expert_work_samples;
DROP POLICY IF EXISTS "Public can view samples of visible experts" ON public.expert_work_samples;

-- 2. Drop policies on parent tables (will recreate on service_providers)
DROP POLICY IF EXISTS "Firm admin can manage own firm lawyers" ON public.lawyers;
DROP POLICY IF EXISTS "Lawyer can delete own record" ON public.lawyers;
DROP POLICY IF EXISTS "Lawyer can update own record" ON public.lawyers;
DROP POLICY IF EXISTS "Lawyer can view own record" ON public.lawyers;
DROP POLICY IF EXISTS "Platform admin full access to lawyers" ON public.lawyers;
DROP POLICY IF EXISTS "Public can view active and trial lawyers" ON public.lawyers;

DROP POLICY IF EXISTS "Expert owner can delete own record" ON public.expert_witnesses;
DROP POLICY IF EXISTS "Expert owner can update own record" ON public.expert_witnesses;
DROP POLICY IF EXISTS "Firm admins delete experts in their firm" ON public.expert_witnesses;
DROP POLICY IF EXISTS "Firm admins update experts in their firm" ON public.expert_witnesses;
DROP POLICY IF EXISTS "Insert experts (firm admin or platform admin)" ON public.expert_witnesses;
DROP POLICY IF EXISTS "Public can view active/trial experts" ON public.expert_witnesses;

-- 3. Drop triggers on expert_witnesses (table will be dropped)
DROP TRIGGER IF EXISTS prevent_expert_status_change ON public.expert_witnesses;
DROP TRIGGER IF EXISTS update_expert_witnesses_updated_at ON public.expert_witnesses;

-- 4. Extend lawyers with provider_type + expert-specific columns
ALTER TABLE public.lawyers
  ADD COLUMN provider_type text,
  ADD COLUMN name_title text,
  ADD COLUMN job_title text,
  ADD COLUMN registration_body text,
  ADD COLUMN employer text,
  ADD COLUMN is_independent boolean NOT NULL DEFAULT true,
  ADD COLUMN cv_url text,
  ADD COLUMN geographic_availability text,
  ADD COLUMN courts_accepted_in text[],
  ADD COLUMN fee_range text,
  ADD COLUMN company_name text,
  ADD COLUMN contact_email text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.lawyers SET provider_type = lawyer_type WHERE lawyer_type IN ('attorney','advocate');
UPDATE public.lawyers SET provider_type = 'attorney' WHERE provider_type IS NULL;
ALTER TABLE public.lawyers ALTER COLUMN provider_type SET NOT NULL;
ALTER TABLE public.lawyers DROP CONSTRAINT IF EXISTS lawyers_lawyer_type_check;
ALTER TABLE public.lawyers DROP COLUMN lawyer_type;
ALTER TABLE public.lawyers ADD CONSTRAINT lawyers_provider_type_check
  CHECK (provider_type = ANY (ARRAY['attorney','advocate','expert']));
ALTER TABLE public.lawyers DROP CONSTRAINT IF EXISTS lawyers_firm_or_bar_check;
ALTER TABLE public.lawyers ADD CONSTRAINT lawyers_firm_or_bar_check
  CHECK (firm_id IS NOT NULL OR bar_id IS NOT NULL OR is_mediator = true OR is_arbitrator = true OR provider_type = 'expert');

-- 5. Copy expert rows into lawyers (preserving id)
INSERT INTO public.lawyers (
  id, firm_id, profile_id, slug, first_name, last_name, name_title, job_title,
  qualifications, registration_body, employer, is_independent, bio, avatar_url, cv_url,
  city, province, geographic_availability, courts_accepted_in, languages, fee_range,
  status, trial_start_date, trial_end_date, profile_views, created_at, updated_at,
  company_name, office_phone, mobile_phone, contact_email, email, provider_type
)
SELECT
  id, firm_id, profile_id, slug, first_name, last_name, name_title, title,
  qualifications, registration_body, employer, is_independent, bio, avatar_url, cv_url,
  city, province, geographic_availability, courts_accepted_in, languages, fee_range,
  status, trial_start_date, trial_end_date, profile_views, created_at, updated_at,
  company_name, office_phone, mobile_phone, contact_email, contact_email, 'expert'
FROM public.expert_witnesses;

-- 6. Repoint expert child tables to lawyers (will rename to service_providers after)
ALTER TABLE public.expert_witness_disciplines DROP CONSTRAINT IF EXISTS expert_witness_disciplines_expert_witness_id_fkey;
ALTER TABLE public.expert_work_samples DROP CONSTRAINT IF EXISTS expert_work_samples_expert_id_fkey;
ALTER TABLE public.case_expert_witnesses DROP CONSTRAINT IF EXISTS case_expert_witnesses_expert_witness_id_fkey;

ALTER TABLE public.expert_witness_disciplines RENAME COLUMN expert_witness_id TO service_provider_id;
ALTER TABLE public.expert_work_samples RENAME COLUMN expert_id TO service_provider_id;
ALTER TABLE public.case_expert_witnesses RENAME COLUMN expert_witness_id TO service_provider_id;

-- 7. Drop expert_witnesses table (rows already copied into lawyers)
DROP TABLE public.expert_witnesses;

-- 8. Rename main + child tables
ALTER TABLE public.lawyers RENAME TO service_providers;

ALTER TABLE public.lawyer_practice_areas RENAME TO provider_practice_areas;
ALTER TABLE public.provider_practice_areas RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.lawyer_branches RENAME TO provider_branches;
ALTER TABLE public.provider_branches RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.lawyer_articles RENAME TO provider_articles;
ALTER TABLE public.provider_articles RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.lawyer_cases RENAME TO provider_cases;
ALTER TABLE public.provider_cases RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.lawyer_reported_cases RENAME TO provider_reported_cases;
ALTER TABLE public.provider_reported_cases RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.lawyer_invites RENAME TO provider_invites;
ALTER TABLE public.provider_invites RENAME COLUMN lawyer_id TO service_provider_id;

ALTER TABLE public.expert_witness_disciplines RENAME TO provider_disciplines;
ALTER TABLE public.expert_work_samples RENAME TO provider_work_samples;
ALTER TABLE public.case_expert_witnesses RENAME TO case_service_providers;

ALTER TABLE public.billing_records RENAME COLUMN lawyer_id TO service_provider_id;
ALTER TABLE public.enquiries RENAME COLUMN lawyer_id TO service_provider_id;

-- 9. Re-add FKs from expert join tables to service_providers
ALTER TABLE public.provider_disciplines
  ADD CONSTRAINT provider_disciplines_provider_fkey
  FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;
ALTER TABLE public.provider_work_samples
  ADD CONSTRAINT provider_work_samples_provider_fkey
  FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;
ALTER TABLE public.case_service_providers
  ADD CONSTRAINT case_service_providers_provider_fkey
  FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;

-- 10. updated_at trigger on service_providers
CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Update expire_trials to point at service_providers
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.service_providers
  SET status = 'pending_payment'
  WHERE status = 'trial' AND trial_end_date < now();
END; $$;

DROP FUNCTION IF EXISTS public.prevent_expert_status_change() CASCADE;

-- 12. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
GRANT SELECT ON public.service_providers TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_practice_areas TO authenticated;
GRANT ALL ON public.provider_practice_areas TO service_role;
GRANT SELECT ON public.provider_practice_areas TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_branches TO authenticated;
GRANT ALL ON public.provider_branches TO service_role;
GRANT SELECT ON public.provider_branches TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_articles TO authenticated;
GRANT ALL ON public.provider_articles TO service_role;
GRANT SELECT ON public.provider_articles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_cases TO authenticated;
GRANT ALL ON public.provider_cases TO service_role;
GRANT SELECT ON public.provider_cases TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_reported_cases TO authenticated;
GRANT ALL ON public.provider_reported_cases TO service_role;
GRANT SELECT ON public.provider_reported_cases TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_invites TO authenticated;
GRANT ALL ON public.provider_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_disciplines TO authenticated;
GRANT ALL ON public.provider_disciplines TO service_role;
GRANT SELECT ON public.provider_disciplines TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_work_samples TO authenticated;
GRANT ALL ON public.provider_work_samples TO service_role;
GRANT SELECT ON public.provider_work_samples TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_service_providers TO authenticated;
GRANT ALL ON public.case_service_providers TO service_role;
GRANT SELECT ON public.case_service_providers TO anon;

-- 13. Recreate policies on service_providers
CREATE POLICY "Public can view active and trial providers" ON public.service_providers
  FOR SELECT TO anon, authenticated
  USING (status = ANY (ARRAY['trial','active']));
CREATE POLICY "Provider can view own record" ON public.service_providers
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Provider can update own record" ON public.service_providers
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Provider can delete own record" ON public.service_providers
  FOR DELETE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Firm admin can manage own firm providers" ON public.service_providers
  FOR ALL TO authenticated
  USING (firm_id = get_my_firm_id())
  WITH CHECK (firm_id = get_my_firm_id());
CREATE POLICY "Platform admin full access to providers" ON public.service_providers
  FOR ALL TO authenticated
  USING (get_my_role() = 'platform_admin')
  WITH CHECK (get_my_role() = 'platform_admin');

-- 14. Recreate child-table policies (now referencing service_providers)
-- provider_practice_areas
CREATE POLICY "Anyone can read provider practice areas" ON public.provider_practice_areas
  FOR SELECT USING (true);
CREATE POLICY "Firm admin can manage provider practice areas" ON public.provider_practice_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_practice_areas.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_practice_areas.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own practice areas" ON public.provider_practice_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_practice_areas.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_practice_areas.service_provider_id AND sp.profile_id = auth.uid()));

-- provider_branches
CREATE POLICY "Public can view provider branches" ON public.provider_branches
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_branches.service_provider_id AND sp.status = ANY (ARRAY['trial','active'])));
CREATE POLICY "Firm admin can manage provider branches" ON public.provider_branches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_branches.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_branches.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own branches" ON public.provider_branches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_branches.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_branches.service_provider_id AND sp.profile_id = auth.uid()));

-- provider_articles
CREATE POLICY "Public can view articles of active providers" ON public.provider_articles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_articles.service_provider_id AND sp.status = ANY (ARRAY['trial','active'])));
CREATE POLICY "Firm admin can manage provider articles" ON public.provider_articles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_articles.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_articles.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own articles" ON public.provider_articles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_articles.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_articles.service_provider_id AND sp.profile_id = auth.uid()));

-- provider_cases
CREATE POLICY "Public can view provider cases" ON public.provider_cases
  FOR SELECT USING (true);
CREATE POLICY "Firm admin can manage provider cases" ON public.provider_cases
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_cases.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_cases.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));

-- provider_reported_cases
CREATE POLICY "Public can view reported cases of active providers" ON public.provider_reported_cases
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_reported_cases.service_provider_id AND sp.status = ANY (ARRAY['trial','active'])));
CREATE POLICY "Firm admin can manage provider reported cases" ON public.provider_reported_cases
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_reported_cases.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_reported_cases.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own reported cases" ON public.provider_reported_cases
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_reported_cases.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_reported_cases.service_provider_id AND sp.profile_id = auth.uid()));

-- provider_invites
CREATE POLICY "Firm admin can manage provider invites" ON public.provider_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_invites.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_invites.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));

-- provider_disciplines (join)
CREATE POLICY "Public read provider disciplines" ON public.provider_disciplines
  FOR SELECT USING (true);
CREATE POLICY "Firm admin can manage provider disciplines" ON public.provider_disciplines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_disciplines.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_disciplines.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own disciplines" ON public.provider_disciplines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_disciplines.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_disciplines.service_provider_id AND sp.profile_id = auth.uid()));

-- provider_work_samples
CREATE POLICY "Public can view samples of visible providers" ON public.provider_work_samples
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_work_samples.service_provider_id AND sp.status = ANY (ARRAY['trial','active'])));
CREATE POLICY "Firm admin can manage provider work samples" ON public.provider_work_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_work_samples.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_work_samples.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));
CREATE POLICY "Provider can manage own work samples" ON public.provider_work_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_work_samples.service_provider_id AND sp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = provider_work_samples.service_provider_id AND sp.profile_id = auth.uid()));

-- case_service_providers
CREATE POLICY "Public read case service providers" ON public.case_service_providers
  FOR SELECT USING (true);
CREATE POLICY "Firm admin can manage case service providers" ON public.case_service_providers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = case_service_providers.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = case_service_providers.service_provider_id AND (sp.firm_id = get_my_firm_id() OR get_my_role() = 'platform_admin')));

-- enquiries (recreate the lawyers-referencing policy with service_providers)
CREATE POLICY "Firm admin can view enquiries for own providers" ON public.enquiries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = enquiries.service_provider_id AND sp.firm_id = get_my_firm_id()));
