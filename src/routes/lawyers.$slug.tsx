import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, MapPin, Building2, Mail, Pencil, Phone, Linkedin, Globe } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { sanitizeBioHtml } from "../lib/sanitize";
import { formatDesignation, headBadges, designationKind } from "../lib/designation";
import { BrandStrandDivider } from "../components/BrandMark";

export const Route = createFileRoute("/lawyers/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Lawexpert.co.za` },
      { name: "description", content: "South African legal professional profile on Lawexpert.co.za — practice areas, experience and contact details." },
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
        .from("service_providers")
        .select(`*, firms(name, slug, city, province), provider_practice_areas(practice_areas(name, slug)), provider_cases(role, outcome, cases(case_name, citation, court, year, saflii_url)), provider_reported_cases(id, case_name, citation, court, year, url, sort_order), provider_branches(firm_branches(id, name, address, city, province, phone, is_head_office))`)
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

  const contact = lawyer ? {
    email: lawyer.email as string | null,
    office_phone: (lawyer.office_phone as string | null) ?? null,
    mobile_phone: (lawyer.mobile_phone as string | null) ?? (lawyer.phone as string | null) ?? null,
  } : null;


  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!lawyer) return null;

  const isPlatformAdmin = viewer?.role === "platform_admin";
  const canEdit = isPlatformAdmin || (!!viewer?.firm_id && lawyer.firm_id === viewer.firm_id);

  const areas = lawyer.provider_practice_areas?.map((x: any) => x.practice_areas).filter(Boolean) ?? [];
  const cases = (lawyer.provider_cases ?? []).slice().sort((a: any, b: any) => (b.cases?.year ?? 0) - (a.cases?.year ?? 0));
  const reportedCases = (lawyer.provider_reported_cases ?? []).slice().sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0));
  const totalCases = cases.length + reportedCases.length;
  const branches = (lawyer.provider_branches ?? [])
    .map((x: any) => x.firm_branches)
    .filter(Boolean);

  return (
    <div className="bg-paper-ivory">
      {/* Header */}
      <section className="relative bg-brand-deep py-16 text-paper-ivory">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {lawyer.avatar_url ? (
              <img
                src={lawyer.avatar_url}
                alt={`${lawyer.first_name} ${lawyer.last_name}`}
                className="h-64 w-52 shrink-0 rounded object-cover object-top ring-1 ring-paper-ivory/25 sm:h-80 sm:w-60 md:h-[22rem] md:w-64"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-64 w-52 shrink-0 items-center justify-center rounded bg-paper-ivory/10 font-heading text-5xl text-paper-ivory ring-1 ring-paper-ivory/25 sm:h-80 sm:w-60 md:h-[22rem] md:w-64">
                {lawyer.first_name[0]}{lawyer.last_name[0]}
              </div>
            )}

            <div className="flex-1">
              <p className="eyebrow mb-2 text-paper-ivory/75">
                {designationKind(lawyer.provider_type === "advocate" ? "advocate" : lawyer.designation) === "advocate"
                  ? "[Advocate]"
                  : lawyer.is_mediator || lawyer.is_arbitrator
                    ? "[Professional]"
                    : "[Attorney]"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-3xl md:text-4xl">{lawyer.first_name} {lawyer.last_name}{lawyer.is_senior_counsel ? " SC" : ""}</h1>
                {(() => {
                  const isPureMedArb =
                    !lawyer.firm_id &&
                    lawyer.provider_type !== "advocate" &&
                    lawyer.provider_type !== "attorney" &&
                    (lawyer.is_mediator || lawyer.is_arbitrator);
                  if (isPureMedArb) {
                    // Pure mediator / arbitrator — do NOT label as Attorney or Advocate.
                    return null;
                  }
                  const label = formatDesignation(lawyer);
                  if (!label) return null;
                  const isAdv = designationKind(lawyer.provider_type === "advocate" ? "advocate" : lawyer.designation) === "advocate";
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-paper-ivory/10 px-3 py-1 font-mono text-xs text-paper-ivory ring-1 ring-inset ring-paper-ivory/25">
                      {isAdv ? "Advocate" : "Attorney"} · {label}
                    </span>
                  );
                })()}
                {lawyer.is_mediator && (
                  <span className="inline-flex items-center rounded-[3px] bg-paper-ivory/10 px-3 py-1 font-mono text-xs text-paper-ivory ring-1 ring-inset ring-paper-ivory/25">Mediator</span>
                )}
                {lawyer.is_arbitrator && (
                  <span className="inline-flex items-center rounded-[3px] bg-paper-ivory/10 px-3 py-1 font-mono text-xs text-paper-ivory ring-1 ring-inset ring-paper-ivory/25">Arbitrator</span>
                )}
                {headBadges(lawyer).map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-[3px] bg-paper-ivory/10 px-3 py-1 font-mono text-xs text-paper-ivory ring-1 ring-inset ring-paper-ivory/25">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[13px] text-paper-ivory/75">
                {lawyer.firms && (
                  <Link to="/firms/$slug" params={{ slug: lawyer.firms.slug }} className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Building2 className="h-4 w-4" /> {lawyer.firms.name}
                  </Link>
                )}
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {lawyer.city}, {lawyer.province}</span>
                {contact?.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Mail className="h-4 w-4" /> {contact.email}
                  </a>
                )}
                {contact?.office_phone && (
                  <a href={`tel:${contact.office_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Phone className="h-4 w-4" /> <span className="text-paper-ivory/50">Office</span> {contact.office_phone}
                  </a>
                )}
                {contact?.mobile_phone && (
                  <a href={`tel:${contact.mobile_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Phone className="h-4 w-4" /> <span className="text-paper-ivory/50">Mobile</span> {contact.mobile_phone}
                  </a>
                )}

                {lawyer.linkedin_url && (
                  <a href={lawyer.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
                {lawyer.website_url && (
                  <a href={lawyer.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-paper-ivory">
                    <Globe className="h-4 w-4" /> Visit website
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canEdit && (
                lawyer.provider_type === "advocate" && !lawyer.firm_id && isPlatformAdmin ? (
                  <Link
                    to="/admin/advocates"
                    search={{ edit: lawyer.id }}
                    className="rounded bg-paper-ivory/10 px-5 py-2.5 text-sm font-medium text-paper-ivory ring-1 ring-paper-ivory/30 transition-colors hover:bg-paper-ivory/20"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit Profile
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    search={{ tab: "lawyers", edit: lawyer.id, ...(isPlatformAdmin && lawyer.firm_id ? { firmId: lawyer.firm_id } : {}) }}
                    className="rounded bg-paper-ivory/10 px-5 py-2.5 text-sm font-medium text-paper-ivory ring-1 ring-paper-ivory/30 transition-colors hover:bg-paper-ivory/20"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" /> Edit Profile
                  </Link>
                )
              )}
              <button onClick={() => setShowEnquiry(true)} className="rounded bg-paper-ivory px-5 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-white">
                <Mail className="mr-2 inline h-4 w-4" /> Send Enquiry
              </button>
            </div>
          </div>
        </div>
        <BrandStrandDivider />
      </section>

      {!lawyer.is_claimed && !lawyer.profile_id && (
        <div className="border-b border-rule bg-brand-tint/40">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-ink">
              Are you <strong>{lawyer.first_name} {lawyer.last_name}</strong>? Take control of this listing.
            </p>
            <Link
              to="/claim-profile"
              search={{ provider: lawyer.slug ?? "" } as never}
              className="rounded bg-brand-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Claim this profile →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {areas.length > 0 && (
            <section>
              <h2 className="font-heading text-xl text-ink">Practice Areas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {areas.map((a: any) => (
                  <span key={a.slug} className="rounded-[3px] bg-brand-tint px-3 py-1 text-xs font-medium text-brand-primary">{a.name}</span>
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

          {lawyer.services && lawyer.services.length > 0 && (
            <section>
              <h2 className="font-heading text-xl text-ink">Services</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lawyer.services.map((s: string) => (
                  <span key={s} className="rounded-[3px] bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand-primary">{s}</span>
                ))}
              </div>
            </section>
          )}




          {lawyer.education && (
            <section>
              <h2 className="font-heading text-xl text-ink">Education & Admissions</h2>
              <p className="mt-3 whitespace-pre-line text-foreground/80">{lawyer.education}</p>
            </section>
          )}

          {lawyer.is_mediator && (lawyer.mediator_accreditation || lawyer.mediator_style || (lawyer.mediator_sectors?.length ?? 0) > 0 || lawyer.availability_notes) && (
            <section>
              <h2 className="font-heading text-xl text-ink">Mediation</h2>
              <div className="mt-3 grid gap-3 rounded border border-rule bg-paper-white p-4 text-sm sm:grid-cols-2">
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
                        <span key={s} className="rounded-[3px] bg-brand-tint px-2 py-0.5 text-xs text-brand-primary">{s}</span>
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

          {lawyer.is_arbitrator && (lawyer.arbitrator_accreditation || typeof lawyer.arbitrator_experience_years === "number" || (lawyer.arbitrator_types?.length ?? 0) > 0 || lawyer.daily_rate_range || (lawyer.languages?.length ?? 0) > 0) && (
            <section>
              <h2 className="font-heading text-xl text-ink">Arbitration</h2>
              <div className="mt-3 grid gap-3 rounded border border-rule bg-paper-white p-4 text-sm sm:grid-cols-2">
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
                        <span key={s} className="rounded-[3px] bg-brand-tint px-2 py-0.5 text-xs text-brand-primary">{s}</span>
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
            <h2 className="font-heading text-xl text-ink">Reported Cases <span className="font-mono text-base text-ink-muted">[{totalCases}]</span></h2>
            {totalCases === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No reported cases yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-rule rounded border border-rule bg-paper-white">
                {cases.map((lc: any, i: number) => lc.cases && (
                  <li key={`linked-${i}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
                    <div className="min-w-0 flex-1">
                      <a href={lc.cases.saflii_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink transition-colors hover:text-brand-hover">
                        {lc.cases.case_name} <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        {[lc.cases.court, lc.role?.replace(/_/g, " "), lc.outcome].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {(lc.cases.citation || lc.cases.year) && (
                      lc.cases.saflii_url ? (
                        <a href={lc.cases.saflii_url} target="_blank" rel="noopener noreferrer" className="citation-chip self-start sm:self-auto">
                          {lc.cases.citation ?? lc.cases.year}
                        </a>
                      ) : (
                        <span className="citation-chip self-start sm:self-auto">{lc.cases.citation ?? lc.cases.year}</span>
                      )
                    )}
                  </li>
                ))}
                {reportedCases.map((rc: any) => (
                  <li key={`rep-${rc.id}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
                    <div className="min-w-0 flex-1">
                      {rc.url ? (
                        <a href={rc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink transition-colors hover:text-brand-hover">
                          {rc.case_name} <ExternalLink className="ml-1 inline h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-ink">{rc.case_name}</span>
                      )}
                      {(rc.court || rc.year) && (
                        <p className="mt-1 font-mono text-xs text-ink-muted">
                          {[rc.court, rc.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {rc.citation && (
                      rc.url ? (
                        <a href={rc.url} target="_blank" rel="noopener noreferrer" className="citation-chip self-start sm:self-auto">{rc.citation}</a>
                      ) : (
                        <span className="citation-chip self-start sm:self-auto">{rc.citation}</span>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {canEdit && (
            <div className="rounded border border-rule bg-paper-white p-5">
              <h3 className="eyebrow text-ink">Status</h3>
              <p className="mt-2 text-sm capitalize text-foreground/80">
                {lawyer.status === "trial" ? "Listed (Trial)" : "Active Listing"}
              </p>
              {lawyer.linkedin_url && (
                <a href={lawyer.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm text-brand-primary transition-colors hover:text-brand-hover">
                  LinkedIn →
                </a>
              )}
            </div>
          )}

          {branches.length > 0 && (
            <div className="rounded border border-rule bg-paper-white p-5">
              <h3 className="eyebrow flex items-center gap-2 text-ink">
                <Building2 className="h-4 w-4 text-brand-primary" /> {branches.length === 1 ? "Office" : "Offices"}
              </h3>
              <ul className="mt-3 space-y-3">
                {branches.map((b: any) => (
                  <li key={b.id} className="text-sm">
                    <p className="font-semibold text-ink">
                      {b.name}
                      {b.is_head_office && <span className="ml-2 rounded-[3px] bg-brand-tint px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-brand-primary">Head Office</span>}
                    </p>
                    {(b.address || b.city || b.province) && (
                      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{[b.address, b.city, b.province].filter(Boolean).join(", ")}</span>
                      </p>
                    )}
                    {b.phone && (
                      <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-primary transition-colors hover:text-brand-hover">
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
      const { error } = await supabase.from("enquiries").insert({ ...parsed, service_provider_id: lawyerId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enquiry sent."); onClose(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="panel-elevated w-full max-w-md rounded bg-paper-white p-6">
        <h3 className="font-heading text-xl text-ink">Send an Enquiry</h3>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-4 space-y-3">
          <input required maxLength={100} placeholder="Your name" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} className="w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          <input required type="email" maxLength={255} placeholder="Your email" value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} className="w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          <textarea required maxLength={1000} rows={5} placeholder="Your message…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-ink-muted hover:text-ink">Cancel</button>
            <button type="submit" disabled={submit.isPending} className="rounded bg-brass px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] disabled:opacity-50">
              {submit.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
