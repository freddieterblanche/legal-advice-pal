
-- Branches table
CREATE TABLE public.firm_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  province text,
  phone text,
  is_head_office boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX firm_branches_firm_id_idx ON public.firm_branches(firm_id);

GRANT SELECT ON public.firm_branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_branches TO authenticated;
GRANT ALL ON public.firm_branches TO service_role;

ALTER TABLE public.firm_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view branches of active firms" ON public.firm_branches
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.firms f WHERE f.id = firm_id AND f.status = 'active'));
CREATE POLICY "Firm admin can manage own firm branches" ON public.firm_branches
  USING (firm_id = public.get_my_firm_id())
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "Platform admin full access to firm_branches" ON public.firm_branches
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');

-- Lawyer <-> Branch many-to-many
CREATE TABLE public.lawyer_branches (
  lawyer_id uuid NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.firm_branches(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (lawyer_id, branch_id)
);
CREATE INDEX lawyer_branches_branch_id_idx ON public.lawyer_branches(branch_id);

GRANT SELECT ON public.lawyer_branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyer_branches TO authenticated;
GRANT ALL ON public.lawyer_branches TO service_role;

ALTER TABLE public.lawyer_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lawyer_branches for active lawyers" ON public.lawyer_branches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id AND l.status IN ('trial','active'))
  );
CREATE POLICY "Firm admin can manage own firm lawyer_branches" ON public.lawyer_branches
  USING (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id AND l.firm_id = public.get_my_firm_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id AND l.firm_id = public.get_my_firm_id()));
CREATE POLICY "Lawyer can view own branches" ON public.lawyer_branches
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id AND l.profile_id = auth.uid()));
CREATE POLICY "Platform admin full access to lawyer_branches" ON public.lawyer_branches
  USING (public.get_my_role() = 'platform_admin')
  WITH CHECK (public.get_my_role() = 'platform_admin');

-- Seed: create a Head Office branch per existing firm using its current address
INSERT INTO public.firm_branches (firm_id, name, address, city, province, phone, is_head_office)
SELECT id, 'Head Office', address, city, province, phone, true
FROM public.firms;

-- Link existing lawyers to their firm's head office branch by default
INSERT INTO public.lawyer_branches (lawyer_id, branch_id)
SELECT l.id, b.id
FROM public.lawyers l
JOIN public.firm_branches b ON b.firm_id = l.firm_id AND b.is_head_office = true;
