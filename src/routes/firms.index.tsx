import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Users } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { Combobox } from "../components/Combobox";
import { SortBar, type SortDir } from "../components/SortBar";
import { FeaturedBadge } from "../components/FeaturedBadge";
import { FirmLogo } from "../components/FirmLogo";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import attorneysHero from "../assets/attorneys-hero.jpg.asset.json";

type SortField = "name" | "lawyers" | "listed";
type Search = { q?: string; province?: string; town?: string; page?: number; sort?: SortField; dir?: SortDir; view?: ViewMode };

export const Route = createFileRoute("/firms/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    province: typeof s.province === "string" ? s.province : undefined,
    town: typeof s.town === "string" ? s.town : undefined,
    page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : 1,
    sort: s.sort === "name" || s.sort === "lawyers" || s.sort === "listed" ? s.sort : "name",
    dir: s.dir === "desc" ? "desc" : "asc",
    view: s.view === "list" ? "list" : "cards",
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

const CARDS_PAGE_SIZE = 25;
const LIST_PAGE_SIZE = 100;

function FirmsIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/firms" });
  const [q, setQ] = useState(search.q ?? "");
  const view: ViewMode = search.view ?? "cards";
  const pageSize = view === "list" ? LIST_PAGE_SIZE : CARDS_PAGE_SIZE;

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
    queryKey: ["firms-index", search, pageSize],
    queryFn: async () => {
      let branchFirmIds: string[] | null = null;
      const provName = search.province ? provinces?.find((p) => p.slug === search.province)?.name : undefined;
      const townName = search.town ? towns?.find((t) => t.slug === search.town)?.name : undefined;
      type MatchedBranch = { firm_id: string; name: string | null; city: string | null; province: string | null; country: string | null };
      const matchedByFirm: Record<string, MatchedBranch[]> = {};
      const addMatch = (rows: any[] | null | undefined) => {
        (rows ?? []).forEach((r: any) => {
          if (!r.firm_id) return;
          (matchedByFirm[r.firm_id] ||= []).push(r as MatchedBranch);
        });
      };
      if (provName || townName) {
        let bq = supabase.from("firm_branches").select("firm_id, name, city, province, country");
        if (provName) bq = bq.eq("province", provName);
        if (townName) bq = bq.ilike("city", townName);
        const { data: branchRows } = await bq;
        branchFirmIds = Array.from(new Set((branchRows ?? []).map((r: any) => r.firm_id).filter(Boolean)));
        addMatch(branchRows);
      }

      let qBranchFirmIds: string[] | null = null;
      if (search.q) {
        const { data: qBranchRows } = await supabase
          .from("firm_branches")
          .select("firm_id, name, city, province, country")
          .or(`city.ilike.%${search.q}%,name.ilike.%${search.q}%,province.ilike.%${search.q}%,country.ilike.%${search.q}%`);
        qBranchFirmIds = Array.from(new Set((qBranchRows ?? []).map((r: any) => r.firm_id).filter(Boolean)));
        addMatch(qBranchRows);
      }

      let query = supabase
        .from("firms")
        .select("id, name, slug, city, province, website, phone, email, description, logo_url, logo_accent_color, created_at, is_featured", { count: "exact" })
        .eq("status", "active");
      if (search.q) {
        const qParts = [`name.ilike.%${search.q}%`, `city.ilike.%${search.q}%`, `province.ilike.%${search.q}%`];
        if (qBranchFirmIds && qBranchFirmIds.length > 0) {
          qParts.push(`id.in.(${qBranchFirmIds.join(",")})`);
        }
        query = query.or(qParts.join(","));
      }
      if (provName || townName) {
        const orParts: string[] = [];
        if (provName && !townName) orParts.push(`province.eq.${provName}`);
        if (townName) orParts.push(`city.ilike.${townName}`);
        if (branchFirmIds && branchFirmIds.length > 0) {
          orParts.push(`id.in.(${branchFirmIds.join(",")})`);
        }
        if (orParts.length > 0) {
          query = query.or(orParts.join(","));
        } else {
          query = query.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }
      const page = search.page ?? 1;
      const from = (page - 1) * pageSize;
      const sort = search.sort ?? "name";
      const ascending = (search.dir ?? "asc") === "asc";
      query = query.range(from, from + pageSize - 1);
      query = query.order("is_featured", { ascending: false });
      if (sort === "listed") {
        query = query.order("created_at", { ascending, nullsFirst: false });
      } else {
        query = query.order("name", { ascending });
      }
      const { data, count, error } = await query;
      if (error) throw error;

      const qLower = (search.q ?? "").trim().toLowerCase();
      const pickedByFirm: Record<string, MatchedBranch> = {};
      for (const [firmId, branches] of Object.entries(matchedByFirm)) {
        const preferred = qLower
          ? branches.find((b) =>
              [b.city, b.name, b.province, b.country].some((v) => v && v.toLowerCase().includes(qLower))
            )
          : undefined;
        pickedByFirm[firmId] = preferred ?? branches[0];
      }
      return { rows: data ?? [], total: count ?? 0, matchedBranch: pickedByFirm };
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
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
      <section className="relative overflow-hidden bg-ink py-12 text-cream">
        <img
          src={attorneysHero.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink/90" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="font-heading text-3xl md:text-4xl">Find a Law Firm</h1>
          <p className="mt-2 max-w-2xl text-cream/70">
            Search verified South African law firms by name, city and province.
          </p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-xl bg-card p-3 text-ink sm:grid-cols-[1fr_auto]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search firms by name or city…"
              maxLength={120}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="submit" className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-white hover:bg-gold/90">Search</button>
          </form>
        </div>
      </section>

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
            <div className="flex flex-wrap items-center gap-3">
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
              <ViewToggle
                value={view}
                onChange={(v) => navigate({ search: (prev: Search) => ({ ...prev, view: v, page: 1 }) })}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : data?.rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
              No firms match your search.
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead className="text-right">Lawyers</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((f) => {
                    const lawyerCount = counts?.[f.id] ?? 0;
                    return (
                      <TableRow key={f.id} className={f.is_featured ? "bg-amber-50/40" : undefined}>
                        <TableCell>
                          <FirmLogo src={f.logo_url} alt={`${f.name} logo`} size="sm" accentColor={f.logo_accent_color} />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to="/firms/$slug" params={{ slug: f.slug }} className="text-ink hover:text-gold">
                              {f.name}
                            </Link>
                            {f.is_featured && <FeaturedBadge />}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(data?.matchedBranch?.[f.id]?.city) ?? f.city ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(data?.matchedBranch?.[f.id]?.province) ?? f.province ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{lawyerCount}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            to="/firms/$slug"
                            params={{ slug: f.slug }}
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
              {sortedRows.map((f) => {
                const lawyerCount = counts?.[f.id] ?? 0;
                return (
                  <article
                    key={f.id}
                    className={`flex items-stretch gap-3 overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md sm:h-28 sm:gap-0 ${f.is_featured ? "ring-2 ring-amber-400/70" : ""}`}
                  >
                    <Link
                      to="/firms/$slug"
                      params={{ slug: f.slug }}
                      className="flex w-20 shrink-0 items-center justify-center self-stretch sm:w-auto"
                      aria-label={f.name}
                    >
                      <FirmLogo
                        src={f.logo_url}
                        alt={`${f.name} logo`}
                        size="card"
                        accentColor={f.logo_accent_color}
                        className="!h-full !w-20 sm:!w-auto"
                      />
                    </Link>
                    <div className="flex flex-1 min-w-0 flex-col gap-2 py-3 pr-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <Link
                            to="/firms/$slug"
                            params={{ slug: f.slug }}
                            className="font-heading text-base font-semibold text-ink hover:text-gold sm:text-lg sm:truncate"
                          >
                            {f.name}
                          </Link>
                          {f.is_featured && <FeaturedBadge />}
                        </div>
                        {(f.city || f.province) && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                            <MapPin className="h-3 w-3" strokeWidth={1.5} />
                            {[f.city, f.province].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-row items-center gap-2 sm:w-32 sm:flex-col sm:items-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-medium text-ink">
                          <Users className="h-3 w-3" strokeWidth={1.5} />
                          {lawyerCount}
                        </span>
                        <Link
                          to="/firms/$slug"
                          params={{ slug: f.slug }}
                          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90"
                        >
                          View
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
