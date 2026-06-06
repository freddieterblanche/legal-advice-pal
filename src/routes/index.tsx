import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  Scale,
  Briefcase,
  Building2,
  BookOpen,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { getPracticeAreaIcon } from "../lib/practice-area-icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lawexperts.co.za | South Africa's Legal Directory" },
      { name: "description", content: "Search verified South African attorneys and advocates by practice area, province, and reported cases. Find the right counsel — backed by their case record." },
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
  const [type, setType] = useState<"all" | "attorney" | "advocate">("all");
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
    if (type !== "all") params.set("type", type);
    navigate({ to: "/search", search: Object.fromEntries(params) as never });
  };

  return (
    <>
      {/* Hero — light + trustworthy */}
      <section className="relative overflow-hidden bg-cream">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-ink/[0.04] to-transparent" />
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              Verified South African legal directory
            </span>
            <h1 className="mt-6 font-heading text-4xl leading-[1.05] text-ink md:text-6xl">
              Find the right <span className="text-gold">attorney</span> or{" "}
              <span className="text-forest">advocate</span> — backed by the cases they've argued.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Search verified profiles linked to reported judgments. Built for clients, in-house counsel
              and referring attorneys across all nine provinces.
            </p>
          </div>

          {/* Type selector */}
          <div className="mx-auto mt-10 flex max-w-md justify-center">
            <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
              {([
                { key: "all", label: "Both" },
                { key: "attorney", label: "Attorneys" },
                { key: "advocate", label: "Advocates" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    type === t.key
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
              ))}
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mx-auto mt-6 max-w-4xl rounded-2xl border border-border bg-card p-3 shadow-xl shadow-ink/5">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                type="text"
                placeholder="Name or firm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={120}
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">All practice areas</option>
                {practiceAreas?.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </select>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">All provinces</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-ink/90">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Scale, label: "Lawyers Listed", value: stats?.lawyers ?? "—" },
              { icon: Building2, label: "Firms", value: stats?.firms ?? "—" },
              { icon: BookOpen, label: "Reported Cases", value: stats?.cases ?? "—" },
              { icon: MapPin, label: "Provinces Covered", value: stats?.provinces ?? 9 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
                <s.icon className="mx-auto h-5 w-5 text-gold" strokeWidth={1.75} />
                <div className="mt-2 font-heading text-3xl text-ink">{s.value}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Attorney vs Advocate explainer */}
      <section className="border-y border-border bg-card py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">South African Legal Profession</span>
            <h2 className="mt-2 font-heading text-3xl text-ink md:text-4xl">Attorney or Advocate?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              South Africa has a split legal profession. Knowing the difference helps you brief the right counsel.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {/* Attorney card */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-background p-7 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/25">
                <Briefcase className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-heading text-2xl text-ink">Attorneys</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your first point of contact. Attorneys advise clients directly, draft contracts, run litigation,
                and instruct advocates when courtroom specialists are needed.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                {["Direct client engagement", "Transactional & commercial work", "Litigation strategy & filings", "Instruct advocates on your behalf"].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={2} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/search"
                search={{ type: "attorney" } as never}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-ink"
              >
                Find an attorney <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Advocate card */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-background p-7 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest/12 text-forest ring-1 ring-inset ring-forest/25">
                <Scale className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-heading text-2xl text-ink">Advocates</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Courtroom specialists. Advocates are briefed by attorneys to argue in the High Court, SCA and
                Constitutional Court. Senior Counsel (SC) take the most complex matters.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                {["Specialist courtroom advocacy", "Drafting heads of argument & opinions", "Briefed via instructing attorneys", "Includes Senior Counsel (SC)"].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={2} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/search"
                search={{ type: "advocate" } as never}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-ink"
              >
                Find an advocate <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Practice areas grid */}
      <section className="bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Browse by</span>
              <h2 className="mt-2 font-heading text-3xl text-ink md:text-4xl">Practice Areas</h2>
            </div>
            <Link to="/practice-areas" className="text-sm font-medium text-gold hover:text-ink">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {practiceAreas?.map((p) => {
              const Icon = getPracticeAreaIcon(p.slug);
              return (
                <Link
                  key={p.id}
                  to="/search"
                  search={{ area: p.slug } as never}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <span className="mt-4 font-heading text-sm font-semibold text-card-foreground">
                    {p.name}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {areaCounts?.[p.id] ?? 0} lawyer{(areaCounts?.[p.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-white md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl">List your firm on Lawexperts.co.za</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            R99 per lawyer per month. First 3 months free — no credit card required.
            Build trust with verified profiles and linked reported cases.
          </p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-gold/90">
            Register Your Firm <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
