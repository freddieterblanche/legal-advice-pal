import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin, BookOpen, Download, Globe } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/expert-witnesses/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Expert Witness — Lawexpert.co.za` },
      { name: "description", content: "South African expert witness profile with qualifications, registration body, and linked court appearances." },
    ],
  }),
  component: ExpertWitnessProfile,
});

function ExpertWitnessProfile() {
  const { slug } = Route.useParams();

  const { data: expert, isLoading } = useQuery({
    queryKey: ["expert-witness", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_witnesses")
        .select(`*,
          expert_witness_disciplines(expert_disciplines(name, slug, parent_category)),
          case_expert_witnesses(role, notes, cases(case_name, citation, court, year, saflii_url))
        `)
        .eq("slug", slug)
        .in("status", ["trial", "active"])
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!expert) return null;

  const disciplines: any[] = (expert.expert_witness_disciplines ?? []).map((x: any) => x.expert_disciplines).filter(Boolean);
  const cases: any[] = (expert.case_expert_witnesses ?? []).filter((x: any) => x.cases);
  const primary = disciplines[0];

  return (
    <div className="bg-cream">
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-gold/20 font-heading text-4xl text-gold">
              {expert.first_name[0]}{expert.last_name[0]}
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-3xl md:text-4xl">
                {expert.title ? `${expert.title} ` : ""}{expert.first_name} {expert.last_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {primary && (
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-gold/40">
                    {primary.name}
                  </span>
                )}
                <span className="rounded-full bg-cream/10 px-3 py-1 text-xs font-semibold text-cream ring-1 ring-inset ring-cream/30">
                  {expert.is_independent ? "Independent Practice" : expert.employer ?? "Employed"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-cream/70">
                {(expert.city || expert.province) && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {[expert.city, expert.province].filter(Boolean).join(", ")}</span>
                )}
                {expert.registration_body && (
                  <span className="rounded bg-cream/5 px-2 py-0.5">{expert.registration_body}</span>
                )}
              </div>
            </div>
            {expert.cv_url && (
              <a href={expert.cv_url} target="_blank" rel="noopener noreferrer" className="self-start rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold/90">
                <Download className="mr-2 inline h-4 w-4" /> Download CV
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {disciplines.length > 0 && (
            <section>
              <h2 className="font-heading text-xl text-ink">Disciplines</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {disciplines.map((d) => (
                  <span key={d.slug} className="rounded bg-ink/10 px-2.5 py-1 text-xs text-ink">{d.name}</span>
                ))}
              </div>
            </section>
          )}

          {expert.qualifications && (
            <section>
              <h2 className="font-heading text-xl text-ink">Qualifications</h2>
              <p className="mt-3 whitespace-pre-line text-foreground/80">{expert.qualifications}</p>
            </section>
          )}

          {expert.bio && (
            <section>
              <h2 className="font-heading text-xl text-ink">About</h2>
              <p className="mt-3 leading-relaxed text-foreground/80">{expert.bio}</p>
            </section>
          )}

          {expert.courts_accepted_in?.length > 0 && (
            <section>
              <h2 className="font-heading text-xl text-ink">Courts Accepted In</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {expert.courts_accepted_in.map((c: string) => (
                  <span key={c} className="rounded bg-forest/10 px-2.5 py-1 text-xs text-forest">{c}</span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="flex items-center gap-2 font-heading text-xl text-ink">
              <BookOpen className="h-5 w-5 text-gold" /> Case Appearances ({cases.length})
            </h2>
            {cases.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No linked cases yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
                {cases.map((cew: any, i: number) => (
                  <li key={i} className="p-4">
                    <a href={cew.cases.saflii_url} target="_blank" rel="noopener noreferrer" className="font-heading text-sm font-semibold text-ink hover:text-gold">
                      {cew.cases.case_name} <ExternalLink className="ml-1 inline h-3 w-3" />
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[cew.cases.citation, cew.cases.court, cew.cases.year, "Expert Witness"].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {expert.geographic_availability && (
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wider text-ink">
                <Globe className="h-4 w-4 text-gold" /> Availability
              </h3>
              <p className="mt-2 text-sm text-foreground/80">{expert.geographic_availability}</p>
            </div>
          )}
          {expert.languages?.length > 0 && (
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Languages</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {expert.languages.map((l: string) => (
                  <span key={l} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{l}</span>
                ))}
              </div>
            </div>
          )}
          {expert.fee_range && (
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Fee Range</h3>
              <p className="mt-2 text-sm text-foreground/80">{expert.fee_range}</p>
            </div>
          )}
          <div className="rounded-md border border-border bg-card p-5">
            <Link to="/expert-witnesses" className="text-sm text-forest hover:text-gold">← Back to expert witness search</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
