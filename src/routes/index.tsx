import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Scale, Building2, BookOpen, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lawexperts.co.za | South Africa's Legal Directory" },
      { name: "description", content: "Search verified South African lawyers by practice area, province, and reported cases. Find the right counsel — backed by their case record." },
      { property: "og:title", content: "Lawexperts.co.za | South Africa's Legal Directory" },
      { property: "og:description", content: "Verified profiles. Linked cases. South Africa's legal directory." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("");
  const [province, setProvince] = useState("");
  const navigate = useNavigate();

  const { data: practiceAreas } = useQuery({
    queryKey: ["practice-areas-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_areas").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [lawyersRes, firmsRes, casesRes] = await Promise.all([
        supabase.from("lawyers").select("*", { count: "exact", head: true }).in("status", ["trial", "active"]),
        supabase.from("firms").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("cases").select("*", { count: "exact", head: true }),
      ]);
      return {
        lawyers: lawyersRes.count ?? 0,
        firms: firmsRes.count ?? 0,
        cases: casesRes.count ?? 0,
        provinces: PROVINCES.length,
      };
    },
  });

  const { data: areaCounts } = useQuery({
    queryKey: ["area-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("lawyer_practice_areas").select("practice_area_id");
      const counts: Record<string, number> = {};
      data?.forEach((r) => { counts[r.practice_area_id] = (counts[r.practice_area_id] ?? 0) + 1; });
      return counts;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (area) params.set("area", area);
    if (province) params.set("province", province);
    navigate({ to: "/search", search: Object.fromEntries(params) as never });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(184,136,42,0.15),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block text-xs font-medium uppercase tracking-[0.25em] text-gold">
              South Africa
            </span>
            <h1 className="mt-4 font-heading text-4xl leading-tight md:text-6xl">
              Find the right <span className="text-gold italic">advocate</span> —
              <br className="hidden md:block" /> backed by the cases they've argued.
            </h1>
            <p className="mt-6 text-base text-cream/70 md:text-lg">
              Verified profiles. Linked reported cases. The legal directory South Africa deserved.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mx-auto mt-12 max-w-4xl rounded-lg bg-cream p-3 shadow-2xl shadow-black/40">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                type="text"
                placeholder="Name or firm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={120}
                className="rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">All practice areas</option>
                {practiceAreas?.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </select>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">All provinces</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-semibold text-cream hover:bg-ink/90">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </form>
        </div>

        {/* Stats */}
        <div className="border-t border-cream/10 bg-ink/60">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 sm:px-6 md:grid-cols-4">
            {[
              { icon: Scale, label: "Lawyers Listed", value: stats?.lawyers ?? "—" },
              { icon: Building2, label: "Firms", value: stats?.firms ?? "—" },
              { icon: BookOpen, label: "Reported Cases", value: stats?.cases ?? "—" },
              { icon: MapPin, label: "Provinces Covered", value: stats?.provinces ?? 9 },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <s.icon className="h-5 w-5 text-gold" />
                <span className="mt-2 font-heading text-3xl text-cream">{s.value}</span>
                <span className="mt-1 text-xs uppercase tracking-wider text-cream/60">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice areas grid */}
      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-forest">Browse by</span>
              <h2 className="mt-2 font-heading text-3xl text-ink md:text-4xl">Practice Areas</h2>
            </div>
            <Link to="/practice-areas" className="text-sm font-medium text-forest hover:text-ink">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {practiceAreas?.map((p) => (
              <Link
                key={p.id}
                to="/search"
                search={{ area: p.slug } as never}
                className="group flex flex-col rounded-md border border-border bg-card p-5 transition-all hover:border-gold hover:shadow-md"
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="mt-3 font-heading text-sm font-semibold text-card-foreground group-hover:text-gold">
                  {p.name}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {areaCounts?.[p.id] ?? 0} lawyer{(areaCounts?.[p.id] ?? 0) === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl">List your firm on Lawexperts.co.za</h2>
          <p className="mx-auto mt-4 max-w-2xl text-cream/70">
            R99 per lawyer per month. First 3 months free — no credit card required.
            Build trust with verified profiles and linked reported cases.
          </p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold text-ink transition-colors hover:bg-gold/90">
            Register Your Firm <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
