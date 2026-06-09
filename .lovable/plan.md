Add a "Law firms in major South African cities" discover-links section to `/firms/` (below the results, same spot as the search page), using the existing `is_major_city` towns from the database and linking to `/firms/?town={slug}`.

### Files
- `src/routes/firms.index.tsx`

### Implementation
1. Fetch `towns` where `is_major_city = true` with a `useQuery` hook inside a new `FirmDiscoverLinks` subcomponent.
2. Render a `<section>` with heading, description, and a flex-wrap list of pill `<Link>` elements pointing to `/firms/?town={slug}`.
3. Skip the section when no major towns are returned.
4. Re-use the same muted-card pill styling as the attorneys discover links (`border-border bg-card`, hover with `border-gold bg-gold/10`).
5. Insert the component below the pagination block inside the results container, matching the exact placement pattern used on the search page.