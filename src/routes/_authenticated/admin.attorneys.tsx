import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft, ExternalLink, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { PROVINCES, slugify } from "../../lib/constants";
import { ComboboxCreatable } from "../../components/ComboboxCreatable";
import { ReportedCasesEditor } from "../../components/ReportedCasesEditor";
import { ImageCropModal } from "../../components/ImageCropModal";

type AttorneyRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  office_phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  province: string | null;
  firm_id: string | null;
  designation: string | null;
  designation_code: string | null;
  designation_custom: string | null;
  is_mediator: boolean | null;
  is_arbitrator: boolean | null;
  year_of_admission: number | null;
  status: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/attorneys")({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    sort: s.sort === "experience" || s.sort === "listed" || s.sort === "firm" ? s.sort : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
  }),
  head: () => ({ meta: [{ title: "Admin · Attorneys — Lawexpert.co.za" }] }),
  component: AdminAttorneysPage,
});

function AdminAttorneysPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<AttorneyRow | null>(null);
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

  const { data: firms } = useQuery({
    queryKey: ["firms-options"],
    queryFn: async () => (await supabase.from("firms").select("id, name, city, province").order("name")).data ?? [],
  });

  const { data: attorneys, isLoading } = useQuery({
    queryKey: ["admin-attorneys"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select("id, slug, first_name, last_name, email, phone, office_phone, mobile_phone, city, province, firm_id, designation, designation_code, designation_custom, is_mediator, is_arbitrator, year_of_admission, status, avatar_url, created_at")
        .or("lawyer_type.eq.attorney,and(lawyer_type.is.null,firm_id.not.is.null)")
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as AttorneyRow[];
    },
  });

  useEffect(() => {
    if (!search.edit || !attorneys) return;
    const found = attorneys.find((a) => a.id === search.edit);
    if (found && (!editing || editing.id !== found.id)) setEditing(found);
  }, [search.edit, attorneys, editing]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lawyers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attorney deleted"); qc.invalidateQueries({ queryKey: ["admin-attorneys"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const firmName = (id: string | null) => firms?.find((f) => f.id === id)?.name ?? "—";
  const filtered = (attorneys ?? []).filter((a) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return `${a.first_name} ${a.last_name}`.toLowerCase().includes(s)
      || firmName(a.firm_id).toLowerCase().includes(s)
      || (a.city ?? "").toLowerCase().includes(s);
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = search.dir === "desc" ? -1 : 1;
    const sort = search.sort;
    if (sort === "experience") {
      const currentYear = new Date().getFullYear();
      list.sort((a, b) => {
        const ya = a.year_of_admission ? currentYear - a.year_of_admission : 0;
        const yb = b.year_of_admission ? currentYear - b.year_of_admission : 0;
        return (ya - yb) * dir;
      });
    } else if (sort === "listed") {
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (da - db) * dir;
      });
    } else if (sort === "firm") {
      list.sort((a, b) => firmName(a.firm_id).localeCompare(firmName(b.firm_id)) * dir);
    } else {
      list.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`) * dir);
    }
    return list;
  }, [filtered, search.sort, search.dir, firms]);

  const setSort = (field: "surname" | "firm" | "experience" | "listed") => {
    if (search.sort === field) {
      navigate({ search: (prev: typeof search) => ({ ...prev, dir: search.dir === "asc" ? "desc" : "asc" }) });
    } else {
      navigate({ search: (prev: typeof search) => ({ ...prev, sort: field, dir: "asc" }) });
    }
  };

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Attorneys</h1>
            <p className="text-sm text-muted-foreground">Add and manage attorneys across all firms.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Attorney
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, firm or city…" className="w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort by</span>
            {(["surname", "firm", "experience", "listed"] as const).map((field) => {
              const active = search.sort === field;
              const asc = active && search.dir === "asc";
              const label = field === "surname" ? "Surname" : field === "firm" ? "Firm" : field === "experience" ? "Years Experience" : "Date Listed";
              return (
                <button
                  key={field}
                  onClick={() => setSort(field)}
                  className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition ${active ? "border-ink bg-ink text-cream" : "border-border bg-card text-ink hover:border-ink"}`}
                >
                  {label}
                  {active ? (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Attorney</th>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setEditing(a)} className="text-left font-medium text-ink hover:text-gold hover:underline">{a.first_name} {a.last_name}</button>
                    <p className="text-xs text-muted-foreground">{[a.city, a.province].filter(Boolean).join(", ") || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{firmName(a.firm_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.designation ?? "—"}</td>
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
              {!isLoading && sorted.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No attorneys yet. Click <strong>Add Attorney</strong> to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <AttorneyFormModal
          attorney={editing ?? undefined}
          firms={firms ?? []}
          onClose={() => {
            setAdding(false); setEditing(null);
            if (search.edit) navigate({ search: { edit: undefined } });
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-attorneys"] });
            qc.invalidateQueries({ queryKey: ["firms-options"] });
            setAdding(false); setEditing(null);
            if (search.edit) navigate({ search: { edit: undefined } });
          }}
        />
      )}
    </div>
  );
}

