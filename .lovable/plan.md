## Goal

Turn `/register` from a firm-only flow into a single entry point that handles five listing types: **Law Firm**, **Advocate**, **Mediator**, **Arbitrator**, and **Expert Witness**. Mediators and arbitrators may be non-lawyers, so they don't require admission or chambers.

## User-facing flow

**Step 0 — Choose what you're registering** (new):
Five `TypePill`-coloured cards. Selecting one routes the rest of the wizard.

**Step 1 — Listing details** (varies by type):

| Type | Step 1 fields |
|---|---|
| Law Firm | (unchanged) firm name, reg #, province, city, address, website, phone |
| Advocate | first/last name, title, year of admission, SC toggle, **bar** (pick), **chambers** (pick or "Create new" — opens chambers sub-form with name + address + city + province), province, city, phone, email |
| Mediator | first/last name, title (optional), `is_lawyer` toggle → if yes, year of admission + bar; if no, profession/background field; accreditation, style, sectors, province, city, phone, email |
| Arbitrator | first/last name, title, `is_lawyer` toggle (same branch as mediator), accreditation, types, experience years, province, city, phone, email |
| Expert | first/last name, title, discipline(s), registration body, employer / company, independent toggle, province, city, phone, email |

**Step 2 — Account** (unchanged): if not signed in, capture admin first/last/email/password; if signed in, confirm.

**Step 3 — Confirmation**: generic copy ("subscription details to follow per listing type"); on submit, listing is created in `status = 'trial'` and user is redirected to `/dashboard`.

## Data model

- **Firm**: existing `firms` insert + `profiles.role = 'firm_admin'` (no change).
- **Advocate / Mediator / Arbitrator (lawyer-flavour)**: insert into `lawyers` with `lawyer_type = 'advocate'` (or null for non-lawyer M/A), `is_mediator` / `is_arbitrator` flags as appropriate, `chambers_id` set for advocates, `firm_id` left null for solo advocates and non-lawyer neutrals. `profile_id` links to the signed-in user.
- **Expert**: insert into `expert_witnesses` as today; `firm_id` null for independents. Link via a new `expert_witnesses.profile_id` column (currently the table has no owner column — see migration).
- New `profiles.role` values used: `lawyer_owner` (solo advocate / mediator / arbitrator), `expert_owner`. `firm_admin` unchanged.

## Migrations needed

1. Add `lawyers.profile_id uuid references auth.users(id)` (nullable) — already exists; verify and add owner-edit RLS policy:
   `lawyers can be updated by their profile_id owner`.
2. Add `expert_witnesses.profile_id uuid references auth.users(id)` (nullable) + owner-update + owner-delete RLS policies mirroring existing firm-admin ones.
3. Allow authenticated users to insert their own `lawyers` row (with `profile_id = auth.uid()`) and their own `expert_witnesses` row. Today insert is restricted; we need a per-owner insert policy.
4. Allow authenticated users to insert `chambers` (currently platform-admin only) so an advocate can create theirs during signup. Scope via `WITH CHECK (true)` for authenticated; platform admin keeps full management rights.

## Server functions

Replace `registerFirmForCurrentUser` with one new file `src/lib/registration.functions.ts` exporting:

- `registerFirmForCurrentUser` (kept, unchanged signature)
- `registerLawyerForCurrentUser` — Zod input discriminated on `kind: 'advocate' | 'mediator' | 'arbitrator'`; sets `is_mediator`/`is_arbitrator`, `chambers_id` (creates chambers on-the-fly if a new-chambers payload is supplied), `lawyer_type`. Sets `profile_id = userId`. Updates `profiles.role = 'lawyer_owner'` (unless already firm_admin/platform_admin).
- `registerExpertForCurrentUser` — Zod input mirroring expert form. Creates expert row, sets `profile_id`, updates `profiles.role = 'expert_owner'`.

All use `supabaseAdmin` (imported inside handler) so we don't have to widen anon/auth insert policies for everything.

## UI changes

- `src/routes/register.tsx` becomes a thin shell that owns step state + the new step 0 picker and renders one of:
  - `RegisterFirmSteps` (existing markup extracted)
  - `RegisterLawyerSteps` (new — handles advocate/mediator/arbitrator with conditional fields)
  - `RegisterExpertSteps` (new)
- Step-0 cards use `TypePill` colours (firm=slate, advocate=emerald, mediator=violet, arbitrator=rose, expert=amber). Each card: icon, type name, one-line description.
- Page H1 changes to "Register your listing"; existing "Register Your Firm" SEO meta stays as the default but is updated to "Register on Lawexpert.co.za — Firms, Advocates, Mediators, Arbitrators & Experts".
- Bar + chambers pickers reuse `ComboboxCreatable`; long-text fields (bio if any in step 1) use `RichTextEditor` per the project rule.
- After successful signup, navigate to `/dashboard` — the dashboard already shows the relevant owner's listing.

## Dashboard impact (light)

`dashboard.tsx` already supports firm admins managing firm + lawyers + experts. For new solo owners we just need the existing per-row owner edit to work, which the new RLS policies enable. No dashboard rewrite in this pass — defer larger "solo lawyer dashboard" tweaks to a follow-up.

## Out of scope (deferred)

- Per-type pricing copy (Step 3 stays generic).
- Lawyer-invite flow changes.
- Dashboard sections tailored to solo neutrals/experts beyond what exists.

## Risks

- Widening `chambers` insert to authenticated users opens spammy chambers creation. Mitigated by: only invoked through signup server fn (which we keep admin-elevated), so the RLS widening may not be needed — instead, the server fn creates chambers with `supabaseAdmin` and we leave the client policy locked down. **Recommended**: keep chambers policies as-is, do chambers creation server-side only.
- `lawyers` insert policy widening: same — do it server-side via `supabaseAdmin`, so no client-side insert policy change needed. Migration #3 is therefore unnecessary; we only need the **owner UPDATE** policies (and matching `expert_witnesses.profile_id` column + UPDATE/DELETE policies) so users can edit their own listing from the dashboard later.
