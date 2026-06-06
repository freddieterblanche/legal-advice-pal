## Goal
Replace the free-text Designation with a structured, role-appropriate selector for Advocates and Attorneys, and surface SC status, year of admission, years in practice, and Practice/Sector Head badges.

## Database changes (lawyers table)
Add the following columns (all nullable so existing rows keep working):
- `lawyer_type` — text: `'advocate' | 'attorney'`
- `year_of_admission` — integer (e.g. 2008); years in practice computed at render time
- `is_senior_counsel` — boolean, default false (Advocates only)
- `designation_code` — text, one of the Attorney values below; null for Advocates
- `designation_custom` — text, free-text fallback when none of the codes fit
- `is_practice_head` — boolean, default false
- `practice_head_area` — text (free text, e.g. "Banking & Finance")
- `is_sector_head` — boolean, default false
- `sector_head_area` — text (free text, e.g. "Mining")

Existing `designation` column stays as-is for back-compat and is shown until the lawyer is next edited.

Attorney `designation_code` values:
Managing Director, Chairperson, Chief Executive Officer, Chief Operating Officer, Company Secretary, Managing Partner, Director, Partner, Consultant, Executive, Senior Associate, Associate, Candidate Legal Practitioner.

## Edit form (admin dashboard + /my-profile)
In the "Details" section, replace the single Designation input with:

1. **Lawyer type** — radio: Advocate / Attorney
2. **If Advocate**:
   - Checkbox: "Senior Counsel (SC)"
   - Number: "Year of admission" (1950–current year)
   - Read-only computed display: "X years in practice"
3. **If Attorney**:
   - Select: Attorney designation (the 13 codes above) + "Other (specify)"
   - If "Other" → free-text `designation_custom`
   - Number: "Year of admission" (optional)
   - If designation is "Director": show two checkboxes
     - "Also Practice Head" → text input for practice area name
     - "Also Sector Head" → text input for sector name
4. Legacy `designation` text shown as a small "Current value (will be replaced on save)" note if present.

## Display logic (public profile, search results, cards)
Helper `formatDesignation(lawyer)` returns the label string:

- Advocate + SC: `Senior Counsel · 18 years in practice`
- Advocate + Junior: `Junior Counsel · 4 years in practice`
- Attorney: `Director` (or chosen code / custom). Append, on a second line/badge:
  - `Practice Head: Banking & Finance` if set
  - `Sector Head: Mining` if set
- Fallback: if `lawyer_type` is null, render the legacy `designation` text.

Years in practice = `currentYear - year_of_admission` (computed in helper, never stored).

## Files touched
- New migration: add the 9 columns above to `public.lawyers`.
- `src/lib/designation.ts` — constants (attorney codes), `formatDesignation()`, `yearsInPractice()`.
- `src/routes/_authenticated/dashboard.tsx` — replace designation input in the lawyer edit modal with the new structured controls.
- `src/routes/_authenticated/my-profile.tsx` — same controls (when this route exists; otherwise the dashboard form covers it for now).
- `src/routes/lawyers.$slug.tsx` — render via `formatDesignation`.
- `src/routes/search.tsx` and any lawyer card components — render via `formatDesignation`.

## Out of scope
- No filtering/search by lawyer type or SC status yet (can be a follow-up).
- No bulk migration of existing `designation` text → new codes (kept as-is per your answer).
- No validation that an SC was actually admitted as SC — trust the admin/lawyer.
