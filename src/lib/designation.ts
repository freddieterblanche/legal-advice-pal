export type LawyerKind = "advocate" | "attorney";

/**
 * Attorney designation codes used in South African firms (in seniority order).
 */
export const ATTORNEY_DESIGNATIONS = [
  "Managing Director",
  "Chairperson",
  "Chief Executive Officer",
  "Chief Operating Officer",
  "Company Secretary",
  "Managing Partner",
  "Director",
  "Partner",
  "Consultant",
  "Executive",
  "Senior Associate",
  "Associate",
  "Candidate Legal Practitioner",
] as const;

export type AttorneyDesignation = (typeof ATTORNEY_DESIGNATIONS)[number];

/**
 * In South Africa, the legal profession is split:
 *  - Advocates (incl. Senior Counsel / SC) — courtroom specialists briefed by attorneys
 *  - Attorneys (incl. Director, Partner, Associate, etc.) — direct client contact, transactional + litigation
 */
export function designationKind(designation?: string | null): LawyerKind {
  if (!designation) return "attorney";
  const d = designation.toLowerCase();
  if (d.includes("advocate") || d === "sc" || d.includes("senior counsel") || d.includes("junior counsel")) return "advocate";
  return "attorney";
}

export const ADVOCATE_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-forest/12 px-2.5 py-0.5 text-xs font-semibold text-forest ring-1 ring-inset ring-forest/25";

export const ATTORNEY_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-gold/12 px-2.5 py-0.5 text-xs font-semibold text-gold ring-1 ring-inset ring-gold/30";

export function designationBadgeClass(designation?: string | null): string {
  return designationKind(designation) === "advocate" ? ADVOCATE_BADGE : ATTORNEY_BADGE;
}

export function yearsInPractice(yearOfAdmission?: number | null): number | null {
  if (!yearOfAdmission || yearOfAdmission < 1900) return null;
  const years = new Date().getFullYear() - yearOfAdmission;
  return years >= 0 ? years : null;
}

export type StructuredLawyer = {
  provider_type?: string | null;
  year_of_admission?: number | null;
  is_senior_counsel?: boolean | null;
  designation_code?: string | null;
  designation_custom?: string | null;
  is_practice_head?: boolean | null;
  practice_head_area?: string | null;
  is_sector_head?: boolean | null;
  sector_head_area?: string | null;
  designation?: string | null;
};

/**
 * Build a primary designation label from the structured fields,
 * falling back to the legacy free-text `designation` column when unset.
 */
export function formatDesignation(l: StructuredLawyer): string {
  const kind: LawyerKind =
    l.provider_type === "advocate" || l.provider_type === "attorney"
      ? l.provider_type
      : designationKind(l.designation);
  if (kind === "advocate") {
    const seniority = l.is_senior_counsel ? "Senior Counsel" : "Junior Counsel";
    const years = yearsInPractice(l.year_of_admission ?? null);
    return years !== null ? `${seniority} · ${years} year${years === 1 ? "" : "s"} in practice` : seniority;
  }
  const designation = (l.designation_code || l.designation_custom || l.designation || "Attorney") as string;
  const years = yearsInPractice(l.year_of_admission ?? null);
  return years !== null
    ? `${designation} · ${years} year${years === 1 ? "" : "s"} in practice`
    : `${designation} · Unspecified years in practice`;
}

/**
 * Extra badges for Practice Head / Sector Head (Attorneys only, typically Directors).
 */
export function headBadges(l: StructuredLawyer): string[] {
  const out: string[] = [];
  if (l.is_practice_head && l.practice_head_area) out.push(`Practice Head: ${l.practice_head_area}`);
  if (l.is_sector_head && l.sector_head_area) out.push(`Sector Head: ${l.sector_head_area}`);
  return out;
}
