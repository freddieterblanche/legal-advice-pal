
-- Hide email/phone from anonymous; authenticated still has access via existing RLS policy.
REVOKE SELECT (email, phone) ON public.lawyers FROM anon;

-- Lock down trigger / internal helpers from being called via the API.
REVOKE EXECUTE ON FUNCTION public.prevent_firm_admin_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
