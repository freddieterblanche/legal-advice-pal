import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Globe, Phone } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/firms/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — LexSA` },
      { name: "description", content: "South African law firm profile on LexSA." },
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

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!firm) return null;

  return (
    <div className="bg-cream">
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="font-heading text-4xl md:text-5xl">{firm.name}</h1>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-cream/70">
            {firm.city && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {firm.city}, {firm.province}</span>}
            {firm.website && <a href={firm.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold"><Globe className="h-4 w-4" /> Website</a>}
            {firm.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {firm.phone}</span>}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {firm.description && <p className="text-foreground/80 leading-relaxed">{firm.description}</p>}

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
