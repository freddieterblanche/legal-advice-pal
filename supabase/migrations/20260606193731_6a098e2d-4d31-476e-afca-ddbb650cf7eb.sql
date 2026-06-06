
-- 1) Prevent firm admins from changing status (privilege escalation)
DROP POLICY IF EXISTS "Firm admin can update own firm" ON public.firms;
CREATE POLICY "Firm admin can update own firm"
  ON public.firms FOR UPDATE
  USING (id = get_my_firm_id())
  WITH CHECK (id = get_my_firm_id());

CREATE OR REPLACE FUNCTION public.prevent_firm_admin_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND COALESCE(get_my_role(), '') <> 'platform_admin' THEN
    RAISE EXCEPTION 'Only platform admins can change firm status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS firms_prevent_status_change ON public.firms;
CREATE TRIGGER firms_prevent_status_change
  BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.prevent_firm_admin_status_change();

-- 2) Storage policies: scope delete/update to the lawyer's own firm folder
DROP POLICY IF EXISTS "Authenticated can delete lawyer photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update lawyer photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload lawyer photos" ON storage.objects;

CREATE POLICY "Firm admin can upload own firm lawyer photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lawyer-photos'
    AND (
      get_my_role() = 'platform_admin'
      OR (storage.foldername(name))[1] = get_my_firm_id()::text
    )
  );

CREATE POLICY "Firm admin can update own firm lawyer photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lawyer-photos'
    AND (
      get_my_role() = 'platform_admin'
      OR (storage.foldername(name))[1] = get_my_firm_id()::text
    )
  )
  WITH CHECK (
    bucket_id = 'lawyer-photos'
    AND (
      get_my_role() = 'platform_admin'
      OR (storage.foldername(name))[1] = get_my_firm_id()::text
    )
  );

CREATE POLICY "Firm admin can delete own firm lawyer photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lawyer-photos'
    AND (
      get_my_role() = 'platform_admin'
      OR (storage.foldername(name))[1] = get_my_firm_id()::text
    )
  );

-- 3) Views: use SECURITY INVOKER so RLS of the querying user applies
ALTER VIEW public.firm_billing_summary SET (security_invoker = true);
ALTER VIEW public.lawyer_search_view SET (security_invoker = true);

-- 4) Restrict SECURITY DEFINER helpers from anon (only authenticated need them in RLS)
REVOKE EXECUTE ON FUNCTION public.get_my_firm_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_firm_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
