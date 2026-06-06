import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Users, Wallet, FileText, Settings as SettingsIcon, Sparkles, X, Upload, Eye, Building2, Trash2, Star } from "lucide-react";
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

type Tab = "overview" | "lawyers" | "billing" | "settings";

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
      {isPlatformAdmin && (
        <div className="border-b border-gold/30 bg-gold/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6">
            <span className="text-ink">
              {search.firmId ? <>Platform admin · managing <strong>{firm.name}</strong></> : <>Platform admin</>}
            </span>
            <Link to="/admin/firms" className="font-medium text-forest hover:text-gold">← All firms</Link>
          </div>
        </div>
      )}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl text-ink md:text-3xl">{firm.name}</h1>
              <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize">{firm.status}</span>
                {firm.status === "pending" && " — awaiting Lawexpert.co.za review"}
              </p>
            </div>
            {firm.status === "active" && (
              <Link to="/firms/$slug" params={{ slug: firm.slug }} className="text-sm font-medium text-forest hover:text-gold">View public profile →</Link>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
            {([
              { id: "overview", label: "Overview", icon: FileText },
              { id: "lawyers", label: "Lawyers", icon: Users },
              { id: "billing", label: "Billing", icon: Wallet },
              { id: "settings", label: "Settings", icon: SettingsIcon },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-gold text-ink" : "border-transparent text-muted-foreground hover:text-ink"
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
      const { data } = await supabase.from("lawyers").select("status, profile_views").eq("firm_id", firmId);
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
    { label: "Monthly Cost", value: `R${(stats?.active ?? 0) * 99}` },
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

const CURRENT_YEAR = new Date().getFullYear();

const lawyerSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  designation: z.string().trim().max(120).optional(),
  lawyer_type: z.enum(["advocate", "attorney"]).nullable().optional(),
  year_of_admission: z.number().int().min(1900).max(CURRENT_YEAR).nullable().optional(),
  is_senior_counsel: z.boolean().optional(),
  designation_code: z.string().trim().max(80).nullable().optional(),
  designation_custom: z.string().trim().max(120).nullable().optional(),
  is_practice_head: z.boolean().optional(),
  practice_head_area: z.string().trim().max(120).nullable().optional(),
  is_sector_head: z.boolean().optional(),
  sector_head_area: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(1).max(80),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]),
  bio: z.string().max(20000).optional(),
  overview: z.string().max(20000).optional(),
  qualifications: z.string().max(20000).optional(),
  accolades: z.string().max(20000).optional(),
  noteworthy_matters: z.string().max(20000).optional(),
  reported_cases_notes: z.string().max(20000).optional(),
  avatar_url: z.string().trim().url().max(2000).or(z.literal("")).optional(),
  email: z.string().trim().email().max(200).or(z.literal("")).optional(),
  phone: z.string().trim().max(60).or(z.literal("")).optional(),
  linkedin_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((u) => /linkedin\.com/i.test(u), { message: "Must be a LinkedIn URL" })
    .or(z.literal(""))
    .optional(),
});

type LawyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  designation: string | null;
  lawyer_type: string | null;
  year_of_admission: number | null;
  is_senior_counsel: boolean | null;
  designation_code: string | null;
  designation_custom: string | null;
  is_practice_head: boolean | null;
  practice_head_area: string | null;
  is_sector_head: boolean | null;
  sector_head_area: string | null;
  city: string | null;
  province: string | null;
  bio: string | null;
  overview: string | null;
  qualifications: string | null;
  accolades: string | null;
  noteworthy_matters: string | null;
  reported_cases_notes: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  status: string | null;
  trial_end_date: string | null;
  profile_views: number | null;
  profile_id?: string | null;
  slug?: string | null;
};


