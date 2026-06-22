import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Microscope, MapPin, BookOpen } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { applyBooleanSearch, BOOLEAN_SEARCH_HINT } from "../lib/boolean-search";
import { SortBar, type SortDir } from "../components/SortBar";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { StickySearchBar } from "../components/StickySearchBar";
import { useStickyTrigger } from "../hooks/use-sticky-trigger";
import { SimpleSelect } from "../components/SimpleSelect";

type SortField = "surname" | "cases" | "listed";
type Search = { q?: string; discipline?: string; province?: string; independent?: "yes" | "no"; page?: number; sort?: SortField; dir?: SortDir; view?: ViewMode };

export const Route = createFileRoute("/expert-witnesses/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    discipline: typeof s.discipline === "string" ? s.discipline : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    independent: s.independent === "yes" || s.independent === "no" ? s.independent : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "surname" || s.sort === "cases" || s.sort === "listed" ? s.sort : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
    view: s.view === "list" ? "list" : "cards",
  }),
  head: () => ({
    meta: [
      { title: "Find an Expert Witness — Lawexpert.co.za" },
      { name: "description", content: "Search South African expert witnesses across medicine, engineering, forensics, finance and more, with linked case appearances." },
      { property: "og:title", content: "Find an Expert Witness — Lawexpert.co.za" },
      { property: "og:description", content: "Specialists across 50+ disciplines, with verified registration bodies and linked cases." },
    ],
  }),
  component: ExpertWitnessSearch,
});

const CARDS_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 100;

