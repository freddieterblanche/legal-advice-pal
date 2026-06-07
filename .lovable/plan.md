## Problem

On mobile the current cards render the profile photo as a full-width 192px banner (`h-48`) above the text. Two issues:

1. Each card eats too much vertical space — bad for a directory where users scan many results.
2. `object-top` was chosen so portraits aren't cut at the forehead on desktop's tall left column, but on a wide mobile banner it crops the photo at the chest/shoulders, showing "half faces".

## Plan

Split the layout cleanly by breakpoint instead of trying to make one photo element work for both.

### Mobile (default, below `sm:`)
- Compact row: small rounded photo on the left, text on the right — similar to the original pre-change layout.
- Photo: `h-16 w-16 rounded-lg object-cover` (face centered, no `object-top`).
- Card keeps `p-4` padding on mobile only.
- "View Profile" button + case count drop below the text (stacked), so the row stays short.
- No forced card height on mobile — card height is content-driven and compact.

### Desktop (`sm:` and up) — unchanged behavior
- Keep the full-height side photo: `sm:h-48 sm:w-40 sm:self-stretch object-cover object-top`.
- Card keeps `sm:h-48` fixed height and `sm:flex-row`.
- Padding moves to the content side only (`sm:p-5`, no padding on card itself).

### Files to update (same pattern in each)
- `src/routes/search.tsx` — attorneys/advocates results
- `src/routes/mediators.index.tsx`
- `src/routes/arbitrators.index.tsx`
- `src/routes/expert-witnesses.index.tsx`

### Technical notes
- Article: remove the mobile `overflow-hidden` requirement by keeping `rounded-xl overflow-hidden` only effective where the photo touches the edge (desktop). On mobile the photo is inset with padding so `overflow-hidden` is harmless — keep it.
- Class shape for the photo element:
  - `h-16 w-16 shrink-0 rounded-lg object-cover sm:h-auto sm:w-40 sm:rounded-none sm:self-stretch sm:object-top`
- Card outer:
  - `flex gap-4 p-4 rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md sm:gap-0 sm:p-0 sm:h-48 sm:flex-row overflow-hidden`
- Content wrapper:
  - `flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:p-5`
- Actions column stays right-aligned on desktop, becomes a normal stacked block on mobile.

No data, query, or business-logic changes — purely Tailwind class adjustments in the four route files.
