## Goal

Restructure lawyer profiles into the 9 Bowmans-style sections, each editable as its own field, and let lawyers manage their own listing after the firm admin invites them.

## Profile sections (new structure)

1. **Details** — Name, Designation *(existing)*
2. **Contact Details** — Tel, Email, Branch Office *(existing)*
3. **Areas of Expertise** — practice-area chips *(existing)*
4. **Qualifications** — rich text *(replaces current "Education" textarea)*
5. **Overview** — rich text *(replaces current "Bio")*
6. **Accolades & Awards** — rich text *(new)*
7. **Articles Published** — structured list: title, publication, date, URL *(new)*
8. **Reported Cases** — existing linked SAFLII cases **+** a rich-text fallback for unlinked cases *(extended)*
9. **Noteworthy Matters** — rich text *(new)*

## Database changes

Add to `lawyers`:
- `qualifications text` (migrate existing `education` values in)
- `overview text` (migrate existing `bio` values in)
- `accolades text`
- `noteworthy_matters text`
- `reported_cases_notes text`

New table `lawyer_articles`:
- `id`, `lawyer_id` (FK → lawyers, cascade delete), `title`, `publication`, `published_date` (date, nullable), `url`, `sort_order`, timestamps
- RLS: public can read articles of trial/active lawyers; firm admin and the lawyer themselves can manage their own.

New table `lawyer_invites` (for self-manage flow):
- `id`, `lawyer_id` (unique), `email`, `token` (uuid, unique), `invited_by`, `sent_at`, `accepted_at`, `expires_at` (7 days)
- RLS: only platform_admin and the inviting firm admin can read.

`profiles.role` gains a `lawyer` role value (already supported as free text).

## Lawyer self-manage flow

1. **Invite**: On a lawyer row in the firm/admin dashboard, an **"Invite to manage"** button. It calls a server function that:
   - Generates an invite token, stores in `lawyer_invites`.
   - Sends a branded email via the project's email infrastructure with a link: `/claim?token=…`.
2. **Accept**: `/claim?token=…` route:
   - Validates token via a public server function.
   - If user not signed in, shows sign-up / sign-in (email is pre-filled, password they choose).
   - On accept, links `lawyers.profile_id = auth.uid()`, sets `is_claimed = true`, marks invite accepted, sets profile `role = 'lawyer'` (if currently visitor).
3. **Manage**: Logged-in lawyer sees a new `/my-profile` route → reuses the existing lawyer-edit form, scoped to *their* lawyer record. The existing "Lawyer can update own record" RLS policy already allows this. Firm admin retains full edit access.

Prerequisite: email infrastructure + transactional email templates need to be set up. If not yet present, the email setup dialog will appear before sending the first invite.

## Edit form (firm dashboard + /my-profile)

Reorganise the existing lawyer modal into collapsible sections matching the 9 categories above. Each rich-text section uses the existing `RichTextEditor`. Articles uses a small repeatable list (add / remove / reorder rows).

## Public profile page (`/lawyers/$slug`)

Render the 9 sections in Bowmans order down the left column; right sidebar keeps Office(s) and Status. Empty sections are hidden. Reported Cases shows linked cases first, then the free-text fallback below if present.

## Migration of existing data

- Copy `lawyers.bio` → `lawyers.overview` (keep `bio` column for back-compat for now; stop writing to it).
- Copy `lawyers.education` → `lawyers.qualifications` (same).

## Out of scope (this turn)

- Approval workflow for lawyer-edited changes (lawyers' edits go live immediately, same as firm admin).
- Branded `/claim` landing page styling beyond a simple form.
- Bulk invite.

## Technical notes

- Sanitize all new rich-text fields with the existing `sanitizeBioHtml`.
- Article URL validation: `https?://`, max 500 chars; title required, others optional.
- Invite link uses signed token in URL; server-side single-use, 7-day expiry.
- Email send route: use `email_domain--scaffold_transactional_email` template `lawyer-invite`.
