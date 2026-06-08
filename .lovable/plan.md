## Add "View as List" toggle to search results

Adds a compact list view to `/search` while keeping the existing card view as default.

### UX
- Small toggle in the results header (next to SortBar): **Cards | List**.
- Default = Cards (existing behaviour, unchanged).
- Selection persists in the URL as `?view=list` (so it survives reloads and shareable links) and falls back to `cards`.

### List view
A dense table (no photos) using existing `Table` primitives:

| Name | Designation | Firm | City | |
|---|---|---|---|---|
| Full name (+ " SC" if senior counsel), linked to profile | Designation text, or fallback "Advocate"/"Senior Counsel"/"Attorney" derived via the existing `resolveKind` logic | `firm_name ?? chambers_name` | `city` (province as muted suffix) | "View" link button |

- Same query, sorting, pagination, filters, and type tabs as the card view — only the row rendering changes.
- Row click → profile (same target as "View Profile").
- Mobile: horizontal scroll on the table (matches `Table` component default).

### Files
- `src/routes/search.tsx`
  - Extend `validateSearch` with `view: "cards" | "list"` (default `"cards"`).
  - Add a small two-button toggle near the SortBar.
  - Branch render: existing `<article>` cards when `view === "cards"`, new `<Table>` block when `view === "list"`.
  - Reuse the existing `kind` / `badgeLabel` / link logic so labels stay consistent with the cards.

No backend, schema, or query changes.