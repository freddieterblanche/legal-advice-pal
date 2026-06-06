# Edit Lawyer Profiles

Currently firm admins can add, deactivate, or delete lawyers, but cannot edit an existing profile. Add a full edit flow in the dashboard.

## User flow

1. In Dashboard → Lawyers, each row gets an **Edit** action (alongside Deactivate / Delete).
2. Clicking Edit opens a modal pre-filled with the lawyer's current values: first name, last name, designation, city, province, bio, and currently linked practice areas.
3. The same **Import from website** AI helper is available at the top — useful to refresh a profile from the firm website.
4. Admin edits any field, adds/removes practice-area chips, and clicks **Save Changes**. Toast confirms and the table refreshes.

## Technical approach

- Refactor `AddLawyerModal` in `src/routes/_authenticated/dashboard.tsx` into a single `LawyerFormModal` that accepts an optional `lawyer` prop:
  - When `lawyer` is undefined → insert (current behavior).
  - When provided → `UPDATE` `lawyers` by id, and sync `lawyer_practice_areas` (delete existing rows for that lawyer, insert the new set).
- `LawyersTab` adds an Edit button per row and tracks `editingLawyer` state.
- Practice areas for the edit case are loaded with a small `useQuery` joining `lawyer_practice_areas` + `practice_areas`.
- All writes use the existing browser `supabase` client — current RLS already lets `firm_admin` users update their own firm's lawyers (no schema changes needed). I'll verify with a read_query before shipping; if a policy is missing I'll add it in a migration.

## Out of scope

- Editing firm-level fields (already handled in the Settings tab).
- Bulk edit / CSV import.
- Photo upload.
