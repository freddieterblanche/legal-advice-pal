import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Briefcase, Scale } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { DESIGNATIONS } from "../lib/constants";
import { designationKind, designationBadgeClass } from "../lib/designation";
import { Combobox } from "../components/Combobox";

type Search = { q?: string; area?: string; province?: string; town?: string; designation?: string; type?: "attorney" | "advocate"; page?: number };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    area: typeof s.area === "string" ? s.area : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    town: typeof s.town === "string" ? s.town : undefined,
    designation: typeof s.designation === "string" ? s.designation : undefined,
    type: s.type === "attorney" || s.type === "advocate" ? s.type : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Find a Lawyer — Lawexpert.co.za" },
      { name: "description", content: "Search South African lawyers by name, practice area, and province." },
    ],
  }),
  component: SearchPage,
});

const PAGE_SIZE = 20;

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);

  const { data: areas } = useQuery({
    queryKey: ["practice-areas"],
    queryFn: async () => (await supabase.from("practice_areas").select("*").order("name")).data ?? [],
  });

  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => (await supabase.from("provinces").select("id, name, slug").order("name")).data ?? [],
  });

  const selectedProvince = provinces?.find((p) => p.slug === search.province);

  const { data: towns } = useQuery({
    queryKey: ["towns", selectedProvince?.id],
    enabled: !!selectedProvince,
    queryFn: async () => (
      await supabase
        .from("towns")
        .select("id, name, slug")
        .eq("province_id", selectedProvince!.id)
        .order("is_major_city", { ascending: false })
        .order("name")
    ).data ?? [],
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", search],
    queryFn: async () => {
      let query = supabase.from("lawyer_search_view").select("*", { count: "exact" });
      if (search.q) query = query.ilike("full_name", `%${search.q}%`);
      if (search.town) {
        query = query.eq("town_slug", search.town);
      } else if (search.province) {
        // Match by linked province OR fall back to legacy text province for rows without town_id
        const provName = provinces?.find((p) => p.slug === search.province)?.name;
        if (provName) {
          query = query.or(`province_slug.eq.${search.province},and(town_id.is.null,province.eq.${provName})`);
        } else {
          query = query.eq("province_slug", search.province);
        }
      }
      if (search.area) query = query.contains("practice_area_slugs", [search.area]);
      const page = search.page ?? 1;
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order("case_count", { ascending: false });
      const { data, count, error } = await query;
      if (error) throw error;
      let filtered = data ?? [];
      if (search.designation) filtered = filtered.filter((r) => r.designation === search.designation);
      if (search.type) filtered = filtered.filter((r) => designationKind(r.designation) === search.type);
      return { rows: filtered, total: search.type ? filtered.length : (count ?? 0) };
    },
  });

  const update = (patch: Partial<Search>) => {
    navigate({ search: (prev: Search) => ({ ...prev, ...patch, page: 1 }) });
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
  };

  const total = results?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = search.page ?? 1;

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or firm…"
              maxLength={120}
              className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="submit" className="rounded-lg bg-ink px-6 py-2 text-sm font-semibold text-white hover:bg-ink/90">Search</button>
          </form>
          {/* Type tabs */}
          <div className="mt-4 inline-flex rounded-full border border-border bg-background p-1">
            {([
              { key: undefined, label: "Both" },
              { key: "attorney" as const, label: "Attorneys" },
              { key: "advocate" as const, label: "Advocates" },
            ]).map((t) => {
              const active = search.type === t.key;
              return (
                <button
                  key={t.label}
                  onClick={() => update({ type: t.key })}
                  className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${
                    active
                      ? t.key === "advocate"
                        ? "bg-forest text-white"
                        : t.key === "attorney"
                        ? "bg-gold text-white"
                        : "bg-ink text-white"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Practice Area</h3>
            <div className="mt-3">
              <Combobox
                value={search.area ?? ""}
                onChange={(v) => update({ area: v || undefined })}
                options={(areas ?? []).map((a) => ({ value: a.slug, label: a.name }))}
                placeholder="Type a practice area…"
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Province</h3>
            <div className="mt-3">
              <Combobox
                value={search.province ?? ""}
                onChange={(v) => update({ province: v || undefined })}
                options={PROVINCES.map((p) => ({ value: p, label: p }))}
                placeholder="Type a province…"
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Designation</h3>
            <div className="mt-3">
              <Combobox
                value={search.designation ?? ""}
                onChange={(v) => update({ designation: v || undefined })}
                options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
                placeholder="Type a designation…"
              />
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h1 className="font-heading text-2xl text-ink">
              {isLoading ? "Searching…" : `${total} lawyer${total === 1 ? "" : "s"} found`}
            </h1>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : results?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No lawyers match your search. Try fewer filters.
            </div>
          ) : (
            <div className="space-y-3">
              {results?.rows.map((l) => {
                const caseCount = l.case_count ?? 0;
                const first = l.first_name ?? "";
                const last = l.last_name ?? "";
                const kind = designationKind(l.designation);
                const KindIcon = kind === "advocate" ? Scale : Briefcase;
                const accentRing = kind === "advocate" ? "ring-forest/30" : "ring-gold/30";
                const accentBg = kind === "advocate" ? "bg-forest/10 text-forest" : "bg-gold/10 text-gold";
                return (
                <article key={l.id} className={`flex flex-col gap-4 rounded-xl border border-border bg-card p-5 ring-1 ring-inset ${accentRing} transition-shadow hover:shadow-md sm:flex-row`}>
                  {l.avatar_url ? (
                    <img
                      src={l.avatar_url}
                      alt={l.full_name ?? `${first} ${last}`}
                      loading="lazy"
                      className={`h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-inset ${accentRing}`}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-xl ${accentBg} font-heading text-2xl`}
                    style={l.avatar_url ? { display: "none" } : undefined}
                  >
                    {first[0]}{last[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <Link to="/lawyers/$slug" params={{ slug: l.slug ?? "" }} className="font-heading text-lg font-semibold text-ink hover:text-gold">
                        {l.full_name}
                      </Link>
                      {l.designation && (
                        <span className={designationBadgeClass(l.designation)}>
                          <KindIcon className="h-3 w-3" strokeWidth={2} />
                          {l.designation}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.firm_name} · {l.city}, {l.province}
                    </p>
                    {l.practice_areas && l.practice_areas[0] && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {l.practice_areas.filter(Boolean).slice(0, 4).map((pa: string) => (
                          <span key={pa} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{pa}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:w-32">
                    {caseCount > 0 && (
                      <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                        {caseCount} case{caseCount === 1 ? "" : "s"}
                      </span>
                    )}
                    <Link to="/lawyers/$slug" params={{ slug: l.slug ?? "" }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90">
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
