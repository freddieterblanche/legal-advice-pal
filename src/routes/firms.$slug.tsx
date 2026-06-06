import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Globe, Phone, Building2, Star } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { sanitizeBioHtml } from "../lib/sanitize";

export const Route = createFileRoute("/firms/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Lawexpert.co.za` },
      { name: "description", content: "South African law firm profile on Lawexpert.co.za." },
    ],
  }),
  component: FirmProfile,
});

function FirmProfile() {
  const { slug } = Route.useParams();

  const { data: firm, isLoading } = useQuery({
    queryKey: ["firm", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: lawyers } = useQuery({
    queryKey: ["firm-lawyers", firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyers")
        .select("id, slug, first_name, last_name, designation, city")
        .eq("firm_id", firm!.id)
        .in("status", ["trial", "active"]);
      return data ?? [];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["firm-branches-public", firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("firm_branches")
        .select("*")
        .eq("firm_id", firm!.id)
        .order("is_head_office", { ascending: false })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!firm) return null;

  return (
    <div className="bg-cream">
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl">{firm.name}</h1>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-cream/70">
              {firm.city && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {firm.city}, {firm.province}</span>}
              {firm.website && <a href={firm.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold"><Globe className="h-4 w-4" /> Website</a>}
              {firm.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {firm.phone}</span>}
            </div>
          </div>
          {firm.logo_url && (
            <img
              src={firm.logo_url}
              alt={`${firm.name} logo`}
              className="h-20 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      </section>


      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {firm.description && (
          <div
            className="text-foreground/80 leading-relaxed [&_h2]:font-heading [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-heading [&_h3]:text-base [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-ink"
            dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(firm.description) }}
          />
        )}

        {branches && branches.length > 0 && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 font-heading text-2xl text-ink">
              <Building2 className="h-5 w-5 text-gold" /> {branches.length === 1 ? "Office" : "Offices"}
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {branches.map((b: any) => (
                <div key={b.id} className="rounded-md border border-border bg-card p-4">
                  <p className="flex items-center gap-2 font-heading text-sm font-semibold text-ink">
                    {b.is_head_office && <Star className="h-3.5 w-3.5 text-gold" />}
                    {b.name}
                  </p>
                  {(b.address || b.city) && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{[b.address, b.city, b.province].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                  {b.phone && (
                    <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="mt-1 flex items-center gap-1.5 text-xs text-forest hover:text-gold">
                      <Phone className="h-3 w-3" /> {b.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <h2 className="mt-12 font-heading text-2xl text-ink">Our Lawyers</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {lawyers?.map((l) => (
            <Link
              key={l.id}
              to="/lawyers/$slug"
              params={{ slug: l.slug }}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-gold hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-heading text-sm text-gold">
                {l.first_name[0]}{l.last_name[0]}
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-ink">{l.first_name} {l.last_name}</p>
                <p className="text-xs text-muted-foreground">{l.designation} · {l.city}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
