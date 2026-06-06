import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Users, Wallet, FileText, Settings as SettingsIcon, Sparkles, X, Upload, Eye, Building2, Trash2, Star } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { PROVINCES, DESIGNATIONS, slugify } from "../../lib/constants";
import { importLawyerProfile } from "../../lib/profile-import.functions";
import { fetchImageAsDataUrl } from "../../lib/fetch-image.functions";
import { RichTextEditor } from "../../components/RichTextEditor";
import { sanitizeBioHtml } from "../../lib/sanitize";
import { ImageCropModal } from "../../components/ImageCropModal";

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

const lawyerSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  designation: z.enum(DESIGNATIONS as unknown as [string, ...string[]]),
  city: z.string().trim().min(1).max(80),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]),
  bio: z.string().max(20000).optional(),
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
  city: string | null;
  province: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  status: string | null;
  trial_end_date: string | null;
  profile_views: number | null;
};


function LawyersTab({ firmId, editLawyerId, onClearEditSearch }: { firmId: string; editLawyerId?: string; onClearEditSearch?: () => void }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LawyerRow | null>(null);

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
  const [form, setForm] = useState({
    first_name: lawyer?.first_name ?? "",
    last_name: lawyer?.last_name ?? "",
    designation: lawyer?.designation ?? "Attorney",
    city: lawyer?.city ?? "",
    province: lawyer?.province ?? "Gauteng",
    bio: lawyer?.bio ?? "",
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
      const parsed = lawyerSchema.parse({ ...form, bio: sanitizeBioHtml(form.bio) });
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
          <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
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
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Biography</label>
            <RichTextEditor
              value={form.bio}
              onChange={(html) => setForm({ ...form, bio: html })}
              placeholder="Short bio with headings, paragraphs, and lists…"
            />
            <p className="mt-1 text-xs text-muted-foreground">Use H2 / H3 for section headings. Paragraph spacing, bold, italic and lists are supported.</p>
          </div>
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
