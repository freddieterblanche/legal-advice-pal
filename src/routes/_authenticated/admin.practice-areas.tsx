import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "../../lib/constants";

type PARow = { id: string; name: string; slug: string; icon: string | null };

export const Route = createFileRoute("/_authenticated/admin/practice-areas")({
  head: () => ({ meta: [{ title: "Admin · Practice Areas — Lawexpert.co.za" }] }),
  component: AdminPracticeAreasPage,
});

function AdminPracticeAreasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PARow | null>(null);
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

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-practice-areas"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_areas").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as PARow[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-pa-counts"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data } = await supabase.from("provider_practice_areas").select("practice_area_id");
      const c: Record<string, number> = {};
      data?.forEach((r: { practice_area_id: string }) => { c[r.practice_area_id] = (c[r.practice_area_id] ?? 0) + 1; });
      return c;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practice_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Practice area deleted"); qc.invalidateQueries({ queryKey: ["admin-practice-areas"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const filtered = (rows ?? []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Practice Areas</h1>
            <p className="text-sm text-muted-foreground">Reference data · areas of law lawyers can be tagged with.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Practice Area
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search practice areas…" className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Lawyers</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{counts?.[r.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${r.name}? Lawyers tagged with this practice area will lose the tag.`)) remove.mutate(r.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No practice areas found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <PAFormModal
          row={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-practice-areas"] }); setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function PAFormModal({ row, onClose, onSaved }: { row?: PARow; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!row;
  const [form, setForm] = useState({ name: row?.name ?? "", slug: row?.slug ?? "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (isEdit && row) {
        const slug = (form.slug.trim() || slugify(name));
        const { error } = await supabase.from("practice_areas").update({ name, slug }).eq("id", row.id);
        if (error) throw error;
        toast.success("Practice area updated");
      } else {
        const baseSlug = form.slug.trim() || slugify(name);
        let slug = baseSlug;
        const { data: clash } = await supabase.from("practice_areas").select("id").eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("practice_areas").insert({ name, slug });
        if (error) throw error;
        toast.success("Practice area added");
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg.includes("duplicate") ? "A practice area with that name or slug already exists" : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Practice Area" : "Add Practice Area"}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <input required placeholder="e.g. Construction Law" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (optional — auto-generated)</label>
            <input placeholder={slugify(form.name) || "construction-law"} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-ink">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
