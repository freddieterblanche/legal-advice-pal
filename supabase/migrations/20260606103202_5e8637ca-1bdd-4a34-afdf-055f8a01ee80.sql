
create extension if not exists "pgcrypto";

-- CORE TABLES
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  registration_number text,
  description text,
  website text,
  phone text,
  address text,
  city text,
  province text,
  logo_url text,
  status text default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  firm_id uuid references public.firms on delete set null,
  role text not null default 'visitor' check (role in ('visitor','lawyer','firm_admin','platform_admin')),
  email text,
  first_name text,
  last_name text,
  created_at timestamptz default now()
);

create table public.lawyers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles on delete set null,
  firm_id uuid references public.firms on delete cascade not null,
  slug text unique not null,
  first_name text not null,
  last_name text not null,
  designation text check (designation in ('SC','Advocate','Attorney-Partner','Attorney')),
  bio text,
  education text,
  linkedin_url text,
  saflii_author_url text,
  avatar_url text,
  city text,
  province text,
  status text default 'trial' check (status in ('trial','active','pending_payment','suspended','inactive')),
  trial_start_date timestamptz default now(),
  trial_end_date timestamptz default (now() + interval '90 days'),
  is_claimed boolean default false,
  profile_views integer default 0,
  created_at timestamptz default now()
);

create table public.practice_areas (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  icon text
);

create table public.lawyer_practice_areas (
  lawyer_id uuid references public.lawyers on delete cascade,
  practice_area_id uuid references public.practice_areas on delete cascade,
  primary key (lawyer_id, practice_area_id)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_name text not null,
  citation text,
  court text,
  year integer,
  saflii_url text,
  summary text,
  created_at timestamptz default now()
);

create table public.lawyer_cases (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.lawyers on delete cascade,
  case_id uuid references public.cases on delete cascade,
  role text check (role in ('counsel_applicant','counsel_respondent','amicus','instructing_attorney','other')),
  outcome text check (outcome in ('won','lost','settled','amicus','other')),
  created_at timestamptz default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.lawyers on delete set null,
  sender_name text,
  sender_email text,
  message text,
  created_at timestamptz default now()
);

create table public.config (
  key text primary key,
  value text
);

create table public.billing_records (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms on delete cascade,
  lawyer_id uuid references public.lawyers on delete set null,
  amount_rands numeric(10,2),
  status text default 'pending' check (status in ('paid','pending','failed')),
  period_start date,
  period_end date,
  payfast_payment_id text,
  created_at timestamptz default now()
);

-- GRANTS
grant select on public.firms to anon;
grant select, insert, update, delete on public.firms to authenticated;
grant all on public.firms to service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select on public.lawyers to anon;
grant select, insert, update, delete on public.lawyers to authenticated;
grant all on public.lawyers to service_role;

grant select on public.practice_areas to anon;
grant select, insert, update, delete on public.practice_areas to authenticated;
grant all on public.practice_areas to service_role;

grant select on public.lawyer_practice_areas to anon;
grant select, insert, update, delete on public.lawyer_practice_areas to authenticated;
grant all on public.lawyer_practice_areas to service_role;

grant select on public.cases to anon;
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;

grant select on public.lawyer_cases to anon;
grant select, insert, update, delete on public.lawyer_cases to authenticated;
grant all on public.lawyer_cases to service_role;

grant insert on public.enquiries to anon;
grant select, insert, update, delete on public.enquiries to authenticated;
grant all on public.enquiries to service_role;

grant select on public.config to anon;
grant select, insert, update, delete on public.config to authenticated;
grant all on public.config to service_role;

grant select, insert, update, delete on public.billing_records to authenticated;
grant all on public.billing_records to service_role;

-- INDEXES
create index on public.lawyers (firm_id);
create index on public.lawyers (status);
create index on public.lawyers (province);
create index on public.lawyers (slug);
create index on public.lawyer_practice_areas (practice_area_id);
create index on public.lawyer_cases (lawyer_id);
create index on public.cases (year);
create index on public.billing_records (firm_id);
create index on public.billing_records (lawyer_id);

-- FULL TEXT SEARCH
alter table public.lawyers
  add column search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(first_name,'') || ' ' ||
      coalesce(last_name,'') || ' ' ||
      coalesce(bio,'') || ' ' ||
      coalesce(city,'')
    )
  ) stored;
create index on public.lawyers using gin(search_vector);

