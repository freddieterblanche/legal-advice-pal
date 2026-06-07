import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { X, Upload, Sparkles, Star, Trash2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { PROVINCES, slugify } from "../lib/constants";
import { ProvinceCityFields } from "./ProvinceCityFields";
import { ATTORNEY_DESIGNATIONS, yearsInPractice } from "../lib/designation";
import { importLawyerProfile } from "../lib/profile-import.functions";
import { fetchImageAsDataUrl } from "../lib/fetch-image.functions";
import { RichTextEditor } from "./RichTextEditor";
import { sanitizeBioHtml } from "../lib/sanitize";
import { ImageCropModal } from "./ImageCropModal";
import { ReportedCasesEditor } from "./ReportedCasesEditor";
import {
  MEDIATION_SECTORS,
  MEDIATION_ACCREDITATIONS,
  MEDIATION_STYLES,
  ARBITRATION_TYPES,
  ARBITRATION_ACCREDITATIONS,
} from "../lib/expert-constants";

export type Branch = {
  id: string;
  firm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  is_head_office: boolean;
};

const CURRENT_YEAR = new Date().getFullYear();

export const lawyerSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  designation: z.string().trim().max(120).optional(),
  lawyer_type: z.enum(["advocate", "attorney"]).nullable().optional(),
  year_of_admission: z.number().int().min(1900).max(CURRENT_YEAR).nullable().optional(),
  is_senior_counsel: z.boolean().optional(),
  designation_code: z.string().trim().max(80).nullable().optional(),
  designation_custom: z.string().trim().max(120).nullable().optional(),
  is_practice_head: z.boolean().optional(),
  practice_head_area: z.string().trim().max(120).nullable().optional(),
  is_sector_head: z.boolean().optional(),
  sector_head_area: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(1).max(80),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]),
  bio: z.string().max(20000).optional(),
  overview: z.string().max(20000).optional(),
  qualifications: z.string().max(20000).optional(),
  accolades: z.string().max(20000).optional(),
  noteworthy_matters: z.string().max(20000).optional(),
  reported_cases_notes: z.string().max(20000).optional(),
  avatar_url: z.string().trim().max(2000).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(60).optional(),
  office_phone: z.string().trim().max(60).optional(),
  mobile_phone: z.string().trim().max(60).optional(),
  linkedin_url: z.string().trim().max(500).optional(),
  is_mediator: z.boolean().optional(),
  is_arbitrator: z.boolean().optional(),
  mediator_accreditation: z.string().trim().max(120).nullable().optional(),
  mediator_style: z.string().trim().max(120).nullable().optional(),
  mediator_sectors: z.array(z.string().trim().max(120)).nullable().optional(),
  arbitrator_accreditation: z.string().trim().max(120).nullable().optional(),
  arbitrator_types: z.array(z.string().trim().max(120)).nullable().optional(),
  arbitrator_experience_years: z.number().int().min(0).max(80).nullable().optional(),
  availability_notes: z.string().trim().max(1000).nullable().optional(),
});

export type LawyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  designation: string | null;
  lawyer_type: string | null;
  year_of_admission: number | null;
  is_senior_counsel: boolean | null;
  designation_code: string | null;
  designation_custom: string | null;
  is_practice_head: boolean | null;
  practice_head_area: string | null;
  is_sector_head: boolean | null;
  sector_head_area: string | null;
  city: string | null;
  province: string | null;
  bio: string | null;
  overview: string | null;
  qualifications: string | null;
  accolades: string | null;
  noteworthy_matters: string | null;
  reported_cases_notes: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  office_phone: string | null;
  mobile_phone: string | null;
  linkedin_url: string | null;
  status: string | null;
  trial_end_date: string | null;
  profile_views: number | null;
  profile_id?: string | null;
  slug?: string | null;
  is_mediator?: boolean | null;
  is_arbitrator?: boolean | null;
  mediator_accreditation?: string | null;
  mediator_style?: string | null;
  mediator_sectors?: string[] | null;
  arbitrator_accreditation?: string | null;
  arbitrator_types?: string[] | null;
  arbitrator_experience_years?: number | null;
  availability_notes?: string | null;
  firm_id: string | null;
};



