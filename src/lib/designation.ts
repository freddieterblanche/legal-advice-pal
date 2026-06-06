export type LawyerKind = "advocate" | "attorney";

/**
 * In South Africa, the legal profession is split:
 *  - Advocates (incl. Senior Counsel / SC) — courtroom specialists briefed by attorneys
 *  - Attorneys (incl. Attorney-Partners) — direct client contact, transactional + litigation
 */
export function designationKind(designation?: string | null): LawyerKind {
  if (!designation) return "attorney";
  const d = designation.toLowerCase();
  if (d.includes("advocate") || d === "sc" || d.includes("senior counsel")) return "advocate";
  return "attorney";
}

export const ADVOCATE_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-forest/12 px-2.5 py-0.5 text-xs font-semibold text-forest ring-1 ring-inset ring-forest/25";

export const ATTORNEY_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-gold/12 px-2.5 py-0.5 text-xs font-semibold text-gold ring-1 ring-inset ring-gold/30";

export function designationBadgeClass(designation?: string | null): string {
  return designationKind(designation) === "advocate" ? ADVOCATE_BADGE : ATTORNEY_BADGE;
}
