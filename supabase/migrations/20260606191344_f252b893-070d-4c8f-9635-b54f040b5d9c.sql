
-- Ensure updated_at helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- New lawyer profile sections
ALTER TABLE public.lawyers
  ADD COLUMN IF NOT EXISTS qualifications text,
  ADD COLUMN IF NOT EXISTS overview text,
  ADD COLUMN IF NOT EXISTS accolades text,
  ADD COLUMN IF NOT EXISTS noteworthy_matters text,
  ADD COLUMN IF NOT EXISTS reported_cases_notes text;

UPDATE public.lawyers SET overview = bio WHERE overview IS NULL AND bio IS NOT NULL;
UPDATE public.lawyers SET qualifications = education WHERE qualifications IS NULL AND education IS NOT NULL;

-- Articles published
CREATE TABLE IF NOT EXISTS public.lawyer_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  title text NOT NULL,
  publication text,
  published_date date,
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lawyer_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyer_articles TO authenticated;
GRANT ALL ON public.lawyer_articles TO service_role;

ALTER TABLE public.lawyer_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view articles of active lawyers"
  ON public.lawyer_articles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lawyers l
    WHERE l.id = lawyer_articles.lawyer_id
      AND l.status = ANY (ARRAY['trial','active'])
  ));

CREATE POLICY "Firm admin can manage own firm lawyer articles"
  ON public.lawyer_articles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_articles.lawyer_id AND l.firm_id = public.get_my_firm_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_articles.lawyer_id AND l.firm_id = public.get_my_firm_id()));

CREATE POLICY "Lawyer can manage own articles"
  ON public.lawyer_articles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_articles.lawyer_id AND l.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_articles.lawyer_id AND l.profile_id = auth.uid()));

CREATE POLICY "Platform admin full access to lawyer_articles"
  ON public.lawyer_articles FOR ALL
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');

DROP TRIGGER IF EXISTS update_lawyer_articles_updated_at ON public.lawyer_articles;
CREATE TRIGGER update_lawyer_articles_updated_at
  BEFORE UPDATE ON public.lawyer_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS lawyer_articles_lawyer_id_idx ON public.lawyer_articles(lawyer_id);

-- Lawyer invites
CREATE TABLE IF NOT EXISTS public.lawyer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL UNIQUE REFERENCES public.lawyers(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyer_invites TO authenticated;
GRANT ALL ON public.lawyer_invites TO service_role;

ALTER TABLE public.lawyer_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm admin can manage invites for own firm lawyers"
  ON public.lawyer_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_invites.lawyer_id AND l.firm_id = public.get_my_firm_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_invites.lawyer_id AND l.firm_id = public.get_my_firm_id()));

CREATE POLICY "Platform admin full access to lawyer_invites"
  ON public.lawyer_invites FOR ALL
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');
