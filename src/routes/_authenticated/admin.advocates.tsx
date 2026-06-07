import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft, ExternalLink, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";
import { ComboboxCreatable } from "../../components/ComboboxCreatable";

type AdvocateRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  bar_id: string | null;
  chambers_id: string | null;
  is_senior_counsel: boolean;
  year_of_admission: number | null;
  status: string | null;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/advocates")({
  head: () => ({ meta: [{ title: "Admin · Advocates — Lawexpert.co.za" }] }),
  component: AdminAdvocatesPage,
});

function AdminAdvocatesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdvocateRow | null>(null);
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

  const { data: chambers } = useQuery({
    queryKey: ["chambers-options"],
    queryFn: async () => (await supabase.from("chambers").select("id, name, bar_id").order("name")).data ?? [],
  });

  const { data: advocates, isLoading } = useQuery({
    queryKey: ["admin-advocates"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select("id, slug, first_name, last_name, email, phone, city, province, bar_id, chambers_id, is_senior_counsel, year_of_admission, status, avatar_url")
        .eq("lawyer_type", "advocate")
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as AdvocateRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lawyers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Advocate deleted"); qc.invalidateQueries({ queryKey: ["admin-advocates"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const barName = (id: string | null) => bars?.find((b) => b.id === id)?.name ?? "—";
  const chambersName = (id: string | null) => chambers?.find((c) => c.id === id)?.name ?? "—";
  const filtered = (advocates ?? []).filter((a) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return `${a.first_name} ${a.last_name}`.toLowerCase().includes(s)
      || barName(a.bar_id).toLowerCase().includes(s)
      || chambersName(a.chambers_id).toLowerCase().includes(s);
  });

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Advocates</h1>
            <p className="text-sm text-muted-foreground">Add and manage advocates by Bar and Chambers.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Advocate
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, bar or chambers…" className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Advocate</th>
                <th className="px-4 py-3">Bar</th>
                <th className="px-4 py-3">Chambers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setEditing(a)} className="text-left font-medium text-ink hover:text-gold hover:underline">{a.first_name} {a.last_name}</button>
                    {a.is_senior_counsel && <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">SC</span>}
                    <p className="text-xs text-muted-foreground">{[a.city, a.province].filter(Boolean).join(", ") || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{barName(a.bar_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{chambersName(a.chambers_id)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{a.status}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(a)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    {a.status === "active" || a.status === "trial" ? (
                      <Link to="/lawyers/$slug" params={{ slug: a.slug }} target="_blank" className="mr-3 text-xs font-medium text-forest hover:text-gold">Open <ExternalLink className="inline h-3 w-3" /></Link>
                    ) : null}
                    <button onClick={() => { if (confirm(`Delete ${a.first_name} ${a.last_name}?`)) remove.mutate(a.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No advocates yet. Click <strong>Add Advocate</strong> to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <AdvocateFormModal
          advocate={editing ?? undefined}
          bars={bars ?? []}
          chambers={chambers ?? []}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-advocates"] });
            qc.invalidateQueries({ queryKey: ["bars-options"] });
            qc.invalidateQueries({ queryKey: ["chambers-options"] });
            setAdding(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AdvocateFormModal({ advocate, bars, chambers, onClose, onSaved }: {
  advocate?: AdvocateRow;
  bars: { id: string; name: string }[];
  chambers: { id: string; name: string; bar_id: string | null }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!advocate;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: advocate?.first_name ?? "",
    last_name: advocate?.last_name ?? "",
    email: advocate?.email ?? "",
    phone: advocate?.phone ?? "",
    city: advocate?.city ?? "",
    province: advocate?.province ?? "",
    bar_id: advocate?.bar_id ?? "",
    chambers_id: advocate?.chambers_id ?? "",
    is_senior_counsel: advocate?.is_senior_counsel ?? false,
    year_of_admission: advocate?.year_of_admission ? String(advocate.year_of_admission) : "",
    avatar_url: advocate?.avatar_url ?? "",
    status: advocate?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // All practice areas
  const { data: allPracticeAreas } = useQuery({
    queryKey: ["practice-areas-all"],
    queryFn: async () => {
      const { data } = await supabase.from("practice_areas").select("id, slug, name").order("name");
      return (data ?? []) as { id: string; slug: string; name: string }[];
    },
  });

  // Existing practice area ids for this advocate
  const { data: existingPaIds } = useQuery({
    queryKey: ["advocate-practice-areas", advocate?.id],
    enabled: !!advocate?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyer_practice_areas")
        .select("practice_area_id")
        .eq("lawyer_id", advocate!.id);
      return (data ?? []).map((r: { practice_area_id: string }) => r.practice_area_id);
    },
  });

  const [selectedPaIds, setSelectedPaIds] = useState<Set<string>>(new Set());
  // Hydrate selection when existing data arrives
  useMemo(() => {
    if (existingPaIds) setSelectedPaIds(new Set(existingPaIds));
  }, [existingPaIds]);

  const togglePa = (id: string) => {
    setSelectedPaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `advocates/${advocate?.id ?? "new"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lawyer-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("lawyer-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
      setForm((f) => ({ ...f, avatar_url: signed.signedUrl }));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Chambers list narrows to selected Bar (plus unaffiliated)
  const chambersOptions = useMemo(() => {
    return chambers
      .filter((c) => !form.bar_id || c.bar_id === form.bar_id || c.bar_id === null)
      .map((c) => ({ value: c.id, label: c.name }));
  }, [chambers, form.bar_id]);

  const createBar = async (name: string): Promise<string | null> => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    const { data: clash } = await supabase.from("bars").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("bars").insert({ name: name.trim(), slug }).select("id").single();
    if (error) { toast.error(error.message); return null; }
    toast.success(`Bar "${name}" added`);
    await qc.invalidateQueries({ queryKey: ["bars-options"] });
    return data.id;
  };

  const createChambers = async (name: string): Promise<string | null> => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    const { data: clash } = await supabase.from("chambers").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("chambers")
      .insert({ name: name.trim(), slug, bar_id: form.bar_id || null })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success(`Chambers "${name}" added`);
    await qc.invalidateQueries({ queryKey: ["chambers-options"] });
    return data.id;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("First and last name required"); return; }
    if (!form.bar_id) { toast.error("Bar is required for advocates"); return; }
    setSaving(true);
    try {
      const year = form.year_of_admission ? parseInt(form.year_of_admission, 10) : null;
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        province: form.province || null,
        bar_id: form.bar_id,
        chambers_id: form.chambers_id || null,
        is_senior_counsel: form.is_senior_counsel,
        year_of_admission: Number.isFinite(year as number) ? year : null,
        avatar_url: form.avatar_url.trim() || null,
        status: form.status,
        lawyer_type: "advocate" as const,
        designation: form.is_senior_counsel ? "Senior Counsel" : "Advocate",
        firm_id: null,
      };
      if (isEdit && advocate) {
        const { error } = await supabase.from("lawyers").update(payload).eq("id", advocate.id);
        if (error) throw error;
        toast.success("Advocate updated");
      } else {
        const slug = `${slugify(`${payload.first_name}-${payload.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("lawyers").insert({ ...payload, slug, status: "active" });
        if (error) throw error;
        toast.success("Advocate added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Advocate" : "Add Advocate"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bar *</label>
            <ComboboxCreatable
              value={form.bar_id}
              onChange={(v) => setForm({ ...form, bar_id: v, chambers_id: "" })}
              options={bars.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Type or select a Bar…"
              emptyLabel="— None —"
              onCreate={createBar}
              createLabel="Add Bar"
            />
            <p className="mt-1 text-xs text-muted-foreground">Pick from the list to avoid duplicates. New Bars are added rarely.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chambers (optional)</label>
            <ComboboxCreatable
              value={form.chambers_id}
              onChange={(v) => setForm({ ...form, chambers_id: v })}
              options={chambersOptions}
              placeholder={form.bar_id ? "Type or select Chambers…" : "Select a Bar first"}
              emptyLabel="— None —"
              disabled={!form.bar_id}
              onCreate={form.bar_id ? createChambers : undefined}
              createLabel="Add Chambers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
              <option value="">Province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Year of admission" inputMode="numeric" value={form.year_of_admission} onChange={(e) => setForm({ ...form, year_of_admission: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-sm">
              <input type="checkbox" checked={form.is_senior_counsel} onChange={(e) => setForm({ ...form, is_senior_counsel: e.target.checked })} />
              Senior Counsel (SC)
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo URL (optional)</label>
            <input type="url" placeholder="https://…" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">A photo can be added or updated later.</p>
          </div>

          {isEdit && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                <option value="active">Active (public)</option>
                <option value="trial">Trial</option>
                <option value="pending_payment">Pending payment</option>
                <option value="inactive">Inactive (hidden)</option>
              </select>
            </div>
          )}
        </form>

        <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} onClick={submit} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save" : "Add Advocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
