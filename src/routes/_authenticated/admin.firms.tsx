import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, X, Building2, Trash2, Users, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";
import { RichTextEditor } from "../../components/RichTextEditor";
import { TagInput } from "../../components/TagInput";
import { ProfileImportBar } from "../../components/ProfileImportBar";
import { importFirmProfile } from "../../lib/profile-import.functions";
import { sanitizeBioHtml } from "../../lib/sanitize";
import { StatusCell } from "../../components/StatusCell";

type FirmRow = {
  id: string;
  name: string;
  slug: string;
  registration_number: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  status: string | null;
  is_featured: boolean | null;
  logo_url: string | null;
  logo_accent_color: string | null;
  services: string[] | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/firms")({
  head: () => ({ meta: [{ title: "Admin · Firms — Lawexpert.co.za" }] }),
  component: AdminFirmsPage,
});

function AdminFirmsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<FirmRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: firms, isLoading } = useQuery({
    queryKey: ["admin-firms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FirmRow[];
    },
    enabled: profile?.role === "platform_admin",
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("firms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Firm deleted"); qc.invalidateQueries({ queryKey: ["admin-firms"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">Not authorised</h1>
        <p className="mt-2 text-muted-foreground">This page is reserved for platform admins.</p>
      </div>
    );
  }

  const filtered = (firms ?? []).filter((f) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return f.name.toLowerCase().includes(s) || (f.city ?? "").toLowerCase().includes(s) || (f.province ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">All Firms</h1>
            <p className="text-sm text-muted-foreground">Platform admin · create, edit and manage every firm.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Firm
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, city or province…"
          className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm"
        />

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <button
                          type="button"
                          onClick={() => setEditing(f)}
                          className="text-left font-medium text-ink hover:text-gold hover:underline"
                          title="Open editor with live preview"
                        >
                          {f.name}
                        </button>
                        <p className="text-xs text-muted-foreground">/{f.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{[f.city, f.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusCell
                      table="firms"
                      id={f.id}
                      status={f.status ?? null}
                      isFeatured={f.is_featured}
                      featuredCategory={{ table: "firms" }}
                      invalidateKeys={[["admin-firms"]]}
                    />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => navigate({ to: "/dashboard", search: { firmId: f.id, tab: "lawyers" } as never })}
                      className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-gold"
                    >
                      <Users className="h-3 w-3" /> Lawyers
                    </button>
                    <button
                      onClick={() => navigate({ to: "/dashboard", search: { firmId: f.id, tab: "settings" } as never })}
                      className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"
                    >
                      <SettingsIcon className="h-3 w-3" /> Settings
                    </button>
                    <button onClick={() => setEditing(f)} className="mr-3 text-xs font-medium text-ink hover:text-gold">Edit</button>
                    {f.status === "active" && (
                      <Link to="/firms/$slug" params={{ slug: f.slug }} target="_blank" className="mr-3 text-xs font-medium text-forest hover:text-gold">Open ↗</Link>
                    )}
                    <button onClick={() => { if (confirm(`Delete ${f.name}? This also removes its lawyers and branches.`)) remove.mutate(f.id); }} className="text-xs text-destructive">
                      <Trash2 className="inline h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No firms found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <FirmFormModal
          firm={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={(stayOpen) => {
            qc.invalidateQueries({ queryKey: ["admin-firms"] });
            if (!stayOpen) { setAdding(false); setEditing(null); }
          }}
        />
      )}
    </div>
  );
}

function FirmFormModal({ firm, onClose, onSaved }: { firm?: FirmRow; onClose: () => void; onSaved: (stayOpen?: boolean) => void }) {
  const isEdit = !!firm;
  const [form, setForm] = useState({
    name: firm?.name ?? "",
    registration_number: firm?.registration_number ?? "",
    description: firm?.description ?? "",
    website: firm?.website ?? "",
    phone: firm?.phone ?? "",
    email: firm?.email ?? "",
    address: firm?.address ?? "",
    city: firm?.city ?? "",
    province: firm?.province ?? "Gauteng",
    status: firm?.status ?? "active",
    logo_url: firm?.logo_url ?? "",
    logo_accent_color: firm?.logo_accent_color ?? "",
    services: (firm?.services ?? []) as string[],
    linkedin_url: firm?.linkedin_url ?? "",
    facebook_url: firm?.facebook_url ?? "",
    twitter_url: firm?.twitter_url ?? "",
    instagram_url: firm?.instagram_url ?? "",
    youtube_url: firm?.youtube_url ?? "",
  });
  const [importedBranches, setImportedBranches] = useState<Array<{ name: string; address: string; city: string; province: string; country: string; phone: string; email: string; is_head_office: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Firm name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description ? sanitizeBioHtml(form.description) : null,
        services: form.services.length ? form.services : null,
        logo_accent_color: form.logo_accent_color?.trim() ? form.logo_accent_color.trim() : null,
      };
      if (isEdit && firm) {
        const { error } = await supabase.from("firms").update(payload).eq("id", firm.id);
        if (error) throw error;
        toast.success("Firm updated — preview refreshed");
        setPreviewKey((k) => k + 1);
        onSaved(true); // keep modal open so admin can keep editing & previewing
      } else {
        const baseSlug = slugify(form.name);
        let slug = baseSlug;
        const { data: clash } = await supabase.from("firms").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error } = await supabase
          .from("firms")
          .insert({ ...payload, slug })
          .select("id")
          .single();
        if (error) throw error;
        // Seed branches: prefer AI-imported branches, else fall back to a single Head Office row.
        if (importedBranches.length > 0) {
          const headFromImport = importedBranches.find((b) => b.is_head_office);
          const rows = importedBranches.map((b, i) => ({
            firm_id: inserted.id,
            name: b.name || b.city || (b.is_head_office ? "Head Office" : `Office ${i + 1}`),
            address: b.address || null,
            city: b.city || null,
            province: b.province || null,
            country: b.country || "South Africa",
            phone: b.phone || null,
            email: b.email || null,
            is_head_office: headFromImport ? b.is_head_office : i === 0,
          }));
          await supabase.from("firm_branches").insert(rows);
        } else if (form.city || form.address) {
          await supabase.from("firm_branches").insert({
            firm_id: inserted.id,
            name: "Head Office",
            address: form.address || null,
            city: form.city || null,
            province: form.province || null,
            phone: form.phone || null,
            email: form.email || null,
            is_head_office: true,
          });
        }
        toast.success("Firm created");
        onSaved(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-2 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-full w-full ${isEdit ? "max-w-[1400px]" : "max-w-2xl"} flex-col overflow-hidden rounded-lg bg-card shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-xl text-ink">
            {isEdit ? `Edit Firm — ${firm?.name}` : "Add Firm"}
          </h3>
          <div className="flex items-center gap-2">
            {isEdit && firm && (
              <a
                href={`/firms/${firm.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted"
              >
                Open in new tab ↗
              </a>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col ${isEdit ? "lg:flex-row" : ""}`}>
          {/* Editor pane */}
          <div className={`overflow-y-auto p-6 ${isEdit ? "lg:w-[520px] lg:flex-shrink-0 lg:border-r lg:border-border" : ""}`}>
            <form onSubmit={submit} className="space-y-3" id="firm-edit-form">
              {!isEdit && (
                <ProfileImportBar
                  serverFn={importFirmProfile}
                  onImported={(d) => {
                    setForm((f) => ({
                      ...f,
                      name: d.name || f.name,
                      registration_number: d.registration_number || f.registration_number,
                      description: d.description || f.description,
                      website: d.website || f.website,
                      phone: d.phone || f.phone,
                      email: d.email || f.email,
                      address: d.address || f.address,
                      city: d.city || f.city,
                      province: d.province || f.province,
                      logo_url: d.logo_url || f.logo_url,
                      services: d.services.length ? d.services : f.services,
                    }));
                    if (d.branches && d.branches.length > 0) {
                      setImportedBranches(d.branches);
                      toast.success(`Imported ${d.branches.length} branch${d.branches.length === 1 ? "" : "es"} — saved when you create the firm.`);
                    }
                  }}
                  placeholder="https://yourfirm.co.za"
                  helpText="Paste the firm's website URL and AI will fill the firm details and branch offices."
                />
              )}
              <input required placeholder="Firm name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
              <input placeholder="Registration number (optional)" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">About the firm</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Describe the firm — use headings, paragraphs, lists…"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services offered</label>
                <TagInput
                  value={form.services}
                  onChange={(next) => setForm({ ...form, services: next })}
                  placeholder="e.g. Trust formation — press Enter"
                />
                <p className="mt-1 text-xs text-muted-foreground">Type a service and press Enter to add it as a tag. Use short labels.</p>
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
                <p className="mt-1 text-xs text-muted-foreground">Pick an accent colour for the logo tile shown on listing cards. Leave empty to use the default light tile.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social media</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input type="url" placeholder="LinkedIn page URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} maxLength={500} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                  <input type="url" placeholder="Facebook page URL" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} maxLength={500} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                  <input type="url" placeholder="X (Twitter) URL" value={form.twitter_url} onChange={(e) => setForm({ ...form, twitter_url: e.target.value })} maxLength={500} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                  <input type="url" placeholder="Instagram URL" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} maxLength={500} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                  <input type="url" placeholder="YouTube channel URL" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} maxLength={500} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Main phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
                <input type="email" placeholder="Contact email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <input placeholder="Main address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                  <option value="active">Active (public)</option>
                  <option value="pending">Pending review</option>
                  <option value="inactive">Inactive (hidden)</option>
                </select>
              </div>

              {isEdit && firm && <BranchesEditor firmId={firm.id} />}
            </form>
          </div>

          {/* Live preview pane */}
          {isEdit && firm && (
            <div className="flex min-h-[400px] flex-1 flex-col bg-cream/40">
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p>
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="text-xs font-medium text-forest hover:text-gold"
                >
                  Refresh
                </button>
              </div>
              <iframe
                key={previewKey}
                src={`/firms/${firm.slug}`}
                title="Firm preview"
                className="h-full w-full flex-1 bg-background"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Close</button>
          <button type="submit" form="firm-edit-form" disabled={saving} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save & Preview" : "Create Firm"}
          </button>
        </div>
      </div>
    </div>
  );
}

type BranchRow = {
  id: string;
  firm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  is_head_office: boolean;
};

type BranchDraft = {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  country: string;
  phone: string;
  email: string;
  is_head_office: boolean;
};

const toBranchDraft = (branch: BranchRow): BranchDraft => ({
  id: branch.id,
  name: branch.name ?? "",
  address: branch.address ?? "",
  city: branch.city ?? "",
  province: branch.province ?? "",
  country: branch.country || "South Africa",
  phone: branch.phone ?? "",
  email: branch.email ?? "",
  is_head_office: !!branch.is_head_office,
});

const toBranchPayload = (branch: BranchDraft): Partial<BranchRow> => ({
  name: branch.name.trim(),
  address: branch.address.trim() || null,
  city: branch.city.trim() || null,
  province: branch.province.trim() || null,
  country: branch.country || "South Africa",
  phone: branch.phone.trim() || null,
  email: branch.email.trim() || null,
  is_head_office: branch.is_head_office,
});

function BranchesEditor({ firmId }: { firmId: string }) {
  const qc = useQueryClient();
  const [branchDrafts, setBranchDrafts] = useState<Record<string, BranchDraft>>({});
  const { data: branches, isLoading } = useQuery({
    queryKey: ["firm-branches", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_branches")
        .select("*")
        .eq("firm_id", firmId)
        .order("is_head_office", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BranchRow[];
    },
  });

  const [draft, setDraft] = useState({ name: "", address: "", city: "", province: "Gauteng", country: "South Africa", phone: "", email: "", is_head_office: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!branches) return;
    setBranchDrafts(Object.fromEntries(branches.map((branch) => [branch.id, toBranchDraft(branch)])));
  }, [branches]);

  const { data: countries } = useQuery({
    queryKey: ["countries-options"],
    queryFn: async () => (await supabase.from("countries").select("name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["firm-branches", firmId] });

  const addBranch = async () => {
    if (!draft.name.trim()) { toast.error("Branch name required"); return; }
    setBusy(true);
    try {
      const isSA = draft.country === "South Africa";
      const { error } = await supabase.from("firm_branches").insert({
        firm_id: firmId,
        name: draft.name.trim(),
        address: draft.address || null,
        city: draft.city || null,
        province: isSA ? (draft.province || null) : (draft.province || null),
        country: draft.country || "South Africa",
        phone: draft.phone || null,
        email: draft.email || null,
        is_head_office: draft.is_head_office,
      });
      if (error) throw error;
      setDraft({ name: "", address: "", city: "", province: "Gauteng", country: "South Africa", phone: "", email: "", is_head_office: false });
      refresh();
      toast.success("Branch added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const updateBranch = async (id: string, patch: Partial<BranchRow>, refreshAfter = false) => {
    const { error } = await supabase.from("firm_branches").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (refreshAfter) refresh();
  };

  const saveBranchDraft = async (id: string) => {
    const current = branchDrafts[id];
    if (!current) return;
    if (!current.name.trim()) { toast.error("Branch name required"); return; }
    await updateBranch(id, toBranchPayload(current));
  };

  const setBranchField = (id: string, patch: Partial<BranchDraft>) => {
    setBranchDrafts((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...patch } };
    });
  };

  const deleteBranch = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    const { error } = await supabase.from("firm_branches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
    toast.success("Branch deleted");
  };

  return (
    <div className="rounded-md border border-border bg-cream/50 p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branches</label>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading branches…</p>
      ) : (
        <div className="space-y-2">
          {(branches ?? []).map((b) => {
            const current = branchDrafts[b.id] ?? toBranchDraft(b);
            return (
              <div key={b.id} className="rounded border border-border bg-card p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input value={current.name} onChange={(e) => setBranchField(b.id, { name: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Branch name" />
                  <input value={current.phone} onChange={(e) => setBranchField(b.id, { phone: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Phone" />
                  <input type="email" value={current.email} onChange={(e) => setBranchField(b.id, { email: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Email" />
                  <input value={current.address} onChange={(e) => setBranchField(b.id, { address: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Address" />
                  <input value={current.city} onChange={(e) => setBranchField(b.id, { city: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="City" />
                  {current.country === "South Africa" ? (
                    <select value={current.province} onChange={(e) => { setBranchField(b.id, { province: e.target.value }); updateBranch(b.id, { province: e.target.value }); }} className="rounded border border-border bg-background px-2 py-1.5 text-sm">
                      <option value="">Province…</option>
                      {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input value={current.province} onChange={(e) => setBranchField(b.id, { province: e.target.value })} onBlur={() => saveBranchDraft(b.id)} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="State / region (optional)" />
                  )}
                  <select value={current.country} onChange={(e) => { const country = e.target.value; const province = country === "South Africa" ? "Gauteng" : ""; setBranchField(b.id, { country, province }); updateBranch(b.id, { country, province }); }} className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm">
                    {(countries ?? [{ name: "South Africa" }]).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={current.is_head_office} onChange={(e) => { setBranchField(b.id, { is_head_office: e.target.checked }); updateBranch(b.id, { is_head_office: e.target.checked }); }} />
                    Head office
                  </label>
                  <button type="button" onClick={() => deleteBranch(b.id)} className="text-xs text-destructive hover:underline">
                    <Trash2 className="mr-1 inline h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
          {branches && branches.length === 0 && (
            <p className="text-xs text-muted-foreground">No branches yet.</p>
          )}

          <div className="rounded border border-dashed border-border p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New branch name" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Address" className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="City" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              {draft.country === "South Africa" ? (
                <select value={draft.province} onChange={(e) => setDraft({ ...draft, province: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm">
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input value={draft.province} onChange={(e) => setDraft({ ...draft, province: e.target.value })} placeholder="State / region (optional)" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              )}
              <select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value, province: e.target.value === "South Africa" ? "Gauteng" : "" })} className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm">
                {(countries ?? [{ name: "South Africa" }]).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={draft.is_head_office} onChange={(e) => setDraft({ ...draft, is_head_office: e.target.checked })} />
                Head office
              </label>
              <button type="button" disabled={busy} onClick={addBranch} className="inline-flex items-center gap-1 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50">
                <Plus className="h-3 w-3" /> Add branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

