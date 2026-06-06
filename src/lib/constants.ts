export const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
] as const;

export const DESIGNATIONS = [
  "Senior Counsel",
  "Advocate",
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
  "Attorney",
] as const;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
