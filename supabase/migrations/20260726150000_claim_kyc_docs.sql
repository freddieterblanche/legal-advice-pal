-- KYC verification for profile claims: selfie + ID document.
-- Split into its own migration because 20260726120000 may already be applied.

-- Evidence paths in the private 'verification-docs' bucket, removed (and
-- nulled) once the claim is decided.
alter table public.claim_requests
  add column if not exists selfie_path text,
  add column if not exists id_doc_path text;

-- Private bucket for claim verification documents (selfie + ID). Never public:
-- claimants write/read only their own folder; platform admin reads for review.
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

create policy "Users upload own verification docs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users view own verification docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Platform admin views verification docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.get_my_role() = 'platform_admin');
