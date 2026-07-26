import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Briefcase, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { getPracticeAreaIcon } from "../lib/practice-area-icons";
import { SimpleSelect } from "../components/SimpleSelect";
import { VerifiedMark } from "../components/BrandMark";

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
  const [heroQ, setHeroQ] = useState("");

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
      const [lawyersRes, expertsRes, mediatorsRes, arbitratorsRes] = await Promise.all([
        supabase.from("service_providers").select("*", { count: "exact", head: true }).in("status", ["trial", "active"]),
        supabase.from("service_providers").select("*", { count: "exact", head: true }).eq("provider_type", "expert").in("status", ["trial", "active"]),
        supabase.from("service_providers").select("*", { count: "exact", head: true }).eq("is_mediator", true).in("status", ["trial", "active"]),
        supabase.from("service_providers").select("*", { count: "exact", head: true }).eq("is_arbitrator", true).in("status", ["trial", "active"]),
      ]);
      return {
        lawyers: lawyersRes.count ?? 0,
        experts: expertsRes.count ?? 0,
        mediators: mediatorsRes.count ?? 0,
        arbitrators: arbitratorsRes.count ?? 0,
      };
    },
  });

  const { data: areaCounts } = useQuery({
    queryKey: ["area-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("provider_practice_areas").select("practice_area_id");
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
      {/* Hero — the record speaks */}
      <section className="relative bg-brand-deep">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 md:pb-24 md:pt-24">
          <p className="eyebrow animate-hero-rise text-paper-ivory/70">
            Verified profiles · Linked cases
          </p>
          <h1
            className="animate-hero-rise mx-auto mt-5 max-w-3xl font-heading leading-[1.15] text-paper-ivory [animation-delay:80ms]"
            style={{ fontSize: "clamp(30px, 4.5vw, 46px)" }}
          >
            Choose counsel the way the profession does — by the record.
          </h1>
          <p className="animate-hero-rise mx-auto mt-5 max-w-2xl text-base leading-relaxed text-paper-ivory/75 [animation-delay:160ms]">
            South Africa has a split legal profession. Choose who you need — then search a
            comprehensive database of lawyers across the country.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: (heroQ ? { q: heroQ } : {}) as never });
            }}
            className="animate-hero-rise panel-elevated mx-auto mt-9 flex max-w-2xl rounded bg-paper-white p-1.5 [animation-delay:240ms]"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search by practice area, name, or case citation
            </label>
            <input
              id="hero-search"
              type="text"
              value={heroQ}
              onChange={(e) => setHeroQ(e.target.value)}
              maxLength={120}
              placeholder="Practice area, name, or case citation…"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-[3px] bg-brass px-5 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] sm:px-7"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-paper-ivory/15" />
      </section>

      {/* Section Split — Attorneys | Advocates */}
      <section className="bg-paper-ivory py-14 md:py-20">
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
            Icon={BookOpen}
            practiceAreas={practiceAreas ?? []}
            onSubmit={(q, area, province) => go("advocate", q, area, province)}
          />
        </div>

        {/* Quieter strip — Experts / Mediators / Arbitrators */}
        <div className="mx-auto mt-5 grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3">
          {[
            { to: "/expert-witnesses", label: "Expert Witnesses" },
            { to: "/mediators", label: "Mediators" },
            { to: "/arbitrators", label: "Arbitrators" },
          ].map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-center justify-between border border-rule bg-paper-white p-5 transition-colors hover:border-brand-primary"
              style={{ borderRadius: 4 }}
            >
              <span className="eyebrow text-brand-primary">[{s.label}]</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors group-hover:text-brand-hover">
                Browse <ArrowRight className="h-3.5 w-3.5" strokeWidth={STROKE} />
              </span>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4">
          {[
            { label: "Lawyers Listed", value: stats?.lawyers ?? "—" },
            { label: "Expert Witnesses", value: stats?.experts ?? "—" },
            { label: "Mediators", value: stats?.mediators ?? "—" },
            { label: "Arbitrators", value: stats?.arbitrators ?? "—" },
          ].map((s) => (
            <div key={s.label} className="border border-rule bg-paper-white p-5 text-center" style={{ borderRadius: 4 }}>
              <div className="font-heading text-3xl text-ink">{s.value}</div>
              <div className="eyebrow mt-2 text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Practice areas grid */}
      <section className="border-t border-rule bg-paper-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-ink-muted">[Browse by]</span>
              <h2 className="mt-2 font-heading text-3xl text-ink md:text-[34px]">Practice Areas</h2>
            </div>
            <Link to="/practice-areas" className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-hover">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {practiceAreas?.map((p) => {
              const Icon = getPracticeAreaIcon(p.slug);
              return (
                <Link
                  key={p.id}
                  to="/search"
                  search={{ area: p.slug } as never}
                  className="group flex flex-col border border-rule bg-paper-white p-5 transition-colors hover:border-brand-primary"
                  style={{ borderRadius: 4 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-brand-tint text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={STROKE} />
                  </div>
                  <span className="mt-4 font-body text-sm font-semibold text-ink">{p.name}</span>
                  <span className="mt-1 font-mono text-xs text-ink-muted">
                    {areaCounts?.[p.id] ?? 0} lawyer{(areaCounts?.[p.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-primary py-16 text-white md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl md:text-[34px]">List your firm on Lawexpert.co.za</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-white/75">
            R160 per listing per month. First 3 months free — no credit card required.
            Build trust with verified profiles and linked reported cases.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded bg-brass px-8 py-3.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f]"
          >
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

  return (
    <div className="flex flex-col border border-rule bg-paper-white p-7 md:p-8" style={{ borderRadius: 4 }}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[3px] bg-brand-tint text-brand-primary">
          <Icon className="h-6 w-6" strokeWidth={STROKE} />
        </div>
        <div>
          <div className="eyebrow text-brand-primary">[{title}]</div>
          <h2 className="mt-1 font-heading text-2xl text-ink md:text-[28px]">{tagline}</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{description}</p>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(q, area, province); }}
        className="mt-6 flex flex-col gap-2 border-t border-rule pt-5"
      >
        <input
          type="text"
          placeholder="Search by name, firm, practice area, city, town or province"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={120}
          className="w-full rounded border border-rule bg-paper-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <SimpleSelect
            value={area}
            onChange={setArea}
            options={practiceAreas.map((p) => ({ value: p.slug, label: p.name }))}
            placeholder="All practice areas"
            className="w-full min-w-0 rounded border border-rule bg-paper-white px-3 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <SimpleSelect
            value={province}
            onChange={setProvince}
            options={PROVINCES.map((p) => ({ value: p, label: p }))}
            placeholder="All provinces"
            className="w-full min-w-0 rounded border border-rule bg-paper-white px-3 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <button
          type="submit"
          className="mt-1 inline-flex items-center justify-center gap-2 rounded bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Search className="h-4 w-4" strokeWidth={STROKE} /> Find {title}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <VerifiedMark size={14} />
          Verified profiles · linked cases
        </span>
        <Link
          to="/search"
          search={{ type: kind } as never}
          className="inline-flex items-center gap-1 font-semibold text-brand-primary transition-colors hover:text-brand-hover"
        >
          Browse all <ArrowRight className="h-3.5 w-3.5" strokeWidth={STROKE} />
        </Link>
      </div>
    </div>
  );
}
