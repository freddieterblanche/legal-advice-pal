## Sticky search bar on scroll

When the user scrolls past the dark hero search band on a listing page, a slim sticky bar slides in at the top of the viewport with the search input + the same filter controls, so they can refine without scrolling back up — matching the Property24 pattern in the screenshot.

### Pages affected

Same five pages we just updated:

1. `src/routes/search.tsx` — Attorneys / Advocates
2. `src/routes/firms.index.tsx` — Law Firms
3. `src/routes/expert-witnesses.index.tsx` — Expert Witnesses
4. `src/routes/mediators.index.tsx` — Mediators
5. `src/routes/arbitrators.index.tsx` — Arbitrators

### Visual & behaviour

```text
─── scrolled state ─────────────────────────────────
│ [ 🔍 search input ……………… ]  [Area ▾] [Prov ▾] [Town ▾]  [Search] │
────────────────────────────────────────────────────
```

- A condensed bar pinned to the top (`fixed top-0 inset-x-0 z-40`), full viewport width, with a navy/ink background that matches the existing site nav and a subtle bottom shadow.
- Inside: search input on the left (flex-1), the same filter controls used in the hero (dropdowns / chips collapsed into dropdowns) on the right, and a `Search` button. Same state, same URL params — just a second render of the existing controls.
- **Trigger**: appears once the user scrolls past the hero search card. Implemented with an `IntersectionObserver` on a sentinel `<div>` placed right after the hero card. When the sentinel leaves the viewport, the sticky bar fades/slides in (`transition-transform translate-y-0` from `-translate-y-full`).
- **Hide trigger**: when the sentinel scrolls back into view (user scrolled back near the top), the bar slides out.
- Sits **below the existing site navbar** (the navbar in `__root.tsx` is not currently sticky, so the new bar takes the top spot during scroll — no overlap risk). If the navbar is later made sticky, we can stack via z-index.
- Mobile: on narrow screens the bar collapses to just the search input + a single `Filters` toggle button that opens a small dropdown panel containing the filter controls. Keeps the bar usable on phones.
- The bar reuses the same `update()` / `onSubmit` handlers already in each page — no new state, no new query keys, no change to search logic.

### Implementation

- New shared component `src/components/StickySearchBar.tsx` that takes:
  - `q`, `setQ`, `onSubmit` (search input + submit)
  - `filters: React.ReactNode` (the filter controls — each page passes its own dropdowns/chips so we don't have to model every filter shape)
  - `placeholder` string
- New small hook `src/hooks/use-sticky-trigger.ts` wrapping `IntersectionObserver` → returns `isStuck: boolean` for a sentinel ref.
- Each listing page:
  - Renders `<div ref={sentinelRef} />` immediately after the hero `<section>`.
  - Renders `<StickySearchBar isVisible={isStuck} … />` once near the top of the JSX. CSS handles the slide/fade so it's mounted but hidden when `!isStuck`.
  - The hero search card stays exactly as it is; the sticky bar is purely additive.

### Out of scope

- No changes to the home page (no long results list to scroll past).
- No changes to admin/dashboard pages.
- No change to the existing site navbar's stickiness — only the sticky **search** bar is added.
- No new URL params, sort, or pagination changes.
