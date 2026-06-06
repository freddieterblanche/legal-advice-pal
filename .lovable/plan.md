## Goal
Add 50 missing legal practice areas to the existing `practice_areas` table, avoiding duplicates with the 15 already present. After insertion, confirm the total count and display the complete alphabetical list.

## Context
- **Table:** `practice_areas` (columns: `id` UUID, `name` TEXT, `slug` TEXT, `icon` TEXT)
- **Existing entries:** 15 (Banking & Finance, Commercial Law, Competition Law, Constitutional Law, Criminal Law, Dispute Resolution, Environmental Law, Family Law, Immigration Law, Insolvency & Restructuring, Intellectual Property, Labour Law, Mining & Resources, Property Law, Tax Law)
- **Unique constraints:** `name` and `slug` are both unique-indexed.
- **None of the 50 new names exactly match existing names**, so all 50 can be safely inserted.

## Slug generation
Slugs will be generated using the project's `slugify()` rules:
- lowercased, trimmed
- non-alphanumeric characters (except spaces and hyphens) stripped
- spaces collapsed to single hyphens
- multiple hyphens collapsed

Examples:
- `Alternative Dispute Resolution (ADR)` → `alternative-dispute-resolution-adr`
- `Corporate Law & Mergers and Acquisitions (M&A)` → `corporate-law-mergers-and-acquisitions-ma`
- `Court Appearances / Litigation` → `court-appearances-litigation`
- `Technology, Media & Telecommunications (TMT)` → `technology-media-telecommunications-tmt`

## Steps
1. **Insert** all 50 practice areas in a single query using the `supabase--insert` tool.
2. **Verify** by running `supabase--read_query` to:
   - Count total rows in `practice_areas`
   - Return the full list sorted alphabetically by name

## Expected outcome
- Total practice areas after insertion: **65**
- Full alphabetical list displayed back to user