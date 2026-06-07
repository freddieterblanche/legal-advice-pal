import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, MapPin, Building2, BookOpen, Mail, Pencil, Phone, Linkedin } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { sanitizeBioHtml } from "../lib/sanitize";
import { formatDesignation, headBadges, designationKind } from "../lib/designation";

export const Route = createFileRoute("/lawyers/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Lawexpert.co.za` },
      { name: "description", content: "South African lawyer profile on Lawexpert.co.za with linked reported cases." },
    ],
  }),
  component: LawyerProfile,
});

const enquirySchema = z.object({
  sender_name: z.string().trim().min(1, "Name required").max(100),
  sender_email: z.string().trim().email("Valid email required").max(255),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

function LawyerProfile() {
  const { slug } = Route.useParams();
  const [showEnquiry, setShowEnquiry] = useState(false);

  const { data: lawyer, isLoading } = useQuery({
    queryKey: ["lawyer", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select(`*, firms(name, slug, city, province), lawyer_practice_areas(practice_areas(name, slug)), lawyer_cases(role, outcome, cases(case_name, citation, court, year, saflii_url)), lawyer_reported_cases(id, case_name, citation, court, year, url, sort_order), lawyer_branches(firm_branches(id, name, address, city, province, phone, is_head_office))`)
        .eq("slug", slug)
        .in("status", ["trial", "active"])
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  const { data: viewer } = useQuery({
    queryKey: ["viewer-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("firm_id, role").eq("id", user.id).maybeSingle();
      return data ?? null;
    },
    staleTime: 60_000,
  });

  const contact = lawyer ? { email: lawyer.email as string | null, phone: lawyer.phone as string | null } : null;


  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!lawyer) return null;

  const isPlatformAdmin = viewer?.role === "platform_admin";
  const canEdit = isPlatformAdmin || (!!viewer?.firm_id && lawyer.firm_id === viewer.firm_id);

  const areas = lawyer.lawyer_practice_areas?.map((x: any) => x.practice_areas).filter(Boolean) ?? [];
  const cases = (lawyer.lawyer_cases ?? []).slice().sort((a: any, b: any) => (b.cases?.year ?? 0) - (a.cases?.year ?? 0));
  const reportedCases = (lawyer.lawyer_reported_cases ?? []).slice().sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0));
  const totalCases = cases.length + reportedCases.length;
  const branches = (lawyer.lawyer_branches ?? [])
    .map((x: any) => x.firm_branches)
    .filter(Boolean);

  return (
    <div className="bg-cream">
      {/* Header */}
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {lawyer.avatar_url ? (
              <img
                src={lawyer.avatar_url}
                alt={`${lawyer.first_name} ${lawyer.last_name}`}
                className="h-64 w-52 shrink-0 object-cover object-top sm:h-80 sm:w-60 md:h-[22rem] md:w-64"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-64 w-52 shrink-0 items-center justify-center bg-gold/20 font-heading text-5xl text-gold sm:h-80 sm:w-60 md:h-[22rem] md:w-64">
                {lawyer.first_name[0]}{lawyer.last_name[0]}
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-3xl md:text-4xl">{lawyer.first_name} {lawyer.last_name}{lawyer.is_senior_counsel ? " SC" : ""}</h1>
                {(() => {
                  const label = formatDesignation(lawyer);
                  if (!label) return null;
                  const isAdv = designationKind(lawyer.lawyer_type === "advocate" ? "advocate" : lawyer.designation) === "advocate";
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      isAdv ? "bg-white/10 text-white ring-white/30" : "bg-gold/20 text-white ring-gold/40"
                    }`}>
                      {isAdv ? "Advocate" : "Attorney"} · {label}
                    </span>
                  );
                })()}
                {headBadges(lawyer).map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-gold/40">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-cream/70">
                {lawyer.firms && (
                  <Link to="/firms/$slug" params={{ slug: lawyer.firms.slug }} className="flex items-center gap-1.5 hover:text-gold">
                    <Building2 className="h-4 w-4" /> {lawyer.firms.name}
                  </Link>
                )}
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {lawyer.city}, {lawyer.province}</span>
                {contact?.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-gold">
                    <Mail className="h-4 w-4" /> {contact.email}
                  </a>
                )}
                {contact?.phone && (
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-gold">
                    <Phone className="h-4 w-4" /> {contact.phone}
                  </a>
                )}

                {lawyer.linkedin_url && (
                  <a href={lawyer.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canEdit && (
                lawyer.lawyer_type === "advocate" && !lawyer.firm_id && isPlatformAdmin ? (
                  <Link
                    to="/admin/advocates"
                    search={{ edit: lawyer.id }}
                    className="rounded-md bg-cream/10 px-5 py-2.5 text-sm font-semibold text-cream ring-1 ring-cream/30 hover:bg-cream/20"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit Profile
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    search={{ tab: "lawyers", edit: lawyer.id, ...(isPlatformAdmin && lawyer.firm_id ? { firmId: lawyer.firm_id } : {}) }}
                    className="rounded-md bg-cream/10 px-5 py-2.5 text-sm font-semibold text-cream ring-1 ring-cream/30 hover:bg-cream/20"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit Profile
                  </Link>
                )
              )}
              <button onClick={() => setShowEnquiry(true)} className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold/90">
                <Mail className="mr-2 inline h-4 w-4" /> Send Enquiry
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {areas.length > 0 && (
            <section>
              <h2 className="font-heading text-xl text-ink">Practice Areas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {areas.map((a: any) => (
                  <span key={a.slug} className="rounded bg-ink/10 px-2.5 py-1 text-xs text-ink">{a.name}</span>
                ))}
              </div>
            </section>
          )}

          {(() => {
            const proseClass = "mt-3 leading-relaxed text-foreground/80 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-heading [&_h3]:text-base [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-ink";
            const sections: { title: string; html: string | null }[] = [
              { title: "Accolades", html: lawyer.accolades },
              { title: "About", html: lawyer.overview || lawyer.bio },
              { title: "Qualifications", html: lawyer.qualifications },
              { title: "Noteworthy Matters", html: lawyer.noteworthy_matters },
            ];
            return sections.filter((s) => s.html && String(s.html).trim()).map((s) => (
              <section key={s.title}>
                <h2 className="font-heading text-xl text-ink">{s.title}</h2>
                <div className={proseClass} dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(s.html as string) }} />
              </section>
            ));
          })()}


          {lawyer.education && (
            <section>
              <h2 className="font-heading text-xl text-ink">Education & Admissions</h2>
              <p className="mt-3 whitespace-pre-line text-foreground/80">{lawyer.education}</p>
            </section>
          )}

          {lawyer.is_mediator && (
            <section>
              <h2 className="font-heading text-xl text-ink">Mediation</h2>
              <div className="mt-3 grid gap-3 rounded-md border border-border bg-card p-4 text-sm sm:grid-cols-2">
                {lawyer.mediator_accreditation && (
                  <div><span className="text-muted-foreground">Accreditation: </span><span className="text-ink">{lawyer.mediator_accreditation}</span></div>
                )}
                {lawyer.mediator_style && (
                  <div><span className="text-muted-foreground">Style: </span><span className="text-ink">{lawyer.mediator_style}</span></div>
                )}
                {lawyer.mediator_sectors?.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Sectors: </span>
                    <span className="inline-flex flex-wrap gap-1.5">
                      {lawyer.mediator_sectors.map((s: string) => (
                        <span key={s} className="rounded bg-gold/10 px-2 py-0.5 text-xs text-ink">{s}</span>
                      ))}
                    </span>
                  </div>
                )}
                {lawyer.availability_notes && (
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Availability: </span><span className="text-ink">{lawyer.availability_notes}</span></div>
                )}
              </div>
            </section>
          )}

          {lawyer.is_arbitrator && (
            <section>
              <h2 className="font-heading text-xl text-ink">Arbitration</h2>
              <div className="mt-3 grid gap-3 rounded-md border border-border bg-card p-4 text-sm sm:grid-cols-2">
                {lawyer.arbitrator_accreditation && (
                  <div><span className="text-muted-foreground">Accreditation: </span><span className="text-ink">{lawyer.arbitrator_accreditation}</span></div>
                )}
                {typeof lawyer.arbitrator_experience_years === "number" && (
                  <div><span className="text-muted-foreground">Experience: </span><span className="text-ink">{lawyer.arbitrator_experience_years} years</span></div>
                )}
                {lawyer.arbitrator_types?.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Types handled: </span>
                    <span className="inline-flex flex-wrap gap-1.5">
                      {lawyer.arbitrator_types.map((s: string) => (
                        <span key={s} className="rounded bg-forest/10 px-2 py-0.5 text-xs text-forest">{s}</span>
                      ))}
                    </span>
                  </div>
                )}
                {lawyer.daily_rate_range && (
                  <div><span className="text-muted-foreground">Daily rate: </span><span className="text-ink">{lawyer.daily_rate_range}</span></div>
                )}
                {lawyer.languages?.length > 0 && (
                  <div><span className="text-muted-foreground">Languages: </span><span className="text-ink">{lawyer.languages.join(", ")}</span></div>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="flex items-center gap-2 font-heading text-xl text-ink">
              <BookOpen className="h-5 w-5 text-gold" /> Reported Cases ({totalCases})
            </h2>
            {totalCases === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No reported cases yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
                {cases.map((lc: any, i: number) => lc.cases && (
                  <li key={`linked-${i}`} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <a href={lc.cases.saflii_url} target="_blank" rel="noopener noreferrer" className="font-heading text-sm font-semibold text-ink hover:text-gold">
                        {lc.cases.case_name} <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                      {lc.outcome && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          lc.outcome === "won" ? "bg-forest/15 text-forest" :
                          lc.outcome === "lost" ? "bg-destructive/15 text-destructive" :
                          "bg-muted text-muted-foreground"
                        }`}>{lc.outcome}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[lc.cases.citation, lc.cases.court, lc.cases.year, lc.role?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
                {reportedCases.map((rc: any) => (
                  <li key={`rep-${rc.id}`} className="p-4">
                    {rc.url ? (
                      <a href={rc.url} target="_blank" rel="noopener noreferrer" className="font-heading text-sm font-semibold text-ink hover:text-gold">
                        {rc.case_name} <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-heading text-sm font-semibold text-ink">{rc.case_name}</span>
                    )}
                    {(rc.citation || rc.court || rc.year) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[rc.citation, rc.court, rc.year].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {canEdit && (
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Status</h3>
              <p className="mt-2 text-sm capitalize text-foreground/80">
                {lawyer.status === "trial" ? "Listed (Trial)" : "Verified Listing"}
              </p>
              {lawyer.linkedin_url && (
                <a href={lawyer.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm text-forest hover:text-gold">
                  LinkedIn →
                </a>
              )}
            </div>
          )}

          {branches.length > 0 && (
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wider text-ink">
                <Building2 className="h-4 w-4 text-gold" /> {branches.length === 1 ? "Office" : "Offices"}
              </h3>
              <ul className="mt-3 space-y-3">
                {branches.map((b: any) => (
                  <li key={b.id} className="text-sm">
                    <p className="font-semibold text-ink">
                      {b.name}
                      {b.is_head_office && <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">Head Office</span>}
                    </p>
                    {(b.address || b.city || b.province) && (
                      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{[b.address, b.city, b.province].filter(Boolean).join(", ")}</span>
                      </p>
                    )}
                    {b.phone && (
                      <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="mt-0.5 flex items-center gap-1.5 text-xs text-forest hover:text-gold">
                        <Phone className="h-3 w-3" /> {b.phone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {showEnquiry && <EnquiryModal lawyerId={lawyer.id} onClose={() => setShowEnquiry(false)} />}
    </div>
  );
}

function EnquiryModal({ lawyerId, onClose }: { lawyerId: string; onClose: () => void }) {
  const [form, setForm] = useState({ sender_name: "", sender_email: "", message: "" });

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = enquirySchema.parse(form);
      const { error } = await supabase.from("enquiries").insert({ ...parsed, lawyer_id: lawyerId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enquiry sent."); onClose(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">Send an Enquiry</h3>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-4 space-y-3">
          <input required maxLength={100} placeholder="Your name" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <input required type="email" maxLength={255} placeholder="Your email" value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <textarea required maxLength={1000} rows={5} placeholder="Your message…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-ink">Cancel</button>
            <button type="submit" disabled={submit.isPending} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {submit.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
