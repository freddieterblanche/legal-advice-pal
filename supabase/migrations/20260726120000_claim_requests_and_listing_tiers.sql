-- Paid profile claims + listing tiers.
-- Professionals can request to claim a seeded profile; platform admin reviews;
-- approval hands over the profile in `pending_payment` until billing activates it.

-- Listing tier on providers (basic | standard | silver | gold | elite)
alter table public.service_providers
  add column if not exists listing_tier text not null default 'basic';

alter table public.service_providers
  add constraint service_providers_listing_tier_check
  check (listing_tier in ('basic','standard','silver','gold','elite'));

-- Self-serve claim requests
create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid not null references public.service_providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  message text,
  requested_tier text not null default 'basic'
    check (requested_tier in ('basic','standard','silver','gold','elite')),
  -- pending -> verified (identity confirmed, awaiting payment) -> approved (paid,
  -- handed over) | rejected. Handover happens on payment via the PayFast webhook.
  status text not null default 'pending'
    check (status in ('pending','verified','approved','rejected')),
  decision_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- One live (pending) request per provider; history rows keep their status.
create unique index if not exists claim_requests_one_pending_per_provider
  on public.claim_requests (service_provider_id)
  where status = 'pending';

create index if not exists claim_requests_user_idx on public.claim_requests (user_id);

alter table public.claim_requests enable row level security;

create policy "Users can create their own claim requests"
  on public.claim_requests for insert
  with check (user_id = auth.uid());

create policy "Users can view their own claim requests"
  on public.claim_requests for select
  using (user_id = auth.uid());

create policy "Platform admin full access to claim requests"
  on public.claim_requests for all
  using (public.get_my_role() = 'platform_admin');

-- PayFast recurring subscriptions (one live subscription per provider).
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid not null references public.service_providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_request_id uuid references public.claim_requests(id) on delete set null,
  tier text not null check (tier in ('basic','standard','silver','gold','elite')),
  frequency text not null default 'monthly' check (frequency in ('monthly','annual')),
  amount_rands numeric not null,
  payfast_token text,
  pf_payment_id text,
  status text not null default 'pending'
    check (status in ('pending','active','cancelled','past_due')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  current_period_end timestamptz
);

create index if not exists subscriptions_provider_idx on public.subscriptions (service_provider_id);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create unique index if not exists subscriptions_one_active_per_provider
  on public.subscriptions (service_provider_id)
  where status = 'active';

alter table public.subscriptions enable row level security;

-- Rows are written exclusively by the service role (server functions + ITN webhook).
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid());

create policy "Platform admin full access to subscriptions"
  on public.subscriptions for all
  using (public.get_my_role() = 'platform_admin');
