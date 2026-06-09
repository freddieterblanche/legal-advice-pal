## Goal

Add contextual, dynamic link lists to `/search` to help users (and Google) discover lawyers by location, and advocates by city → chambers.

- **Attorneys tab (`/search?type=attorney`)**: a "Attorneys in major cities" block listing the top South African cities/towns where we have attorney listings, each linking to the filtered search.
- **Advocates tab (`/search?type=advocate`)**: a "Advocates by chambers" block grouped by city (Cape Town, Johannesburg, Durban, Pretoria, Bloemfontein, Gqeberha, etc.) with each chambers under that city as a link.

Both lists are rendered inside the main content flow (below the results, above the footer), not in a sidebar — so they read as contextual on-page links rather than sitewide boilerplate.

## Where it goes

`src/routes/search.tsx` — append a new `<DiscoverLinks />` section after the results grid, switching content by `search.type`.

## Data

Driven by live DB queries (TanStack Query, public via the existing browser supabase client; both `towns` and `chambers` are already publicly readable for the site).

1. **Attorney cities** — count active attorneys per town:
   ```sql
   select town_slug, town_name, count(*)
   from service_providers
   where (provider_type = 'attorney'
          or (provider_type is null and designation not ilike '%advocate%'))
     and town_slug is not null
   group by town_slug, town_name
   order by count(*) desc
   limit 24;
   ```
   Render as a responsive grid of pills: `City (count)` → `/search?type=attorney&town={slug}`.

2. **Advocate chambers** — fetch chambers grouped by city, with counts:
   ```sql
   select c.id, c.name, c.slug, c.city, count(sp.id) as n
   from chambers c
   left join service_providers sp on sp.chambers_id = c.id
   group by c.id
   having count(sp.id) > 0
   order by c.city, c.name;
   ```
   Render grouped by `city`:
   ```
   Cape Town
     Leeuwen Chambers · Huguenot Chambers · 50 Keerom Street Chambers · …
   Johannesburg
     Maisels Group · Pitje Chambers · Schreiner Chambers (Group 3) · …
   ```

## New filter: chambers

`src/routes/search.tsx` currently filters by `province` and `town` but not by chambers. To make the chamber links functional we add a `chambers` search param:

- Extend `validateSearch` with `chambers?: string` (slug).
- In the query builder add `if (search.chambers) query = query.eq("chambers_slug", search.chambers);` (column already exists alongside `town_slug`; confirm in the existing select list and add if missing).
- Show an active-filter chip with the chambers name + clear (×) when set, matching the existing province/town chip pattern.

Each chambers link → `/search?type=advocate&chambers={slug}`.

## UX details

- Section heading: `<h2>` with semantic styling (`text-lg font-semibold`), matching site typography.
- Use `<Link>` from `@tanstack/react-router` (not `<a>`) for client-side nav + preloading.
- Skip the section entirely when the underlying query returns 0 rows (no empty headings).
- Mobile: pills wrap; chambers list collapses to single column.
- Styling: reuse existing `TypePill`/muted card surfaces — no new color tokens.

## SEO

- Real anchor text (`Attorneys in Cape Town`, `Leeuwen Chambers`) — good internal-link signal.
- Lives in main content (not sidebar boilerplate), so Google weights it.
- Each target URL already has unique title/description via the search route's `head()`; no additional metadata work needed for this change.

## Out of scope

- No new routes — everything funnels through the existing `/search` filters.
- No changes to other listing pages (firms, mediators, arbitrators, experts).
- No sidebar widget.
