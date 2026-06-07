CREATE TABLE public.expert_work_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES public.expert_witnesses(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  synopsis text,
  project_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expert_work_samples_expert ON public.expert_work_samples(expert_id, project_date DESC NULLS LAST);

GRANT SELECT ON public.expert_work_samples TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expert_work_samples TO authenticated;
GRANT ALL ON public.expert_work_samples TO service_role;

ALTER TABLE public.expert_work_samples ENABLE ROW LEVEL SECURITY;

-- Public can read samples for visible experts
CREATE POLICY "Public can view samples of visible experts"
  ON public.expert_work_samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expert_witnesses ew
      WHERE ew.id = expert_work_samples.expert_id
        AND ew.status IN ('trial', 'active')
    )
  );

-- Platform admins can do anything
CREATE POLICY "Platform admins manage all samples"
  ON public.expert_work_samples FOR ALL
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');

-- Firm admins/owners can manage samples for experts attached to their firm
CREATE POLICY "Firm members manage their firm experts samples"
  ON public.expert_work_samples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.expert_witnesses ew
      WHERE ew.id = expert_work_samples.expert_id
        AND ew.firm_id IS NOT NULL
        AND ew.firm_id = public.get_my_firm_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expert_witnesses ew
      WHERE ew.id = expert_work_samples.expert_id
        AND ew.firm_id IS NOT NULL
        AND ew.firm_id = public.get_my_firm_id()
    )
  );

CREATE TRIGGER trg_expert_work_samples_updated
  BEFORE UPDATE ON public.expert_work_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();