import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, MapPin, Users } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { Combobox } from "../components/Combobox";
import { SortBar, type SortDir } from "../components/SortBar";

type SortField = "name" | "lawyers" | "listed";
type Search = { q?: string; province?: string; town?: string; page?: number; sort?: SortField; dir?: SortDir };

export const Route = createFileRoute("/firms/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    town: typeof s.town === "string" ? s.town : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "name" || s.sort === "lawyers" || s.sort === "listed" ? s.sort : "name",
    dir: s.dir === "desc" ? "desc" : "asc",
  }),
  head: () => ({
    meta: [
      { title: "Browse Law Firms — Lawexpert.co.za" },
      { name: "description", content: "Browse and search verified South African law firms by name, city, and province." },
      { property: "og:title", content: "Browse Law Firms — Lawexpert.co.za" },
      { property: "og:description", content: "Search verified South African law firms by name, city, and province." },
    ],
  }),
  component: FirmsIndex,
});

const PAGE_SIZE = 25;

function FirmsIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/firms" });
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);

  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => (await supabase.from("provinces").select("id, name, slug").order("name")).data ?? [],
  });

  const { data: towns } = useQuery({
    queryKey: ["towns"],
    queryFn: async () => (await supabase.from("towns").select("id, name, slug, province_id").order("name")).data ?? [],
  });

  const townOptions = (() => {
    if (!towns) return [];
    if (search.province) {
      const prov = provinces?.find((p) => p.slug === search.province);
      if (prov) return towns.filter((t) => t.province_id === prov.id);
    }
    return towns;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ["firms-index", search],
    queryFn: async () => {
      let query = supabase
        .from("firms")
        .select("id, name, slug, city, province, website, phone, email, description, logo_url, created_at", { count: "exact" })
        .eq("status", "active");
      if (search.q) query = query.or(`name.ilike.%${search.q}%,city.ilike.%${search.q}%`);
      if (search.province) {
        const provName = provinces?.find((p) => p.slug === search.province)?.name;
        if (provName) query = query.eq("province", provName);
      }
      if (search.town) {
        const townName = towns?.find((t) => t.slug === search.town)?.name;
        if (townName) query = query.ilike("city", townName);
      }
      const page = search.page ?? 1;
      const from = (page - 1) * PAGE_SIZE;
      const sort = search.sort ?? "name";
      const ascending = (search.dir ?? "asc") === "asc";
      query = query.range(from, from + PAGE_SIZE - 1);
      if (sort === "listed") {
        query = query.order("created_at", { ascending, nullsFirst: false });
      } else {
        // "name" — and fall-through for "lawyers" which is re-sorted client-side below
        query = query.order("name", { ascending });
      }
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    enabled: !!provinces || !search.province,
  });

  const { data: counts } = useQuery({
    queryKey: ["firm-lawyer-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("service_providers").select("firm_id").in("status", ["trial", "active"]);
      const map: Record<string, number> = {};
      data?.forEach((r) => { if (r.firm_id) map[r.firm_id] = (map[r.firm_id] ?? 0) + 1; });
      return map;
    },
  });

  const update = (patch: Partial<Search>) => {
    const next: Search = { ...search, ...patch, page: 1 };
    if (patch.province !== undefined && patch.province !== search.province) {
      next.town = undefined;
    }
    navigate({ search: next });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = search.page ?? 1;
  const sortedRows = (() => {
    const rows = data?.rows ?? [];
    if ((search.sort ?? "name") !== "lawyers") return rows;
    const ascending = (search.dir ?? "asc") === "asc";
    return [...rows].sort((a, b) => {
      const ac = counts?.[a.id] ?? 0;
      const bc = counts?.[b.id] ?? 0;
      return ascending ? ac - bc : bc - ac;
    });
  })();

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search firms by name or city…"
              maxLength={120}
              className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="submit" className="rounded-lg bg-ink px-6 py-2 text-sm font-semibold text-white hover:bg-ink/90">Search</button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Province</h3>
            <div className="mt-3">
              <Combobox
                value={search.province ?? ""}
                onChange={(v) => update({ province: v || undefined })}
                options={(provinces ?? []).map((p) => ({ value: p.slug, label: p.name }))}
                placeholder="Type a province…"
              />
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Town</h3>
            <div className="mt-3">
              <Combobox
                value={search.town ?? ""}
                onChange={(v) => update({ town: v || undefined })}
                options={townOptions.map((t) => ({ value: t.slug, label: t.name }))}
                placeholder={search.province ? "Type a town…" : "Select a province first…"}
              />
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-heading text-2xl text-ink">
              {isLoading ? "Loading…" : `${total} firm${total === 1 ? "" : "s"} found`}
            </h1>
            <SortBar
              options={[
                { key: "name", label: "Name" },
                { key: "lawyers", label: "Lawyers" },
                { key: "listed", label: "Date Listed" },
              ]}
              sort={search.sort ?? "name"}
              dir={search.dir ?? "asc"}
              onChange={(sort, dir) => navigate({ search: (prev: Search) => ({ ...prev, sort, dir, page: 1 }) })}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : data?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No firms match your search.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedRows.map((f) => {
                const lawyerCount = counts?.[f.id] ?? 0;
                return (
                  <Link
                    key={f.id}
                    to="/firms/$slug"
                    params={{ slug: f.slug }}
                    className="group flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold">
                      <Building2 className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <h3 className="truncate font-heading text-base font-semibold text-ink group-hover:text-gold">
                          {f.name}
                        </h3>
                        {(f.city || f.province) && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" strokeWidth={1.5} />
                            {[f.city, f.province].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink sm:inline-flex">
                      <Users className="h-3 w-3" strokeWidth={1.5} />
                      {lawyerCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => navigate({ search: (prev: Search) => ({ ...prev, page: page - 1 }) })}
                className="rounded border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => navigate({ search: (prev: Search) => ({ ...prev, page: page + 1 }) })}
                className="rounded border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
