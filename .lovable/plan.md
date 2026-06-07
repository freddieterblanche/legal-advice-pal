## Problem

In the admin panel, clicking **Edit** on a mediator or arbitrator currently sends them to `/admin/advocates?edit=<id>` (see `AdminRoleListPage.editHref`). That form was built for advocates — it shows Bar, Chambers, Senior Counsel, Year of Admission — and forces every mediator/arbitrator through an advocate-shaped UX. Pure mediators/arbitrators who are not (and may never have been) attorneys or advocates should not be touched by that form.

The data model already supports this separation:
- `lawyers.lawyer_type` can be `null` for pure mediators/arbitrators (the constraint fix from the previous turn allows this).
- Dedicated columns exist: `mediator_accreditation`, `mediator_style`, `mediator_sectors`, `arbitrator_accreditation`, `arbitrator_types`, `arbitrator_experience_years`.
- The "Create new" form in `AdminRoleListPage` already creates rows with `lawyer_type = null` when background = "Other".

What's missing is a dedicated **edit** path for those rows.

## What we'll build

1. **New component `MediatorArbitratorFormModal`** (in `src/components/AdminRoleListPage.tsx` alongside the existing `AddRoleModal`, or a sibling file). Shows only fields that apply:
   - First name, Last name
   - Photo (URL + upload + crop, reusing `ImageCropModal` like the advocate modal)
   - City, Province
   - Email, Office phone, Mobile
   - **Description / Bio** — `RichTextEditor`, sanitized with `sanitizeBioHtml` on save (per memory rule)
   - For mediators: Accreditation, Style, Sectors (multi-select from `MEDIATION_SECTORS`)
   - For arbitrators: Accreditation, Types (multi-select), Years of experience
   - Languages, Daily rate range, Availability notes
   - Optional cross-flag: "Also acts as Arbitrator" (on mediator form) / "Also acts as Mediator" (on arbitrator form)
   - Status (Active / Trial / Pending payment / Inactive) when editing
   - Practice areas chips (same picker used elsewhere)
   - Reported cases editor (existing component)
   - Hydrates the full row with `select("*")` before allowing edits and gates input on a `hydrated` flag (per memory rule)
   - Never writes `lawyer_type`, `bar_id`, `chambers_id`, `is_senior_counsel`, `year_of_admission` — these stay untouched

2. **Update `AdminRoleListPage`** so the Edit button behaviour becomes:
   - If `lawyer_type === "advocate"` → open `/admin/advocates?edit=<id>` (unchanged — they're an advocate first)
   - Else if `firm_id` is set (attorney at a firm) → `/dashboard` (unchanged)
   - Else → open the new `MediatorArbitratorFormModal` directly (instead of the current fallback to advocate admin)

3. **Public profile separation check**: Confirm `/lawyers/$slug` already renders pure mediators/arbitrators cleanly (it does — `mediators.index.tsx` and `arbitrators.index.tsx` already link there) and that no labels there call them "Advocate" when `lawyer_type` is null. Adjust the type pill / heading on `lawyers.$slug.tsx` so a row with `lawyer_type = null` + `is_mediator/is_arbitrator` uses the Mediator/Arbitrator `TypePill` variant (per the type-pill memory rule) instead of falling through to an Attorney/Advocate label.

4. **Registration flow sanity check** (`src/routes/register.tsx` / `registerLawyerForCurrentUser`): Already supports `kind: "mediator" | "arbitrator"` with `is_lawyer: false`. Verify the public registration UI clearly offers Mediator and Arbitrator as standalone choices that don't require selecting attorney/advocate. Make wording adjustments only if it's currently ambiguous; no schema change needed.

## What we will NOT change

- The `AdvocateFormModal` keeps its Mediator/Arbitrator toggles for advocates who also act in those roles.
- The dashboard's `LawyerFormModal` keeps its toggles for firm attorneys who also mediate/arbitrate.
- Database schema — no migration needed; the constraint already allows mediator/arbitrator-only rows.
- Public listing pages (`/mediators`, `/arbitrators`) — unchanged.

## Technical details

- File touched: `src/components/AdminRoleListPage.tsx` (add the new modal, change `editHref` into modal-open state) and `src/routes/lawyers.$slug.tsx` (pill/label fallback when `lawyer_type` is null).
- New modal uses the same `supabase.from("lawyers").select("*").eq("id", id)` hydrate pattern already proven in `AdvocateFormModal`.
- Save uses `supabase.from("lawyers").update(payload).eq("id", id)` with **only** the fields the modal owns — no destructive overwrite of advocate-only columns.
- Bio sanitized via `sanitizeBioHtml(form.bio) || null` before update.
- Photo upload reuses `lawyer-photos` storage bucket and `ImageCropModal`.
- No new dependencies.
