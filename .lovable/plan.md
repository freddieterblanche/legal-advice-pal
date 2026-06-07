## Problem

Alan Nelson is in the DB as `lawyer_type = 'advocate'` with `is_mediator = true`, so he shows up on both the **Advocates** search listing and the **Mediators** directory. He no longer accepts advocate briefs and should appear only as a Mediator. The "SC" appended to his last name also reinforces the advocate identity.

Today the schema forces `lawyer_type` to be `'advocate'` or `'attorney'`, so there is no clean way to mark a person as mediator-/arbitrator-only. We need a small mechanism so this distinction works for Alan now and for anyone similar later.

## Approach

Add a per-lawyer flag that hides someone from the attorney/advocate search listings without removing their profile or their mediator/arbitrator entries.

### 1. Schema (migration)
- Add `lawyers.exclude_from_lawyer_listing boolean not null default false`.
- No constraint changes — keep `lawyer_type` as-is to avoid touching every existing query.

### 2. Data update
- For `Alan Nelson`:
  - Set `exclude_from_lawyer_listing = true`.
  - Rename `last_name` from `"Nelson SC"` to `"Nelson"`.
  - Set `is_senior_counsel = false`.
  - Leave `is_mediator = true` so he continues to appear on `/mediators`.

### 3. Search listing filter (`src/routes/search.tsx`)
- Where the query filters by `lawyer_type` (attorney/advocate), also add `.eq("exclude_from_lawyer_listing", false)` so excluded profiles never appear in the Attorneys or Advocates results.

### 4. Admin edit forms (advocate + attorney)
- In `src/routes/_authenticated/admin.advocates.tsx` and `admin.attorneys.tsx` edit modals, add a checkbox **"Hide from Advocate/Attorney directory (mediator/arbitrator only)"** bound to `exclude_from_lawyer_listing`. Hydrate it with the rest of the row (per the project's "edit forms hydrate full record" rule).

### 5. No changes to
- `/mediators` and `/arbitrators` pages — they already filter purely by `is_mediator` / `is_arbitrator`.
- Firm pages — Alan's firm-level listing (if any) is independent of this flag.
- Profile page `/lawyers/[slug]` — still reachable directly.

## Files touched

- `supabase/migrations/<new>.sql` — add column
- data update for Alan Nelson (via insert tool)
- `src/routes/search.tsx`
- `src/routes/_authenticated/admin.advocates.tsx`
- `src/routes/_authenticated/admin.attorneys.tsx`

## Out of scope

- Changing the `lawyer_type` check constraint or adding `'mediator'`/`'arbitrator'` as types.
- Reworking the mediators/arbitrators directories.
