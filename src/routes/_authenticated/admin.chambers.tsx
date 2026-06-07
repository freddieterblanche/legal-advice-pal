import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";
import { Combobox } from "../../components/Combobox";

type ChamberRow = {
  id: string;
  name: string;
  slug: string;
  bar_id: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/chambers")({
  head: () => ({ meta: [{ title: "Admin · Chambers — Lawexpert.co.za" }] }),
  component: AdminChambersPage,
});

function AdminChambersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ChamberRow | null>(null);
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

  const { data: bars } = useQuery({
    queryKey: ["bars-options"],
    queryFn: async () => (await supabase.from("bars").select("id, name").order("name")).data ?? [],
  });

  const { data: chambers, isLoading } = useQuery({
    queryKey: ["admin-chambers"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("chambers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as ChamberRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chambers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chambers deleted"); qc.invalidateQueries({ queryKey: ["admin-chambers"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const barName = (id: string | null) => bars?.find((b) => b.id === id)?.name ?? "—";
  const filtered = (chambers ?? []).filter((c) => !q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || barName(c.bar_id).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Chambers</h1>
            <p className="text-sm text-muted-foreground">Reference data · advocate Chambers and Groups.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Chambers
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by chambers or bar…" className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Chambers</th><th className="px-4 py-3">Bar</th><th className="px-4 py-3">City</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{barName(c.bar_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[c.city, c.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${c.name}?`)) remove.mutate(c.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No chambers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <ChambersFormModal
          chambers={editing ?? undefined}
          bars={bars ?? []}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-chambers"] }); setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ChambersFormModal({ chambers, bars, onClose, onSaved }: {
  chambers?: ChamberRow;
  bars: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!chambers;
  const [form, setForm] = useState({
    name: chambers?.name ?? "",
    bar_id: chambers?.bar_id ?? "",
    address: chambers?.address ?? "",
    city: chambers?.city ?? "",
    province: chambers?.province ?? "",
    phone: chambers?.phone ?? "",
    website: chambers?.website ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        bar_id: form.bar_id || null,
        address: form.address || null,
        city: form.city || null,
        province: form.province || null,
        phone: form.phone || null,
        website: form.website || null,
      };
      if (isEdit && chambers) {
        const { error } = await supabase.from("chambers").update(payload).eq("id", chambers.id);
        if (error) throw error;
        toast.success("Chambers updated");
      } else {
        const baseSlug = slugify(name);
        let slug = baseSlug;
        const { data: clash } = await supabase.from("chambers").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("chambers").insert({ ...payload, slug });
        if (error) throw error;
        toast.success("Chambers added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message?.includes("duplicate") || err?.message?.includes("unique") ? "Chambers with that name already exists for this Bar" : (err?.message ?? "Failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Chambers" : "Add Chambers"}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required placeholder="Chambers name (e.g. Maisels Chambers)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bar (optional)</label>
            <Combobox
              value={form.bar_id}
              onChange={(v) => setForm({ ...form, bar_id: v })}
              options={bars.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Type a Bar…"
              allLabel="— Unaffiliated —"
            />
          </div>
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
              <option value="">Province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <input type="url" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-ink">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