-- ENABLE RLS
alter table public.firms enable row level security;
alter table public.profiles enable row level security;
alter table public.lawyers enable row level security;
alter table public.practice_areas enable row level security;
alter table public.lawyer_practice_areas enable row level security;
alter table public.cases enable row level security;
alter table public.lawyer_cases enable row level security;
alter table public.enquiries enable row level security;
alter table public.billing_records enable row level security;
alter table public.config enable row level security;

-- HELPER FUNCTIONS
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_firm_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select firm_id from public.profiles where id = auth.uid();
$$;

-- POLICIES: FIRMS
create policy "Public can view active firms" on public.firms for select using (status = 'active');
create policy "Firm admin can view own firm" on public.firms for select using (id = public.get_my_firm_id());
create policy "Firm admin can update own firm" on public.firms for update using (id = public.get_my_firm_id());
create policy "Platform admin full access to firms" on public.firms for all using (public.get_my_role() = 'platform_admin');

-- PROFILES
create policy "Users can view own profile" on public.profiles for select using (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid());
create policy "Platform admin full access to profiles" on public.profiles for all using (public.get_my_role() = 'platform_admin');

-- LAWYERS
create policy "Public can view active and trial lawyers" on public.lawyers for select using (status in ('trial','active'));
create policy "Firm admin can manage own firm lawyers" on public.lawyers for all using (firm_id = public.get_my_firm_id());
create policy "Lawyer can view own record" on public.lawyers for select using (profile_id = auth.uid());
create policy "Lawyer can update own record" on public.lawyers for update using (profile_id = auth.uid());
create policy "Platform admin full access to lawyers" on public.lawyers for all using (public.get_my_role() = 'platform_admin');

-- PRACTICE AREAS
create policy "Anyone can read practice areas" on public.practice_areas for select using (true);
create policy "Platform admin can manage practice areas" on public.practice_areas for all using (public.get_my_role() = 'platform_admin');

-- LAWYER PRACTICE AREAS
create policy "Anyone can read lawyer practice areas" on public.lawyer_practice_areas for select using (true);
create policy "Firm admin can manage lawyer practice areas" on public.lawyer_practice_areas for all
  using (exists (select 1 from public.lawyers l where l.id = lawyer_id and l.firm_id = public.get_my_firm_id()));

-- CASES
create policy "Anyone can read cases" on public.cases for select using (true);
create policy "Platform admin can manage cases" on public.cases for all using (public.get_my_role() = 'platform_admin');
create policy "Firm admin can insert cases" on public.cases for insert with check (public.get_my_role() in ('firm_admin','platform_admin'));

-- LAWYER CASES
create policy "Anyone can read lawyer cases" on public.lawyer_cases for select using (true);
create policy "Firm admin can manage lawyer cases for own firm" on public.lawyer_cases for all
  using (exists (select 1 from public.lawyers l where l.id = lawyer_id and l.firm_id = public.get_my_firm_id()));

-- ENQUIRIES
create policy "Anyone can insert enquiries" on public.enquiries for insert with check (true);
create policy "Firm admin can view enquiries for own lawyers" on public.enquiries for select
  using (exists (select 1 from public.lawyers l where l.id = lawyer_id and l.firm_id = public.get_my_firm_id()));

-- BILLING
create policy "Firm admin can view own billing" on public.billing_records for select using (firm_id = public.get_my_firm_id());
create policy "Platform admin full access to billing" on public.billing_records for all using (public.get_my_role() = 'platform_admin');

-- CONFIG
create policy "Anyone can read config" on public.config for select using (true);
create policy "Platform admin can manage config" on public.config for all using (public.get_my_role() = 'platform_admin');

-- AUTH TRIGGER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'visitor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- TRIAL EXPIRY FUNCTION
create or replace function public.expire_trials()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lawyers
  set status = 'pending_payment'
  where status = 'trial'
    and trial_end_date < now();
end;
$$;

-- SEED DATA
insert into public.config (key, value) values
  ('monthly_price_rands', '99'),
  ('trial_days', '90');

