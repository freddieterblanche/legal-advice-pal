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
import { FeaturedBadge } from "../components/FeaturedBadge";
import { StickySearchBar } from "../components/StickySearchBar";
import { useStickyTrigger } from "../hooks/use-sticky-trigger";
import attorneysHero from "../assets/attorneys-hero.jpg.asset.json";
import advocateHero from "../assets/advocate-hero.jpg.asset.json";

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


const CARDS_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 100;

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
    queryKey: ["search", search, (areas ?? []).length],
    enabled: !search.q || !!areas,
    queryFn: async () => {
      let query = supabase.from("lawyer_search_view").select("*", { count: "exact" });
      query = query.eq("exclude_from_lawyer_listing", false);
      if (search.q) {
        // Boolean search with AND (default), OR, and NOT operators.
        // Example: "insolvency cape town OR tax NOT labor"
        //   → (insolvency AND cape AND town) OR (tax AND NOT labor)
        // Also supports leading "-" as shorthand for NOT (e.g. "-labor").
        const FIELDS = [
          "full_name",
          "firm_name",
          "chambers_name",
          "city",
          "province",
          "town_name",
          "province_name",
        ];
        const buildTerm = (raw: string, negate: boolean): string | null => {
          const t = raw.replace(/[(),"*]/g, " ").trim();
          if (!t) return null;
          const like = `*${t}*`;
          const lower = t.toLowerCase();
          const slugs = (areas ?? [])
            .filter((a) => a.name.toLowerCase().includes(lower) || a.slug.toLowerCase().includes(lower))
            .map((a) => a.slug);
          if (negate) {
            const negs = FIELDS.map((f) => `${f}.not.ilike.${like}`);
            for (const s of slugs) negs.push(`practice_area_slugs.not.cs.{${s}}`);
            return `and(${negs.join(",")})`;
          }
          const pos = FIELDS.map((f) => `${f}.ilike.${like}`);
          for (const s of slugs) pos.push(`practice_area_slugs.cs.{${s}}`);
          return `or(${pos.join(",")})`;
        };

        // Parse tokens into OR-separated clauses of AND-joined terms.
        const tokens = search.q.trim().split(/\s+/).filter(Boolean).slice(0, 16);
        const clauses: { negate: boolean; raw: string }[][] = [[]];
        let negateNext = false;
        for (const tok of tokens) {
          const u = tok.toUpperCase();
          if (u === "OR" || u === "||") {
            clauses.push([]);
            negateNext = false;
            continue;
          }
          if (u === "NOT" || u === "AND") {
            if (u === "NOT") negateNext = true;
            continue;
          }
          let term = tok;
          let neg = negateNext;
          if (term.startsWith("-") && term.length > 1) {
            neg = true;
            term = term.slice(1);
          }
          clauses[clauses.length - 1].push({ negate: neg, raw: term });
          negateNext = false;
        }

        const clauseExprs = clauses
          .map((terms) => {
            const built = terms.map((t) => buildTerm(t.raw, t.negate)).filter((x): x is string => !!x);
            if (!built.length) return null;
            return built.length === 1 ? built[0] : `and(${built.join(",")})`;
          })
          .filter((x): x is string => !!x);

        if (clauseExprs.length) {
          query = query.or(clauseExprs.join(","));
        }
      }
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
      // Always prioritise featured listings first, then apply the chosen sort.
      query = query.order("is_featured", { ascending: false });
      if (sort === "surname") {
        query = query.order("last_name", { ascending }).order("first_name", { ascending });
      } else if (sort === "experience") {
        query = query.order("year_of_admission", { ascending: !ascending, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending, nullsFirst: false });
      }
      const page = search.page ?? 1;
      const pageSize = (search.view ?? "cards") === "list" ? LIST_PAGE_SIZE : CARDS_PAGE_SIZE;
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);
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
  const pageSize = (search.view ?? "cards") === "list" ? LIST_PAGE_SIZE : CARDS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = search.page ?? 1;

  const { ref: sentinelRef, isStuck } = useStickyTrigger();

  const compactFilters = (
    <>
      <div className="w-44">
        <Combobox
          value={search.area ?? ""}
          onChange={(v) => update({ area: v || undefined })}
          options={(areas ?? []).map((a) => ({ value: a.slug, label: a.name }))}
          placeholder="Practice area"
        />
      </div>
      <div className="w-40">
        <Combobox
          value={search.province ?? ""}
          onChange={(v) => update({ province: v || undefined, town: undefined })}
          options={(provinces ?? []).map((p) => ({ value: p.slug, label: p.name }))}
          placeholder="Province"
        />
      </div>
      <div className="w-40">
        <Combobox
          value={search.town ?? ""}
          onChange={(v) => update({ town: v || undefined })}
          options={(towns ?? []).map((t) => ({ value: t.slug, label: t.name }))}
          placeholder={search.province ? "Town" : "Pick province"}
        />
      </div>
      <div className="w-40">
        <Combobox
          value={search.designation ?? ""}
          onChange={(v) => update({ designation: v || undefined })}
          options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
          placeholder="Designation"
        />
      </div>
    </>
  );

  return (
    <div className="bg-cream">
      <StickySearchBar
        visible={isStuck}
        q={q}
        setQ={setQ}
        onSubmit={onSearchSubmit}
        placeholder="Search by name, firm, practice area, city, town or province…"
        filters={compactFilters}
      />
      <section className="relative overflow-hidden bg-ink py-12 text-cream">
        {search.type === "attorney" && (
          <>
            <img
              src={attorneysHero.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink/90" />
          </>
        )}
        {search.type === "advocate" && (
          <>
            <img
              src={advocateHero.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 [filter:grayscale(100%)_contrast(1.05)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-forest/55 mix-blend-multiply" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/40 to-ink/80" />
          </>
        )}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          {/* Type tabs */}
          <div className="mb-6 inline-flex rounded-full border border-cream/20 bg-ink/40 p-1">
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
                        : "bg-gold text-white"
                      : "text-cream/70 hover:text-cream"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {search.type === "advocate" ? (
              <Scale className="h-7 w-7 text-gold" />
            ) : (
              <Briefcase className="h-7 w-7 text-gold" />
            )}
            <h1 className="font-heading text-3xl md:text-4xl">
              {search.type === "advocate" ? "Find an Advocate" : "Find an Attorney"}
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-cream/70">
            {search.type === "advocate"
              ? "Members of the Bar across South Africa — filter by chambers, province and seniority."
              : "Search South African attorneys by name, firm, practice area and province."}
          </p>
          <div className="mt-6 rounded-xl bg-card p-3 text-ink">
            <form onSubmit={onSearchSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, firm, practice area, city, town or province…"
                maxLength={120}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-white hover:bg-gold/90"
              >
                Search
              </button>
            </form>
            <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <Combobox
                value={search.area ?? ""}
                onChange={(v) => update({ area: v || undefined })}
                options={(areas ?? []).map((a) => ({ value: a.slug, label: a.name }))}
                placeholder="Practice area"
              />
              <Combobox
                value={search.province ?? ""}
                onChange={(v) => update({ province: v || undefined, town: undefined })}
                options={(provinces ?? []).map((p) => ({ value: p.slug, label: p.name }))}
                placeholder="Province"
              />
              <Combobox
                value={search.town ?? ""}
                onChange={(v) => update({ town: v || undefined })}
                options={(towns ?? []).map((t) => ({ value: t.slug, label: t.name }))}
                placeholder={search.province ? "Town / City" : "Pick a province first"}
              />
              <Combobox
                value={search.designation ?? ""}
                onChange={(v) => update({ designation: v || undefined })}
                options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
                placeholder="Designation"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-cream/60">
            Tip: combine terms with <span className="font-semibold text-cream/80">OR</span> and{" "}
            <span className="font-semibold text-cream/80">NOT</span> — e.g. <em>insolvency OR tax NOT labour</em>.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Results */}
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-heading text-2xl text-ink">
              {isLoading
                ? "Searching…"
                : `${total} ${search.type === "advocate" ? "advocate" : "attorney"}${total === 1 ? "" : "s"} found`}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="inline-flex rounded-full border border-border bg-background p-1">
                {([
                  { key: "cards" as const, label: "Cards" },
                  { key: "list" as const, label: "List" },
                ]).map((v) => {
                  const active = (search.view ?? "cards") === v.key;
                  return (
                    <button
                      key={v.key}
                      onClick={() => navigate({ search: (prev: Search) => ({ ...prev, view: v.key, page: 1 }) })}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>


          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : results?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No lawyers match your search. Try fewer filters.
            </div>
          ) : (search.view ?? "cards") === "list" ? (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Firm / Chambers</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.rows.map((l) => {
                    const kind: "advocate" | "attorney" =
                      l.provider_type === "advocate" || l.provider_type === "attorney"
                        ? l.provider_type
                        : designationKind(l.designation);
                    const badgeLabel = l.designation
                      ?? (kind === "advocate" ? (l.is_senior_counsel ? "Senior Counsel" : "Advocate") : "Attorney");
                    return (
                      <TableRow key={l.id} className={l.is_featured ? "bg-amber-50/40" : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to="/lawyers/$slug" params={{ slug: l.slug ?? "" }} className="text-ink hover:text-gold">
                              {l.full_name}{l.is_senior_counsel ? " SC" : ""}
                            </Link>
                            {l.is_featured && <FeaturedBadge />}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{badgeLabel}</TableCell>
                        <TableCell className="text-muted-foreground">{l.firm_name ?? l.chambers_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.city ?? "—"}
                          {l.province ? <span className="text-muted-foreground/70">, {l.province}</span> : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to="/lawyers/$slug"
                            params={{ slug: l.slug ?? "" }}
                            className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/90"
                          >
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
                <article key={l.id} className={`flex gap-4 overflow-hidden rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:h-28 sm:gap-0 sm:p-0 ${l.is_featured ? "ring-2 ring-amber-400/70" : ""}`}>
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
                        {l.is_featured && <FeaturedBadge />}
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
