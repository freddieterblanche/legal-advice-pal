import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";
import { ProvinceCityFields } from "./ProvinceCityFields";
import { sanitizeBioHtml } from "../lib/sanitize";
import {
  MEDIATION_SECTORS,
  MEDIATION_ACCREDITATIONS,
  MEDIATION_STYLES,
  ARBITRATION_TYPES,
  ARBITRATION_ACCREDITATIONS,
  COMMON_LANGUAGES,
} from "../lib/expert-constants";

type Role = "mediator" | "arbitrator";

type FormState = {
  first_name: string;
  last_name: string;
  avatar_url: string;
  city: string;
  province: string;
  email: string;
  office_phone: string;
  mobile_phone: string;
  bio: string;
  languages: string[];
  services: string[];
  daily_rate_range: string;
  availability_notes: string;
  status: string;
  // mediator
  mediator_accreditation: string;
  mediator_style: string;
  mediator_sectors: string[];
  // arbitrator
  arbitrator_accreditation: string;
  arbitrator_types: string[];
  arbitrator_experience_years: string;
  // cross flags
  is_mediator: boolean;
  is_arbitrator: boolean;
};

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  avatar_url: "",
  city: "",
  province: "",
  email: "",
  office_phone: "",
  mobile_phone: "",
  bio: "",
  languages: [],
  services: [],
  daily_rate_range: "",
  availability_notes: "",
  status: "active",
  mediator_accreditation: "",
  mediator_style: "",
  mediator_sectors: [],
  arbitrator_accreditation: "",
  arbitrator_types: [],
  arbitrator_experience_years: "",
  is_mediator: false,
  is_arbitrator: false,
};

