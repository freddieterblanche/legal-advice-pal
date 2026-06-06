# AI Profile Importer

Add a one-click "Import from URL" flow to the Add Lawyer modal. The user pastes a link to a lawyer's bio on their firm website; the app scrapes the page and uses Lovable AI to extract structured profile fields, which pre-fill the form for review before saving.

## User flow

1. In Dashboard → Lawyers → **Add Lawyer**, a new field appears at the top: *"Import from website (optional)"* with a URL input and an **Import** button.
2. User pastes e.g. `https://terblanche.co.za/team/johan-terblanche` and clicks Import.
3. Spinner shows "Reading profile…" → "Extracting with AI…".
4. Form fields populate: first name, last name, designation, city, province, bio, and (best-effort) suggested practice areas.
5. User reviews/edits any field, then clicks **Add Lawyer** as today. Nothing is saved until they confirm.

## Technical approach

**Scraping** — Firecrawl connector (already documented in stack). Server-side only, scrape with `formats: ['markdown']`, `onlyMainContent: true`. This handles JS-rendered pages and avoids CORS.

**AI extraction** — Lovable AI Gateway via AI SDK (`google/gemini-3-flash-preview`), `generateText` with `Output.object` and a Zod schema:
```
{ first_name, last_name, designation (enum from DESIGNATIONS),
  city, province (enum from PROVINCES), bio (<=2000 chars),
  practice_area_slugs: string[] }
```
System prompt instructs the model to map free-text to the allowed enums and return empty strings if unknown rather than hallucinate. Practice-area slugs are matched against the existing `practice_areas` table server-side; unknowns are dropped.

**Server function** — new `src/lib/profile-import.functions.ts`:
- `importLawyerProfile({ url })` — protected by `requireSupabaseAuth`
- Validates URL with Zod (https only, max length)
- Calls Firecrawl → trims markdown to ~15k chars → calls AI → returns the parsed object plus matched practice-area IDs
- Errors surfaced clearly: invalid URL, scrape failure, AI 402/429, no profile found

**Frontend** — extend `AddLawyerModal` in `src/routes/_authenticated/dashboard.tsx`:
- URL input + Import button at top of the form
- On success, `setForm(...)` with returned fields and show a small "Imported — please review" notice
- Practice areas: render extracted ones as removable chips for the user to confirm (only persisted if we extend the insert to also write `lawyer_practice_areas`, which I'll include)

## Secrets / connectors required

- **Firecrawl** connector must be linked. If not yet linked, the build step will trigger `standard_connectors--connect` for Firecrawl.
- `LOVABLE_API_KEY` — already provisioned.

## Out of scope (ask if wanted later)

- Photo/headshot extraction and upload
- Bulk import of an entire firm's team page
- Auto-save without review