export function LawyerFormModal({
  firmId,
  lawyer,
  onClose,
  onSaved,
}: {
  firmId: string;
  lawyer?: LawyerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lawyer;
  const initialOtherCode =
    !!lawyer?.designation_code &&
    !(ATTORNEY_DESIGNATIONS as readonly string[]).includes(lawyer.designation_code);
  const [otherDesignation, setOtherDesignation] = useState<boolean>(initialOtherCode);
  const [form, setForm] = useState({
    first_name: lawyer?.first_name ?? "",
    last_name: lawyer?.last_name ?? "",
    designation: lawyer?.designation ?? "",
    lawyer_type: (lawyer?.lawyer_type as "advocate" | "attorney" | null) ?? "attorney",
    year_of_admission: lawyer?.year_of_admission ?? null,
    is_senior_counsel: !!lawyer?.is_senior_counsel,
    designation_code: initialOtherCode ? "" : (lawyer?.designation_code ?? ""),
    designation_custom: lawyer?.designation_custom ?? (initialOtherCode ? (lawyer?.designation_code ?? "") : ""),
    is_practice_head: !!lawyer?.is_practice_head,
    practice_head_area: lawyer?.practice_head_area ?? "",
    is_sector_head: !!lawyer?.is_sector_head,
    sector_head_area: lawyer?.sector_head_area ?? "",
    city: lawyer?.city ?? "",
    province: lawyer?.province ?? "Gauteng",
    bio: lawyer?.bio ?? "",
    overview: lawyer?.overview ?? lawyer?.bio ?? "",
    qualifications: lawyer?.qualifications ?? "",
    accolades: lawyer?.accolades ?? "",
    noteworthy_matters: lawyer?.noteworthy_matters ?? "",
    reported_cases_notes: lawyer?.reported_cases_notes ?? "",
    avatar_url: lawyer?.avatar_url ?? "",
    email: lawyer?.email ?? "",
    phone: lawyer?.phone ?? "",
    office_phone: lawyer?.office_phone ?? "",
    mobile_phone: lawyer?.mobile_phone ?? lawyer?.phone ?? "",
    linkedin_url: lawyer?.linkedin_url ?? "",
    is_mediator: !!lawyer?.is_mediator,
    is_arbitrator: !!lawyer?.is_arbitrator,
    mediator_accreditation: lawyer?.mediator_accreditation ?? "",
    mediator_style: lawyer?.mediator_style ?? "",
    mediator_sectors: (lawyer?.mediator_sectors ?? []) as string[],
    arbitrator_accreditation: lawyer?.arbitrator_accreditation ?? "",
    arbitrator_types: (lawyer?.arbitrator_types ?? []) as string[],
    arbitrator_experience_years:
      lawyer?.arbitrator_experience_years != null ? String(lawyer.arbitrator_experience_years) : "",
    availability_notes: lawyer?.availability_notes ?? "",
  });

  const toggleArr = (key: "mediator_sectors" | "arbitrator_types", v: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v],
    }));

  const [practiceAreas, setPracticeAreas] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [allPracticeAreas, setAllPracticeAreas] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [firmBranches, setFirmBranches] = useState<Branch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const importFn = useServerFn(importLawyerProfile);
  const fetchImageFn = useServerFn(fetchImageAsDataUrl);
  const [loadingUrlCrop, setLoadingUrlCrop] = useState(false);

  // Load firm branches
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("firm_branches")
        .select("*")
        .eq("firm_id", firmId)
        .order("is_head_office", { ascending: false })
        .order("created_at", { ascending: true });
      setFirmBranches((data ?? []) as Branch[]);
    })();
  }, [firmId]);

  // Load all practice areas (for selection)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("practice_areas")
        .select("id, slug, name")
        .order("name", { ascending: true });
      setAllPracticeAreas((data ?? []) as { id: string; slug: string; name: string }[]);
    })();
  }, []);

  // Load lawyer's existing branch links
  useEffect(() => {
    if (!lawyer) return;
    (async () => {
      const { data } = await supabase
        .from("lawyer_branches")
        .select("branch_id")
        .eq("lawyer_id", lawyer.id);
      setSelectedBranchIds(new Set((data ?? []).map((r) => r.branch_id)));
    })();
  }, [lawyer]);

  const toggleBranch = (branchId: string) => {
    const next = new Set(selectedBranchIds);
    if (next.has(branchId)) next.delete(branchId);
    else next.add(branchId);
    setSelectedBranchIds(next);
    // Auto-fill city/province from first selected branch
    const firstId = next.values().next().value as string | undefined;
    const first = firstId ? firmBranches.find((b) => b.id === firstId) : undefined;
    if (first) {
      setForm((f) => ({
        ...f,
        city: first.city || f.city,
        province: (first.province as string) || f.province,
      }));
    }
  };


  const handleRepositionUrl = async () => {
    const url = form.avatar_url?.trim();
    if (!url) {
      toast.error("Enter or paste an image URL first");
      return;
    }
    setLoadingUrlCrop(true);
    try {
      const { dataUrl } = await fetchImageFn({ data: { url } });
      setCropSrc(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load image");
    } finally {
      setLoadingUrlCrop(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `${firmId}/${crypto.randomUUID()}.jpg`;
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
      toast.success("Photo uploaded");
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Load existing practice areas when editing
  useEffect(() => {
    if (!lawyer) return;
    (async () => {
      const { data } = await supabase
        .from("lawyer_practice_areas")
        .select("practice_areas(id, slug, name)")
        .eq("lawyer_id", lawyer.id);
      const rows = (data ?? [])
        .map((r: { practice_areas: { id: string; slug: string; name: string } | null }) => r.practice_areas)
        .filter((p): p is { id: string; slug: string; name: string } => !!p);
      setPracticeAreas(rows);
    })();
  }, [lawyer]);

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImported(false);
    try {
      const res = await importFn({ data: { url: importUrl.trim() } });
      setForm((f) => ({
        ...f,
        first_name: res.first_name || f.first_name,
        last_name: res.last_name || f.last_name,
        lawyer_type: (res.lawyer_type as "advocate" | "attorney") || f.lawyer_type,
        is_senior_counsel: res.lawyer_type === "advocate" ? !!res.is_senior_counsel : f.is_senior_counsel,
        year_of_admission: res.year_of_admission ?? f.year_of_admission,
        designation_code: res.designation_code || f.designation_code,
        designation_custom: res.designation_custom || f.designation_custom,
        designation: res.designation || f.designation,
        city: res.city || f.city,
        province: res.province || f.province,
        overview: res.overview || f.overview,
        qualifications: res.qualifications || f.qualifications,
        accolades: res.accolades || f.accolades,
        noteworthy_matters: res.noteworthy_matters || f.noteworthy_matters,
        bio: res.overview || f.bio,
        avatar_url: res.avatar_url || f.avatar_url,
        email: res.email || f.email,
        phone: res.phone || f.phone,
        mobile_phone: res.phone || f.mobile_phone,
        linkedin_url: res.linkedin_url || f.linkedin_url,
      }));
      // If imported designation_custom is set, switch the "Other" toggle on
      if (res.designation_custom && !res.designation_code) setOtherDesignation(true);
      else if (res.designation_code) setOtherDesignation(false);
      setPracticeAreas(res.practice_areas);

      setImported(true);
      toast.success("Profile imported — please review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const syncPracticeAreas = async (lawyerId: string) => {
    const { error: delErr } = await supabase.from("lawyer_practice_areas").delete().eq("lawyer_id", lawyerId);
    if (delErr) throw delErr;
    if (practiceAreas.length === 0) return;
    const links = practiceAreas.map((p) => ({ lawyer_id: lawyerId, practice_area_id: p.id }));
    const { error } = await supabase.from("lawyer_practice_areas").insert(links);
    if (error) throw error;
  };

  const syncBranches = async (lawyerId: string) => {
    const { error: delErr } = await supabase.from("lawyer_branches").delete().eq("lawyer_id", lawyerId);
    if (delErr) throw delErr;
    if (selectedBranchIds.size === 0) return;
    const links = Array.from(selectedBranchIds).map((branch_id) => ({ lawyer_id: lawyerId, branch_id }));
    const { error } = await supabase.from("lawyer_branches").insert(links);
    if (error) throw error;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // If the avatar_url is an external URL (not already in our storage),
      // fetch it server-side and upload to lawyer-photos so we don't rely on
      // hotlinking (many sites block cross-origin image embeds).
      const currentUrl = form.avatar_url?.trim() ?? "";
      const isOurStorage = currentUrl.includes("/storage/v1/object/");
      if (currentUrl && /^https?:\/\//i.test(currentUrl) && !isOurStorage) {
        try {
          const { dataUrl } = await fetchImageFn({ data: { url: currentUrl } });
          const [meta, b64] = dataUrl.split(",");
          const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const ext = mime.split("/")[1]?.split(";")[0] || "jpg";
          const path = `${firmId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("lawyer-photos")
            .upload(path, new Blob([bytes], { type: mime }), { contentType: mime, upsert: false });
          if (upErr) throw upErr;
          const { data: signed, error: sErr } = await supabase.storage
            .from("lawyer-photos")
            .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
          form.avatar_url = signed.signedUrl;
          setForm((f) => ({ ...f, avatar_url: signed.signedUrl }));
        } catch (fetchErr) {
          console.error("External photo fetch failed:", fetchErr);
          toast.warning("Couldn't fetch that photo — saving without it. You can upload a photo afterwards.");
          form.avatar_url = "";
          setForm((f) => ({ ...f, avatar_url: "" }));
        }
      }

      // Normalise structured designation fields by type
      const isAdvocate = form.lawyer_type === "advocate";
      const normalised = {
        ...form,
        designation_code: isAdvocate ? null : (otherDesignation ? null : (form.designation_code || null)),
        designation_custom: isAdvocate ? null : (otherDesignation ? (form.designation_custom || null) : null),
        is_senior_counsel: isAdvocate ? form.is_senior_counsel : false,
        is_practice_head: !isAdvocate && form.designation_code === "Director" ? form.is_practice_head : false,
        practice_head_area: !isAdvocate && form.designation_code === "Director" && form.is_practice_head ? (form.practice_head_area || null) : null,
        is_sector_head: !isAdvocate && form.designation_code === "Director" ? form.is_sector_head : false,
        sector_head_area: !isAdvocate && form.designation_code === "Director" && form.is_sector_head ? (form.sector_head_area || null) : null,
      };
      // Keep the legacy `designation` text in sync for views/lists that haven't migrated
      const legacyDesignation = isAdvocate
        ? (normalised.is_senior_counsel ? "Senior Counsel" : "Advocate")
        : (normalised.designation_code || normalised.designation_custom || "Attorney");

      const parsed = lawyerSchema.parse({
        ...normalised,
        designation: legacyDesignation,
        bio: sanitizeBioHtml(form.bio),
        overview: sanitizeBioHtml(form.overview),
        qualifications: sanitizeBioHtml(form.qualifications),
        accolades: sanitizeBioHtml(form.accolades),
        noteworthy_matters: sanitizeBioHtml(form.noteworthy_matters),
        reported_cases_notes: sanitizeBioHtml(form.reported_cases_notes),
      });
      if (isEdit && lawyer) {
        const { error } = await supabase.from("lawyers").update(parsed).eq("id", lawyer.id);
        if (error) throw error;
        await syncPracticeAreas(lawyer.id);
        await syncBranches(lawyer.id);
        toast.success("Profile updated");
      } else {
        const slug = `${slugify(`${parsed.first_name}-${parsed.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error } = await supabase
          .from("lawyers")
          .insert({ ...parsed, firm_id: firmId, slug, status: "trial" })
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) {
          await syncPracticeAreas(inserted.id);
          await syncBranches(inserted.id);
        }
        toast.success("Lawyer added");
      }
      onSaved();
    } catch (err) {
      console.error("Lawyer save failed:", err);
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        const path = first?.path?.join(".") || "field";
        toast.error(`${path}: ${first?.message || "invalid value"}`);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-[90vw] flex-col overflow-hidden rounded-lg bg-card shadow-xl md:w-[70vw]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="font-heading text-xl text-ink">{isEdit ? "Edit Lawyer" : "Add Lawyer"}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">


        <div className="mt-4 rounded-md border border-dashed border-gold/60 bg-gold/5 p-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Import from website (optional)
          </label>
          <p className="mt-1 text-xs text-muted-foreground">Paste a link to the lawyer's bio on your firm site and AI will fill the form.</p>
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              placeholder="https://yourfirm.co.za/team/jane-doe"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importing}
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              className="rounded bg-gold px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          {imported && <p className="mt-2 text-xs text-forest">Imported — please review fields below before saving.</p>}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="rounded-md border border-border bg-background p-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lawyer type</label>
              <div className="flex gap-2">
                {(["attorney", "advocate"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, lawyer_type: t })}
                    className={`flex-1 rounded border px-3 py-2 text-sm capitalize transition-colors ${
                      form.lawyer_type === t ? "border-gold bg-gold/15 text-ink" : "border-border bg-card text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {form.lawyer_type === "advocate" ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_senior_counsel}
                    onChange={(e) => setForm({ ...form, is_senior_counsel: e.target.checked })}
                    className="accent-gold"
                  />
                  Senior Counsel (SC)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Year of admission</label>
                    <input
                      type="number"
                      min={1900}
                      max={CURRENT_YEAR}
                      placeholder="e.g. 2008"
                      value={form.year_of_admission ?? ""}
                      onChange={(e) => setForm({ ...form, year_of_admission: e.target.value ? Number(e.target.value) : null })}
                      className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Years in practice</label>
                    <div className="rounded border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {yearsInPractice(form.year_of_admission) ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Designation</label>
                  <select
                    value={otherDesignation ? "__other__" : form.designation_code}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__other__") {
                        setOtherDesignation(true);
                        setForm({ ...form, designation_code: "" });
                      } else {
                        setOtherDesignation(false);
                        setForm({ ...form, designation_code: v, designation_custom: "" });
                      }
                    }}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {ATTORNEY_DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    <option value="__other__">Other (specify)</option>
                  </select>
                </div>
                {otherDesignation && (
                  <input
                    placeholder="Custom designation"
                    value={form.designation_custom}
                    onChange={(e) => setForm({ ...form, designation_custom: e.target.value })}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  />
                )}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Year of admission (optional)</label>
                  <input
                    type="number"
                    min={1900}
                    max={CURRENT_YEAR}
                    placeholder="e.g. 2015"
                    value={form.year_of_admission ?? ""}
                    onChange={(e) => setForm({ ...form, year_of_admission: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  />
                </div>
                {form.designation_code === "Director" && (
                  <div className="space-y-2 rounded border border-dashed border-border p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_practice_head}
                        onChange={(e) => setForm({ ...form, is_practice_head: e.target.checked })}
                        className="accent-gold"
                      />
                      Also Practice Head
                    </label>
                    {form.is_practice_head && (
                      <input
                        placeholder="Practice area (e.g. Banking & Finance)"
                        value={form.practice_head_area}
                        onChange={(e) => setForm({ ...form, practice_head_area: e.target.value })}
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                      />
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_sector_head}
                        onChange={(e) => setForm({ ...form, is_sector_head: e.target.checked })}
                        className="accent-gold"
                      />
                      Also Sector Head
                    </label>
                    {form.is_sector_head && (
                      <input
                        placeholder="Sector (e.g. Mining)"
                        value={form.sector_head_area}
                        onChange={(e) => setForm({ ...form, sector_head_area: e.target.value })}
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {lawyer?.designation && (
              <p className="text-xs text-muted-foreground">
                Current legacy value: <span className="font-medium text-ink">{lawyer.designation}</span> — will be replaced when you save.
              </p>
            )}

            <div className="rounded border border-dashed border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Roles</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_mediator}
                    onChange={(e) => setForm({ ...form, is_mediator: e.target.checked })}
                    className="accent-gold"
                  />
                  Also acts as Mediator
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_arbitrator}
                    onChange={(e) => setForm({ ...form, is_arbitrator: e.target.checked })}
                    className="accent-gold"
                  />
                  Also acts as Arbitrator
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ProvinceCityFields
              province={form.province}
              city={form.city}
              onProvince={(v: string) => setForm({ ...form, province: v })}
              onCity={(v: string) => setForm({ ...form, city: v })}
            />
          </div>
          {firmBranches.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branches <span className="text-muted-foreground/70">(select one or more)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {firmBranches.map((b) => {
                  const checked = selectedBranchIds.has(b.id);
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => toggleBranch(b.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        checked ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {b.is_head_office && <Star className="h-3 w-3 text-gold" />}
                      {b.name}
                      {b.city ? ` · ${b.city}` : ""}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">City and province above auto-fill from the first selected branch.</p>
            </div>
          )}
          <Section title="Overview" hint="Lead paragraph(s) for the profile.">
            <RichTextEditor value={form.overview} onChange={(html) => setForm({ ...form, overview: html })} placeholder="Brief introduction…" />
          </Section>

          <Section title="Qualifications" hint="Degrees, admissions, memberships.">
            <RichTextEditor value={form.qualifications} onChange={(html) => setForm({ ...form, qualifications: html })} placeholder="LLB (University of...), Admitted as an Attorney…" />
          </Section>

          <Section title="Accolades & Awards">
            <RichTextEditor value={form.accolades} onChange={(html) => setForm({ ...form, accolades: html })} placeholder="Chambers Global ranking, awards, recognitions…" />
          </Section>

          <Section title="Articles Published" hint="Add each article with a title, publication, date and link.">
            {lawyer ? (
              <ArticlesEditor lawyerId={lawyer.id} />
            ) : (
              <p className="text-xs text-muted-foreground">Save the lawyer first to add articles.</p>
            )}
          </Section>

          <Section title="Reported Cases" hint="Add each case with a name and an optional link (e.g. SAFLII URL).">
            {lawyer ? (
              <ReportedCasesEditor lawyerId={lawyer.id} />
            ) : (
              <p className="text-xs text-muted-foreground">Save the lawyer first to add reported cases.</p>
            )}
          </Section>

          <Section title="Reported Cases — additional notes" hint="Optional free-text notes (commentary, unlinked citations).">
            <RichTextEditor value={form.reported_cases_notes} onChange={(html) => setForm({ ...form, reported_cases_notes: html })} placeholder="Brief commentary, additional citations…" />
          </Section>

          <Section title="Noteworthy Matters" hint="Significant deals, transactions, mandates.">
            <RichTextEditor value={form.noteworthy_matters} onChange={(html) => setForm({ ...form, noteworthy_matters: html })} placeholder="Major transactions, mandates and matters…" />
          </Section>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo</label>
            <div className="flex items-start gap-3">
              {form.avatar_url && (
                <img
                  src={form.avatar_url}
                  alt="Preview"
                  className="h-20 w-20 shrink-0 rounded-md object-cover ring-1 ring-border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  placeholder="https://yourfirm.co.za/team/jane.jpg"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted ${uploading ? "opacity-50" : ""}`}>
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading…" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {form.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRepositionUrl}
                      disabled={loadingUrlCrop}
                      className="inline-flex items-center gap-1.5 rounded border border-border bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted disabled:opacity-50"
                    >
                      {loadingUrlCrop ? "Loading…" : "Reposition / Crop"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Paste a URL or upload a file (max 5 MB). Use Reposition to crop URL images.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="email"
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Office / landline (optional)"
              value={form.office_phone}
              onChange={(e) => setForm({ ...form, office_phone: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="tel"
              placeholder="Mobile (optional)"
              value={form.mobile_phone}
              onChange={(e) => setForm({ ...form, mobile_phone: e.target.value, phone: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <div />
          </div>
          <input
            type="url"
            placeholder="LinkedIn URL (optional) — https://www.linkedin.com/in/…"
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />



          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice areas</p>
            <div className="flex flex-wrap gap-1.5">
              {allPracticeAreas.map((p) => {
                const selected = practiceAreas.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setPracticeAreas(
                        selected
                          ? practiceAreas.filter((x) => x.id !== p.id)
                          : [...practiceAreas, p]
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      selected
                        ? "bg-green-600/15 text-green-700 ring-1 ring-green-600/40 hover:bg-green-600/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
              {allPracticeAreas.length === 0 && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Lawyer"}</button>
          </div>
        </form>
        </div>
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          busy={uploading}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onConfirm={handleCroppedUpload}
        />
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Article = {
  id: string;
  title: string;
  publication: string | null;
  published_date: string | null;
  url: string | null;
  sort_order: number;
};

function ArticlesEditor({ lawyerId }: { lawyerId: string }) {
  const qc = useQueryClient();
  const { data: articles } = useQuery({
    queryKey: ["lawyer-articles", lawyerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyer_articles")
        .select("*")
        .eq("lawyer_id", lawyerId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as Article[];
    },
  });

  const [draft, setDraft] = useState({ title: "", publication: "", published_date: "", url: "" });
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lawyer-articles", lawyerId] });

  const add = async () => {
    if (!draft.title.trim()) { toast.error("Title is required"); return; }
    if (draft.url && !/^https?:\/\//i.test(draft.url.trim())) { toast.error("URL must start with http:// or https://"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("lawyer_articles").insert({
        lawyer_id: lawyerId,
        title: draft.title.trim().slice(0, 255),
        publication: draft.publication.trim().slice(0, 255) || null,
        published_date: draft.published_date || null,
        url: draft.url.trim().slice(0, 500) || null,
        sort_order: (articles?.length ?? 0),
      });
      if (error) throw error;
      setDraft({ title: "", publication: "", published_date: "", url: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this article?")) return;
    const { error } = await supabase.from("lawyer_articles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="space-y-3">
      {(articles ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded border border-border">
          {(articles ?? []).map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[a.publication, a.published_date ? new Date(a.published_date).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                </p>
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:text-gold">Open ↗</a>}
              </div>
              <button type="button" onClick={() => remove(a.id)} className="shrink-0 text-destructive hover:text-destructive/80">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-semibold text-ink">Add an article</p>
        <input
          placeholder="Title *"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          maxLength={255}
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Publication"
            value={draft.publication}
            onChange={(e) => setDraft({ ...draft, publication: e.target.value })}
            maxLength={255}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={draft.published_date}
            onChange={(e) => setDraft({ ...draft, published_date: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <input
          type="url"
          placeholder="https://… (link to article)"
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          maxLength={500}
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !draft.title.trim()}
          className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add article"}
        </button>
      </div>
    </div>
  );
}
