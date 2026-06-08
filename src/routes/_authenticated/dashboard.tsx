import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Users, Wallet, FileText, Settings as SettingsIcon, Sparkles, X, Upload, Eye, Building2, Trash2, Star, Pencil, Stethoscope } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { PROVINCES, slugify } from "../../lib/constants";
import { ATTORNEY_DESIGNATIONS, yearsInPractice } from "../../lib/designation";
import { importLawyerProfile } from "../../lib/profile-import.functions";
import { fetchImageAsDataUrl } from "../../lib/fetch-image.functions";
import { RichTextEditor } from "../../components/RichTextEditor";
import { sanitizeBioHtml } from "../../lib/sanitize";
import { ImageCropModal } from "../../components/ImageCropModal";
import { createLawyerInvite } from "../../lib/lawyer-invite.functions";
import { ExpertWorkSamples } from "../../components/ExpertWorkSamples";
import { ExpertPhotoField } from "../../components/ExpertPhotoField";
import { LawyerFormModal, type LawyerRow } from "../../components/LawyerFormModal";
import { TagInput } from "../../components/TagInput";

type Branch = {
  id: string;
  firm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  is_head_office: boolean;
};

type Tab = "overview" | "lawyers" | "experts" | "billing" | "settings";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Firm Dashboard — Lawexpert.co.za" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab as Tab | undefined) ?? undefined,
    edit: typeof s.edit === "string" ? s.edit : undefined,
    firmId: typeof s.firmId === "string" ? s.firmId : undefined,
  }),
  component: Dashboard,
});

function Dashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const [tab, setTab] = useState<Tab>(search.tab ?? (search.edit ? "lawyers" : "overview"));
  const clearEditSearch = () => {
    if (!search.edit) return;
    navigate({ search: (prev: { tab?: Tab; edit?: string; firmId?: string }) => ({ ...prev, edit: undefined }) });
  };

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*, firms(*)").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const isPlatformAdmin = profile?.role === "platform_admin";

  const { data: overrideFirm } = useQuery({
    queryKey: ["override-firm", search.firmId],
    queryFn: async () => {
      if (!search.firmId) return null;
      const { data } = await supabase.from("firms").select("*").eq("id", search.firmId).maybeSingle();
      return data;
    },
    enabled: !!search.firmId && !!isPlatformAdmin,
  });

  const firm: any = search.firmId && isPlatformAdmin ? overrideFirm : profile?.firms;

  if (!profile) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!firm) {
    if (search.firmId && isPlatformAdmin) {
      return <div className="p-12 text-center text-muted-foreground">Loading firm…</div>;
    }
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">No firm linked to your account</h1>
        <p className="mt-2 text-muted-foreground">You haven't registered a firm yet.</p>
        <Link to="/register" className="mt-6 inline-block rounded bg-ink px-6 py-3 text-sm font-semibold text-cream">Register a Firm</Link>
        {isPlatformAdmin && (
          <p className="mt-4 text-sm"><Link to="/admin/firms" className="text-forest hover:text-gold">Or manage all firms →</Link></p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-cream">
      {isPlatformAdmin && search.firmId && (
        <div className="border-b border-gold/30 bg-gold/10">
          <div className="mx-auto max-w-7xl px-4 py-2 text-xs sm:px-6">
            <span className="text-ink">Platform admin · managing <strong>{firm.name}</strong></span>
          </div>
        </div>
      )}
      <div className="border-b border-cream/20 bg-ink">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl text-cream md:text-3xl">{firm.name}</h1>
              <p className="text-sm text-cream/70">
                Status: <span className="capitalize">{firm.status}</span>
                {firm.status === "pending" && " — awaiting Lawexpert.co.za review"}
              </p>
              {firm.status === "active" && (
                <Link to="/firms/$slug" params={{ slug: firm.slug }} className="text-sm font-medium text-cream/80 hover:text-gold">View public profile →</Link>
              )}
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
          <div className="mt-6 flex flex-wrap gap-1 border-b border-cream/20">
            {([
              { id: "overview", label: "Overview", icon: FileText },
              { id: "lawyers", label: "Lawyers", icon: Users },
              { id: "experts", label: "Expert Witnesses", icon: Stethoscope },
              { id: "billing", label: "Billing", icon: Wallet },
              { id: "settings", label: "Settings", icon: SettingsIcon },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-gold text-cream" : "border-transparent text-cream/60 hover:text-cream"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "overview" && <Overview firmId={firm.id} />}
        {tab === "lawyers" && <LawyersTab firmId={firm.id} editLawyerId={search.edit} onClearEditSearch={clearEditSearch} />}
        {tab === "experts" && <ExpertWitnessesTab firmId={firm.id} editExpertId={search.edit} onClearEditSearch={clearEditSearch} />}
        {tab === "billing" && <BillingTab firmId={firm.id} />}
        {tab === "settings" && <SettingsTab firm={firm} />}
      </div>
    </div>
  );
}

function Overview({ firmId }: { firmId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["firm-stats", firmId],
    queryFn: async () => {
      const { data } = await supabase.from("service_providers").select("status, profile_views").eq("firm_id", firmId);
      const lawyers = data ?? [];
      return {
        total: lawyers.length,
        trial: lawyers.filter((l) => l.status === "trial").length,
        active: lawyers.filter((l) => l.status === "active").length,
        pending: lawyers.filter((l) => l.status === "pending_payment").length,
        views: lawyers.reduce((s, l) => s + (l.profile_views ?? 0), 0),
      };
    },
  });

  const cards = [
    { label: "Total Lawyers", value: stats?.total ?? 0 },
    { label: "In Free Trial", value: stats?.trial ?? 0 },
    { label: "Active (Billing)", value: stats?.active ?? 0 },
    { label: "Monthly Cost", value: `R${(stats?.active ?? 0) * 160}` },
    { label: "Profile Views", value: stats?.views ?? 0 },
    { label: "Pending Payment", value: stats?.pending ?? 0 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-heading text-3xl text-ink">{c.value}</p>
        </div>
      ))}
    </div>
  );
}



function LawyersTab({ firmId, editLawyerId, onClearEditSearch }: { firmId: string; editLawyerId?: string; onClearEditSearch?: () => void }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LawyerRow | null>(null);
  const [inviting, setInviting] = useState<LawyerRow | null>(null);

  const { data: lawyers } = useQuery({
    queryKey: ["firm-lawyers-list", firmId],
    queryFn: async () => (await supabase.from("service_providers").select("*").eq("firm_id", firmId).order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (editLawyerId && lawyers && !editing) {
      const found = lawyers.find((l) => l.id === editLawyerId);
      if (found) setEditing(found as LawyerRow);
    }
  }, [editLawyerId, lawyers, editing]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lawyer removed"); qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "inactive" ? "trial" : "inactive";
      const { error } = await supabase.from("service_providers").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }),
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "is_mediator" | "is_arbitrator"; value: boolean }) => {
      const patch = field === "is_mediator" ? { is_mediator: value } : { is_arbitrator: value };
      const { error } = await supabase.from("service_providers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] });

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="font-heading text-xl text-ink">Lawyers ({lawyers?.length ?? 0})</h2>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
          <Plus className="h-4 w-4" /> Add Lawyer
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial Ends</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lawyers?.map((l) => {
              const daysLeft = l.trial_end_date ? Math.max(0, Math.ceil((new Date(l.trial_end_date).getTime() - Date.now()) / 86400000)) : null;
              return (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium text-ink">{l.first_name ?? ""} {l.last_name ?? ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.designation}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => toggleFlag.mutate({ id: l.id, field: "is_mediator", value: !l.is_mediator })}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${l.is_mediator ? "border-forest bg-forest text-white" : "border-border text-muted-foreground hover:border-forest"}`}
                        title="Toggle mediator role"
                      >
                        Mediator
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag.mutate({ id: l.id, field: "is_arbitrator", value: !l.is_arbitrator })}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${l.is_arbitrator ? "border-gold bg-gold text-white" : "border-border text-muted-foreground hover:border-gold"}`}
                        title="Toggle arbitrator role"
                      >
                        Arbitrator
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{l.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.status === "trial" ? `${daysLeft} days left` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.profile_views}</td>
                  <td className="px-4 py-3 text-right">
                    {l.slug && (l.status === "trial" || l.status === "active") && (
                      <a href={`/lawyers/${l.slug}`} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-gold">
                        <Eye className="h-3 w-3" /> Preview
                      </a>
                    )}
                    <button onClick={() => setEditing(l as LawyerRow)} className="mr-2 text-xs font-medium text-ink hover:text-gold">Edit</button>
                    <button onClick={() => setInviting(l as LawyerRow)} className="mr-2 text-xs font-medium text-forest hover:text-gold" disabled={!!l.profile_id} title={l.profile_id ? "Already claimed" : "Invite the lawyer to manage their own profile"}>
                      {l.profile_id ? "Claimed" : "Invite"}
                    </button>
                    <button onClick={() => toggle.mutate({ id: l.id, status: l.status ?? "trial" })} className="mr-2 text-xs text-forest hover:text-ink">
                      {l.status === "inactive" ? "Reactivate" : "Deactivate"}
                    </button>
                    <button onClick={() => { if (confirm("Delete this lawyer?")) remove.mutate(l.id); }} className="text-xs text-destructive">Delete</button>
                  </td>
                </tr>
              );
            })}
            {(!lawyers || lawyers.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No lawyers yet. Add your first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <LawyerFormModal firmId={firmId} onClose={() => setShowAdd(false)} onSaved={() => { refresh(); setShowAdd(false); }} />}
      {editing && <LawyerFormModal firmId={firmId} lawyer={editing} onClose={() => { setEditing(null); onClearEditSearch?.(); }} onSaved={() => { refresh(); setEditing(null); onClearEditSearch?.(); }} />}
      {inviting && <InviteLawyerModal lawyer={inviting} onClose={() => setInviting(null)} onSent={() => { refresh(); setInviting(null); }} />}
    </div>
  );
}

function BillingTab({ firmId }: { firmId: string }) {
  const { data: lawyers } = useQuery({
    queryKey: ["billing-lawyers", firmId],
    queryFn: async () => (await supabase.from("service_providers").select("first_name, last_name, status, trial_end_date, is_mediator, is_arbitrator").eq("firm_id", firmId)).data ?? [],
  });

  const { data: experts } = useQuery({
    queryKey: ["billing-experts", firmId],
    queryFn: async () => (await supabase.from("service_providers").select("first_name, last_name, status").eq("firm_id", firmId)).data ?? [],
  });

  const activeLawyers = lawyers?.filter((l) => l.status === "active") ?? [];
  const mediators = activeLawyers.filter((l) => l.is_mediator).length;
  const arbitrators = activeLawyers.filter((l) => l.is_arbitrator).length;
  const activeExperts = experts?.filter((e) => e.status === "active").length ?? 0;

  const RATE = 160;
  const lawyerTotal = activeLawyers.length * RATE;
  const expertTotal = activeExperts * RATE;
  const monthlyTotal = lawyerTotal + expertTotal;

  const lines = [
    { label: `${activeLawyers.length} active lawyer${activeLawyers.length === 1 ? "" : "s"} × R${RATE}`, amount: lawyerTotal },
    { label: `${activeExperts} expert witness${activeExperts === 1 ? "" : "es"} × R${RATE}`, amount: expertTotal },
  ];
  void mediators; void arbitrators;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="font-heading text-xl text-ink">Monthly Total</h2>
        <p className="mt-2 font-heading text-4xl text-gold">R{monthlyTotal}</p>
        <div className="mt-4 divide-y divide-border border-t border-border">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">{l.label}</span>
              <span className="font-medium text-ink">R{l.amount}</span>
            </div>
          ))}
        </div>
        <button className="mt-4 rounded border border-gold bg-transparent px-4 py-2 text-sm font-medium text-gold hover:bg-gold hover:text-white">
          Connect PayFast (coming soon)
        </button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Trial Expiry Schedule</h3>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {lawyers?.filter((l) => l.status === "trial").map((l, i) => (
              <tr key={i}>
                <td className="px-4 py-3">{l.first_name} {l.last_name}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  Trial ends {l.trial_end_date ? new Date(l.trial_end_date).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {lawyers?.filter((l) => l.status === "trial").length === 0 && (
              <tr><td className="px-4 py-6 text-center text-muted-foreground">No active trials</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Invoice history will appear here once PayFast is connected.
      </div>
    </div>
  );
}

const EXPERT_NAME_TITLES = ["", "Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof", "Adv", "Rev"] as const;

type ExpertRow = {
  id: string;
  first_name: string;
  last_name: string;
  name_title: string | null;
  job_title: string | null;
  slug: string;
  city: string | null;
  province: string | null;
  status: string;
  trial_end_date: string | null;
  profile_views: number;
  qualifications: string | null;
  registration_body: string | null;
  bio: string | null;
  avatar_url: string | null;
  company_name: string | null;
  office_phone: string | null;
  mobile_phone: string | null;
  contact_email: string | null;
  website_url?: string | null;
};

const expertSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  name_title: z.string().trim().max(40).optional(),
  title: z.string().trim().max(120).optional(),
  qualifications: z.string().trim().max(20000).optional(),
  registration_body: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]).optional(),
  bio: z.string().trim().max(20000).optional(),
  avatar_url: z.string().trim().max(2000).optional(),
  company_name: z.string().trim().max(200).optional(),
  office_phone: z.string().trim().max(40).optional(),
  mobile_phone: z.string().trim().max(40).optional(),
  contact_email: z.string().trim().max(200).optional(),
  website_url: z.string().trim().max(500).optional(),
});

function ExpertWitnessesTab({ firmId, editExpertId, onClearEditSearch }: { firmId: string; editExpertId?: string; onClearEditSearch?: () => void }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ExpertRow | null>(null);

  useEffect(() => {
    if (editExpertId && !editing) {
      // fetch on-demand so we can open immediately even if list not loaded
      supabase.from("service_providers").select("*").eq("id", editExpertId).maybeSingle().then(({ data }) => {
        if (data) setEditing(data as ExpertRow);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editExpertId]);

  const { data: experts } = useQuery({
    queryKey: ["firm-experts-list", firmId],
    queryFn: async () => (await supabase.from("service_providers").select("*").eq("firm_id", firmId).order("created_at", { ascending: false })).data ?? [],
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Expert removed"); qc.invalidateQueries({ queryKey: ["firm-experts-list", firmId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["firm-experts-list", firmId] });

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="font-heading text-xl text-ink">Expert Witnesses ({experts?.length ?? 0})</h2>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
          <Plus className="h-4 w-4" /> Add Expert Witness
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial Ends</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {experts?.map((e) => {
              const daysLeft = e.trial_end_date ? Math.max(0, Math.ceil((new Date(e.trial_end_date).getTime() - Date.now()) / 86400000)) : null;
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-ink">{[e.name_title, e.first_name, e.last_name].filter(Boolean).join(" ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.job_title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[e.city, e.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{e.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{e.status === "trial" ? `${daysLeft} days left` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.profile_views}</td>
                  <td className="px-4 py-3 text-right">
                    {(e.status === "trial" || e.status === "active") && (
                      <a href={`/expert-witnesses/${e.slug}`} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-gold">
                        <Eye className="h-3 w-3" /> Preview
                      </a>
                    )}
                    <button onClick={() => setEditing(e as ExpertRow)} className="mr-2 text-xs font-medium text-ink hover:text-gold">Edit</button>
                    <button onClick={() => { if (confirm("Delete this expert?")) remove.mutate(e.id); }} className="text-xs text-destructive">Delete</button>
                  </td>
                </tr>
              );
            })}
            {(!experts || experts.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No expert witnesses yet. Add your first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <ExpertFormModal firmId={firmId} onClose={() => setShowAdd(false)} onSaved={() => { refresh(); setShowAdd(false); }} />}
      {editing && <ExpertFormModal firmId={firmId} expert={editing} onClose={() => { setEditing(null); onClearEditSearch?.(); }} onSaved={() => { refresh(); setEditing(null); onClearEditSearch?.(); }} />}
    </div>
  );
}

function ExpertFormModal({ firmId, expert, onClose, onSaved }: { firmId: string; expert?: ExpertRow; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!expert;
  const [form, setForm] = useState({
    first_name: expert?.first_name ?? "",
    last_name: expert?.last_name ?? "",
    name_title: expert?.name_title ?? "",
    title: expert?.job_title ?? "",
    qualifications: expert?.qualifications ?? "",
    registration_body: expert?.registration_body ?? "",
    city: expert?.city ?? "",
    province: (expert?.province ?? "Gauteng") as string,
    bio: expert?.bio ?? "",
    avatar_url: expert?.avatar_url ?? "",
    company_name: expert?.company_name ?? "",
    office_phone: expert?.office_phone ?? "",
    mobile_phone: expert?.mobile_phone ?? "",
    contact_email: expert?.contact_email ?? "",
    website_url: expert?.website_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = expertSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        name_title: form.name_title?.trim() || null,
        job_title: form.title || null,
        qualifications: form.qualifications ? sanitizeBioHtml(form.qualifications) : null,
        registration_body: form.registration_body || null,
        city: form.city || null,
        province: form.province || null,
        bio: form.bio ? sanitizeBioHtml(form.bio) : null,
        avatar_url: form.avatar_url?.trim() || null,
        company_name: form.company_name?.trim() || null,
        office_phone: form.office_phone?.trim() || null,
        mobile_phone: form.mobile_phone?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        website_url: form.website_url?.trim() || null,
      };
      if (isEdit && expert) {
        const { error } = await supabase.from("service_providers").update(payload).eq("id", expert.id);
        if (error) throw error;
      } else {
        const baseSlug = slugify(`${form.first_name}-${form.last_name}`);
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
        const { error } = await supabase.from("service_providers").insert({ provider_type: 'expert',
          ...payload,
          firm_id: firmId,
          slug,
        });
        if (error) throw error;
      }
      toast.success(isEdit ? "Expert updated" : "Expert added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit" : "Add"} Expert Witness</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Photo">
            <ExpertPhotoField
              value={form.avatar_url}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
              firmId={firmId}
              expertId={expert?.id}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-[7rem_1fr_1fr]">
            <Field label="Title">
              <select value={form.name_title} onChange={(e) => setForm({ ...form, name_title: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                {EXPERT_NAME_TITLES.map((t) => <option key={t} value={t}>{t || "— none —"}</option>)}
              </select>
            </Field>
            <Field label="First name *"><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Last name *"><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Professional title (e.g. Orthopaedic Surgeon, Chartered Accountant)"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Company / practice name"><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="e.g. De Kroon Forensic Accounting" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Office phone"><input type="tel" value={form.office_phone} onChange={(e) => setForm({ ...form, office_phone: e.target.value })} placeholder="+27 21 555 0100" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Mobile phone"><input type="tel" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} placeholder="+27 82 555 0100" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Contact email"><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="expert@example.co.za" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Website URL (deep link to this profile on the expert's own site)"><input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.co.za/team/jane-doe" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Qualifications">
            <RichTextEditor value={form.qualifications} onChange={(html) => setForm({ ...form, qualifications: html })} placeholder="LLB, MBChB, FCS(SA)… use bullets for each qualification." />
          </Field>
          <Field label="Registration body (e.g. HPCSA)"><input value={form.registration_body} onChange={(e) => setForm({ ...form, registration_body: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="City"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Province">
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Bio / experience">
            <RichTextEditor value={form.bio} onChange={(html) => setForm({ ...form, bio: html })} placeholder="Background, areas of focus, notable experience…" />
          </Field>
          {isEdit && expert && (
            <Field label="Samples of work">
              <ExpertWorkSamples expertId={expert.id} />
            </Field>
          )}
          {!isEdit && (
            <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Save the expert first, then re-open to add samples of work.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add expert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function SettingsTab({ firm }: { firm: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: firm.name ?? "",
    description: firm.description ?? "",
    website: firm.website ?? "",
    phone: firm.phone ?? "",
    address: firm.address ?? "",
    city: firm.city ?? "",
    province: firm.province ?? "Gauteng",
    logo_url: firm.logo_url ?? "",
    logo_accent_color: firm.logo_accent_color ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const clean = {
        ...form,
        description: sanitizeBioHtml(form.description),
        logo_accent_color: form.logo_accent_color?.trim() ? form.logo_accent_color.trim() : null,
      };
      const { error } = await supabase.from("firms").update(clean).eq("id", firm.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3 rounded-md border border-border bg-card p-6">
        <h2 className="font-heading text-xl text-ink">Firm Settings</h2>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Firm name" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">About the firm</label>
          <RichTextEditor
            value={form.description}
            onChange={(html) => setForm({ ...form, description: html })}
            placeholder="Describe your firm — use headings, paragraphs, lists…"
          />
          <p className="mt-1 text-xs text-muted-foreground">Use H2 / H3 for section headings. Bold, italic and lists are supported.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo image URL</label>
          <div className="flex items-start gap-3">
            {form.logo_url && (
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="h-16 w-16 shrink-0 rounded border border-border bg-white object-contain p-1"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://yourfirm.co.za/logo.png"
              maxLength={2000}
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Paste a public URL to your firm logo. PNG or SVG with a transparent background works best.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo background colour</label>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-border"
              style={{ backgroundColor: form.logo_accent_color || "#f1f5f9" }}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-[11px] text-muted-foreground">Preview</span>
              )}
            </div>
            <input
              type="color"
              value={form.logo_accent_color || "#f1f5f9"}
              onChange={(e) => setForm({ ...form, logo_accent_color: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-background"
              aria-label="Pick logo background colour"
            />
            <input
              type="text"
              value={form.logo_accent_color}
              onChange={(e) => setForm({ ...form, logo_accent_color: e.target.value })}
              placeholder="#0F172A"
              maxLength={7}
              className="w-32 rounded border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            {form.logo_accent_color && (
              <button
                type="button"
                onClick={() => setForm({ ...form, logo_accent_color: "" })}
                className="rounded border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:text-ink"
              >
                Reset
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Pick a background colour for the logo tile. Ideal for plain-white logos that disappear on the default light tile. Leave empty to use the default.</p>
        </div>

        <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Main phone" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Main address" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">City and province auto-apply to lawyers linked only to the head office.</p>

        <button type="submit" disabled={save.isPending} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">
          {save.isPending ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <BranchesManager firmId={firm.id} />
    </div>
  );
}

function BranchesManager({ firmId }: { firmId: string }) {
  const qc = useQueryClient();
  const { data: branches } = useQuery({
    queryKey: ["firm-branches", firmId],
    queryFn: async () => {
      const { data } = await supabase
        .from("firm_branches")
        .select("*")
        .eq("firm_id", firmId)
        .order("is_head_office", { ascending: false })
        .order("created_at", { ascending: true });
      return (data ?? []) as Branch[];
    },
  });

  const [editing, setEditing] = useState<Branch | null>(null);
  const [adding, setAdding] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("firm_branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Branch removed"); qc.invalidateQueries({ queryKey: ["firm-branches", firmId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl text-ink">Branches</h2>
          <p className="text-xs text-muted-foreground">Head office plus any additional offices. Lawyers can belong to one or more branches.</p>
        </div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream hover:bg-ink/90">
          <Plus className="h-3.5 w-3.5" /> Add branch
        </button>
      </div>

      <div className="divide-y divide-border rounded border border-border">
        {(branches ?? []).map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {b.is_head_office && <Star className="h-3.5 w-3.5 text-gold" />}
                <p className="text-sm font-semibold text-ink">{b.name}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[b.address, b.city, b.province].filter(Boolean).join(", ") || "No address set"}
                {b.phone ? ` · ${b.phone}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setEditing(b)} className="text-xs font-medium text-ink hover:text-gold">Edit</button>
              {!b.is_head_office && (
                <button onClick={() => { if (confirm("Delete this branch?")) remove.mutate(b.id); }} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {(!branches || branches.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground">No branches yet.</div>
        )}
      </div>

      {(adding || editing) && (
        <BranchFormModal
          firmId={firmId}
          branch={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["firm-branches", firmId] }); }}
        />
      )}
    </div>
  );
}