insert into public.practice_areas (name, slug, icon) values
  ('Constitutional Law', 'constitutional-law', '⚖'),
  ('Commercial Law', 'commercial-law', '🏢'),
  ('Labour Law', 'labour-law', '👷'),
  ('Criminal Law', 'criminal-law', '🔒'),
  ('Family Law', 'family-law', '👪'),
  ('Property Law', 'property-law', '🏠'),
  ('Tax Law', 'tax-law', '📊'),
  ('Insolvency & Restructuring', 'insolvency', '🔄'),
  ('Environmental Law', 'environmental-law', '🌿'),
  ('Intellectual Property', 'intellectual-property', '💡'),
  ('Competition Law', 'competition-law', '📡'),
  ('Mining & Resources', 'mining-resources', '⛏'),
  ('Dispute Resolution', 'dispute-resolution', '🤝'),
  ('Banking & Finance', 'banking-finance', '🏦'),
  ('Immigration Law', 'immigration-law', '✈');

insert into public.firms (id, name, slug, description, website, city, province, status)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Webber Wentzel',
  'webber-wentzel',
  'One of South Africa''s leading full-service law firms.',
  'https://www.webberwentzel.com',
  'Johannesburg',
  'Gauteng',
  'active'
);

insert into public.lawyers (id, firm_id, slug, first_name, last_name, designation, bio, city, province, status)
values
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','thabo-mokoena','Thabo','Mokoena','SC','Senior Counsel with 22 years'' experience in constitutional and administrative law.','Johannesburg','Gauteng','active'),
  ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','sibongile-dlamini','Sibongile','Dlamini','Attorney-Partner','Partner specialising in labour law and employment disputes.','Johannesburg','Gauteng','active'),
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','nomvula-khumalo','Nomvula','Khumalo','Attorney','Attorney focusing on commercial litigation and dispute resolution.','Johannesburg','Gauteng','trial');

insert into public.lawyer_practice_areas (lawyer_id, practice_area_id)
select 'b0000000-0000-0000-0000-000000000001', id from public.practice_areas where slug in ('constitutional-law','dispute-resolution');
insert into public.lawyer_practice_areas (lawyer_id, practice_area_id)
select 'b0000000-0000-0000-0000-000000000002', id from public.practice_areas where slug in ('labour-law','commercial-law');
insert into public.lawyer_practice_areas (lawyer_id, practice_area_id)
select 'b0000000-0000-0000-0000-000000000003', id from public.practice_areas where slug in ('commercial-law','dispute-resolution');

insert into public.cases (id, case_name, citation, court, year, saflii_url) values
  ('c0000000-0000-0000-0000-000000000001','Minister of Home Affairs v Fourie and Another','CCT 60/04','Constitutional Court',2005,'https://www.saflii.org/za/cases/ZACC/2005/19.html'),
  ('c0000000-0000-0000-0000-000000000002','Economic Freedom Fighters v Speaker of the National Assembly','CCT 143/15','Constitutional Court',2016,'https://www.saflii.org/za/cases/ZACC/2016/11.html');

insert into public.lawyer_cases (lawyer_id, case_id, role, outcome) values
  ('b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','counsel_applicant','won'),
  ('b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','counsel_applicant','won');

-- VIEWS
create or replace view public.lawyer_search_view as
select
  l.id, l.slug, l.first_name, l.last_name,
  l.first_name || ' ' || l.last_name as full_name,
  l.designation, l.city, l.province, l.avatar_url, l.status,
  l.profile_views, l.trial_end_date,
  f.name as firm_name, f.slug as firm_slug,
  array_agg(distinct pa.name) as practice_areas,
  array_agg(distinct pa.slug) as practice_area_slugs,
  count(distinct lc.id) as case_count
from public.lawyers l
join public.firms f on f.id = l.firm_id
left join public.lawyer_practice_areas lpa on lpa.lawyer_id = l.id
left join public.practice_areas pa on pa.id = lpa.practice_area_id
left join public.lawyer_cases lc on lc.lawyer_id = l.id
where l.status in ('trial','active')
group by l.id, f.name, f.slug;

create or replace view public.firm_billing_summary as
select
  f.id as firm_id, f.name as firm_name,
  count(l.id) as total_lawyers,
  count(l.id) filter (where l.status = 'trial') as trial_count,
  count(l.id) filter (where l.status = 'active') as active_count,
  count(l.id) filter (where l.status = 'pending_payment') as pending_count,
  count(l.id) filter (where l.status = 'active') * 99 as monthly_cost_rands,
  min(l.trial_end_date) filter (where l.status = 'trial') as next_trial_expiry
from public.firms f
left join public.lawyers l on l.firm_id = f.id
group by f.id, f.name;

grant select on public.lawyer_search_view to anon, authenticated;
grant select on public.firm_billing_summary to authenticated;
