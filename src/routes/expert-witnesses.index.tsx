import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Microscope, MapPin, BookOpen } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { SortBar, type SortDir } from "../components/SortBar";

type SortField = "surname" | "cases" | "listed";
type Search = { q?: string; discipline?: string; province?: string; independent?: "yes" | "no"; page?: number; sort?: SortField; dir?: SortDir };

export const Route = createFileRoute("/expert-witnesses/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    discipline: typeof s.discipline === "string" ? s.discipline : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    independent: s.independent === "yes" || s.independent === "no" ? s.independent : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "surname" || s.sort === "cases" || s.sort === "listed" ? s.sort : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
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

const PAGE_SIZE = 20;

function ExpertWitnessSearch() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/expert-witnesses" });
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);

  const { data: disciplines } = useQuery({
    queryKey: ["expert-disciplines"],
    queryFn: async () => (await supabase.from("expert_disciplines").select("*").order("parent_category").order("name")).data ?? [],
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["expert-witness-search", search],
    queryFn: async () => {
      let query = supabase
        .from("expert_witnesses")
        .select("*, expert_witness_disciplines(expert_disciplines(name, slug, parent_category)), case_expert_witnesses(id)", { count: "exact" })
        .in("status", ["trial", "active"]);
      if (search.q) {
        query = query.or(`first_name.ilike.%${search.q}%,last_name.ilike.%${search.q}%,employer.ilike.%${search.q}%`);
      }
      if (search.province) query = query.eq("province", search.province);
      if (search.independent === "yes") query = query.eq("is_independent", true);
      if (search.independent === "no") query = query.eq("is_independent", false);
      const page = search.page ?? 1;
      const from = (page - 1) * PAGE_SIZE;
      const sort = search.sort ?? "surname";
      const ascending = (search.dir ?? "asc") === "asc";
      query = query.range(from, from + PAGE_SIZE - 1);
      if (sort === "surname") {
        query = query.order("last_name", { ascending }).order("first_name", { ascending });
      } else if (sort === "listed") {
        query = query.order("created_at", { ascending, nullsFirst: false });
      } else {
        // cases: defer to client-side sort below
        query = query.order("last_name", { ascending: true });
      }
      const { data, count, error } = await query;
      if (error) throw error;
      let rows = data ?? [];
      if (search.discipline) {
        rows = rows.filter((r: any) =>
          r.expert_witness_disciplines?.some((d: any) => d.expert_disciplines?.slug === search.discipline)
        );
      }
      if (sort === "cases") {
        rows = [...rows].sort((a: any, b: any) => {
          const ac = a.case_expert_witnesses?.length ?? 0;
          const bc = b.case_expert_witnesses?.length ?? 0;
          return ascending ? ac - bc : bc - ac;
        });
      }
      return { rows, total: search.discipline ? rows.length : (count ?? 0) };
    },
  });

  const update = (patch: Partial<Search>) => navigate({ search: (prev: Search) => ({ ...prev, ...patch, page: 1 }) });
  const page = search.page ?? 1;
  const total = results?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group disciplines by parent for the dropdown
  const groupedDisciplines = (disciplines ?? []).reduce((acc: Record<string, typeof disciplines>, d) => {
    const k = d.parent_category ?? "Other";
    (acc[k] ||= [] as never).push(d);
    return acc;
  }, {});

  return (
    <div className="bg-cream">
      <section className="bg-ink py-12 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Microscope className="h-7 w-7 text-gold" />
            <h1 className="font-heading text-3xl md:text-4xl">Find an Expert Witness</h1>
          </div>
          <p className="mt-2 max-w-2xl text-cream/70">
            Specialists across medicine, engineering, forensics, finance and more — with linked case appearances.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
            className="mt-6 grid gap-2 rounded-xl bg-card p-3 text-ink sm:grid-cols-[1fr_240px_180px_auto]"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or employer…"
              maxLength={120}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <select
              value={search.discipline ?? ""}
              onChange={(e) => update({ discipline: e.target.value || undefined })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All disciplines</option>
              {Object.entries(groupedDisciplines).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list?.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                </optgroup>
              ))}
            </select>
            <select
              value={search.province ?? ""}
              onChange={(e) => update({ province: e.target.value || undefined })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All provinces</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-white hover:bg-gold/90">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Practice Status</h3>
            <div className="mt-3 space-y-2 text-sm">
              {[
                { v: undefined, label: "All experts" },
                { v: "yes" as const, label: "Independent" },
                { v: "no" as const, label: "Employed" },
              ].map((o) => (
                <label key={o.label} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ind"
                    checked={search.independent === o.v}
                    onChange={() => update({ independent: o.v })}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Provinces</h3>
            <div className="mt-3 space-y-1 text-sm">
              {PROVINCES.map((p) => (
                <button
                  key={p}
                  onClick={() => update({ province: search.province === p ? undefined : p })}
                  className={`block w-full rounded px-2 py-1 text-left transition-colors ${
                    search.province === p ? "bg-gold/15 text-ink font-medium" : "hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-2xl text-ink">
              {isLoading ? "Searching…" : `${total} expert${total === 1 ? "" : "s"} found`}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : results?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No expert witnesses match your search. Try fewer filters.
            </div>
          ) : (
            <div className="space-y-3">
              {results?.rows.map((e: any) => {
                const disciplines: any[] = (e.expert_witness_disciplines ?? []).map((x: any) => x.expert_disciplines).filter(Boolean);
                const caseCount = e.case_expert_witnesses?.length ?? 0;
                return (
                  <article key={e.id} className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row">
                    {e.avatar_url ? (
                      <img
                        src={e.avatar_url}
                        alt={`${e.first_name} ${e.last_name}`}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gold/10 font-heading text-2xl text-gold">
                        {e.first_name?.[0]}{e.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <Link
                          to="/expert-witnesses/$slug"
                          params={{ slug: e.slug }}
                          className="font-heading text-lg font-semibold text-ink hover:text-gold"
                        >
                          {e.first_name} {e.last_name}
                        </Link>
                        {e.title && (
                          <span className="text-sm text-muted-foreground">
                            <span aria-hidden className="mr-2">•</span>{e.title}
                          </span>
                        )}
                        {disciplines[0] && (
                          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                            {disciplines[0].name}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {e.is_independent ? "Independent Practice" : e.employer}
                        {(e.city || e.province) && (
                          <> · <MapPin className="inline h-3 w-3" /> {[e.city, e.province].filter(Boolean).join(", ")}</>
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {e.registration_body && (
                          <span className="rounded bg-ink/5 px-2 py-0.5 text-xs text-ink">{e.registration_body}</span>
                        )}
                        {disciplines.slice(1, 4).map((d) => (
                          <span key={d.slug} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{d.name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 sm:w-32">
                      {caseCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                          <BookOpen className="h-3 w-3" /> {caseCount} case{caseCount === 1 ? "" : "s"}
                        </span>
                      )}
                      <Link to="/expert-witnesses/$slug" params={{ slug: e.slug }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90">
                        View Profile
                      </Link>
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