export function MediatorArbitratorFormModal({
  id,
  role,
  onClose,
  onSaved,
}: {
  id: string;
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["mediator-arbitrator-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!row || hydrated) return;
    setForm({
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      avatar_url: row.avatar_url ?? "",
      city: row.city ?? "",
      province: row.province ?? "",
      email: row.email ?? "",
      office_phone: row.office_phone ?? "",
      mobile_phone: row.mobile_phone ?? "",
      bio: row.bio ?? "",
      languages: Array.isArray(row.languages) ? row.languages : [],
      services: Array.isArray((row as any).services) ? ((row as any).services as string[]) : [],
      daily_rate_range: row.daily_rate_range ?? "",
      availability_notes: row.availability_notes ?? "",
      status: row.status ?? "active",
      mediator_accreditation: row.mediator_accreditation ?? "",
      mediator_style: row.mediator_style ?? "",
      mediator_sectors: Array.isArray(row.mediator_sectors) ? row.mediator_sectors : [],
      arbitrator_accreditation: row.arbitrator_accreditation ?? "",
      arbitrator_types: Array.isArray(row.arbitrator_types) ? row.arbitrator_types : [],
      arbitrator_experience_years:
        row.arbitrator_experience_years != null ? String(row.arbitrator_experience_years) : "",
      is_mediator: !!row.is_mediator,
      is_arbitrator: !!row.is_arbitrator,
    });
    setHydrated(true);
  }, [row, hydrated]);

  const toggleArr = (key: "mediator_sectors" | "arbitrator_types" | "languages", v: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v],
    }));

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lawyer-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("lawyer-photos").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hydrated) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name required");
      return;
    }
    setSaving(true);
    // Build payload using ONLY fields this modal owns — never touch
    // advocate-only columns (provider_type, bar_id, chambers_id, is_senior_counsel,
    // year_of_admission, designation_*).
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      avatar_url: form.avatar_url.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      email: form.email.trim() || null,
      office_phone: form.office_phone.trim() || null,
      mobile_phone: form.mobile_phone.trim() || null,
      bio: sanitizeBioHtml(form.bio) || null,
      languages: form.languages.length ? form.languages : null,
      services: form.services.length ? form.services : null,
      daily_rate_range: form.daily_rate_range.trim() || null,
      availability_notes: form.availability_notes.trim() || null,
      status: form.status,
      is_mediator: form.is_mediator,
      is_arbitrator: form.is_arbitrator,
      // mediator-only
      mediator_accreditation: form.is_mediator ? form.mediator_accreditation || null : null,
      mediator_style: form.is_mediator ? form.mediator_style || null : null,
      mediator_sectors: form.is_mediator && form.mediator_sectors.length ? form.mediator_sectors : null,
      // arbitrator-only
      arbitrator_accreditation: form.is_arbitrator ? form.arbitrator_accreditation || null : null,
      arbitrator_types: form.is_arbitrator && form.arbitrator_types.length ? form.arbitrator_types : null,
      arbitrator_experience_years:
        form.is_arbitrator && form.arbitrator_experience_years
          ? Number(form.arbitrator_experience_years)
          : null,
    };
    const { error } = await supabase.from("service_providers").update(payload).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  };

  const ready = hydrated && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg text-ink">
            Edit {role === "mediator" ? "Mediator" : "Arbitrator"}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!ready ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-5">
            {/* Basic */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name *">
                <input className={inputCls} value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </Field>
              <Field label="Last name *">
                <input className={inputCls} value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </Field>
            </div>

            {/* Photo */}
            <Field label="Profile photo">
              <div className="flex items-center gap-4">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="h-20 w-16 rounded object-cover" />
                ) : (
                  <div className="flex h-20 w-16 items-center justify-center rounded bg-muted text-xs text-muted-foreground">No photo</div>
                )}
                <div className="flex-1 space-y-2">
                  <input className={inputCls} placeholder="Photo URL" value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
                    {uploading ? "Uploading…" : "Upload new"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                  </label>
                </div>
              </div>
            </Field>

            {/* Location */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Province &amp; City</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProvinceCityFields
                  province={form.province}
                  city={form.city}
                  onProvince={(v: string) => setForm({ ...form, province: v })}
                  onCity={(v: string) => setForm({ ...form, city: v })}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Email">
                <input type="email" className={inputCls} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Office phone">
                <input className={inputCls} value={form.office_phone}
                  onChange={(e) => setForm({ ...form, office_phone: e.target.value })} />
              </Field>
              <Field label="Mobile">
                <input className={inputCls} value={form.mobile_phone}
                  onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} />
              </Field>
            </div>

            {/* Description / bio */}
            <Field label="Description / Bio">
              <RichTextEditor
                value={form.bio}
                onChange={(v) => setForm({ ...form, bio: v })}
                placeholder="Background, experience, approach…"
              />
            </Field>

            {/* Role flags */}
            <div className="rounded border border-border bg-cream/50 p-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active roles</div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.is_mediator}
                    onChange={(e) => setForm({ ...form, is_mediator: e.target.checked })} />
                  Acts as Mediator
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.is_arbitrator}
                    onChange={(e) => setForm({ ...form, is_arbitrator: e.target.checked })} />
                  Acts as Arbitrator
                </label>
              </div>
            </div>

            {/* Mediator fields */}
            {form.is_mediator && (
              <fieldset className="space-y-3 rounded border border-violet-500/30 bg-violet-500/5 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-violet-700">Mediator details</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Accreditation">
                    <select className={inputCls} value={form.mediator_accreditation}
                      onChange={(e) => setForm({ ...form, mediator_accreditation: e.target.value })}>
                      <option value="">—</option>
                      {MEDIATION_ACCREDITATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Style">
                    <select className={inputCls} value={form.mediator_style}
                      onChange={(e) => setForm({ ...form, mediator_style: e.target.value })}>
                      <option value="">—</option>
                      {MEDIATION_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Sectors">
                  <div className="flex flex-wrap gap-1.5">
                    {MEDIATION_SECTORS.map((s) => (
                      <button type="button" key={s} onClick={() => toggleArr("mediator_sectors", s)}
                        className={`rounded-full border px-2.5 py-1 text-xs ${form.mediator_sectors.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              </fieldset>
            )}

            {/* Arbitrator fields */}
            {form.is_arbitrator && (
              <fieldset className="space-y-3 rounded border border-rose-500/30 bg-rose-500/5 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-rose-700">Arbitrator details</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Accreditation">
                    <select className={inputCls} value={form.arbitrator_accreditation}
                      onChange={(e) => setForm({ ...form, arbitrator_accreditation: e.target.value })}>
                      <option value="">—</option>
                      {ARBITRATION_ACCREDITATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Years of experience">
                    <input type="number" min={0} max={80} className={inputCls}
                      value={form.arbitrator_experience_years}
                      onChange={(e) => setForm({ ...form, arbitrator_experience_years: e.target.value })} />
                  </Field>
                </div>
                <Field label="Types">
                  <div className="flex flex-wrap gap-1.5">
                    {ARBITRATION_TYPES.map((s) => (
                      <button type="button" key={s} onClick={() => toggleArr("arbitrator_types", s)}
                        className={`rounded-full border px-2.5 py-1 text-xs ${form.arbitrator_types.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              </fieldset>
            )}

            {/* Languages */}
            <Field label="Languages">
              <div className="flex flex-wrap gap-1.5">
                {COMMON_LANGUAGES.map((s) => (
                  <button type="button" key={s} onClick={() => toggleArr("languages", s)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${form.languages.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Services">
              <TagInput
                value={form.services}
                onChange={(next) => setForm((f) => ({ ...f, services: next }))}
                placeholder="e.g. Workplace mediation — press Enter"
              />
            </Field>


            {/* Rate & availability */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Daily rate range">
                <input className={inputCls} value={form.daily_rate_range}
                  placeholder="e.g. R15 000 – R25 000"
                  onChange={(e) => setForm({ ...form, daily_rate_range: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="pending_payment">Pending payment</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
            <Field label="Availability notes">
              <textarea rows={2} className={inputCls} value={form.availability_notes}
                onChange={(e) => setForm({ ...form, availability_notes: e.target.value })} />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={onClose}
                className="rounded border border-border bg-background px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving}
                className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90 disabled:opacity-60">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded border border-border bg-background px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
