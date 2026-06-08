## Add email address to firms

Adds a contact email to firms (and per-branch) — surfaced on the public firm page and editable in the admin firm form.

### Database
Migration:
- `ALTER TABLE public.firms ADD COLUMN email text;`
- `ALTER TABLE public.firm_branches ADD COLUMN email text;`

No CHECK constraint (kept simple text); validation happens in the form. No RLS / grant changes (columns inherit the existing table policies).

### Admin form — `src/routes/_authenticated/admin.firms.tsx`
- Add `email` to the `Firm` type, the form state (init from `firm?.email`), and the insert/update payloads.
- Add an "Email" input alongside the existing "Main phone" field (`type="email"`, optional, basic browser validation).
- Add `email` to the per-branch row type, the "Add branch" draft, the editable branch inputs, and the branch update/insert payloads.

### Public firm page — `src/routes/firms.$slug.tsx`
- Include `email` in the firm + branches select.
- Show firm email next to the phone line as a `mailto:` link (Mail icon from lucide-react).
- Show branch email under each branch the same way as branch phone.

### Firms listing — `src/routes/firms.index.tsx`
- Add `email` to the `select(...)` projection so the field is available; no UI change on the card itself (kept minimal — listing already shows phone/website).

No changes to search, dashboard, or registration flow.