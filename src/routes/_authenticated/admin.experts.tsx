import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { slugify } from "../../lib/constants";
import { RichTextEditor } from "../../components/RichTextEditor";
import { ExpertWorkSamples } from "../../components/ExpertWorkSamples";
import { ExpertPhotoField } from "../../components/ExpertPhotoField";
import { ProvinceCityFields } from "../../components/ProvinceCityFields";
import { sanitizeBioHtml } from "../../lib/sanitize";

export const Route = createFileRoute("/_authenticated/admin/experts")({
  head: () => ({ meta: [{ title: "Admin · Expert Witnesses — Lawexpert.co.za" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  component: AdminExpertsPage,
});

const NAME_TITLES = ["", "Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof", "Adv", "Rev"] as const;

type ExpertRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  name_title: string | null;
  title: string | null;
  city: string | null;
  province: string | null;
  status: string;
  trial_end_date: string | null;
  profile_views: number;
  firm_id: string | null;
};

function AdminExpertsPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/experts" });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ExpertRow | null>(null);

  const clearEditSearch = () => {
    if (search.edit) navigate({ search: { edit: undefined } as any });
  };


  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: experts, isLoading } = useQuery({
    queryKey: ["admin-experts"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, slug, first_name, last_name, name_title, title, city, province, status, trial_end_date, profile_views, firm_id").eq("provider_type", "expert")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpertRow[];
    },
  });

  useEffect(() => {
    if (search.edit && experts && !editing) {
      const found = experts.find((e) => e.id === search.edit);
      if (found) setEditing(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.edit, experts]);


  const { data: firms } = useQuery({
    queryKey: ["admin-firms-list"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").order("name");
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expert removed");
      qc.invalidateQueries({ queryKey: ["admin-experts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-experts"] });

  if (profileLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">Not authorised</h1>
        <p className="mt-2 text-muted-foreground">This page is reserved for platform admins.</p>
      </div>
    );
  }

  const firmName = (id: string | null) => firms?.find((f: any) => f.id === id)?.name ?? "Independent";

  return (
    <div className="bg-cream min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to Admin Hub
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="font-heading text-3xl text-ink">Expert Witnesses</h1>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
              <Plus className="h-4 w-4" /> Add Expert Witness
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {experts?.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-ink">{[e.name_title, e.first_name, e.last_name].filter(Boolean).join(" ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{firmName(e.firm_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[e.city, e.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{e.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{e.profile_views}</td>
                  <td className="px-4 py-3 text-right">
                    {(e.status === "trial" || e.status === "active") && (
                      <a href={`/expert-witnesses/${e.slug}`} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-gold">
                        <Eye className="h-3 w-3" /> Preview
                      </a>
                    )}
                    <button onClick={() => setEditing(e)} className="mr-2 text-xs font-medium text-ink hover:text-gold">Edit</button>
                    <button onClick={() => { if (confirm("Delete this expert?")) remove.mutate(e.id); }} className="text-xs text-destructive">Delete</button>
                  </td>
                </tr>
              ))}
              {!isLoading && (!experts || experts.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No expert witnesses yet. Add your first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AdminExpertFormModal
          firms={firms ?? []}
          onClose={() => setShowAdd(false)}
          onSaved={() => { refresh(); setShowAdd(false); }}
        />
      )}
      {editing && (
        <AdminExpertFormModal
          firms={firms ?? []}
          expert={editing}
          onClose={() => { setEditing(null); clearEditSearch(); }}
          onSaved={() => { refresh(); setEditing(null); clearEditSearch(); }}
        />
      )}
    </div>
  );
}

function AdminExpertFormModal({
  firms,
  expert,
  onClose,
  onSaved,
}: {
  firms: { id: string; name: string }[];
  expert?: ExpertRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!expert;

  const { data: existing } = useQuery({
    queryKey: ["admin-expert-detail", expert?.id],
    enabled: !!expert?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("service_providers")
        .select("*").eq("provider_type", "expert")
        .eq("id", expert!.id)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    first_name: expert?.first_name ?? "",
    last_name: expert?.last_name ?? "",
    name_title: expert?.name_title ?? "",
    title: expert?.title ?? "",
    qualifications: "",
    registration_body: "",
    city: expert?.city ?? "",
    province: (expert?.province ?? "Gauteng") as string,
    bio: "",
    avatar_url: "",
    firm_id: expert?.firm_id ?? "",
    status: expert?.status ?? "trial",
    company_name: "",
    office_phone: "",
    mobile_phone: "",
    contact_email: "",
  });
  const [hydrated, setHydrated] = useState(!isEdit);
  const [saving, setSaving] = useState(false);

  // Hydrate ALL editable fields from the full row once it loads so the form
  // never blanks out existing data and saves don't overwrite stored values.
  useEffect(() => {
    if (!isEdit || hydrated || !existing) return;
    const e = existing as Record<string, unknown>;
    setForm((f) => ({
      ...f,
      first_name: (e.first_name as string) ?? f.first_name,
      last_name: (e.last_name as string) ?? f.last_name,
      name_title: (e.name_title as string) ?? f.name_title,
      title: (e.title as string) ?? f.title,
      qualifications: (e.qualifications as string) ?? "",
      registration_body: (e.registration_body as string) ?? "",
      city: (e.city as string) ?? f.city,
      province: (e.province as string) ?? f.province,
      bio: (e.bio as string) ?? "",
      avatar_url: (e.avatar_url as string) ?? "",
      firm_id: (e.firm_id as string) ?? f.firm_id,
      status: (e.status as string) ?? f.status,
      company_name: (e.company_name as string) ?? "",
      office_phone: (e.office_phone as string) ?? "",
      mobile_phone: (e.mobile_phone as string) ?? "",
      contact_email: (e.contact_email as string) ?? "",
    }));
    setHydrated(true);
  }, [existing, isEdit, hydrated]);




  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        name_title: form.name_title?.trim() || null,
        title: form.title || null,
        qualifications: form.qualifications ? sanitizeBioHtml(form.qualifications) : null,
        registration_body: form.registration_body || null,
        city: form.city || null,
        province: form.province || null,
        bio: form.bio ? sanitizeBioHtml(form.bio) : null,
        avatar_url: form.avatar_url?.trim() || null,
        firm_id: form.firm_id || null,
        is_independent: !form.firm_id,
        company_name: form.company_name?.trim() || null,
        office_phone: form.office_phone?.trim() || null,
        mobile_phone: form.mobile_phone?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
      };
      if (isEdit && expert) {
        const { error } = await supabase
          .from("service_providers")
          .update({ ...payload, status: form.status })
          .eq("id", expert.id);
        if (error) throw error;
      } else {
        const baseSlug = slugify(`${form.first_name}-${form.last_name}`);
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
        const { error } = await supabase.from("service_providers").insert({ ...payload, slug, provider_type: "expert" });
        if (error) throw error;
      }
      toast.success(isEdit ? "Expert updated" : "Expert added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit" : "Add"} Expert Witness</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {isEdit && !hydrated ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading existing details…</div>
        ) : (
        <form onSubmit={submit} className="space-y-3">
          <AField label="Photo">
            <ExpertPhotoField
              value={form.avatar_url}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
              firmId={form.firm_id || null}
              expertId={expert?.id}
            />
          </AField>
          <div className="grid gap-3 md:grid-cols-[7rem_1fr_1fr]">
            <AField label="Title">
              <select value={form.name_title} onChange={(e) => setForm({ ...form, name_title: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                {NAME_TITLES.map((t) => <option key={t} value={t}>{t || "— none —"}</option>)}
              </select>
            </AField>
            <AField label="First name *">
              <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </AField>
            <AField label="Last name *">
              <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </AField>
          </div>
          <AField label="Firm (leave blank for independent expert)">
            <select value={form.firm_id} onChange={(e) => setForm({ ...form, firm_id: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Independent —</option>
              {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </AField>
          <AField label="Professional title (e.g. Orthopaedic Surgeon, Chartered Accountant)">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </AField>
          <AField label="Company / practice name">
            <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="e.g. De Kroon Forensic Accounting" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </AField>
          <div className="grid gap-3 md:grid-cols-2">
            <AField label="Office phone">
              <input type="tel" value={form.office_phone} onChange={(e) => setForm({ ...form, office_phone: e.target.value })} placeholder="+27 21 555 0100" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </AField>
            <AField label="Mobile phone">
              <input type="tel" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} placeholder="+27 82 555 0100" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </AField>
          </div>
          <AField label="Contact email">
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="eric@example.co.za" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </AField>
          <AField label="Qualifications">
            <RichTextEditor value={form.qualifications} onChange={(html) => setForm({ ...form, qualifications: html })} placeholder="LLB, MBChB, FCS(SA)… use bullets for each qualification." />
          </AField>
          <AField label="Registration body (e.g. HPCSA)">
            <input value={form.registration_body} onChange={(e) => setForm({ ...form, registration_body: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </AField>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Province &amp; City</p>
            <div className="grid gap-3 md:grid-cols-2">
              <ProvinceCityFields
                province={form.province}
                city={form.city}
                onProvince={(v: string) => setForm({ ...form, province: v })}
                onCity={(v: string) => setForm({ ...form, city: v })}
              />
            </div>
          </div>
          {isEdit && (
            <AField label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="pending_payment">Pending payment</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </AField>
          )}
          <AField label="Bio / experience">
            <RichTextEditor value={form.bio} onChange={(html) => setForm({ ...form, bio: html })} placeholder="Background, areas of focus, notable experience…" />
          </AField>

          {isEdit && expert && (
            <AField label="Samples of work">
              <ExpertWorkSamples expertId={expert.id} />
            </AField>
          )}
          {!isEdit && (
            <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Save the expert first, then re-open to add samples of work.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add expert"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function AField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
