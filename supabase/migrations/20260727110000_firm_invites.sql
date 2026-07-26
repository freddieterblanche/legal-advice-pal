-- Platform admin invites a firm administrator: token link -> sign up with the
-- invited email -> profile becomes firm_admin of that firm.
create table if not exists public.firm_invites (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id),
  sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (firm_id, email)
);

alter table public.firm_invites enable row level security;

-- Written and read via the service role (server functions); admins may inspect.
create policy "Platform admin full access to firm invites"
  on public.firm_invites for all
  using (public.get_my_role() = 'platform_admin');
