## Change

In `src/routes/search.tsx`, restructure each result card (lines ~276–336) so the profile photo fills the entire **left edge** of the card from top to bottom, flush with the card's rounded corners — instead of a small `h-24 w-24` thumbnail sitting in the padded interior.

### Card layout (desktop, `sm:` and up)

```text
┌──────────┬───────────────────────────────────────────┐
│          │  Name  [Partner]                          │
│          │  Firm · Years · Location                  │
│  PHOTO   │  [tag] [tag] [tag] [tag]                  │
│          │                                           │
│          │                          [View Profile]   │
└──────────┴───────────────────────────────────────────┘
```

- `<article>`: keep `rounded-xl bg-card shadow-sm`, **remove `p-5`**, add `overflow-hidden` so the image's corners are clipped by the card.
- Photo column: fixed width `w-32 sm:w-40`, stretched to card height via the parent `flex` (`self-stretch` on the image, no fixed `h-24`). Image uses `h-full w-full object-cover object-top`, no `rounded-xl` (the card's `overflow-hidden` handles the left corners).
- Fallback initials block: same dimensions, same accent background, no internal rounding.
- Content column: wrap the existing name/meta/practice-areas block in a new `flex-1 p-5` container so padding stays only on the text side.
- Right-side action column (`View Profile` + case count): move inside the padded content area, right-aligned, kept vertically centered with `sm:items-center`.

### Card layout (mobile, below `sm:`)

The card already stacks (`flex-col sm:flex-row`). On mobile the photo becomes a full-width banner across the top of the card:

- Photo column on mobile: `w-full h-48` (banner), `object-cover object-top`, no rounding (card clips).
- Content column on mobile: keeps `p-5`.

This is achieved with responsive classes on the photo wrapper: `w-full h-48 sm:h-auto sm:w-40 sm:self-stretch`.

### Technical notes

- The card has three current direct children: img/fallback, content `<div>`, action `<div>`. I'll regroup into two children: photo column, then a single padded content column that internally lays out text (flex-1) and the actions (right) using `flex sm:items-center justify-between gap-4`.
- Keep the existing `onError` fallback swap logic between `<img>` and the initials `<div>`; only the className/dimensions change.
- No other files need to change. No DB / no public profile changes.
- Listing-type pills and other badges remain as-is (out of scope).
