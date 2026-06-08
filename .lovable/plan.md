## 1. Firm logos on listing rows and detail page

**Where logos render today**
- `firms.$slug.tsx` already renders `firm.logo_url` in the hero.
- `firms.index.tsx` renders a generic `Building2` icon tile instead of the logo.
- `admin.firms.tsx` already exposes a `logo_url` URL input.

**Changes**
- In `firms.index.tsx`, replace the `Building2` tile with a logo thumbnail when `f.logo_url` exists; fall back to the `Building2` icon when missing or on image error.
- Add a new shared `<FirmLogo />` component used by both the listing thumbnail and the `firms.$slug` hero so the white-logo fix lives in one place.

**White-on-transparent logo fix**
- Wrap every logo in a tile with `bg-slate-100` (light neutral), padding, rounded corners, and `object-contain` so the logo never bleeds to the edge.
- Use `bg-slate-100` for every firm logo (not just detected white ones) — it is the only reliable way to guarantee white/transparent logos remain visible without per-image detection, and dark/coloured logos still read well on a light neutral.
- On the firm detail hero, keep the existing larger size but apply the same tile treatment.

## 2. List view + pagination across listing pages

**Current state**
- `search.tsx` already has a `view` (cards | list) toggle but always uses `PAGE_SIZE = 20`.
- `firms.index.tsx`, `mediators.index.tsx`, `arbitrators.index.tsx`, `expert-witnesses.index.tsx` only have one layout and a fixed page size (~25).

**Changes — apply the same pattern to every index page above**
1. Add a `view: "cards" | "list"` search param (validated, default `"cards"`).
2. Add a small "Cards / List" toggle next to the existing `SortBar` (same component used in `search.tsx`).
3. Page size becomes dynamic:
   - `view === "cards"` → keep current size (firms 25, search 20, etc.).
   - `view === "list"` → `100`.
4. When `view === "list"`, render results in a compact `<Table>` (Name, Type/Designation, City/Province, action), reusing the shadcn `Table` primitives already used in `search.tsx`.
5. Pagination computes `totalPages` from the active page size, so switching view resets to page 1.

**Featured ordering, filters, and sorting are unchanged** — only the row template and page size differ between views.

## 3. Files touched

- `src/components/FirmLogo.tsx` (new) — tile with bg-slate-100, object-contain, fallback icon.
- `src/routes/firms.index.tsx` — use `FirmLogo`, add view toggle, 100/page in list mode, compact table layout.
- `src/routes/firms.$slug.tsx` — swap hero logo `<img>` for `<FirmLogo size="lg" />`.
- `src/routes/search.tsx` — change page size to 100 when `view === "list"` (cards stays at 20).
- `src/routes/mediators.index.tsx` — add view toggle + 100/page list layout.
- `src/routes/arbitrators.index.tsx` — same.
- `src/routes/expert-witnesses.index.tsx` — same.

## 4. Out of scope (flag for follow-up)

- No change to the admin logo input flow (still paste-a-URL). If you want a true file upload to Cloud storage for firm logos, say so and I'll add it as a separate step.
- No change to how lawyer/expert avatars are rendered — the bg-slate-100 fix is only applied to firm logos, where transparent-white is the common case.
