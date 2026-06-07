import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin, BookOpen, Download, Globe, Briefcase, Pencil, Building2, Phone, Smartphone, Mail } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { sanitizeBioHtml } from "../lib/sanitize";
import { TypePill } from "../components/TypePill";


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

  const { data: samples } = useQuery({
    queryKey: ["expert-work-samples-public", (expert as any)?.id],
    enabled: !!(expert as any)?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("expert_work_samples")
        .select("id, project_name, synopsis, project_date")
        .eq("expert_id", (expert as any).id)
        .order("project_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as Array<{ id: string; project_name: string; synopsis: string | null; project_date: string | null }>;
    },
  });

  const { data: viewer } = useQuery({
    queryKey: ["viewer-profile-expert"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("firm_id, role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!expert) return null;

  const isPlatformAdmin = viewer?.role === "platform_admin";
  const canEdit = isPlatformAdmin || (!!viewer?.firm_id && expert.firm_id === viewer.firm_id);
  const editSearch = expert.firm_id
    ? ({ tab: "experts" as const, edit: expert.id, ...(isPlatformAdmin ? { firmId: expert.firm_id } : {}) })
    : null;

  const disciplines: any[] = (expert.expert_witness_disciplines ?? []).map((x: any) => x.expert_disciplines).filter(Boolean);
  const cases: any[] = (expert.case_expert_witnesses ?? []).filter((x: any) => x.cases);
  const primary = disciplines[0];

  return (
    <div className="bg-cream">
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {expert.avatar_url ? (
              <img
                src={expert.avatar_url}
                alt={`${expert.first_name} ${expert.last_name}`}
                className="h-64 w-52 shrink-0 object-cover object-top sm:h-80 sm:w-60 md:h-[22rem] md:w-64"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-64 w-52 shrink-0 items-center justify-center bg-gold/20 font-heading text-5xl text-gold sm:h-80 sm:w-60 md:h-[22rem] md:w-64">
                {expert.first_name[0]}{expert.last_name[0]}
              </div>
            )}

            <div className="flex-1">
              <h1 className="font-heading text-3xl md:text-4xl">
                {[expert.name_title, expert.first_name, expert.last_name].filter(Boolean).join(" ")}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <TypePill variant="expert">Expert Witness</TypePill>
                {expert.title && <TypePill variant="neutral">{expert.title}</TypePill>}
                {primary && <TypePill variant="neutral">{primary.name}</TypePill>}
                <TypePill variant="neutral">
                  {expert.is_independent
                    ? (expert.company_name ?? "Independent Practice")
                    : (expert.company_name ?? expert.employer ?? "Employed")}
                </TypePill>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-cream/70">
                {(expert.city || expert.province) && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {[expert.city, expert.province].filter(Boolean).join(", ")}</span>
                )}
                {expert.company_name && (
                  <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {expert.company_name}</span>
                )}
                {expert.registration_body && (
                  <span className="rounded bg-cream/5 px-2 py-0.5">{expert.registration_body}</span>
                )}
              </div>
              {(expert.office_phone || expert.mobile_phone || expert.contact_email) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-cream/80">
                  {expert.office_phone && (
                    <a href={`tel:${expert.office_phone}`} className="flex items-center gap-1.5 hover:text-gold">
                      <Phone className="h-4 w-4" /> {expert.office_phone}
                    </a>
                  )}
                  {expert.mobile_phone && (
                    <a href={`tel:${expert.mobile_phone}`} className="flex items-center gap-1.5 hover:text-gold">
                      <Smartphone className="h-4 w-4" /> {expert.mobile_phone}
                    </a>
                  )}
                  {expert.contact_email && (
                    <a href={`mailto:${expert.contact_email}`} className="flex items-center gap-1.5 hover:text-gold">
                      <Mail className="h-4 w-4" /> {expert.contact_email}
                    </a>
                  )}
                </div>
              )}
            </div>
            {(expert.cv_url || canEdit) && (
              <div className="flex flex-col gap-2 self-start">
                {canEdit && (editSearch ? (
                  <Link to="/dashboard" search={editSearch} className="rounded-md bg-cream/10 px-5 py-2.5 text-sm font-semibold text-cream ring-1 ring-cream/30 hover:bg-cream/20">
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit this Profile
                  </Link>
                ) : isPlatformAdmin ? (
                  <Link to="/admin/experts" search={{ edit: expert.id }} className="rounded-md bg-cream/10 px-5 py-2.5 text-sm font-semibold text-cream ring-1 ring-cream/30 hover:bg-cream/20">
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit this Profile
                  </Link>
                ) : null)}
                {expert.cv_url && (
                  <a href={expert.cv_url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold/90">
                    <Download className="mr-2 inline h-4 w-4" /> Download CV
                  </a>
                )}
              </div>
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
              <div
                className="prose prose-sm mt-3 max-w-none text-foreground/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(expert.qualifications) }}
              />
            </section>
          )}

          {expert.bio && (
            <section>
              <h2 className="font-heading text-xl text-ink">About</h2>
              <div
                className="prose prose-sm mt-3 max-w-none leading-relaxed text-foreground/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(expert.bio) }}
              />
            </section>
          )}

          {samples && samples.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-heading text-xl text-ink">
                <Briefcase className="h-5 w-5 text-gold" /> Samples of Work
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
                {samples.map((s) => (
                  <li key={s.id} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-heading text-sm font-semibold text-ink">{s.project_name}</span>
                      {s.project_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.project_date).toLocaleDateString("en-ZA", { year: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    {s.synopsis && <p className="mt-1 text-sm whitespace-pre-line text-foreground/80">{s.synopsis}</p>}
                  </li>
                ))}
              </ul>
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

          {cases.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-heading text-xl text-ink">
                <BookOpen className="h-5 w-5 text-gold" /> Case Appearances ({cases.length})
              </h2>
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
            </section>
          )}
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
