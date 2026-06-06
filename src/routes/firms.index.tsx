import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, MapPin, Globe, Phone, Users } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";

type Search = { q?: string; province?: string; page?: number };

export const Route = createFileRoute("/firms/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
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

const PAGE_SIZE = 24;

function FirmsIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/firms" });
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);

  const { data, isLoading } = useQuery({
    queryKey: ["firms-index", search],
    queryFn: async () => {
      let query = supabase
        .from("firms")
        .select("id, name, slug, city, province, website, phone, description, logo_url", { count: "exact" })
        .eq("status", "active");
      if (search.q) query = query.or(`name.ilike.%${search.q}%,city.ilike.%${search.q}%`);
      if (search.province) query = query.eq("province", search.province);
      const page = search.page ?? 1;
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order("name");
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["firm-lawyer-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("lawyers").select("firm_id").in("status", ["trial", "active"]);
      const map: Record<string, number> = {};
      data?.forEach((r) => { if (r.firm_id) map[r.firm_id] = (map[r.firm_id] ?? 0) + 1; });
      return map;
    },
  });

  const update = (patch: Partial<Search>) => {
    navigate({ search: (prev: Search) => ({ ...prev, ...patch, page: 1 }) });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = search.page ?? 1;

  return (
    <div className="bg-cream">
      <section className="bg-ink py-12 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="font-heading text-3xl md:text-4xl">Law Firms</h1>
          <p className="mt-2 text-sm text-cream/70">Browse verified South African law firms.</p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search firms by name or city…"
              maxLength={120}
              className="flex-1 min-w-[200px] rounded-lg border border-cream/20 bg-cream/5 px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <select
              value={search.province ?? ""}
              onChange={(e) => update({ province: e.target.value || undefined })}
              className="rounded-lg border border-cream/20 bg-cream/5 px-3 py-2 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="" className="text-ink">All provinces</option>
              {PROVINCES.map((p) => <option key={p} value={p} className="text-ink">{p}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-ink hover:bg-gold/90">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-heading text-xl text-ink">
            {isLoading ? "Loading…" : `${total} firm${total === 1 ? "" : "s"}`}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : data?.rows.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
            No firms match your search.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.rows.map((f) => {
              const lawyerCount = counts?.[f.id] ?? 0;
              return (
                <Link
                  key={f.id}
                  to="/firms/$slug"
                  params={{ slug: f.slug }}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                      <Building2 className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-lg font-semibold text-ink group-hover:text-gold">
                        {f.name}
                      </h3>
                      {(f.city || f.province) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" strokeWidth={1.5} />
                          {[f.city, f.province].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  {f.description && (
                    <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{f.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {lawyerCount} lawyer{lawyerCount === 1 ? "" : "s"}
                    </span>
                    {f.website && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" strokeWidth={1.5} /> Website</span>}
                    {f.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> Phone</span>}
                  </div>
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
  );
}
