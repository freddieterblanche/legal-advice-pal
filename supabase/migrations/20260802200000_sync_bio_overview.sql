-- The advocate and mediator/arbitrator editors write `bio`, but the public
-- "About" section renders `overview || bio`. Seeded records often carry junk
-- in `overview` (e.g. a bare list of practice-area names from imports), which
-- hid the real bio. The editors now mirror bio -> overview on save; this
-- repairs existing records they manage.
--
-- Scope is deliberately tight: independent advocates and pure mediators/
-- arbitrators (no firm). Firm-managed lawyers are edited via the firm modal,
-- where `overview` is canonical — those rows are left untouched.
update public.service_providers
set overview = bio
where btrim(coalesce(bio, '')) <> ''
  and firm_id is null
  and (
    provider_type = 'advocate'
    or (provider_type is null and (is_mediator = true or is_arbitrator = true))
  );
