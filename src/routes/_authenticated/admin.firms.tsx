import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X, Building2, Trash2, Users, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";
import { RichTextEditor } from "../../components/RichTextEditor";
import { sanitizeBioHtml } from "../../lib/sanitize";

type FirmRow = {
  id: string;
  name: string;
  slug: string;
  registration_number: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  status: string | null;
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
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{f.status}</span></td>
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
    address: firm?.address ?? "",
    city: firm?.city ?? "",
    province: firm?.province ?? "Gauteng",
    status: firm?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Firm name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description ? sanitizeBioHtml(form.description) : null,
      };
      if (isEdit && firm) {
        const { error } = await supabase.from("firms").update(payload).eq("id", firm.id);
        if (error) throw error;
        toast.success("Firm updated");
      } else {
        const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 7)}`;
        const { data: inserted, error } = await supabase
          .from("firms")
          .insert({ ...payload, slug })
          .select("id")
          .single();
        if (error) throw error;
        // Seed a head-office branch from the firm address
        if (form.city || form.address) {
          await supabase.from("firm_branches").insert({
            firm_id: inserted.id,
            name: "Head Office",
            address: form.address || null,
            city: form.city || null,
            province: form.province || null,
            phone: form.phone || null,
            is_head_office: true,
          });
        }
        toast.success("Firm created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Firm" : "Add Firm"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
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

          <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <input placeholder="Main phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
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


          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Firm"}
            </button>
          </div>
        </form>
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
  phone: string | null;
  is_head_office: boolean;
};

function BranchesEditor({ firmId }: { firmId: string }) {
  const qc = useQueryClient();
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

  const [draft, setDraft] = useState({ name: "", address: "", city: "", province: "Gauteng", phone: "", is_head_office: false });
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["firm-branches", firmId] });

  const addBranch = async () => {
    if (!draft.name.trim()) { toast.error("Branch name required"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("firm_branches").insert({
        firm_id: firmId,
        name: draft.name.trim(),
        address: draft.address || null,
        city: draft.city || null,
        province: draft.province || null,
        phone: draft.phone || null,
        is_head_office: draft.is_head_office,
      });
      if (error) throw error;
      setDraft({ name: "", address: "", city: "", province: "Gauteng", phone: "", is_head_office: false });
      refresh();
      toast.success("Branch added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const updateBranch = async (id: string, patch: Partial<BranchRow>) => {
    const { error } = await supabase.from("firm_branches").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
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
          {(branches ?? []).map((b) => (
            <div key={b.id} className="rounded border border-border bg-card p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={b.name} onChange={(e) => updateBranch(b.id, { name: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Branch name" />
                <input value={b.phone ?? ""} onChange={(e) => updateBranch(b.id, { phone: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Phone" />
                <input value={b.address ?? ""} onChange={(e) => updateBranch(b.id, { address: e.target.value })} className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="Address" />
                <input value={b.city ?? ""} onChange={(e) => updateBranch(b.id, { city: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm" placeholder="City" />
                <select value={b.province ?? ""} onChange={(e) => updateBranch(b.id, { province: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm">
                  <option value="">Province…</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={b.is_head_office} onChange={(e) => updateBranch(b.id, { is_head_office: e.target.checked })} />
                  Head office
                </label>
                <button type="button" onClick={() => deleteBranch(b.id)} className="text-xs text-destructive hover:underline">
                  <Trash2 className="mr-1 inline h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          ))}
          {branches && branches.length === 0 && (
            <p className="text-xs text-muted-foreground">No branches yet.</p>
          )}

          <div className="rounded border border-dashed border-border p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New branch name" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Address" className="sm:col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="City" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
              <select value={draft.province} onChange={(e) => setDraft({ ...draft, province: e.target.value })} className="rounded border border-border bg-background px-2 py-1.5 text-sm">
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
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

