import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { X, Upload, Sparkles, Star, Trash2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { PROVINCES, slugify } from "../lib/constants";

import { ATTORNEY_DESIGNATIONS, yearsInPractice } from "../lib/designation";
import { importLawyerProfile } from "../lib/profile-import.functions";
import { fetchImageAsDataUrl } from "../lib/fetch-image.functions";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";
import { sanitizeBioHtml } from "../lib/sanitize";
import { ImageCropModal } from "./ImageCropModal";
import { ReportedCasesEditor } from "./ReportedCasesEditor";
import { useFeaturedToggle, FEATURED_CAP } from "./FeaturedToggle";
import { SimpleSelect } from "./SimpleSelect";
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
  provider_type: z.enum(["advocate", "attorney"]).nullable().optional(),
  year_of_admission: z.number().int().min(1900).max(CURRENT_YEAR).nullable().optional(),
  is_senior_counsel: z.boolean().optional(),
  designation_code: z.string().trim().max(80).nullable().optional(),
  designation_custom: z.string().trim().max(120).nullable().optional(),
  is_practice_head: z.boolean().optional(),
  practice_head_area: z.string().trim().max(120).nullable().optional(),
  is_sector_head: z.boolean().optional(),
  sector_head_area: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(1).max(80),
  // Province is free-form because non-SA records use a state/region string
  // rather than the canonical SA province list.
  province: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120).optional(),
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
  website_url: z.string().trim().max(500).optional(),
  is_mediator: z.boolean().optional(),
  is_arbitrator: z.boolean().optional(),
  mediator_accreditation: z.string().trim().max(120).nullable().optional(),
  mediator_style: z.string().trim().max(120).nullable().optional(),
  mediator_sectors: z.array(z.string().trim().max(120)).nullable().optional(),
  arbitrator_accreditation: z.string().trim().max(120).nullable().optional(),
  arbitrator_types: z.array(z.string().trim().max(120)).nullable().optional(),
  arbitrator_experience_years: z.number().int().min(0).max(80).nullable().optional(),
  availability_notes: z.string().trim().max(1000).nullable().optional(),
  services: z.array(z.string().trim().min(1).max(120)).nullable().optional(),
});

