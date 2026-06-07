import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";

type BarRow = { id: string; name: string; slug: string; province: string | null };

export const Route = createFileRoute("/_authenticated/admin/bars")({
  head: () => ({ meta: [{ title: "Admin · Bars — Lawexpert.co.za" }] }),
  component: AdminBarsPage,
});

function AdminBarsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BarRow | null>(null);
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

  const { data: bars, isLoading } = useQuery({
    queryKey: ["admin-bars"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("bars").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as BarRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bar deleted"); qc.invalidateQueries({ queryKey: ["admin-bars"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const filtered = (bars ?? []).filter((b) => !q.trim() || b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Bars</h1>
            <p className="text-sm text-muted-foreground">Reference data · South African Bar Councils.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Bar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bars…" className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Province</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.province ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(b)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${b.name}? Advocates linked to this Bar will keep their record but lose the Bar link.`)) remove.mutate(b.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">No bars found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <BarFormModal
          bar={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-bars"] }); setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function BarFormModal({ bar, onClose, onSaved }: { bar?: BarRow; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!bar;
  const [form, setForm] = useState({ name: bar?.name ?? "", province: bar?.province ?? "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (isEdit && bar) {
        const { error } = await supabase.from("bars").update({ name, province: form.province || null }).eq("id", bar.id);
        if (error) throw error;
        toast.success("Bar updated");
      } else {
        const baseSlug = slugify(name);
        let slug = baseSlug;
        const { data: clash } = await supabase.from("bars").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("bars").insert({ name, slug, province: form.province || null });
        if (error) throw error;
        toast.success("Bar added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message?.includes("duplicate") ? "A Bar with that name already exists" : (err?.message ?? "Failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Bar" : "Add Bar"}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required placeholder="Bar name (e.g. Johannesburg Bar)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            <option value="">Province (optional)</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-ink">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
