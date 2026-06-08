## Show matched branch on firm search results

When a user's search matches a firm via one of its branches (e.g. "yzerfontein"), the result card currently still shows the firm's head-office city ("Stellenbosch, Western Cape"), which looks wrong. We will surface the matching branch under the firm name so the result makes sense.

### Changes (frontend only — `src/routes/firms.index.tsx`)

1. **Fetch matched branches alongside firms.**
   When `search.q`, `search.province`, or `search.town` is set, also fetch the matching `firm_branches` rows (id, firm_id, name, city, province, country) — reuse the same filters already used to compute `branchFirmIds` / `qBranchFirmIds`. Return a `Record<firm_id, MatchedBranch[]>` from the same `useQuery`.

2. **Pick a "matched branch" per firm card.**
   For each firm row, if a matched branch exists for that firm, pick the first one. Prefer a branch whose `city`/`name`/`province`/`country` actually contains `search.q` (case-insensitive) over a town/province filter match.

3. **Render the branch location instead of the head-office location** on both the card and list views when a matched branch is present:
   - Card subtitle: `📍 {branch.city}, {branch.province}` (fallback to country if no province), with a small muted suffix like `— branch of {firm.name}` is NOT needed; just show the branch location.
   - List view: replace the City and Province cells with the branch's city/province when a matched branch exists.
   - When no branch match (pure name/city match on the firm itself), keep the existing head-office display unchanged.

4. **No backend, schema, or search-logic changes.** The existing branch-aware search already returns Cliffe Dekker for "Yzerfontein"; this plan only fixes the displayed location.

### Out of scope
- Showing multiple branches per card.
- Changing sort/filter behaviour.
- Any edits to firm detail pages.