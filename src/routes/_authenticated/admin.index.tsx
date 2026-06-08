import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Scale, Landmark, Briefcase, MapPin, Stethoscope, Handshake, Gavel, BookOpen } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Lawexpert.co.za" }] }),
  component: AdminHub,
});

function AdminHub() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const [firms, attorneys, advocates, experts, mediators, arbitrators, bars, chambers, towns] = await Promise.all([
        supabase.from("firms").select("id", { count: "exact", head: true }),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("provider_type", "expert").not("firm_id", "is", null),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("provider_type", "expert").eq("provider_type", "advocate"),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("provider_type", "expert"),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("provider_type", "expert").eq("is_mediator", true),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("provider_type", "expert").eq("is_arbitrator", true),
        supabase.from("bars").select("id", { count: "exact", head: true }),
        supabase.from("chambers").select("id", { count: "exact", head: true }),
        supabase.from("towns").select("id", { count: "exact", head: true }),
      ]);
      return {
        firms: firms.count ?? 0,
        attorneys: attorneys.count ?? 0,
        advocates: advocates.count ?? 0,
        experts: experts.count ?? 0,
        mediators: mediators.count ?? 0,
        arbitrators: arbitrators.count ?? 0,
        bars: bars.count ?? 0,
        chambers: chambers.count ?? 0,
        towns: towns.count ?? 0,
      };
    },
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">Not authorised</h1>
        <p className="mt-2 text-muted-foreground">This page is reserved for platform admins.</p>
      </div>
    );
  }

  const cards = [
    {
      to: "/admin/firms",
      icon: Building2,
      title: "Firms",
      desc: "Create, edit and manage every law firm.",
      count: counts?.firms,
    },
    {
      to: "/admin/attorneys",
      icon: Users,
      title: "Attorneys",
      desc: "Browse and add attorneys across all firms.",
      count: counts?.attorneys,
    },
    {
      to: "/admin/advocates",
      icon: Scale,
      title: "Advocates",
      desc: "Add advocates by Bar and Chambers.",
      count: counts?.advocates,
    },
    {
      to: "/admin/experts",
      icon: Stethoscope,
      title: "Expert Witnesses",
      desc: "Add and manage expert witnesses (firm-linked or independent).",
      count: counts?.experts,
    },
    {
      to: "/admin/mediators",
      icon: Handshake,
      title: "Mediators",
      desc: "Lawyers flagged as mediators.",
      count: counts?.mediators,
    },
    {
      to: "/admin/arbitrators",
      icon: Gavel,
      title: "Arbitrators",
      desc: "Lawyers flagged as arbitrators.",
      count: counts?.arbitrators,
    },
    {
      to: "/admin/bars",
      icon: Landmark,
      title: "Bars",
      desc: "South African Bar Councils — reference data.",
      count: counts?.bars,
    },
    {
      to: "/admin/chambers",
      icon: Briefcase,
      title: "Chambers",
      desc: "Groups & Chambers — reference data.",
      count: counts?.chambers,
    },
    {
      to: "/admin/towns",
      icon: MapPin,
      title: "Towns & Cities",
      desc: "Provinces and towns used for location search.",
      count: counts?.towns,
    },
  ] as const;

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <h1 className="font-heading text-3xl text-ink md:text-4xl">Admin Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform admin · everything you can manage in one place.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-lg border border-border bg-card p-6 transition hover:border-gold hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-md bg-gold/10 p-2 text-gold">
                  <c.icon className="h-6 w-6" />
                </div>
                {typeof c.count === "number" && (
                  <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-medium text-ink/70">
                    {c.count}
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-heading text-lg text-ink group-hover:text-gold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
