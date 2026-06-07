
# Province / Town Search

Add a normalized location reference (provinces + towns) so users can filter lawyers by Province and then by Town/City, with typeable comboboxes. Existing free-text `city`/`province` on lawyers stays as a fallback.

## Database (single migration)

- `provinces` table — 9 SA provinces seeded: Eastern Cape, Free State, Gauteng, KwaZulu-Natal, Limpopo, Mpumalanga, Northern Cape, North West, Western Cape. Fields: `name` (citext, unique), `slug`, `code` (e.g. `GP`, `WC`).
- `towns` table — ~200 major cities and well-known towns across all 9 provinces. Fields: `name` (citext), `slug`, `province_id` (FK, required), `is_major_city` (bool), with `UNIQUE (province_id, name)`. Seed list curated per province (Joburg, Pretoria, Cape Town, Stellenbosch, Durban, Pietermaritzburg, Bloemfontein, Gqeberha, East London, Polokwane, Nelspruit, Kimberley, Mahikeng, etc., plus the larger towns).
- `lawyers` — add nullable `town_id` (FK → `towns.id`). Existing free-text `city` and `province` columns kept as fallback (no destructive migration). A future cleanup pass can backfill `town_id` by matching text.
- `firm_branches` — add nullable `town_id` for consistency (lawyer branch records can also be linked).
- Indexes on `towns.province_id`, `lawyers.town_id`, `firm_branches.town_id`.
- RLS: public `SELECT` on `provinces` and `towns` (reference data). Only `platform_admin` may `INSERT/UPDATE/DELETE`. Standard grants for `authenticated`, `service_role`, plus `anon SELECT` on these two reference tables.

## Public search page (`/search`)

Replace the current free-text Province textbox with two cascading typeable comboboxes (reusing existing `Combobox`):

1. **Province** — typeable select from the 9 provinces.
2. **Town / City** — typeable select; disabled until a Province is picked; options filtered to that province. Optional ("Any town").

Both filters are encoded in search params (`province`, `town`). The lawyer query filters on `lawyers.town_id` when town is set, otherwise on any town within the selected province. Falls back to matching the legacy text `province` column for rows without `town_id`, so existing seeded lawyers still appear.

## Admin

- **Add/Edit Attorney** and **Add/Edit Advocate** forms get a Province + Town combobox pair. Town list filters by Province. Selecting a town also sets the text `city`/`province` columns for backward compatibility.
- **New `/admin/towns` page** — small CRUD table so platform admin can add missing towns later (typed Province combobox + Town name). Mirrors the Bars/Chambers admin pages. Linked from the Admin Hub alongside Bars and Chambers.

## Profile + listings

- Lawyer profile header: prefer joined `town.name, province.name` when `town_id` is set; fall back to text fields.
- Firm pages: unchanged (firm-level location stays as-is for now).

## Out of scope

- Backfilling `town_id` on existing lawyer rows (admin can do this manually via edit, or a future migration can attempt fuzzy text match).
- Suburb-level locations.
- Self-service town requests by firms/lawyers.

## Technical notes

- New server fns in `src/lib/locations.functions.ts` (`listProvinces`, `listTowns({ provinceId })`, admin `createTown`, `updateTown`, `deleteTown`). Admin mutations gate on `platform_admin` role via `requireSupabaseAuth` + role check, same pattern as bars/chambers.
- Search page loads provinces eagerly; towns lazy-loaded on province change via TanStack Query.
- Seed data for the ~200 towns lives in the migration SQL as one `INSERT ... VALUES` block per province.