function LawyersTab({ firmId, editLawyerId, onClearEditSearch }: { firmId: string; editLawyerId?: string; onClearEditSearch?: () => void }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LawyerRow | null>(null);
  const [inviting, setInviting] = useState<LawyerRow | null>(null);

  const { data: lawyers } = useQuery({
    queryKey: ["firm-lawyers-list", firmId],
    queryFn: async () => (await supabase.from("lawyers").select("*").eq("firm_id", firmId).order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (editLawyerId && lawyers && !editing) {
      const found = lawyers.find((l) => l.id === editLawyerId);
      if (found) setEditing(found as LawyerRow);
    }
  }, [editLawyerId, lawyers, editing]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lawyers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lawyer removed"); qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "inactive" ? "trial" : "inactive";
      const { error } = await supabase.from("lawyers").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }),
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
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No lawyers yet. Add your first.</td></tr>
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

function LawyerFormModal({
  firmId,
  lawyer,
  onClose,
  onSaved,
}: {
  firmId: string;
  lawyer?: LawyerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lawyer;
  const initialOtherCode =
    !!lawyer?.designation_code &&
    !(ATTORNEY_DESIGNATIONS as readonly string[]).includes(lawyer.designation_code);
  const [otherDesignation, setOtherDesignation] = useState<boolean>(initialOtherCode);
  const [form, setForm] = useState({
    first_name: lawyer?.first_name ?? "",
    last_name: lawyer?.last_name ?? "",
    designation: lawyer?.designation ?? "",
    lawyer_type: (lawyer?.lawyer_type as "advocate" | "attorney" | null) ?? "attorney",
    year_of_admission: lawyer?.year_of_admission ?? null,
    is_senior_counsel: !!lawyer?.is_senior_counsel,
    designation_code: initialOtherCode ? "" : (lawyer?.designation_code ?? ""),
    designation_custom: lawyer?.designation_custom ?? (initialOtherCode ? (lawyer?.designation_code ?? "") : ""),
    is_practice_head: !!lawyer?.is_practice_head,
    practice_head_area: lawyer?.practice_head_area ?? "",
    is_sector_head: !!lawyer?.is_sector_head,
    sector_head_area: lawyer?.sector_head_area ?? "",
    city: lawyer?.city ?? "",
    province: lawyer?.province ?? "Gauteng",
    bio: lawyer?.bio ?? "",
    overview: lawyer?.overview ?? lawyer?.bio ?? "",
    qualifications: lawyer?.qualifications ?? "",
    accolades: lawyer?.accolades ?? "",
    noteworthy_matters: lawyer?.noteworthy_matters ?? "",
    reported_cases_notes: lawyer?.reported_cases_notes ?? "",
    avatar_url: lawyer?.avatar_url ?? "",
    email: lawyer?.email ?? "",
    phone: lawyer?.phone ?? "",
    linkedin_url: lawyer?.linkedin_url ?? "",
  });

  const [practiceAreas, setPracticeAreas] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [allPracticeAreas, setAllPracticeAreas] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [firmBranches, setFirmBranches] = useState<Branch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const importFn = useServerFn(importLawyerProfile);
  const fetchImageFn = useServerFn(fetchImageAsDataUrl);
  const [loadingUrlCrop, setLoadingUrlCrop] = useState(false);

  // Load firm branches
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("firm_branches")
        .select("*")
        .eq("firm_id", firmId)
        .order("is_head_office", { ascending: false })
        .order("created_at", { ascending: true });
      setFirmBranches((data ?? []) as Branch[]);
    })();
  }, [firmId]);

  // Load all practice areas (for selection)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("practice_areas")
        .select("id, slug, name")
        .order("name", { ascending: true });
      setAllPracticeAreas((data ?? []) as { id: string; slug: string; name: string }[]);
    })();
  }, []);

  // Load lawyer's existing branch links
  useEffect(() => {
    if (!lawyer) return;
    (async () => {
      const { data } = await supabase
        .from("lawyer_branches")
        .select("branch_id")
        .eq("lawyer_id", lawyer.id);
      setSelectedBranchIds(new Set((data ?? []).map((r) => r.branch_id)));
    })();
  }, [lawyer]);

  const toggleBranch = (branchId: string) => {
    const next = new Set(selectedBranchIds);
    if (next.has(branchId)) next.delete(branchId);
    else next.add(branchId);
    setSelectedBranchIds(next);
    // Auto-fill city/province from first selected branch
    const firstId = next.values().next().value as string | undefined;
    const first = firstId ? firmBranches.find((b) => b.id === firstId) : undefined;
    if (first) {
      setForm((f) => ({
        ...f,
        city: first.city || f.city,
        province: (first.province as string) || f.province,
      }));
    }
  };


  const handleRepositionUrl = async () => {
    const url = form.avatar_url?.trim();
    if (!url) {
      toast.error("Enter or paste an image URL first");
      return;
    }
    setLoadingUrlCrop(true);
    try {
      const { dataUrl } = await fetchImageFn({ data: { url } });
      setCropSrc(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load image");
    } finally {
      setLoadingUrlCrop(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `${firmId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("lawyer-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("lawyer-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
      setForm((f) => ({ ...f, avatar_url: signed.signedUrl }));
      toast.success("Photo uploaded");
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Load existing practice areas when editing
  useEffect(() => {
    if (!lawyer) return;
    (async () => {
      const { data } = await supabase
        .from("lawyer_practice_areas")
        .select("practice_areas(id, slug, name)")
        .eq("lawyer_id", lawyer.id);
      const rows = (data ?? [])
        .map((r: { practice_areas: { id: string; slug: string; name: string } | null }) => r.practice_areas)
        .filter((p): p is { id: string; slug: string; name: string } => !!p);
      setPracticeAreas(rows);
    })();
  }, [lawyer]);

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImported(false);
    try {
      const res = await importFn({ data: { url: importUrl.trim() } });
      setForm((f) => ({
        ...f,
        first_name: res.first_name || f.first_name,
        last_name: res.last_name || f.last_name,
        designation: res.designation || f.designation,
        city: res.city || f.city,
        province: res.province || f.province,
        bio: res.bio || f.bio,
        avatar_url: res.avatar_url || f.avatar_url,
        email: res.email || f.email,
        phone: res.phone || f.phone,
        linkedin_url: res.linkedin_url || f.linkedin_url,
      }));
      setPracticeAreas(res.practice_areas);

      setImported(true);
      toast.success("Profile imported — please review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const syncPracticeAreas = async (lawyerId: string) => {
    const { error: delErr } = await supabase.from("lawyer_practice_areas").delete().eq("lawyer_id", lawyerId);
    if (delErr) throw delErr;
    if (practiceAreas.length === 0) return;
    const links = practiceAreas.map((p) => ({ lawyer_id: lawyerId, practice_area_id: p.id }));
    const { error } = await supabase.from("lawyer_practice_areas").insert(links);
    if (error) throw error;
  };

  const syncBranches = async (lawyerId: string) => {
    const { error: delErr } = await supabase.from("lawyer_branches").delete().eq("lawyer_id", lawyerId);
    if (delErr) throw delErr;
    if (selectedBranchIds.size === 0) return;
    const links = Array.from(selectedBranchIds).map((branch_id) => ({ lawyer_id: lawyerId, branch_id }));
    const { error } = await supabase.from("lawyer_branches").insert(links);
    if (error) throw error;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Normalise structured designation fields by type
      const isAdvocate = form.lawyer_type === "advocate";
      const normalised = {
        ...form,
        designation_code: isAdvocate ? null : (otherDesignation ? null : (form.designation_code || null)),
        designation_custom: isAdvocate ? null : (otherDesignation ? (form.designation_custom || null) : null),
        is_senior_counsel: isAdvocate ? form.is_senior_counsel : false,
        is_practice_head: !isAdvocate && form.designation_code === "Director" ? form.is_practice_head : false,
        practice_head_area: !isAdvocate && form.designation_code === "Director" && form.is_practice_head ? (form.practice_head_area || null) : null,
        is_sector_head: !isAdvocate && form.designation_code === "Director" ? form.is_sector_head : false,
        sector_head_area: !isAdvocate && form.designation_code === "Director" && form.is_sector_head ? (form.sector_head_area || null) : null,
      };
      // Keep the legacy `designation` text in sync for views/lists that haven't migrated
      const legacyDesignation = isAdvocate
        ? (normalised.is_senior_counsel ? "Senior Counsel" : "Advocate")
        : (normalised.designation_code || normalised.designation_custom || "Attorney");

      const parsed = lawyerSchema.parse({
        ...normalised,
        designation: legacyDesignation,
        bio: sanitizeBioHtml(form.bio),
        overview: sanitizeBioHtml(form.overview),
        qualifications: sanitizeBioHtml(form.qualifications),
        accolades: sanitizeBioHtml(form.accolades),
        noteworthy_matters: sanitizeBioHtml(form.noteworthy_matters),
        reported_cases_notes: sanitizeBioHtml(form.reported_cases_notes),
      });
      if (isEdit && lawyer) {
        const { error } = await supabase.from("lawyers").update(parsed).eq("id", lawyer.id);
        if (error) throw error;
        await syncPracticeAreas(lawyer.id);
        await syncBranches(lawyer.id);
        toast.success("Profile updated");
      } else {
        const slug = `${slugify(`${parsed.first_name}-${parsed.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error } = await supabase
          .from("lawyers")
          .insert({ ...parsed, firm_id: firmId, slug, status: "trial" })
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) {
          await syncPracticeAreas(inserted.id);
          await syncBranches(inserted.id);
        }
        toast.success("Lawyer added");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-[90vw] flex-col overflow-hidden rounded-lg bg-card shadow-xl md:w-[70vw]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Lawyer" : "Add Lawyer"}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">


        <div className="mt-4 rounded-md border border-dashed border-gold/60 bg-gold/5 p-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Import from website (optional)
          </label>
          <p className="mt-1 text-xs text-muted-foreground">Paste a link to the lawyer's bio on your firm site and AI will fill the form.</p>
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              placeholder="https://yourfirm.co.za/team/jane-doe"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importing}
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              className="rounded bg-gold px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          {imported && <p className="mt-2 text-xs text-forest">Imported — please review fields below before saving.</p>}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="rounded-md border border-border bg-background p-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lawyer type</label>
              <div className="flex gap-2">
                {(["attorney", "advocate"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, lawyer_type: t })}
                    className={`flex-1 rounded border px-3 py-2 text-sm capitalize transition-colors ${
                      form.lawyer_type === t ? "border-gold bg-gold/15 text-ink" : "border-border bg-card text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {form.lawyer_type === "advocate" ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_senior_counsel}
                    onChange={(e) => setForm({ ...form, is_senior_counsel: e.target.checked })}
                    className="accent-gold"
                  />
                  Senior Counsel (SC)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Year of admission</label>
                    <input
                      type="number"
                      min={1900}
                      max={CURRENT_YEAR}
                      placeholder="e.g. 2008"
                      value={form.year_of_admission ?? ""}
                      onChange={(e) => setForm({ ...form, year_of_admission: e.target.value ? Number(e.target.value) : null })}
                      className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Years in practice</label>
                    <div className="rounded border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {yearsInPractice(form.year_of_admission) ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Designation</label>
                  <select
                    value={otherDesignation ? "__other__" : form.designation_code}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__other__") {
                        setOtherDesignation(true);
                        setForm({ ...form, designation_code: "" });
                      } else {
                        setOtherDesignation(false);
                        setForm({ ...form, designation_code: v, designation_custom: "" });
                      }
                    }}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {ATTORNEY_DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    <option value="__other__">Other (specify)</option>
                  </select>
                </div>
                {otherDesignation && (
                  <input
                    placeholder="Custom designation"
                    value={form.designation_custom}
                    onChange={(e) => setForm({ ...form, designation_custom: e.target.value })}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  />
                )}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Year of admission (optional)</label>
                  <input
                    type="number"
                    min={1900}
                    max={CURRENT_YEAR}
                    placeholder="e.g. 2015"
                    value={form.year_of_admission ?? ""}
                    onChange={(e) => setForm({ ...form, year_of_admission: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  />
                </div>
                {form.designation_code === "Director" && (
                  <div className="space-y-2 rounded border border-dashed border-border p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_practice_head}
                        onChange={(e) => setForm({ ...form, is_practice_head: e.target.checked })}
                        className="accent-gold"
                      />
                      Also Practice Head
                    </label>
                    {form.is_practice_head && (
                      <input
                        placeholder="Practice area (e.g. Banking & Finance)"
                        value={form.practice_head_area}
                        onChange={(e) => setForm({ ...form, practice_head_area: e.target.value })}
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                      />
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_sector_head}
                        onChange={(e) => setForm({ ...form, is_sector_head: e.target.checked })}
                        className="accent-gold"
                      />
                      Also Sector Head
                    </label>
                    {form.is_sector_head && (
                      <input
                        placeholder="Sector (e.g. Mining)"
                        value={form.sector_head_area}
                        onChange={(e) => setForm({ ...form, sector_head_area: e.target.value })}
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {lawyer?.designation && (
              <p className="text-xs text-muted-foreground">
                Current legacy value: <span className="font-medium text-ink">{lawyer.designation}</span> — will be replaced when you save.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {firmBranches.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branches <span className="text-muted-foreground/70">(select one or more)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {firmBranches.map((b) => {
                  const checked = selectedBranchIds.has(b.id);
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => toggleBranch(b.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        checked ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {b.is_head_office && <Star className="h-3 w-3 text-gold" />}
                      {b.name}
                      {b.city ? ` · ${b.city}` : ""}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">City and province above auto-fill from the first selected branch.</p>
            </div>
          )}
          <Section title="Overview" hint="Lead paragraph(s) for the profile.">
            <RichTextEditor value={form.overview} onChange={(html) => setForm({ ...form, overview: html })} placeholder="Brief introduction…" />
          </Section>

          <Section title="Qualifications" hint="Degrees, admissions, memberships.">
            <RichTextEditor value={form.qualifications} onChange={(html) => setForm({ ...form, qualifications: html })} placeholder="LLB (University of...), Admitted as an Attorney…" />
          </Section>

          <Section title="Accolades & Awards">
            <RichTextEditor value={form.accolades} onChange={(html) => setForm({ ...form, accolades: html })} placeholder="Chambers Global ranking, awards, recognitions…" />
          </Section>

          <Section title="Articles Published" hint="Add each article with a title, publication, date and link.">
            {lawyer ? (
              <ArticlesEditor lawyerId={lawyer.id} />
            ) : (
              <p className="text-xs text-muted-foreground">Save the lawyer first to add articles.</p>
            )}
          </Section>

          <Section title="Reported Cases — additional notes" hint="Free-text fallback for cases not yet linked from SAFLII.">
            <RichTextEditor value={form.reported_cases_notes} onChange={(html) => setForm({ ...form, reported_cases_notes: html })} placeholder="Listed cases, citations, brief commentary…" />
          </Section>

          <Section title="Noteworthy Matters" hint="Significant deals, transactions, mandates.">
            <RichTextEditor value={form.noteworthy_matters} onChange={(html) => setForm({ ...form, noteworthy_matters: html })} placeholder="Major transactions, mandates and matters…" />
          </Section>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo</label>
            <div className="flex items-start gap-3">
              {form.avatar_url && (
                <img
                  src={form.avatar_url}
                  alt="Preview"
                  className="h-20 w-20 shrink-0 rounded-md object-cover ring-1 ring-border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  placeholder="https://yourfirm.co.za/team/jane.jpg"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted ${uploading ? "opacity-50" : ""}`}>
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading…" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {form.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRepositionUrl}
                      disabled={loadingUrlCrop}
                      className="inline-flex items-center gap-1.5 rounded border border-border bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted disabled:opacity-50"
                    >
                      {loadingUrlCrop ? "Loading…" : "Reposition / Crop"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Paste a URL or upload a file (max 5 MB). Use Reposition to crop URL images.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="email"
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <input
            type="url"
            placeholder="LinkedIn URL (optional) — https://www.linkedin.com/in/…"
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />



          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice areas</p>
            <div className="flex flex-wrap gap-1.5">
              {allPracticeAreas.map((p) => {
                const selected = practiceAreas.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setPracticeAreas(
                        selected
                          ? practiceAreas.filter((x) => x.id !== p.id)
                          : [...practiceAreas, p]
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      selected
                        ? "bg-forest/15 text-forest ring-1 ring-forest/30 hover:bg-forest/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
              {allPracticeAreas.length === 0 && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Lawyer"}</button>
          </div>
        </form>
        </div>
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          busy={uploading}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onConfirm={handleCroppedUpload}
        />
      )}
    </div>
  );
}

function BillingTab({ firmId }: { firmId: string }) {
  const { data: lawyers } = useQuery({
    queryKey: ["billing-lawyers", firmId],
    queryFn: async () => (await supabase.from("lawyers").select("first_name, last_name, status, trial_end_date").eq("firm_id", firmId)).data ?? [],
  });

  const activeCount = lawyers?.filter((l) => l.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="font-heading text-xl text-ink">Monthly Total</h2>
        <p className="mt-2 font-heading text-4xl text-gold">R{activeCount * 99}</p>
        <p className="text-sm text-muted-foreground">{activeCount} active lawyer{activeCount === 1 ? "" : "s"} × R99/month</p>
        <button className="mt-4 rounded border border-gold bg-transparent px-4 py-2 text-sm font-medium text-gold hover:bg-gold hover:text-ink">
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
  });

  const save = useMutation({
    mutationFn: async () => {
      const clean = { ...form, description: sanitizeBioHtml(form.description) };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
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

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Article = {
  id: string;
  title: string;
  publication: string | null;
  published_date: string | null;
  url: string | null;
  sort_order: number;
};

function ArticlesEditor({ lawyerId }: { lawyerId: string }) {
  const qc = useQueryClient();
  const { data: articles } = useQuery({
    queryKey: ["lawyer-articles", lawyerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyer_articles")
        .select("*")
        .eq("lawyer_id", lawyerId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as Article[];
    },
  });

  const [draft, setDraft] = useState({ title: "", publication: "", published_date: "", url: "" });
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lawyer-articles", lawyerId] });

  const add = async () => {
    if (!draft.title.trim()) { toast.error("Title is required"); return; }
    if (draft.url && !/^https?:\/\//i.test(draft.url.trim())) { toast.error("URL must start with http:// or https://"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("lawyer_articles").insert({
        lawyer_id: lawyerId,
        title: draft.title.trim().slice(0, 255),
        publication: draft.publication.trim().slice(0, 255) || null,
        published_date: draft.published_date || null,
        url: draft.url.trim().slice(0, 500) || null,
        sort_order: (articles?.length ?? 0),
      });
      if (error) throw error;
      setDraft({ title: "", publication: "", published_date: "", url: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this article?")) return;
    const { error } = await supabase.from("lawyer_articles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="space-y-3">
      {(articles ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded border border-border">
          {(articles ?? []).map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[a.publication, a.published_date ? new Date(a.published_date).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                </p>
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:text-gold">Open ↗</a>}
              </div>
              <button type="button" onClick={() => remove(a.id)} className="shrink-0 text-destructive hover:text-destructive/80">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-semibold text-ink">Add an article</p>
        <input
          placeholder="Title *"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          maxLength={255}
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Publication"
            value={draft.publication}
            onChange={(e) => setDraft({ ...draft, publication: e.target.value })}
            maxLength={255}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={draft.published_date}
            onChange={(e) => setDraft({ ...draft, published_date: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <input
          type="url"
          placeholder="https://… (link to article)"
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          maxLength={500}
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !draft.title.trim()}
          className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add article"}
        </button>
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
      const res = await inviteFn({ data: { lawyer_id: lawyer.id, email } });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
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
              <button type="button" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Copied"); }} className="rounded bg-gold px-3 py-2 text-xs font-semibold text-ink">Copy</button>
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
