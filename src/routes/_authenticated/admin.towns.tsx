import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "../../lib/constants";
import { Combobox } from "../../components/Combobox";

type TownRow = {
  id: string;
  name: string;
  slug: string;
  province_id: string;
  is_major_city: boolean;
};
type ProvinceRow = { id: string; name: string; slug: string };

export const Route = createFileRoute("/_authenticated/admin/towns")({
  head: () => ({ meta: [{ title: "Admin · Towns — Lawexpert.co.za" }] }),
  component: AdminTownsPage,
});

function AdminTownsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TownRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [filterProvince, setFilterProvince] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => (await supabase.from("provinces").select("id, name, slug").order("name")).data as ProvinceRow[] ?? [],
  });

  const { data: towns, isLoading } = useQuery({
    queryKey: ["admin-towns"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("towns").select("id, name, slug, province_id, is_major_city").order("name");
      if (error) throw error;
      return (data ?? []) as TownRow[];
    },
  });

  const provinceMap = useMemo(() => {
    const m = new Map<string, string>();
    (provinces ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [provinces]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("towns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Town deleted"); qc.invalidateQueries({ queryKey: ["admin-towns"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const filtered = (towns ?? []).filter((t) => {
    if (filterProvince && t.province_id !== filterProvince) return false;
    if (q.trim() && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-cream min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Towns &amp; Cities</h1>
            <p className="text-sm text-muted-foreground">Reference data · keep this list clean to avoid duplicates.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Town
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search towns…" className="w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
          <select value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-sm">
            <option value="">All provinces</option>
            {(provinces ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="ml-auto self-center text-xs text-muted-foreground">{filtered.length} town{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Major</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{provinceMap.get(t.province_id) ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.is_major_city ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(t)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${t.name}? Lawyers linked to this town will keep their record but lose the town link.`)) remove.mutate(t.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No towns match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <TownFormModal
          town={editing ?? undefined}
          provinces={provinces ?? []}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-towns"] }); qc.invalidateQueries({ queryKey: ["towns"] }); setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TownFormModal({ town, provinces, onClose, onSaved }: { town?: TownRow; provinces: ProvinceRow[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!town;
  const [name, setName] = useState(town?.name ?? "");
  const [provinceId, setProvinceId] = useState(town?.province_id ?? "");
  const [major, setMajor] = useState(town?.is_major_city ?? false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { toast.error("Name is required"); return; }
    if (!provinceId) { toast.error("Province is required"); return; }
    setSaving(true);
    try {
      if (isEdit && town) {
        const { error } = await supabase.from("towns").update({ name: n, province_id: provinceId, is_major_city: major }).eq("id", town.id);
        if (error) throw error;
        toast.success("Town updated");
      } else {
        const baseSlug = slugify(n);
        let slug = baseSlug;
        const { data: clash } = await supabase.from("towns").select("id").eq("province_id", provinceId).eq("slug", slug).maybeSingle();
        if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("towns").insert({ name: n, slug, province_id: provinceId, is_major_city: major });
        if (error) throw error;
        toast.success("Town added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message?.includes("duplicate") ? "That town already exists in this province" : (err?.message ?? "Failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Town" : "Add Town"}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Province</label>
            <Combobox
              value={provinceId}
              onChange={setProvinceId}
              options={provinces.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Type a province…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Town / City name</label>
            <input required placeholder="e.g. Stellenbosch" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={major} onChange={(e) => setMajor(e.target.checked)} />
            Major city (sorted first)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-ink">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
