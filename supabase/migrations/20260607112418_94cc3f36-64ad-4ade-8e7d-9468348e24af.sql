DROP POLICY IF EXISTS "Firm admins insert experts in their firm" ON public.expert_witnesses;

CREATE POLICY "Insert experts (firm admin or platform admin)"
  ON public.expert_witnesses FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'platform_admin'
    OR (firm_id = get_my_firm_id() AND get_my_role() = 'firm_admin')
  );