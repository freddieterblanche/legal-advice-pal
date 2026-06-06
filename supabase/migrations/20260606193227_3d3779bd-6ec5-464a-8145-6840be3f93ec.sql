
CREATE TABLE public.lawyer_reported_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  case_name text NOT NULL,
  citation text,
  court text,
  year integer,
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lawyer_reported_cases_lawyer_id_idx ON public.lawyer_reported_cases(lawyer_id);

GRANT SELECT ON public.lawyer_reported_cases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyer_reported_cases TO authenticated;
GRANT ALL ON public.lawyer_reported_cases TO service_role;

ALTER TABLE public.lawyer_reported_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reported cases of active lawyers"
  ON public.lawyer_reported_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_reported_cases.lawyer_id
      AND l.status IN ('trial','active')
  ));

CREATE POLICY "Firm admin can manage own firm reported cases"
  ON public.lawyer_reported_cases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_reported_cases.lawyer_id
      AND l.firm_id = public.get_my_firm_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_reported_cases.lawyer_id
      AND l.firm_id = public.get_my_firm_id()
  ));

CREATE POLICY "Lawyer can manage own reported cases"
  ON public.lawyer_reported_cases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_reported_cases.lawyer_id
      AND l.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_reported_cases.lawyer_id
      AND l.profile_id = auth.uid()
  ));

CREATE POLICY "Platform admin full access to lawyer_reported_cases"
  ON public.lawyer_reported_cases FOR ALL
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');

CREATE TRIGGER update_lawyer_reported_cases_updated_at
  BEFORE UPDATE ON public.lawyer_reported_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
