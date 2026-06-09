## Move filters under the search box (Property24-style)

Right now the search/listing pages put filters in a **left sidebar** beside the results, while the search box lives up in the dark hero band. Users have to look in two different places to refine a query. We'll move the filters into a **horizontal filter row attached directly under the main search input**, so search + refine + results read top-to-bottom in one column — matching the Property24 pattern.

### Pages affected

All five listing/search pages share the same sidebar pattern and will be updated consistently:

1. `src/routes/search.tsx` — Attorneys/Advocates (the page in the screenshot)
2. `src/routes/firms.index.tsx` — Law Firms
3. `src/routes/expert-witnesses.index.tsx` — Expert Witnesses
4. `src/routes/mediators.index.tsx` — Mediators
5. `src/routes/arbitrators.index.tsx` — Arbitrators

The **home page** (`src/routes/index.tsx`) already stacks practice-area + province dropdowns directly below the search input inside each profession panel, which is already Property24-style — no change needed there unless you want a different layout. (Flag if you'd like me to tweak it too.)

### New layout (per page)

```text
┌─────────────────────────────────────────────────────────┐
│  HERO BAND (dark)                                        │
│   Title + tagline                                        │
│   ┌─────────────────────────────────────────────────┐   │
│   │  🔍  Search by name, firm, area…   [ Search ]  │   │
│   ├─────────────────────────────────────────────────┤   │
│   │  [Practice Area ▾] [Province ▾] [Town ▾] [Desig ▾] │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  RESULTS (full width)                                    │
│   28 attorneys found       Sort by ▾   [Cards|List]      │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Lawyer card                                     │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Behaviour & details

- The filter row sits **inside the same white card** as the search input (one rounded panel: input on top, filter chips/dropdowns underneath, separated by a divider) so it visually belongs to the search.
- On desktop: filters render as a horizontal row of dropdowns (`flex flex-wrap gap-2`), each using the existing `Combobox` component.
- On mobile: the row wraps to 2 columns; on very small screens it stacks. No "Filters" modal — keeping it inline is simpler and matches Property24.
- An **"Active filters"** strip with removable chips appears below the row when any filter is set (e.g. `Practice Area: Tax ✕`, `Yzerfontein ✕`), plus a `Clear all` link. This compensates for losing the always-visible sidebar labels.
- The sidebar `<aside>` and the `lg:grid-cols-[260px_1fr]` wrapper are removed; results become full-width (`max-w-7xl`).
- Sort bar + Cards/List toggle stay exactly where they are (above the results list).
- Each page keeps its own filter set:
  - search: Practice Area, Province, Town, Designation
  - firms: Province, Town (+ existing firm-specific filters)
  - experts: Specialisation, Province, Town
  - mediators / arbitrators: Practice Area, Province, Town
- URL search-param wiring, query keys, sort, pagination, and result rendering are **unchanged** — this is purely a layout move of the same filter controls.

### Out of scope

- No changes to search logic, ranking, or branch-aware matching.
- No changes to the home page profession panels (already Property24-like).
- No changes to admin/dashboard pages or profile detail pages.
- No new "Filters" modal/drawer — filters stay inline.