function ExpertWitnessSearch() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/expert-witnesses" });
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);
  const view: ViewMode = search.view ?? "cards";
  const pageSize = view === "list" ? LIST_PAGE_SIZE : CARDS_PAGE_SIZE;

  const { data: disciplines } = useQuery({
    queryKey: ["expert-disciplines"],
    queryFn: async () => (await supabase.from("expert_disciplines").select("*").order("parent_category").order("name")).data ?? [],
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["expert-witness-search", search, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("service_providers")
        .select("*, provider_disciplines(expert_disciplines(name, slug, parent_category)), case_service_providers(id)", { count: "exact" })
        .eq("provider_type", "expert")
        .in("status", ["trial", "active"]);
      query = applyBooleanSearch(query, search.q, [
        "first_name",
        "last_name",
        "employer",
        "company_name",
        "city",
        "province",
        "job_title",
        "name_title",
        "registration_body",
      ]);
      if (search.province) query = query.eq("province", search.province);
      if (search.independent === "yes") query = query.eq("is_independent", true);
      if (search.independent === "no") query = query.eq("is_independent", false);
      const page = search.page ?? 1;
      const from = (page - 1) * pageSize;
      const sort = search.sort ?? "surname";
      const ascending = (search.dir ?? "asc") === "asc";
      query = query.range(from, from + pageSize - 1);
      if (sort === "surname") {
        query = query.order("last_name", { ascending }).order("first_name", { ascending });
      } else if (sort === "listed") {
        query = query.order("created_at", { ascending, nullsFirst: false });
      } else {
        query = query.order("last_name", { ascending: true });
      }
      const { data, count, error } = await query;
      if (error) throw error;
      let rows = data ?? [];
      if (search.discipline) {
        rows = rows.filter((r: any) =>
          r.provider_disciplines?.some((d: any) => d.expert_disciplines?.slug === search.discipline)
        );
      }
      if (sort === "cases") {
        rows = [...rows].sort((a: any, b: any) => {
          const ac = a.case_service_providers?.length ?? 0;
          const bc = b.case_service_providers?.length ?? 0;
          return ascending ? ac - bc : bc - ac;
        });
      }
      return { rows, total: search.discipline ? rows.length : (count ?? 0) };
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
      <SimpleSelect value={search.discipline ?? ""} onChange={(discipline) => update({ discipline: discipline || undefined })} options={(disciplines ?? []).map((d) => ({ value: d.slug, label: `${d.parent_category ?? "Other"} — ${d.name}` }))} placeholder="All disciplines" className="w-44 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
      <SimpleSelect value={search.province ?? ""} onChange={(province) => update({ province: province || undefined })} options={PROVINCES.map((p) => ({ value: p, label: p }))} placeholder="All provinces" className="w-40 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
      <SimpleSelect value={search.independent ?? ""} onChange={(independent) => update({ independent: (independent || undefined) as Search["independent"] })} options={[{ value: "yes", label: "Independent" }, { value: "no", label: "Employed" }]} placeholder="All experts" className="w-36 rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" />
    </>
  );

  return (
    <div className="bg-cream">
      <StickySearchBar
        visible={isStuck}
        q={q}
        setQ={setQ}
        onSubmit={onSubmit}
        placeholder="Search experts — supports AND / OR / NOT…"
        filters={compactFilters}
      />
      <section className="bg-ink py-12 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Microscope className="h-7 w-7 text-gold" />
            <h1 className="font-heading text-3xl md:text-4xl">Find an Expert Witness</h1>
          </div>
          <p className="mt-2 max-w-2xl text-cream/70">
            Specialists across medicine, engineering, forensics, finance and more — with linked case appearances.
          </p>
          <div className="mt-6 rounded-xl border border-white/15 bg-white/10 p-3 text-cream backdrop-blur-md shadow-lg [&_input]:text-ink [&_select]:text-ink [&_input]:placeholder:text-muted-foreground">
            <form
              onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
              className="grid gap-2 sm:grid-cols-[1fr_240px_180px_auto]"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search — supports AND / OR / NOT…"
                maxLength={240}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <SimpleSelect value={search.discipline ?? ""} onChange={(discipline) => update({ discipline: discipline || undefined })} options={(disciplines ?? []).map((d) => ({ value: d.slug, label: `${d.parent_category ?? "Other"} — ${d.name}` }))} placeholder="All disciplines" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink" />
              <SimpleSelect value={search.province ?? ""} onChange={(province) => update({ province: province || undefined })} options={PROVINCES.map((p) => ({ value: p, label: p }))} placeholder="All provinces" className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink" />
              <button type="submit" className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-white hover:bg-gold/90">
                Search
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice:</span>
              {[
                { v: undefined, label: "All" },
                { v: "yes" as const, label: "Independent" },
                { v: "no" as const, label: "Employed" },
              ].map((o) => {
                const active = search.independent === o.v;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => update({ independent: o.v })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active ? "border-ink bg-ink text-cream" : "border-border bg-background text-ink hover:border-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
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
              {isLoading ? "Searching…" : `${total} expert${total === 1 ? "" : "s"} found`}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <SortBar
                options={[
                  { key: "surname", label: "Surname" },
                  { key: "cases", label: "Cases" },
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
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : results?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No expert witnesses match your search. Try fewer filters.
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Discipline</TableHead>
                    <TableHead>Employer / Practice</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Cases</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.rows.map((e: any) => {
                    const disc: any[] = (e.provider_disciplines ?? []).map((x: any) => x.expert_disciplines).filter(Boolean);
                    const caseCount = e.case_service_providers?.length ?? 0;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          <Link to="/expert-witnesses/$slug" params={{ slug: e.slug }} className="text-ink hover:text-gold">
                            {[e.name_title, e.first_name, e.last_name].filter(Boolean).join(" ")}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{disc[0]?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.is_independent ? "Independent" : (e.employer ?? "—")}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.city ?? "—"}
                          {e.province ? <span className="text-muted-foreground/70">, {e.province}</span> : null}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{caseCount}</TableCell>
                        <TableCell className="text-right">
                          <Link to="/expert-witnesses/$slug" params={{ slug: e.slug }} className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/90">
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {results?.rows.map((e: any) => {
                const disc: any[] = (e.provider_disciplines ?? []).map((x: any) => x.expert_disciplines).filter(Boolean);
                const caseCount = e.case_service_providers?.length ?? 0;
                return (
                  <article key={e.id} className="flex gap-4 overflow-hidden rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:h-28 sm:gap-0 sm:p-0">
                    {e.avatar_url ? (
                      <img
                        src={e.avatar_url}
                        alt={`${e.first_name} ${e.last_name}`}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:object-top"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gold/10 font-heading text-xl text-gold sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:text-2xl">
                        {e.first_name?.[0]}{e.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-3">
                          <Link
                            to="/expert-witnesses/$slug"
                            params={{ slug: e.slug }}
                            className="font-heading text-lg font-semibold text-ink hover:text-gold"
                          >
                            {[e.name_title, e.first_name, e.last_name].filter(Boolean).join(" ")}
                          </Link>
                          {e.title && (
                            <span className="text-sm text-muted-foreground">
                              <span aria-hidden className="mr-2">•</span>{e.title}
                            </span>
                          )}
                          {disc[0] && (
                            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                              {disc[0].name}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.is_independent ? "Independent Practice" : e.employer}
                          {(e.city || e.province) && (
                            <> · <MapPin className="inline h-3 w-3" /> {[e.city, e.province].filter(Boolean).join(", ")}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-row items-center gap-2 sm:w-32 sm:flex-col sm:items-end">
                        {caseCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                            <BookOpen className="h-3 w-3" /> {caseCount} case{caseCount === 1 ? "" : "s"}
                          </span>
                        )}
                        <Link to="/expert-witnesses/$slug" params={{ slug: e.slug }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
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
