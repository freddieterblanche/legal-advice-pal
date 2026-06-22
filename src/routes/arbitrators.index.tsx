import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ClipboardList, MapPin } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { applyBooleanSearch, BOOLEAN_SEARCH_HINT } from "../lib/boolean-search";
import { ARBITRATION_TYPES, ARBITRATION_ACCREDITATIONS } from "../lib/expert-constants";
import { SortBar, type SortDir } from "../components/SortBar";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { FeaturedBadge } from "../components/FeaturedBadge";
import { StickySearchBar } from "../components/StickySearchBar";
import { useStickyTrigger } from "../hooks/use-sticky-trigger";
import { SimpleSelect } from "../components/SimpleSelect";

type SortField = "surname" | "experience" | "listed";
type Search = { q?: string; atype?: string; province?: string; accreditation?: string; experience?: "0-5" | "5-10" | "10+"; page?: number; sort?: SortField; dir?: SortDir; view?: ViewMode };

export const Route = createFileRoute("/arbitrators/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    atype: typeof s.atype === "string" ? s.atype : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    accreditation: typeof s.accreditation === "string" ? s.accreditation : undefined,
    experience: s.experience === "0-5" || s.experience === "5-10" || s.experience === "10+" ? s.experience : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "surname" || s.sort === "experience" || s.sort === "listed" ? s.sort : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
    view: s.view === "list" ? "list" : "cards",
  }),
  head: () => ({
    meta: [
      { title: "Find an Arbitrator — Lawexpert.co.za" },
      { name: "description", content: "Experienced South African arbitrators for commercial, construction, labour and international disputes." },
      { property: "og:title", content: "Find an Arbitrator — Lawexpert.co.za" },
      { property: "og:description", content: "AFSA panel and independent arbitrators." },
    ],
  }),
  component: ArbitratorSearch,
});

const CARDS_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 100;