function AttorneyFormModal({ attorney, firms, onClose, onSaved }: {
  attorney?: AttorneyRow;
  firms: { id: string; name: string; city: string | null; province: string | null }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!attorney;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: attorney?.first_name ?? "",
    last_name: attorney?.last_name ?? "",
    email: attorney?.email ?? "",
    phone: attorney?.phone ?? "",
    office_phone: attorney?.office_phone ?? "",
    mobile_phone: attorney?.mobile_phone ?? attorney?.phone ?? "",
    city: attorney?.city ?? "",
    province: attorney?.province ?? "",
    firm_id: attorney?.firm_id ?? "",
    designation: attorney?.designation ?? "Attorney",
    is_mediator: attorney?.is_mediator ?? false,
    is_arbitrator: attorney?.is_arbitrator ?? false,
    year_of_admission: attorney?.year_of_admission ? String(attorney.year_of_admission) : "",
    avatar_url: attorney?.avatar_url ?? "",
    status: attorney?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropSrcIsObjectUrl, setCropSrcIsObjectUrl] = useState(false);

  const { data: allPracticeAreas } = useQuery({
    queryKey: ["practice-areas-all"],
    queryFn: async () => {
      const { data } = await supabase.from("practice_areas").select("id, slug, name").order("name");
      return (data ?? []) as { id: string; slug: string; name: string }[];
    },
  });

  const { data: existingPaIds } = useQuery({
    queryKey: ["attorney-practice-areas", attorney?.id],
    enabled: !!attorney?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyer_practice_areas")
        .select("practice_area_id")
        .eq("lawyer_id", attorney!.id);
      return (data ?? []).map((r: { practice_area_id: string }) => r.practice_area_id);
    },
  });

  const [selectedPaIds, setSelectedPaIds] = useState<Set<string>>(new Set());
  useEffect(() => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    const url = URL.createObjectURL(file);
    setCropSrcIsObjectUrl(true);
    setCropSrc(url);
  };

  const closeCrop = () => {
    if (cropSrc && cropSrcIsObjectUrl) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropSrcIsObjectUrl(false);
  };

  const uploadCroppedBlob = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `attorneys/${attorney?.id ?? "new"}/${crypto.randomUUID()}.jpg`;
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
      toast.success("Photo saved");
      closeCrop();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openRepositionExisting = async () => {
    if (!form.avatar_url) return;
    setUploading(true);
    try {
      const { fetchImageAsDataUrl } = await import("../../lib/fetch-image.functions");
      const { dataUrl } = await fetchImageAsDataUrl({ data: { url: form.avatar_url } });
      setCropSrcIsObjectUrl(false);
      setCropSrc(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load image for repositioning");
    } finally {
      setUploading(false);
    }
  };

  const createFirm = async (name: string): Promise<string | null> => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    const { data: clash } = await supabase.from("firms").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("firms").insert({ name: name.trim(), slug }).select("id").single();
    if (error) { toast.error(error.message); return null; }
    toast.success(`Firm "${name}" added`);
    await qc.invalidateQueries({ queryKey: ["firms-options"] });
    return data.id;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("First and last name required"); return; }
    if (!form.firm_id) { toast.error("Firm is required for attorneys"); return; }
    setSaving(true);
    try {
      const year = form.year_of_admission ? parseInt(form.year_of_admission, 10) : null;
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.mobile_phone.trim() || form.phone.trim() || null,
        office_phone: form.office_phone.trim() || null,
        mobile_phone: form.mobile_phone.trim() || null,
        city: form.city.trim() || null,
        province: form.province || null,
        firm_id: form.firm_id,
        designation: form.designation.trim() || "Attorney",
        is_mediator: form.is_mediator,
        is_arbitrator: form.is_arbitrator,
        year_of_admission: Number.isFinite(year as number) ? year : null,
        avatar_url: form.avatar_url.trim() || null,
        status: form.status,
        lawyer_type: "attorney" as const,
        bar_id: null,
        chambers_id: null,
      };
      let attorneyId = attorney?.id;
      if (isEdit && attorney) {
        const { data: updated, error } = await supabase
          .from("lawyers")
          .update(payload)
          .eq("id", attorney.id)
          .select("id");
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error(
            "Update was blocked by access rules — you must be signed in as a platform admin to edit this attorney.",
          );
        }
      } else {
        const slug = `${slugify(`${payload.first_name}-${payload.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error } = await supabase
          .from("lawyers")
          .insert({ ...payload, slug, status: "active" })
          .select("id")
          .single();
        if (error) throw error;
        attorneyId = inserted.id;
      }

      if (attorneyId) {
        const { error: delErr } = await supabase
          .from("lawyer_practice_areas")
          .delete()
          .eq("lawyer_id", attorneyId);
        if (delErr) throw delErr;
        if (selectedPaIds.size > 0) {
          const rows = Array.from(selectedPaIds).map((pid) => ({
            lawyer_id: attorneyId!,
            practice_area_id: pid,
          }));
          const { error: insErr } = await supabase.from("lawyer_practice_areas").insert(rows);
          if (insErr) throw insErr;
        }
      }

      toast.success(isEdit ? "Attorney updated" : "Attorney added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Attorney" : "Add Attorney"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Firm *</label>
            <ComboboxCreatable
              value={form.firm_id}
              onChange={(v) => {
                const selected = v ? firms.find((f) => f.id === v) : null;
                setForm({
                  ...form,
                  firm_id: v,
                  city: form.city || selected?.city || "",
                  province: form.province || selected?.province || "",
                });
              }}
              options={firms.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="Type or select a Firm…"
              emptyLabel="— None —"
              onCreate={createFirm}
              createLabel="Add Firm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Designation</label>
            <input placeholder="e.g. Partner, Director, Senior Associate, Attorney" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input placeholder="Office / landline" type="tel" value={form.office_phone} onChange={(e) => setForm({ ...form, office_phone: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Mobile" type="tel" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <div />
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
            <div />
          </div>

          <div className="rounded border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Roles</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_mediator} onChange={(e) => setForm({ ...form, is_mediator: e.target.checked })} className="accent-gold" />
                Also acts as Mediator
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_arbitrator} onChange={(e) => setForm({ ...form, is_arbitrator: e.target.checked })} className="accent-gold" />
                Also acts as Arbitrator
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo</label>
            <div className="flex items-start gap-3">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">No photo</div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  placeholder="Paste image URL…"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted ${uploading ? "opacity-50" : ""}`}>
                    {uploading ? "Uploading…" : "Upload image"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileUpload} />
                  </label>
                  {form.avatar_url && (
                    <>
                      <button type="button" onClick={openRepositionExisting} className="text-xs text-ink underline hover:text-gold">Reposition</button>
                      <button type="button" onClick={() => setForm({ ...form, avatar_url: "" })} className="text-xs text-destructive hover:underline">Remove</button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Paste a URL or upload a file (max 5 MB).</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice areas</label>
            <div className="flex flex-wrap gap-1.5 rounded border border-border bg-background p-2">
              {(allPracticeAreas ?? []).length === 0 && <span className="text-xs text-muted-foreground">Loading…</span>}
              {(allPracticeAreas ?? []).map((pa) => {
                const active = selectedPaIds.has(pa.id);
                return (
                  <button
                    key={pa.id}
                    type="button"
                    onClick={() => togglePa(pa.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      active
                        ? "border-ink bg-ink text-cream"
                        : "border-border bg-cream text-ink hover:border-ink"
                    }`}
                  >
                    {pa.name}
                  </button>
                );
              })}
            </div>
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

          {isEdit && attorney && (
            <div className="border-t border-border pt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reported cases</label>
              <ReportedCasesEditor lawyerId={attorney.id} />
            </div>
          )}
        </form>

        <div className="flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} onClick={submit} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save" : "Add Attorney"}
          </button>
        </div>
      </div>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          busy={uploading}
          onCancel={closeCrop}
          onConfirm={uploadCroppedBlob}
        />
      )}
    </div>
  );
}