export type LawyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  designation: string | null;
  provider_type: string | null;
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
  country: string | null;
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
  website_url?: string | null;
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
  services?: string[] | null;
  is_featured?: boolean | null;
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
    provider_type: (lawyer?.provider_type as "advocate" | "attorney" | null) ?? "attorney",
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
    country: lawyer?.country ?? "South Africa",
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
    website_url: lawyer?.website_url ?? "",
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
    services: (lawyer?.services ?? []) as string[],
    status: lawyer?.status ?? "active",
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

  // Autosave state — once the lawyer row exists (either editing, or after the
  // first manual "Add"), we persist updates in the background without closing.
  const [currentLawyerId, setCurrentLawyerId] = useState<string | null>(lawyer?.id ?? null);
  const [isFeatured, setIsFeatured] = useState<boolean>(!!lawyer?.is_featured);
  const featuredMut = useFeaturedToggle(
    { table: "service_providers", key: (form?.provider_type === "advocate" ? "advocate" : "attorney") as "advocate" | "attorney" },
    [["lawyers"], ["service_providers"], ["search"]]
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const skipFirstAutosave = useRef(true);

  // Province / city pickers (inline so the user can free-type any city)
  const { data: townsAll } = useQuery({
    queryKey: ["towns-all-lawyer-modal"],
    queryFn: async () =>
      (await supabase
        .from("towns")
        .select("name, province_id")
        .order("is_major_city", { ascending: false })
        .order("name")
      ).data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const { data: provincesAll } = useQuery({
    queryKey: ["provinces-all-lawyer-modal"],
    queryFn: async () =>
      (await supabase.from("provinces").select("id, name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const cityOptions: string[] = (() => {
    if (!townsAll) return [];
    const provId = provincesAll?.find((p) => p.name === form.province)?.id;
    return provId
      ? townsAll.filter((t) => t.province_id === provId).map((t) => t.name as string)
      : [];
  })();

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
        .from("provider_branches")
        .select("branch_id")
        .eq("service_provider_id", lawyer.id);
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
        .from("provider_practice_areas")
        .select("practice_areas(id, slug, name)")
        .eq("service_provider_id", lawyer.id);
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
        provider_type: (res.provider_type as "advocate" | "attorney") || f.provider_type,
        is_senior_counsel: res.provider_type === "advocate" ? !!res.is_senior_counsel : f.is_senior_counsel,
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
        website_url: res.website_url || f.website_url,
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
    const { error: delErr } = await supabase.from("provider_practice_areas").delete().eq("service_provider_id", lawyerId);
    if (delErr) throw delErr;
    if (practiceAreas.length === 0) return;
    const links = practiceAreas.map((p) => ({ service_provider_id: lawyerId, practice_area_id: p.id }));
    const { error } = await supabase.from("provider_practice_areas").insert(links);
    if (error) throw error;
  };

  const syncBranches = async (lawyerId: string) => {
    const { error: delErr } = await supabase.from("provider_branches").delete().eq("service_provider_id", lawyerId);
    if (delErr) throw delErr;
    if (selectedBranchIds.size === 0) return;
    const links = Array.from(selectedBranchIds).map((branch_id) => ({ service_provider_id: lawyerId, branch_id }));
    const { error } = await supabase.from("provider_branches").insert(links);
    if (error) throw error;
  };

  // Shared payload builder used by both manual save and autosave so the
  // database always sees the same normalised shape.
  const buildParsed = () => {
    const isAdvocate = form.provider_type === "advocate";
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
    const legacyDesignation = isAdvocate
      ? (normalised.is_senior_counsel ? "Senior Counsel" : "Advocate")
      : (normalised.designation_code || normalised.designation_custom || "Attorney");
    return lawyerSchema.parse({
      ...normalised,
      designation: legacyDesignation,
      bio: sanitizeBioHtml(form.bio),
      overview: sanitizeBioHtml(form.overview),
      qualifications: sanitizeBioHtml(form.qualifications),
      accolades: sanitizeBioHtml(form.accolades),
      noteworthy_matters: sanitizeBioHtml(form.noteworthy_matters),
      reported_cases_notes: sanitizeBioHtml(form.reported_cases_notes),
      mediator_accreditation: form.is_mediator ? (form.mediator_accreditation || null) : null,
      mediator_style: form.is_mediator ? (form.mediator_style || null) : null,
      mediator_sectors: form.is_mediator && form.mediator_sectors.length ? form.mediator_sectors : null,
      arbitrator_accreditation: form.is_arbitrator ? (form.arbitrator_accreditation || null) : null,
      arbitrator_types: form.is_arbitrator && form.arbitrator_types.length ? form.arbitrator_types : null,
      arbitrator_experience_years:
        form.is_arbitrator && form.arbitrator_experience_years
          ? Number(form.arbitrator_experience_years)
          : null,
      availability_notes: (form.is_mediator || form.is_arbitrator) && form.availability_notes
        ? form.availability_notes
        : null,
      services: form.services.length ? form.services : null,
    });
  };

  // Background autosave: once we have a row id (either editing existing, or
  // after the first manual "Add"), debounce changes and patch the DB so the
  // user can keep filling fields without fear of losing work.
  useEffect(() => {
    if (!currentLawyerId) return;
    if (skipFirstAutosave.current) { skipFirstAutosave.current = false; return; }
    const t = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const parsed = buildParsed();
        const { error } = await supabase
          .from("service_providers")
          .update({ ...parsed, status: form.status })
          .eq("id", currentLawyerId);
        if (!error) setLastSavedAt(new Date());
        else console.warn("autosave failed:", error.message);
      } catch (e) {
        // Validation failures are expected while the user is mid-edit — skip silently.
        console.debug("autosave skipped (validation):", e);
      } finally {
        setAutoSaving(false);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, otherDesignation, currentLawyerId]);

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

      const parsed = buildParsed();
      if (currentLawyerId) {
        const { error } = await supabase.from("service_providers").update({ ...parsed, status: form.status }).eq("id", currentLawyerId);
        if (error) throw error;
        await syncPracticeAreas(currentLawyerId);
        await syncBranches(currentLawyerId);
        setLastSavedAt(new Date());
        toast.success("Profile updated");
        onSaved();
      } else {
        const slug = `${slugify(`${parsed.first_name}-${parsed.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error } = await supabase
          .from("service_providers")
          .insert({ ...parsed, firm_id: firmId, slug, status: "trial" })
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) {
          await syncPracticeAreas(inserted.id);
          await syncBranches(inserted.id);
          // Keep the modal open and switch into autosave mode so the user can
          // continue editing without losing work.
          skipFirstAutosave.current = true;
          setCurrentLawyerId(inserted.id);
          setLastSavedAt(new Date());
        }
        toast.success("Lawyer added — autosave on. Keep editing or click Done.");
      }
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
          <div className="flex items-center gap-3">
            <h3 className="font-heading text-xl text-ink">{currentLawyerId ? "Edit Lawyer" : "Add Lawyer"}</h3>
            {currentLawyerId && (
              <span className="text-xs text-muted-foreground">
                {autoSaving
                  ? "Autosaving…"
                  : lastSavedAt
                    ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Autosave on"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { if (currentLawyerId) onSaved(); else onClose(); }}
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
                    onClick={() => setForm({ ...form, provider_type: t })}
                    className={`flex-1 rounded border px-3 py-2 text-sm capitalize transition-colors ${
                      form.provider_type === t ? "border-gold bg-gold/15 text-ink" : "border-border bg-card text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing status</label>
                <div className="flex flex-wrap gap-2">
                  {(["active", "trial", "suspended", "pending_payment"] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      className={`rounded border px-3 py-1.5 text-xs capitalize transition-colors ${
                        form.status === s
                          ? s === "suspended"
                            ? "border-destructive bg-destructive/15 text-destructive"
                            : "border-gold bg-gold/15 text-ink"
                          : "border-border bg-card text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Suspended profiles are hidden from public listings and search.</p>
              </div>
            )}

            {isEdit && currentLawyerId && (
              <div className="rounded-md border border-amber-300/60 bg-amber-50/40 p-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-amber-800">Featured listing</label>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-muted-foreground">
                    Premium placement at the top of the {form.provider_type === "advocate" ? "advocates" : "attorneys"} category. R10 000 / month. Max {FEATURED_CAP} per category.
                  </p>
                  <button
                    type="button"
                    disabled={featuredMut.isPending}
                    onClick={() => {
                      const next = !isFeatured;
                      featuredMut.mutate(
                        { id: currentLawyerId, value: next },
                        { onSuccess: () => setIsFeatured(next) }
                      );
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition disabled:opacity-50 ${
                      isFeatured
                        ? "bg-amber-400/90 text-ink ring-amber-600/60 hover:bg-amber-300"
                        : "bg-transparent text-amber-700 ring-amber-400/50 hover:bg-amber-50"
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFeatured ? "fill-ink" : ""}`} />
                    {isFeatured ? "Featured" : "Mark as Featured"}
                  </button>
                </div>
              </div>
            )}

            {form.provider_type === "advocate" ? (
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
                  <SimpleSelect
                    value={otherDesignation ? "__other__" : form.designation_code}
                    onChange={(v) => {
                      if (v === "__other__") {
                        setOtherDesignation(true);
                        setForm({ ...form, designation_code: "" });
                      } else {
                        setOtherDesignation(false);
                        setForm({ ...form, designation_code: v, designation_custom: "" });
                      }
                    }}
                    options={[...ATTORNEY_DESIGNATIONS.map((d) => ({ value: d, label: d })), { value: "__other__", label: "Other (specify)" }]}
                    placeholder="Select…"
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
                  />
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

              {form.is_mediator && (
                <fieldset className="mt-3 space-y-3 rounded border border-violet-500/30 bg-violet-500/5 p-3">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-violet-700">Mediator details</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Accreditation
                      <SimpleSelect value={form.mediator_accreditation} onChange={(mediator_accreditation) => setForm({ ...form, mediator_accreditation })} options={MEDIATION_ACCREDITATIONS.map((s) => ({ value: s, label: s }))} placeholder="—" className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink" />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Style
                      <SimpleSelect value={form.mediator_style} onChange={(mediator_style) => setForm({ ...form, mediator_style })} options={MEDIATION_STYLES.map((s) => ({ value: s, label: s }))} placeholder="—" className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink" />
                    </label>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Sectors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MEDIATION_SECTORS.map((s) => (
                        <button type="button" key={s} onClick={() => toggleArr("mediator_sectors", s)}
                          className={`rounded-full border px-2.5 py-1 text-xs ${form.mediator_sectors.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </fieldset>
              )}

              {form.is_arbitrator && (
                <fieldset className="mt-3 space-y-3 rounded border border-rose-500/30 bg-rose-500/5 p-3">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-rose-700">Arbitrator details</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Accreditation
                      <SimpleSelect value={form.arbitrator_accreditation} onChange={(arbitrator_accreditation) => setForm({ ...form, arbitrator_accreditation })} options={ARBITRATION_ACCREDITATIONS.map((s) => ({ value: s, label: s }))} placeholder="—" className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink" />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Years of experience
                      <input
                        type="number" min={0} max={80}
                        value={form.arbitrator_experience_years}
                        onChange={(e) => setForm({ ...form, arbitrator_experience_years: e.target.value })}
                        className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink"
                      />
                    </label>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Types</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ARBITRATION_TYPES.map((s) => (
                        <button type="button" key={s} onClick={() => toggleArr("arbitrator_types", s)}
                          className={`rounded-full border px-2.5 py-1 text-xs ${form.arbitrator_types.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </fieldset>
              )}

              {(form.is_mediator || form.is_arbitrator) && (
                <label className="mt-3 block text-xs font-medium text-muted-foreground">
                  Availability notes
                  <textarea
                    rows={2}
                    value={form.availability_notes}
                    onChange={(e) => setForm({ ...form, availability_notes: e.target.value })}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink"
                    placeholder="e.g. Available weekdays, virtual or in-person"
                  />
                </label>
              )}
            </div>
          </div>
          {/* Contact details — quick wins, captured early */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact details</label>
            <div className="space-y-3">
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
                <input
                  type="url"
                  placeholder="LinkedIn URL (optional)"
                  value={form.linkedin_url}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  className="rounded border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Website URL (link visitors directly to this profile on the lawyer's firm/personal site)
                </label>
                <input
                  type="url"
                  placeholder="https://example.co.za/people/jane-doe"
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Profile photo */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile photo</label>
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
                <p className="text-xs text-muted-foreground">Paste a URL or upload a file (max 5 MB).</p>
              </div>
            </div>
          </div>

          {/* Location — country, then province + city. Non-SA records swap
              the province dropdown / town suggestions for free-text inputs. */}
          <LocationFields
            country={form.country}
            province={form.province}
            city={form.city}
            cityOptions={cityOptions}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />


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

          <div className="rounded-md border border-gold/40 bg-gold/5 p-4">
            <h4 className="font-heading text-sm font-semibold text-ink">Services offered</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add each service this {form.provider_type === "advocate" ? "advocate" : "attorney"} offers as a tag. Type and press Enter (or comma) to add.
            </p>
            <div className="mt-2">
              <TagInput
                value={form.services}
                onChange={(next) => setForm({ ...form, services: next })}
                placeholder="e.g. Trust formation — press Enter"
              />
            </div>
          </div>


          <Section title="Qualifications" hint="Degrees, admissions, memberships.">
            <RichTextEditor value={form.qualifications} onChange={(html) => setForm({ ...form, qualifications: html })} placeholder="LLB (University of...), Admitted as an Attorney…" />
          </Section>

          <Section title="Accolades & Awards">
            <RichTextEditor value={form.accolades} onChange={(html) => setForm({ ...form, accolades: html })} placeholder="Chambers Global ranking, awards, recognitions…" />
          </Section>

          <Section title="Articles Published" hint="Add each article with a title, publication, date and link.">
            {currentLawyerId ? (
              <ArticlesEditor lawyerId={currentLawyerId} />
            ) : (
              <p className="text-xs text-muted-foreground">Save the lawyer first to add articles.</p>
            )}
          </Section>

          <Section title="Reported Cases" hint="Add each case with a name and an optional link (e.g. SAFLII URL).">
            {currentLawyerId ? (
              <ReportedCasesEditor lawyerId={currentLawyerId} />
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
          <div className="flex items-center justify-end gap-2 pt-2">
            {currentLawyerId && (
              <span className="mr-auto text-xs text-muted-foreground">
                {autoSaving ? "Autosaving…" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosave on"}
              </span>
            )}
            <button type="button" onClick={() => { if (currentLawyerId) onSaved(); else onClose(); }} className="rounded px-4 py-2 text-sm">
              {currentLawyerId ? "Done" : "Cancel"}
            </button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? "Saving…" : currentLawyerId ? "Save now" : "Add Lawyer"}
            </button>
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
        .from("provider_articles")
        .select("*")
        .eq("service_provider_id", lawyerId)
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
      const { error } = await supabase.from("provider_articles").insert({
        service_provider_id: lawyerId,
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
    const { error } = await supabase.from("provider_articles").delete().eq("id", id);
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

/**
 * Country + Province + City row for the lawyer edit form.
 * - SA: native province <select> + city <datalist> seeded with town options
 *   filtered by the chosen province (mirrors the original UX).
 * - Non-SA: free-text "State / region" and "City" inputs because we don't
 *   seed province/town reference data for other countries.
 */
function LocationFields({
  country,
  province,
  city,
  cityOptions,
  onChange,
}: {
  country: string;
  province: string;
  city: string;
  cityOptions: string[];
  onChange: (patch: { country?: string; province?: string; city?: string }) => void;
}) {
  const { data: countries } = useQuery({
    queryKey: ["countries-list"],
    queryFn: async () =>
      (await supabase.from("countries").select("name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const options = (countries?.map((c) => c.name as string) ?? []);
  if (!options.includes("South Africa")) options.unshift("South Africa");
  if (country && !options.includes(country)) options.push(country);
  const isSA = country === "South Africa";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Country</label>
        <select
          value={country}
          onChange={(e) => {
            const next = e.target.value;
            // Wipe province/city when switching country group so SA values
            // don't linger on non-SA records and vice versa.
            const reset = (next === "South Africa") !== isSA;
            onChange({ country: next, ...(reset ? { province: "", city: "" } : {}) });
          }}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          {options.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {isSA ? (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Province</label>
            <select
              value={province}
              onChange={(e) => onChange({ province: e.target.value, city: "" })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">City / town</label>
            <input
              list="lawyer-city-suggestions"
              value={city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder={province ? "Type or pick a city/town…" : "Select a province first…"}
              disabled={!province}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            <datalist id="lawyer-city-suggestions">
              {cityOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">State / region</label>
            <input
              value={province}
              onChange={(e) => onChange({ province: e.target.value })}
              placeholder="State / region (optional)"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">City</label>
            <input
              value={city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="City"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
