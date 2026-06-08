import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Briefcase, Scale } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { DESIGNATIONS } from "../lib/constants";
import { designationKind, designationBadgeClass, yearsInPractice } from "../lib/designation";
import { Combobox } from "../components/Combobox";
import { SortBar, type SortDir } from "../components/SortBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

type LawyerType = "attorney" | "advocate";
type SortField = "surname" | "experience" | "listed";
type ViewMode = "cards" | "list";
type Search = {
  q?: string;
  area?: string;
  province?: string;
  town?: string;
  designation?: string;
  type: LawyerType;
  page?: number;
  sort?: SortField;
  dir?: SortDir;
  view?: ViewMode;
};

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    area: typeof s.area === "string" ? s.area : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    town: typeof s.town === "string" ? s.town : undefined,
    designation: typeof s.designation === "string" ? s.designation : undefined,
    type: s.type === "advocate" ? "advocate" : "attorney",
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "surname" || s.sort === "experience" || s.sort === "listed"
      ? s.sort
      : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
    view: s.view === "list" ? "list" : "cards",
  }),
  head: () => ({
    meta: [
      { title: "Find Attorneys & Advocates — Lawexpert.co.za" },
      { name: "description", content: "Search South African attorneys and advocates by name, practice area, and province." },
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
      query = query.eq("exclude_from_lawyer_listing", false);
      if (search.q) query = query.ilike("full_name", `%${search.q}%`);
      if (search.town) {
        query = query.eq("town_slug", search.town);
      } else if (search.province) {
        // Match by linked province OR fall back to legacy text province for rows without town_id
        const provName = provinces?.find((p) => p.slug === search.province)?.name;
        if (provName) {
          query = query.or(`province_slug.eq.${search.province},and(town_id.is.null,province.eq."${provName}")`);
        } else {
          query = query.eq("province_slug", search.province);
        }
      }
      if (search.area) query = query.contains("practice_area_slugs", [search.area]);
      if (search.designation) query = query.eq("designation", search.designation);
      // Push type filter to SQL so pagination works correctly.
      // Prefer structured provider_type; fall back to designation parsing for legacy rows.
      if (search.type === "advocate") {
        query = query.or(
          `provider_type.eq.advocate,and(provider_type.is.null,or(designation.ilike.%advocate%,designation.ilike.%senior counsel%,designation.ilike.%junior counsel%,designation.eq.SC))`,
        );
      } else {
        // Attorneys: explicit attorney type, OR null provider_type with a non-advocate designation.
        query = query
          .or(`provider_type.eq.attorney,provider_type.is.null`)
          .not("designation", "ilike", "%advocate%")
          .not("designation", "ilike", "%senior counsel%")
          .not("designation", "ilike", "%junior counsel%");
      }
      const sort = search.sort ?? "surname";
      const ascending = (search.dir ?? "asc") === "asc";
      if (sort === "surname") {
        query = query.order("last_name", { ascending }).order("first_name", { ascending });
      } else if (sort === "experience") {
        query = query.order("year_of_admission", { ascending: !ascending, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending, nullsFirst: false });
      }
      const page = search.page ?? 1;
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      let rows = data ?? [];
      // Final client-side guard: exclude pure mediators/arbitrators (no firm,
      // no designation, no provider_type) from the Attorneys tab — they
      // belong on /mediators and /arbitrators.
      if (search.type === "attorney") {
        rows = rows.filter(
          (r) => !((r.is_mediator || r.is_arbitrator) && !r.firm_name && !r.designation && !r.provider_type),
        );
      }
      return { rows, total: count ?? rows.length };
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
                onChange={(v) => update({ province: v || undefined, town: undefined })}
                options={(provinces ?? []).map((p) => ({ value: p.slug, label: p.name }))}
                placeholder="Type a province…"
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Town / City</h3>
            <div className="mt-3">
              {search.province ? (
                <Combobox
                  value={search.town ?? ""}
                  onChange={(v) => update({ town: v || undefined })}
                  options={(towns ?? []).map((t) => ({ value: t.slug, label: t.name }))}
                  placeholder={towns ? "Type a town…" : "Loading towns…"}
                />
              ) : (
                <p className="text-xs italic text-muted-foreground">Pick a province first</p>
              )}
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
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-heading text-2xl text-ink">
              {isLoading
                ? "Searching…"
                : `${total} ${search.type === "advocate" ? "advocate" : "attorney"}${total === 1 ? "" : "s"} found`}
            </h1>
            <SortBar
              options={[
                { key: "surname", label: "Surname" },
                { key: "experience", label: "Years Experience" },
                { key: "listed", label: "Date Listed" },
              ]}
              sort={search.sort ?? "surname"}
              dir={search.dir ?? "asc"}
              onChange={(sort, dir) =>
                navigate({ search: (prev: Search) => ({ ...prev, sort, dir, page: 1 }) })
              }
            />
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
                const kind: "advocate" | "attorney" =
                  l.provider_type === "advocate" || l.provider_type === "attorney"
                    ? l.provider_type
                    : designationKind(l.designation);
                const KindIcon = kind === "advocate" ? Scale : Briefcase;
                const accentBg = kind === "advocate" ? "bg-forest/10 text-forest" : "bg-gold/10 text-gold";
                const badgeLabel = l.designation
                  ?? (kind === "advocate" ? (l.is_senior_counsel ? "Senior Counsel" : "Advocate") : "Attorney");
                const yrs = yearsInPractice(l.year_of_admission ?? null);
                return (
                <article key={l.id} className="flex gap-4 overflow-hidden rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:h-28 sm:gap-0 sm:p-0">
                  {l.avatar_url ? (
                    <img
                      src={l.avatar_url}
                      alt={l.full_name ?? `${first} ${last}`}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:object-top"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${accentBg} font-heading text-xl sm:h-auto sm:w-28 sm:self-stretch sm:rounded-none sm:text-2xl`}
                    style={l.avatar_url ? { display: "none" } : undefined}
                  >
                    {first[0]}{last[0]}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">

                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <Link to="/lawyers/$slug" params={{ slug: l.slug ?? "" }} className="font-heading text-lg font-semibold text-ink hover:text-gold">
                          {l.full_name}{l.is_senior_counsel ? " SC" : ""}
                        </Link>
                        <span className={designationBadgeClass(kind === "advocate" ? "advocate" : (l.designation ?? "attorney"))}>
                          <KindIcon className="h-3 w-3" strokeWidth={2} />
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          l.firm_name ?? l.chambers_name,
                          kind === "attorney" ? (yrs !== null ? `${yrs} years in practice` : null) : null,
                          [l.city, l.province].filter(Boolean).join(", ")
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-row items-center gap-2 sm:w-32 sm:flex-col sm:items-end">
                      {caseCount > 0 && (
                        <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                          {caseCount} case{caseCount === 1 ? "" : "s"}
                        </span>
                      )}
                      <Link to="/lawyers/$slug" params={{ slug: l.slug ?? "" }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90">
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
