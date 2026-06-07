## Goal

Give platform admin one obvious place to add anything to the directory, and add proper support for **Advocates** with a normalised **Bar** and **Chambers** structure (no duplicates, no misspellings).

## What's missing today

- No way to add an Advocate as admin. Advocates live in the `lawyers` table with `lawyer_type = 'advocate'`, but `firm_id` is `NOT NULL` so they're forced under a "firm" they don't actually belong to.
- No concept of Bar or Chambers in the schema.
- Admin only has `/admin/firms`; no central hub.

## Plan

### 1. Database (single migration)

- New table **`bars`** — South African Bar Councils.
  - Fields: `name` (unique, citext), `slug` (unique), `province`.
  - Seed with the standard SA Bars: Johannesburg, Cape, Pretoria, Durban (KZN), Port Elizabeth, Grahamstown, Bloemfontein, Pietermaritzburg, Polokwane, Mthatha, Mahikeng, Kimberley, Mbombela.
- New table **`chambers`** (a.k.a. Groups).
  - Fields: `name` (unique with `bar_id`, citext), `slug`, `bar_id` (nullable — most Chambers belong to one Bar but some can be unaffiliated), `address`, `city`, `province`, `phone`, `website`.
- **`lawyers`** changes:
  - `ALTER COLUMN firm_id DROP NOT NULL`.
  - Add `bar_id uuid` and `chambers_id uuid` (nullable; only used for advocates).
  - Add CHECK: an advocate must have `bar_id` set; an attorney must have `firm_id` set.
- RLS: public can `SELECT` from `bars` and `chambers` (they're reference data). Only `platform_admin` can insert/update/delete. Standard GRANTs on the new tables.
- Update RLS / queries on `lawyers` so listings filter correctly when `firm_id` is null.

### 2. Admin hub — `/admin`

New landing page for platform admins with three big cards:

```text
+--------------+  +------------------+  +------------------+
|  Add Firm    |  |  Add Attorney    |  |  Add Advocate    |
|  Manage all  |  |  Across all firms|  |  By Bar/Chambers |
+--------------+  +------------------+  +------------------+
```

Plus quick links to manage Bars and Chambers (reference data).

### 3. Pages

- **`/admin/firms`** — already exists, kept as-is.
- **`/admin/attorneys`** (new) — table of all attorneys across all firms. "Add Attorney" button opens a modal that asks **Firm** first (typeable combobox over existing firms), then the usual attorney fields. Row actions: edit, open profile, change firm, delete.
- **`/admin/advocates`** (new) — table of all advocates. "Add Advocate" button opens a modal with:
  - First name, last name, email, phone, city, province
  - **Bar** — typeable combobox bound to the `bars` table. No free text — must pick from list. A small "+ Add Bar" affordance opens a tiny inline form (admin only).
  - **Chambers** — typeable combobox filtered by selected Bar; "+ Add Chambers" inline. Optional.
  - Designation (Senior Counsel toggle, year of admission, etc. — reuses existing lawyer fields).
- **`/admin/bars`** and **`/admin/chambers`** (new, small) — simple CRUD tables so admin can rename/merge/clean reference data without duplicates. Name uniqueness is enforced by the DB; inline edit; merge action moves all advocates from Bar A → Bar B then deletes A.

### 4. Profile + listings

- Lawyer profile page (`/lawyers/$slug`) — for advocates, show **Bar** and **Chambers** in the header instead of the firm link. "Office" sidebar shows the Chambers address (if any) instead of firm branches.
- Search page — Bar and Chambers become filterable (typeable comboboxes) when the user picks "Advocate" designation.
- Firm page — only attorneys (advocates excluded by the `firm_id IS NOT NULL` filter).

### 5. Anti-duplication safeguards

- DB-level: `UNIQUE` on `bars.name` (citext) and on `(bar_id, chambers.name)` (citext) so casing/whitespace can't create dupes.
- UI-level: comboboxes ONLY allow selecting existing rows; creating a new Bar or Chambers is a deliberate, separate action behind a button, with a "did you mean …" suggestion if the typed name fuzzy-matches an existing row.

## Technical notes

- Existing `lawyer_type` check constraint already restricts to `'advocate' | 'attorney'`.
- Schema change requires updating `lawyers` queries that assume `firm_id` is non-null (search page, firm detail, dashboards). I'll grep and patch each.
- Reuse the existing `Combobox` component for Bar/Chambers pickers.
- New server fns under `src/lib/advocate-registration.functions.ts` for create/update flows that need admin checks; everything routed through `requireSupabaseAuth` + role check.
- All new admin routes live under `src/routes/_authenticated/admin.*.tsx` so the existing auth gate applies.

## Out of scope

- Letting Bars/Chambers self-register or claim listings (admin-managed only).
- Migrating any existing fake-firm rows that were created to hold advocates — I'll surface a list so you can re-link them manually.