function BranchFormModal({
  firmId,
  branch,
  onClose,
  onSaved,
}: {
  firmId: string;
  branch?: Branch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!branch;
  const [form, setForm] = useState({
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    city: branch?.city ?? "",
    province: branch?.province ?? "Gauteng",
    phone: branch?.phone ?? "",
    is_head_office: branch?.is_head_office ?? false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      // If marking as head office, clear the flag on any existing head office
      if (form.is_head_office) {
        const { error: clearErr } = await supabase
          .from("firm_branches")
          .update({ is_head_office: false })
          .eq("firm_id", firmId)
          .neq("id", branch?.id ?? "00000000-0000-0000-0000-000000000000");
        if (clearErr) throw clearErr;
      }
      if (isEdit && branch) {
        const { error } = await supabase.from("firm_branches").update(form).eq("id", branch.id);
        if (error) throw error;
        toast.success("Branch updated");
      } else {
        const { error } = await supabase.from("firm_branches").insert({ ...form, firm_id: firmId });
        if (error) throw error;
        toast.success("Branch added");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Branch" : "Add Branch"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Branch name (e.g. Cape Town Office)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <input placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_head_office} onChange={(e) => setForm({ ...form, is_head_office: e.target.checked })} />
            Head office
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save" : "Add"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}



function InviteLawyerModal({ lawyer, onClose, onSent }: { lawyer: LawyerRow; onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState(lawyer.email ?? "");
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const inviteFn = useServerFn(createLawyerInvite);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error("Enter a valid email"); return; }
    setSending(true);
    try {
      const res = await inviteFn({ data: { service_provider_id: lawyer.id, email } });
      const url = `${window.location.origin}/claim?token=${res.token}`;
      setInviteUrl(url);
      toast.success("Invite created — share the link below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl text-ink">Invite {lawyer.first_name} {lawyer.last_name}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!inviteUrl ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              They'll be able to sign in with this email and manage their own profile sections (Overview, Qualifications, Articles, etc.).
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lawyer@firm.co.za"
              maxLength={255}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={sending} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
                {sending ? "Creating…" : "Create invite link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink">Share this single-use link with the lawyer (valid for 7 days):</p>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl} className="flex-1 rounded border border-border bg-background px-3 py-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Copied"); }} className="rounded bg-gold px-3 py-2 text-xs font-semibold text-white">Copy</button>
            </div>
            <p className="text-xs text-muted-foreground">Email delivery isn't active yet on this project — paste the link into an email or message to the lawyer.</p>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onSent} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

