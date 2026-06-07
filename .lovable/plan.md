## Fix

Only 4 TypeScript errors remain — all on a single line in `src/routes/expert-witnesses.index.tsx:51`, where the previous refactor accidentally injected an `.eq("provider_type", "expert")` call *inside* the `.select(...)` string, breaking the parser:

```ts
.select("*, provider_disciplines(expert_disciplines(name, slug, parent_category).eq("provider_type", "expert")), case_service_providers(id)", { count: "exact" })
```

### Change

Restore the select string and move the filter to a proper chained call:

```ts
.select("*, provider_disciplines(expert_disciplines(name, slug, parent_category)), case_service_providers(id)", { count: "exact" })
.eq("provider_type", "expert")
.in("status", ["trial", "active"]);
```

### Verify

Run `bunx tsc --noEmit` — expect 0 errors.