function ArbitratorSearch() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/arbitrators" });
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);
  const view: ViewMode = search.view ?? "cards";
  const pageSize = view === "list" ? LIST_PAGE_SIZE : CARDS_PAGE_SIZE;

  const { data: results, isLoading } = useQuery({
    queryKey: ["arbitrator-search", search, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("lawyer_search_view")
        .select("*", { count: "exact" })
        .eq("is_arbitrator", true);
      query = applyBooleanSearch(query, search.q, [
        "full_name",
        "first_name",
        "last_name",
        "firm_name",
        "city",
        "province",
        "arbitrator_accreditation",
      ]);
      if (search.province) query = query.eq("province", search.province);
      if (search.accreditation) query = query.ilike("arbitrator_accreditation", `%${search.accreditation}%`);
      if (search.atype) query = query.contains("arbitrator_types", [search.atype]);
      if (search.experience === "0-5") query = query.gte("arbitrator_experience_years", 0).lte("arbitrator_experience_years", 5);
      if (search.experience === "5-10") query = query.gt("arbitrator_experience_years", 5).lte("arbitrator_experience_years", 10);
      if (search.experience === "10+") query = query.gt("arbitrator_experience_years", 10);
      const page = search.page ?? 1;
      const from = (page - 1) * pageSize;
      const sort = search.sort ?? "surname";
      const ascending = (search.dir ?? "asc") === "asc";
      query = query.range(from, from + pageSize - 1);
      query = query.order("is_featured", { ascending: false });
      if (sort === "surname") {
        query = query.order("last_name", { ascending }).order("first_name", { ascending });
      } else if (sort === "experience") {
        query = query.order("arbitrator_experience_years", { ascending, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending, nullsFirst: false });
      }
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const update = (patch: Partial<Search>) => navigate({ search: (prev: Search) => ({ ...prev, ...patch, page: 1 }) });
  const page = search.page ?? 1;
  const total = results?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { ref: sentinelRef, isStuck } = useStickyTrigger();
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); update({ q: q || undefined }); };
  const compactFilters = (
    <>
      <SimpleSelect value={search.atype ?? ""} onChange={(atype) => update({ atype: atype || undefined })} options={ARBITRATION_TYPES.map((t) => ({ value: t, label: t }))} placeholder="All types" className="w-40 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
      <SimpleSelect value={search.province ?? ""} onChange={(province) => update({ province: province || undefined })} options={PROVINCES.map((p) => ({ value: p, label: p }))} placeholder="All provinces" className="w-40 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
      <SimpleSelect value={search.accreditation ?? ""} onChange={(accreditation) => update({ accreditation: accreditation || undefined })} options={ARBITRATION_ACCREDITATIONS.map((a) => ({ value: a, label: a }))} placeholder="Any accreditation" className="w-40 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
      <SimpleSelect value={search.experience ?? ""} onChange={(experience) => update({ experience: (experience || undefined) as Search["experience"] })} options={[{ value: "0-5", label: "0–5 years" }, { value: "5-10", label: "5–10 years" }, { value: "10+", label: "10+ years" }]} placeholder="Any experience" className="w-36 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
    </>
  );

  return (
    <div className="bg-cream">
      <StickySearchBar
        visible={isStuck}
        q={q}
        setQ={setQ}
        onSubmit={onSubmit}
        placeholder="Search arbitrators — supports AND / OR / NOT…"
        filters={compactFilters}
      />
      <section className="bg-ink py-12 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-gold" />
            <h1 className="font-heading text-3xl md:text-4xl">Find an Arbitrator</h1>
          </div>
          <p className="mt-2 max-w-2xl text-cream/70">
            Experienced arbitrators for commercial, construction, labour and international disputes.
          </p>
          <div className="mt-6 rounded-xl border border-white/15 bg-white/10 p-3 text-cream backdrop-blur-md shadow-lg [&_input]:text-ink [&_select]:text-ink [&_input]:placeholder:text-muted-foreground">
            <form
              onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
              className="grid gap-2 sm:grid-cols-[1fr_220px_180px_auto]"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search — supports AND / OR / NOT…"
                maxLength={240}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <SimpleSelect value={search.atype ?? ""} onChange={(atype) => update({ atype: atype || undefined })} options={ARBITRATION_TYPES.map((t) => ({ value: t, label: t }))} placeholder="All types" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink" />
              <SimpleSelect value={search.province ?? ""} onChange={(province) => update({ province: province || undefined })} options={PROVINCES.map((p) => ({ value: p, label: p }))} placeholder="All provinces" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink" />
              <button type="submit" className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-white hover:bg-gold/90">Search</button>
            </form>
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accreditation:</span>
                {ARBITRATION_ACCREDITATIONS.map((a) => {
                  const active = search.accreditation === a;
                  return (
                    <button key={a} type="button" onClick={() => update({ accreditation: active ? undefined : a })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-ink bg-ink text-cream" : "border-border bg-background text-ink hover:border-ink"}`}>
                      {a}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience:</span>
                {([
                  { v: "0-5" as const, label: "0–5 years" },
                  { v: "5-10" as const, label: "5–10 years" },
                  { v: "10+" as const, label: "10+ years" },
                ]).map((o) => {
                  const active = search.experience === o.v;
                  return (
                    <button key={o.v} type="button" onClick={() => update({ experience: active ? undefined : o.v })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-ink bg-ink text-cream" : "border-border bg-background text-ink hover:border-ink"}`}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-cream/60">{BOOLEAN_SEARCH_HINT}</p>
        </div>
      </section>
      <div ref={sentinelRef} aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-heading text-2xl text-ink">
              {isLoading ? "Searching…" : `${total} arbitrator${total === 1 ? "" : "s"} found`}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <SortBar
                options={[
                  { key: "surname", label: "Surname" },
                  { key: "experience", label: "Years Experience" },
                  { key: "listed", label: "Date Listed" },
                ]}
                sort={search.sort ?? "surname"}
                dir={search.dir ?? "asc"}
                onChange={(sort, dir) => navigate({ search: (prev: Search) => ({ ...prev, sort, dir, page: 1 }) })}
              />
              <ViewToggle
                value={view}
                onChange={(v) => navigate({ search: (prev: Search) => ({ ...prev, view: v, page: 1 }) })}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}</div>
          ) : results?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No arbitrators match your search.
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Accreditation</TableHead>
                    <TableHead className="text-right">Years</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.rows.map((l: any) => (
                    <TableRow key={l.id} className={l.is_featured ? "bg-amber-50/40" : undefined}>
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to="/lawyers/$slug" params={{ slug: l.slug }} className="text-ink hover:text-gold">
                            {l.full_name}{l.is_senior_counsel ? " SC" : ""}
                          </Link>
                          {l.is_featured && <FeaturedBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.arbitrator_accreditation ?? "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{l.arbitrator_experience_years ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.city ?? "—"}
                        {l.province ? <span className="text-muted-foreground/70">, {l.province}</span> : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to="/lawyers/$slug" params={{ slug: l.slug }} className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/90">
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {results?.rows.map((l: any) => (
                <article key={l.id} className={`flex gap-4 overflow-hidden rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:h-28 sm:gap-0 sm:p-0 ${l.is_featured ? "ring-2 ring-amber-400/70" : ""}`}>
                  {l.avatar_url ? (
                    <img src={l.avatar_url} alt={l.full_name} className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:object-top" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-forest/10 font-heading text-xl text-forest sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:text-2xl">
                      {l.first_name?.[0]}{l.last_name?.[0]}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <Link to="/lawyers/$slug" params={{ slug: l.slug }} className="font-heading text-lg font-semibold text-ink hover:text-gold">
                          {l.full_name}{l.is_senior_counsel ? " SC" : ""}
                        </Link>
                        {l.arbitrator_accreditation && (
                          <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-xs font-medium text-forest">{l.arbitrator_accreditation}</span>
                        )}
                        {typeof l.arbitrator_experience_years === "number" && (
                          <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink">{l.arbitrator_experience_years} yrs</span>
                        )}
                        {l.is_featured && <FeaturedBadge />}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {l.firm_name} · <MapPin className="inline h-3 w-3" /> {[l.city, l.province].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-row items-center gap-2 sm:w-32 sm:flex-col sm:items-end">
                      <Link to="/lawyers/$slug" params={{ slug: l.slug }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90">
                        View Profile
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => navigate({ search: (prev: Search) => ({ ...prev, page: page - 1 }) })} className="rounded border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => navigate({ search: (prev: Search) => ({ ...prev, page: page + 1 }) })} className="rounded border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
