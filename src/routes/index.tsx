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
  Gavel,
  Users,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { getPracticeAreaIcon } from "../lib/practice-area-icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lawexpert.co.za | South Africa's Legal Directory" },
      { name: "description", content: "Search verified South African attorneys and advocates by practice area, province, and reported cases. Find the right counsel — backed by their case record." },
      { property: "og:title", content: "Lawexpert.co.za | South Africa's Legal Directory" },
      { property: "og:description", content: "Verified profiles. Linked cases. South Africa's legal directory." },
    ],
  }),
  component: HomePage,
});

const STROKE = 1.5;

function HomePage() {
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

  const go = (type: "attorney" | "advocate", q: string, area: string, province: string) => {
    const params: Record<string, string> = { type };
    if (q) params.q = q;
    if (area) params.area = area;
    if (province) params.province = province;
    navigate({ to: "/search", search: params as never });
  };

  return (
    <>
      {/* Intro band */}
      <section className="relative overflow-hidden bg-cream">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-gold/[0.05] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" strokeWidth={STROKE} />
              Verified South African legal directory
            </span>
            <h1 className="mt-6 font-heading text-4xl leading-[1.05] text-ink md:text-6xl">
              The right counsel for your matter.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              South Africa has a split legal profession. Choose who you need — then search verified
              profiles linked to their reported judgments.
            </p>
          </div>
        </div>
      </section>

      {/* Section Split — Attorneys | Advocates */}
      <section className="bg-cream pb-20">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-2">
          <ProfessionPanel
            kind="attorney"
            title="Attorneys"
            tagline="Your first point of contact"
            description="Advise clients directly, draft contracts, run litigation, and instruct advocates when courtroom specialists are needed."
            Icon={Briefcase}
            practiceAreas={practiceAreas ?? []}
            onSubmit={(q, area, province) => go("attorney", q, area, province)}
          />
          <ProfessionPanel
            kind="advocate"
            title="Advocates"
            tagline="Courtroom specialists"
            description="Briefed by attorneys to argue in the High Court, SCA and Constitutional Court. Includes Senior Counsel (SC)."
            Icon={Gavel}
            practiceAreas={practiceAreas ?? []}
            onSubmit={(q, area, province) => go("advocate", q, area, province)}
          />
        </div>

        {/* Stats */}
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4">
          {[
            { icon: Users, label: "Lawyers Listed", value: stats?.lawyers ?? "—" },
            { icon: Building2, label: "Firms", value: stats?.firms ?? "—" },
            { icon: BookOpen, label: "Reported Cases", value: stats?.cases ?? "—" },
            { icon: MapPin, label: "Provinces Covered", value: stats?.provinces ?? 9 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
              <s.icon className="mx-auto h-5 w-5 text-gold" strokeWidth={STROKE} />
              <div className="mt-2 font-heading text-3xl text-ink">{s.value}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Practice areas grid */}
      <section className="border-t border-border bg-card py-20 md:py-24">
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
                  className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={STROKE} />
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
          <h2 className="font-heading text-3xl md:text-4xl">List your firm on Lawexpert.co.za</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            R99 per lawyer per month. First 3 months free — no credit card required.
            Build trust with verified profiles and linked reported cases.
          </p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-gold/90">
            Register Your Firm <ArrowRight className="h-4 w-4" strokeWidth={STROKE} />
          </Link>
        </div>
      </section>
    </>
  );
}

type PanelProps = {
  kind: "attorney" | "advocate";
  title: string;
  tagline: string;
  description: string;
  Icon: typeof Briefcase;
  practiceAreas: { id: string; slug: string; name: string }[];
  onSubmit: (q: string, area: string, province: string) => void;
};

function ProfessionPanel({ kind, title, tagline, description, Icon, practiceAreas, onSubmit }: PanelProps) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [province, setProvince] = useState("");

  const accent = kind === "attorney" ? "gold" : "forest";
  const ringClass = kind === "attorney" ? "focus:ring-gold" : "focus:ring-forest";
  const btnClass =
    kind === "attorney"
      ? "bg-gold hover:bg-gold/90"
      : "bg-forest hover:bg-forest/90";
  const iconBg = kind === "attorney" ? "bg-gold/10 text-gold" : "bg-forest/10 text-forest";
  const labelClass = kind === "attorney" ? "text-gold" : "text-forest";

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm md:p-8">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-${accent}/20 ${iconBg}`}>
          <Icon className="h-7 w-7" strokeWidth={STROKE} />
        </div>
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${labelClass}`}>
            {tagline}
          </div>
          <h2 className="mt-1 font-heading text-2xl text-ink md:text-3xl">{title}</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(q, area, province); }}
        className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-background p-3"
      >
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()} by name or firm`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={120}
          className={`w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${ringClass}`}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={area} onChange={(e) => setArea(e.target.value)} className={`rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 ${ringClass}`}>
            <option value="">All practice areas</option>
            {practiceAreas.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className={`rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 ${ringClass}`}>
            <option value="">All provinces</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button
          type="submit"
          className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors ${btnClass}`}
        >
          <Search className="h-4 w-4" strokeWidth={STROKE} /> Find {title}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5" strokeWidth={STROKE} />
          Verified profiles · linked cases
        </span>
        <Link
          to="/search"
          search={{ type: kind } as never}
          className={`inline-flex items-center gap-1 font-semibold ${labelClass} hover:text-ink`}
        >
          Browse all <ArrowRight className="h-3.5 w-3.5" strokeWidth={STROKE} />
        </Link>
      </div>
    </div>
  );
}
