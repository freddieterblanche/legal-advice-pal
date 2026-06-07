
-- 1. Owner link on expert_witnesses
ALTER TABLE public.expert_witnesses
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expert_witnesses_profile_id_idx ON public.expert_witnesses(profile_id);

-- Owner can update/delete their own expert listing
DROP POLICY IF EXISTS "Expert owner can update own record" ON public.expert_witnesses;
CREATE POLICY "Expert owner can update own record"
  ON public.expert_witnesses
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Expert owner can delete own record" ON public.expert_witnesses;
CREATE POLICY "Expert owner can delete own record"
  ON public.expert_witnesses
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- 2. Lawyer owner delete (update policy already exists)
DROP POLICY IF EXISTS "Lawyer can delete own record" ON public.lawyers;
CREATE POLICY "Lawyer can delete own record"
  ON public.lawyers
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- 3. Broaden profile role values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['visitor','lawyer','firm_admin','platform_admin','expert_owner']));
