
## Goal

Replace the two parallel tables (`lawyers`, `expert_witnesses`) with a single `service_providers` table. `provider_type` is one of `attorney`, `advocate`, `expert`. `is_mediator` and `is_arbitrator` remain as boolean facets that can be true for any type (most mediators are also advocates/attorneys).

## End-state shape

```text
service_providers
├── provider_type           attorney | advocate | expert
├── is_mediator / is_arbitrator         (facets, any type)
├── shared cols             slug, names, contact, bio, qualifications,
│                           overview, accolades, status, billing, photo, etc.
├── lawyer-specific         firm_id, bar_id, chambers_id, town_id,
│                           year_of_admission, is_senior_counsel,
│                           is_practice_head, sector/practice head fields,
│                           reported_cases_notes, noteworthy_matters
├── expert-specific         disciplines (via join), hourly_rate, currency,
│                           credentials, years_of_experience,
│                           consultation_areas, court_appearances, etc.
└── shared facets           mediator_*, arbitrator_*, languages,
                            daily_rate_range, availability_notes
```

All 11 dependent tables get repointed to `service_providers(id)`. UUIDs are preserved so no profile URLs break.

## Migration sequence

Each numbered step is a separate migration so each can be reviewed and rolled back independently.

**1. Extend `lawyers` with expert columns + provider_type**
- Add `provider_type text not null default 'attorney'` (CHECK: attorney | advocate | expert).
- Backfill from current `lawyer_type` (`advocate` / `attorney`).
- Drop the old `lawyer_type` column and its CHECK constraint.
- Add nullable expert-specific columns from `expert_witnesses` that aren't already covered (hourly_rate, currency, years_of_experience, credentials, consultation_areas, court_appearances_count, etc. — final list confirmed against the live `expert_witnesses` schema).
- Update the `firm_or_bar` CHECK to also allow `provider_type='expert'`.

**2. Copy expert rows in**
- `INSERT INTO lawyers (...) SELECT ... FROM expert_witnesses` preserving `id`, mapping shared fields, setting `provider_type='expert'`.
- Slug collision check first (rare; resolve with `-expert` suffix if any).
- Copy `expert_work_samples`, `expert_disciplines` join, etc. — but FKs are already pointing to the same UUIDs in step 3.

**3. Repoint FKs from `expert_witnesses` → `lawyers`**
- `case_expert_witnesses.expert_witness_id` → `lawyers(id)` (rename to `service_provider_id`).
- `expert_witness_disciplines.expert_witness_id` → `lawyers(id)` (rename to `service_provider_id`).
- `expert_work_samples.expert_id` → `lawyers(id)` (rename to `service_provider_id`).

**4. Rename to `service_providers`**
- `ALTER TABLE lawyers RENAME TO service_providers`.
- Rename `lawyer_*` child tables to `provider_*` (`lawyer_practice_areas` → `provider_practice_areas`, etc.) and their `lawyer_id` columns to `service_provider_id`.
- Rename indexes for clarity.
- Recreate the search_vector generated column.

**5. RLS + grants + functions**
- Recreate all RLS policies on the renamed table (same logic, new names).
- Update `expire_trials()`, `prevent_*_status_change()` triggers, `has_role` callers if any reference the old names.
- Re-grant: `authenticated` CRUD + `service_role` ALL; keep `anon` SELECT for the public listing path that previously worked on `lawyers`.

**6. Drop `expert_witnesses`**
- After app code is migrated and verified, drop `expert_witnesses` and its now-orphan join tables.

## App code changes

**Types & data access**
- `src/integrations/supabase/types.ts` regenerates automatically post-migration.
- Global rename: `from('lawyers')` → `from('service_providers')` (16 files) and `from('expert_witnesses')` → `from('service_providers').eq('provider_type','expert')`.
- Helper `getProviderType(row)` and `isExpert(row)` for branching display logic.

**Routes**
- `/lawyers/$slug` and `/expert-witnesses/$slug` both stay (SEO + back-compat). Both load from `service_providers`; the route enforces the expected `provider_type`. Add a `/providers/$slug` canonical that redirects per type for future use.
- `/expert-witnesses` index, `/admin/advocates`, `/admin/attorneys`, `/admin/experts`, dashboard, firms pages: all read from `service_providers` with `eq('provider_type', …)`.
- `index.tsx` cross-type search hits one table now (simpler `or` queries gone).

**Components**
- Unify `LawyerFormModal` and the expert edit form into `ServiceProviderFormModal`, with conditional sections by `provider_type`. Mediator/arbitrator sections stay shared (facets). `ExpertWorkSamples` and `ExpertPhotoField` keep working since FKs/columns just got renamed.
- `MediatorArbitratorFormModal` keeps working — it's already provider-agnostic in intent.
- `TypePill` already supports all five variants; no change needed.

**Auth/invites/billing**
- `lawyer-invite.functions.ts` → `provider-invite.functions.ts`, references updated.
- `billing_records.lawyer_id` → `service_provider_id`.

## Risk & rollback

- All migrations preserve UUIDs → no public URL breaks.
- Each migration is small and independent → rollback per step.
- Before step 6 (drop), the app runs on the renamed table for at least one verified deploy. Old `expert_witnesses` stays as a safety net until then.
- Live data today: 149 advocates just inserted, plus existing attorneys + experts. Row counts are verified before and after each copy.

## Out of scope

- No URL changes for end users on day one.
- No new features — pure consolidation. New cross-type features (unified search, unified reviews) become easy *after* this lands.
- Mediator/arbitrator stay as facets (per your answer); no provider_type values for them.

