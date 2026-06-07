## LexSA expansion — Expert Witnesses, Mediators & Arbitrators

Expand the directory from lawyers-only to four service types, with shared search/profile patterns, new database tables/flags, billing add-ons, and updated navigation/homepage.

### 1. Database (single migration)

New tables in `public`:
- `expert_disciplines` — `id, name, slug (unique), parent_category, icon`
- `expert_witnesses` — all fields per spec + `firm_id uuid null references firms`, `status` enum check, trial dates default `now()` / `now() + 90 days`
- `expert_witness_disciplines` — composite PK join
- `case_expert_witnesses` — links expert to `cases`

Extend `lawyers` with: `is_mediator, is_arbitrator, mediator_accreditation, mediator_style, mediator_sectors text[], arbitrator_accreditation, arbitrator_types text[], arbitrator_experience_years, languages text[], daily_rate_range, availability_notes`.

Each new table: `GRANT SELECT TO anon, authenticated` (publicly browsable) + `GRANT ALL TO service_role`; writes restricted by RLS to firm admins / platform admins. `expert_disciplines` public read, admin write.

Update view: recreate `lawyer_search_view` (currently includes `is_senior_counsel`) to also expose `is_mediator`, `is_arbitrator`, and the new mediator/arbitrator/languages fields needed by the new search pages.

Config seed: insert `expert_witness_monthly_price_rands=149`, `mediator_monthly_price_rands=149`, `arbitrator_monthly_price_rands=199`.

Seed `expert_disciplines` with the ~50 disciplines grouped by `parent_category` from the spec. Seed Dr Priya Naidoo demo expert witness + link to Orthopaedics & Occupational Medicine.

### 2. Routes (TanStack file-based)

New route files:
- `src/routes/expert-witnesses.index.tsx` — search/list
- `src/routes/expert-witnesses.$slug.tsx` — profile
- `src/routes/mediators.index.tsx` — search/list (queries `lawyers` where `is_mediator`)
- `src/routes/arbitrators.index.tsx` — search/list (queries `lawyers` where `is_arbitrator`)
- Mediator/arbitrator profiles reuse `lawyers.$slug.tsx` with conditional "Mediation" / "Arbitration" sections appended

Each route gets unique `head()` meta (title, description, og:title, og:description).

### 3. Navigation & homepage

`Navbar.tsx` public links → `Find a Lawyer`, `Find an Expert Witness`, `Find a Mediator`, `Find an Arbitrator`. Mobile menu mirrors.

`routes/index.tsx`:
- Update hero copy
- Add tab row above search (Lawyers / Experts / Mediators / Arbitrators) switching the search form & target route
- Stats bar → 4 counts (lawyers, expert witnesses, mediators, arbitrators)
- Add four "Find a …" cards above the existing practice area grid (keep practice areas below)

### 4. Search pages — shared pattern

Each search page reuses the visual pattern from existing `search.tsx`:
- Hero with keyword + primary dropdown + province
- Left sidebar multi-select filters per spec
- Result cards per spec
- Server queries via `supabase` browser client + RLS-safe public reads

### 5. Firm dashboard

Existing `_authenticated/dashboard.tsx` Lawyers tab:
- Add Mediator / Arbitrator toggle columns per lawyer row
- Expanding a toggle reveals inline edit fields (accreditation, style/types, sectors, years)

New Expert Witnesses tab in firm dashboard:
- Table of firm's `expert_witnesses` (filtered by `firm_id = get_my_firm_id()`)
- "Add Expert Witness" modal form (name, title, disciplines multi-select, qualifications, registration body, city, province, bio)
- Edit / delete actions
- Status, trial days remaining, profile views columns

Billing tab: extend to compute `R99 base + R149 (mediator) + R199 (arbitrator) + R149 × expert_witness_count`, with a per-line breakdown.

### 6. RLS

- `expert_witnesses`: public SELECT where `status in ('trial','active')`; firm admin full access where `firm_id = get_my_firm_id()`; platform_admin full access
- `expert_witness_disciplines`, `case_expert_witnesses`: public SELECT joined to visible experts; firm admin manage own; platform admin all
- `expert_disciplines`: public SELECT; platform admin write
- Trigger to prevent non-platform-admins changing `expert_witnesses.status` (mirroring `prevent_firm_admin_status_change` on firms)

### 7. Out of scope (matches spec)

Booking calendar, verified badges, reviews, award uploads — not built.

### Technical notes

- All new server-side reads use the browser supabase client for public pages; firm dashboard writes go via supabase from the authenticated client (RLS scopes by `firm_id`).
- Slugs generated with existing `slugify` helper in `src/lib/constants.ts`.
- New constants file `src/lib/expert-constants.ts` for mediation sectors, arbitration types, accreditation lists.
- Practice-area icon helper extended to map expert discipline slugs → lucide icons.
- One supabase migration for schema + grants + RLS + triggers; one separate insert for `expert_disciplines` and demo data and config rows (data, not schema).
- Existing `lawyer_search_view` recreated to include the new mediator/arbitrator/languages columns so search pages can read in one query.
