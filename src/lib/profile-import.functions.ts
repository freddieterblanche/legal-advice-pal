import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { PROVINCES } from "./constants";
import { ATTORNEY_DESIGNATIONS } from "./designation";
import { sanitizeBioHtml } from "./sanitize";

const CURRENT_YEAR = new Date().getFullYear();

// Lenient field helpers: the model frequently returns nulls or overlong strings;
// we accept them at parse time and clamp/sanitize after extraction.
const sText = z.preprocess((v) => (v == null ? "" : typeof v === "string" ? v : String(v)), z.string()).default("");
const sBool = z.preprocess((v) => (v == null ? false : v), z.boolean()).default(false);
const sStrArr = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []),
  z.array(z.string()),
).default([]);
const sIntOrNull = z.preprocess(
  (v) => (v == null || v === "" ? null : typeof v === "number" ? Math.trunc(v) : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null),
  z.number().int().nullable(),
).default(null);

const inputSchema = z.object({
  url: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  }),
});

const extractionSchema = z.object({
  first_name: sText,
  last_name: sText,
  provider_type: z.preprocess((v) => (v === "advocate" || v === "attorney" ? v : ""), z.enum(["attorney", "advocate", ""])).default(""),
  is_senior_counsel: sBool,
  designation_code: sText,
  designation_custom: sText,
  year_of_admission: sIntOrNull,
  city: sText,
  province: sText,
  overview: sText,
  qualifications: sText,
  accolades: sText,
  noteworthy_matters: sText,
  practice_area_slugs: sStrArr,
  photo_url: sText,
  email: sText,
  phone: sText,
  linkedin_url: sText,
});


export const importLawyerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) throw new Error("Firecrawl is not configured. Please connect Firecrawl in Connectors.");

    // 1. Scrape page via Firecrawl
    const { default: Firecrawl } = await import("@mendable/firecrawl-js");
    const fc = new Firecrawl({ apiKey: firecrawlKey });

    let markdown = "";
    try {
      const result = await fc.scrape(data.url, {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      markdown = (result as { markdown?: string }).markdown
        ?? (result as { data?: { markdown?: string } }).data?.markdown
        ?? "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch the page: ${msg}`);
    }
    if (!markdown.trim()) throw new Error("Could not extract any text from that page. Try a different URL.");

    const trimmed = markdown.slice(0, 15000);

    // 2. Extract structured fields via Lovable AI
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: practiceRows } = await supabaseAdmin.from("practice_areas").select("id, slug, name");
    const practiceAreas = practiceRows ?? [];

    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();

    let extracted: z.infer<typeof extractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: extractionSchema }),
        system:
          "You extract a South African lawyer's profile from a law-firm webpage. Map free-text values to the allowed enums. " +
          "If a field is not present, use an empty string (or empty array / null / false as appropriate). Do not invent information. " +
          // Name
          "first_name / last_name: REQUIRED. The page describes one lawyer — extract their full personal name. " +
          "Look at the page title, the main heading, the URL slug, repeated mentions in the bio, the alt text of the headshot, and any 'About <Name>' phrasing. " +
          "Strip titles (Mr, Mrs, Ms, Dr, Adv, Adv., Attorney, Prof). Split into first and last name. Never leave both blank if any human name appears anywhere on the page. " +
          // Lawyer type & designation
          "provider_type: 'advocate' if the page describes an advocate / member of the Bar / counsel / SC / Senior Counsel / Junior Counsel; otherwise 'attorney' (Director, Partner, Associate, Consultant, etc.). Default 'attorney' if a law-firm page mentions a title like Director/Partner/Associate. " +
          "is_senior_counsel: true ONLY if the page indicates 'SC', 'Senior Counsel', or 'Silk'. " +
          `designation_code (attorneys only — pick the closest match from this list, else leave empty): ${ATTORNEY_DESIGNATIONS.join(", ")}. ` +
          "designation_custom: only if lawyer is an attorney AND the title clearly does NOT match any item in designation_code (e.g. 'Of Counsel', 'Head of Tax'). Otherwise empty. " +
          "year_of_admission: the 4-digit year the lawyer was admitted as an attorney/advocate, if stated (e.g. 'Admitted 2005', 'Admitted as an Attorney in 2010'). Use null if absent. " +
          // Location
          `Allowed province values (South Africa): ${PROVINCES.join(", ")}. ` +
          // Practice areas
          `Allowed practice_area_slugs: ${practiceAreas.map((p) => p.slug).join(", ")}. ` +
          // Bio sections — IMPORTANT: split into structured sections instead of one big bio
          "Return the biography SPLIT into four separate HTML sections. Each section is HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>. " +
          "Do NOT include <h2>/<h3> headings inside these sections — the UI renders the section heading itself. Do not include the lawyer's name as a heading. No inline styles, no classes, no links, no images. " +
          "overview: a 2–5 paragraph narrative introduction describing who the lawyer is, what they do, their seniority and focus. This is the main bio prose. " +
          "qualifications: their academic and professional qualifications (degrees, university, year, admissions, bar memberships). Use <ul><li>…</li></ul> when listing multiple. " +
          "accolades: rankings, awards, recognitions (Chambers, Legal 500, Best Lawyers, IFLR1000, Who's Who Legal, etc.). Use <ul><li>…</li></ul> when listing multiple. " +
          "noteworthy_matters: significant transactions, mandates, cases or matters the lawyer has worked on. Use <ul><li>…</li></ul> when listing multiple. " +
          "If a section's content is not present on the page, return an empty string for that section — do not duplicate the overview into the other sections. " +
          // Contact
          "photo_url: the URL of the lawyer's headshot/portrait image if present on the page " +
          "(look for markdown images like ![alt](url) where the alt or surrounding context refers to the lawyer by name, " +
          "or profile/avatar/team images). Prefer a direct image URL (jpg/png/webp). Resolve relative URLs against the source URL. Empty string if none found. " +
          "email: the lawyer's direct email address if shown on the page (look for mailto: links or plain-text addresses near their name). Empty string otherwise. " +
          "phone: the lawyer's direct phone number (any format). Look for tel: links or labelled phone/mobile/cell/direct numbers next to their name. Empty string otherwise. " +
          "linkedin_url: the lawyer's LinkedIn profile URL if linked on the page (typically https://www.linkedin.com/in/...). Empty string otherwise.",
        prompt: `Source URL: ${data.url}\n\nPage content (markdown):\n\n${trimmed}`,

      });
      extracted = experimental_output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      if (msg.includes("429")) throw new Error("AI is rate-limited. Please try again in a moment.");
      throw new Error(`AI extraction failed: ${msg}`);
    }

    // 3. Coerce to allowed enums
    const provider_type: "attorney" | "advocate" = extracted.provider_type === "advocate" ? "advocate" : "attorney";
    const designation_code = (ATTORNEY_DESIGNATIONS as readonly string[]).includes(extracted.designation_code)
      ? extracted.designation_code
      : "";
    const designation_custom = (!designation_code && extracted.designation_custom.trim())
      ? extracted.designation_custom.trim().slice(0, 60)
      : "";
    const province = (PROVINCES as readonly string[]).includes(extracted.province)
      ? extracted.province
      : "";
    const matchedSlugs = extracted.practice_area_slugs.filter((s) =>
      practiceAreas.some((p) => p.slug === s),
    );
    const practiceAreaIds = practiceAreas
      .filter((p) => matchedSlugs.includes(p.slug))
      .map((p) => ({ id: p.id, slug: p.slug, name: p.name }));

    // Resolve and validate photo URL
    let avatar_url = "";
    if (extracted.photo_url.trim()) {
      try {
        const resolved = new URL(extracted.photo_url.trim(), data.url).toString();
        if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
          avatar_url = resolved.slice(0, 2000);
        }
      } catch {
        // ignore invalid URL
      }
    }

    // Validate LinkedIn URL
    let linkedin_url = "";
    const rawLi = extracted.linkedin_url.trim();
    if (rawLi) {
      try {
        const u = new URL(rawLi, data.url);
        if ((u.protocol === "http:" || u.protocol === "https:") && /linkedin\.com/i.test(u.hostname)) {
          linkedin_url = u.toString().slice(0, 500);
        }
      } catch { /* ignore */ }
    }

    // Lightweight email/phone cleanup
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extracted.email.trim())
      ? extracted.email.trim().toLowerCase().slice(0, 200)
      : "";
    const phone = extracted.phone.trim().replace(/[^\d+()\-\s]/g, "").slice(0, 60);

    // Derive legacy designation label for backwards-compatibility consumers
    const legacyDesignation = provider_type === "advocate"
      ? (extracted.is_senior_counsel ? "Senior Counsel" : "Advocate")
      : (designation_code || designation_custom || "Attorney");

    return {
      first_name: extracted.first_name,
      last_name: extracted.last_name,
      provider_type,
      is_senior_counsel: provider_type === "advocate" ? !!extracted.is_senior_counsel : false,
      designation_code,
      designation_custom,
      year_of_admission:
        extracted.year_of_admission != null && extracted.year_of_admission >= 1900 && extracted.year_of_admission <= CURRENT_YEAR
          ? extracted.year_of_admission
          : null,
      designation: legacyDesignation,
      city: extracted.city,
      province,
      overview: sanitizeBioHtml(extracted.overview),
      qualifications: sanitizeBioHtml(extracted.qualifications),
      accolades: sanitizeBioHtml(extracted.accolades),
      noteworthy_matters: sanitizeBioHtml(extracted.noteworthy_matters),
      // Legacy combined bio (kept as overview for any consumer still reading `bio`)
      bio: sanitizeBioHtml(extracted.overview),
      avatar_url,
      email,
      phone,
      linkedin_url,
      website_url: data.url.slice(0, 500),
      practice_areas: practiceAreaIds,
    };
  });

// ---------- Shared helpers ----------

async function scrapeMarkdown(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) throw new Error("Firecrawl is not configured. Please connect Firecrawl in Connectors.");
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const fc = new Firecrawl({ apiKey: firecrawlKey });
  let markdown = "";
  try {
    const result = await fc.scrape(url, { formats: ["markdown"], onlyMainContent: true });
    markdown = (result as { markdown?: string }).markdown
      ?? (result as { data?: { markdown?: string } }).data?.markdown
      ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch the page: ${msg}`);
  }
  if (!markdown.trim()) throw new Error("Could not extract any text from that page. Try a different URL.");
  return markdown.slice(0, 15000);
}

function resolveAbsoluteUrl(maybe: string, base: string, max = 2000): string {
  const raw = maybe.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString().slice(0, max);
  } catch {
    return "";
  }
}

function cleanEmail(value: string): string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim().toLowerCase().slice(0, 200)
    : "";
}

function cleanPhone(value: string, max = 60): string {
  return value.trim().replace(/[^\d+()\-\s]/g, "").slice(0, max);
}

function mapAiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("402")) return new Error("AI credits exhausted. Please add credits in workspace settings.");
  if (msg.includes("429")) return new Error("AI is rate-limited. Please try again in a moment.");
  return new Error(`AI extraction failed: ${msg}`);
}

// ---------- Expert witness import ----------

const expertExtractionSchema = z.object({
  first_name: sText,
  last_name: sText,
  name_title: sText,
  job_title: sText,
  qualifications: sText,
  registration_body: sText,
  bio: sText,
  city: sText,
  province: sText,
  company_name: sText,
  photo_url: sText,
  email: sText,
  office_phone: sText,
  mobile_phone: sText,
  services: sStrArr,
});

export const importExpertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const trimmed = await scrapeMarkdown(data.url);
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();
    let extracted: z.infer<typeof expertExtractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: expertExtractionSchema }),
        system:
          "You extract a South African expert-witness or consultant profile from a webpage. " +
          "If a field is not present, use an empty string (or empty array as appropriate). Do not invent information. " +
          "first_name / last_name: REQUIRED. Strip titles (Dr, Prof, Mr, Mrs). " +
          "name_title: an honorific like 'Dr', 'Prof', 'Adv' if used in front of the name; empty otherwise. " +
          "job_title: their job title (e.g. 'Forensic Accountant', 'Civil Engineer'). " +
          "qualifications: HTML using <p>, <ul>, <li>, <strong>, <em> only — list degrees, designations, registrations. " +
          "registration_body: any professional body they are registered with (e.g. SAICA, ECSA, HPCSA). " +
          "bio: HTML overview of who they are and what they do, using only <p>, <ul>, <li>, <strong>, <em>. " +
          `Allowed province values: ${PROVINCES.join(", ")}. ` +
          "company_name: the firm/practice they belong to if shown. " +
          "services: short labels of the services they offer (max ~12 items). " +
          "photo_url: URL of their headshot. Resolve relative URLs against the source URL. " +
          "email / office_phone / mobile_phone: their direct contact details if shown.",
        prompt: `Source URL: ${data.url}\n\nPage content (markdown):\n\n${trimmed}`,
      });
      extracted = experimental_output;
    } catch (err) {
      throw mapAiError(err);
    }
    const province = (PROVINCES as readonly string[]).includes(extracted.province) ? extracted.province : "";
    return {
      first_name: extracted.first_name,
      last_name: extracted.last_name,
      name_title: extracted.name_title.trim().slice(0, 20),
      job_title: extracted.job_title.trim().slice(0, 120),
      qualifications: sanitizeBioHtml(extracted.qualifications),
      registration_body: extracted.registration_body.trim().slice(0, 200),
      bio: sanitizeBioHtml(extracted.bio),
      city: extracted.city.trim().slice(0, 80),
      province,
      company_name: extracted.company_name.trim().slice(0, 200),
      avatar_url: resolveAbsoluteUrl(extracted.photo_url, data.url),
      contact_email: cleanEmail(extracted.email),
      office_phone: cleanPhone(extracted.office_phone),
      mobile_phone: cleanPhone(extracted.mobile_phone),
      services: extracted.services.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      website_url: data.url.slice(0, 500),
    };
  });

// ---------- Mediator / Arbitrator import ----------

const medArbExtractionSchema = z.object({
  first_name: sText,
  last_name: sText,
  photo_url: sText,
  city: sText,
  province: sText,
  email: sText,
  office_phone: sText,
  mobile_phone: sText,
  bio: sText,
  languages: sStrArr,
  services: sStrArr,
  daily_rate_range: sText,
  availability_notes: sText,
  is_mediator: sBool,
  is_arbitrator: sBool,
  mediator_accreditation: sText,
  mediator_style: sText,
  mediator_sectors: sStrArr,
  arbitrator_accreditation: sText,
  arbitrator_types: sStrArr,
  arbitrator_experience_years: sIntOrNull,
});

export const importMediatorArbitratorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const trimmed = await scrapeMarkdown(data.url);
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();
    let extracted: z.infer<typeof medArbExtractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: medArbExtractionSchema }),
        system:
          "You extract a South African mediator and/or arbitrator profile from a webpage. " +
          "If a field is not present, use an empty string / empty array / null / false. Do not invent information. " +
          "first_name / last_name REQUIRED. Strip honorifics. " +
          "is_mediator: true if the page describes them as a mediator/conflict-resolution practitioner. " +
          "is_arbitrator: true if the page describes them as an arbitrator. Either or both can be true. " +
          `Allowed province values: ${PROVINCES.join(", ")}. ` +
          "bio: HTML overview using only <p>, <ul>, <li>, <strong>, <em>. " +
          "languages: simple language names (English, Afrikaans, Zulu, etc.). " +
          "services: short service labels (max ~12). " +
          "mediator_accreditation / mediator_style / mediator_sectors: only if is_mediator. " +
          "arbitrator_accreditation / arbitrator_types / arbitrator_experience_years: only if is_arbitrator. " +
          "photo_url: URL of headshot. Resolve relative URLs against source URL. " +
          "email / office_phone / mobile_phone: direct contact details if shown.",
        prompt: `Source URL: ${data.url}\n\nPage content (markdown):\n\n${trimmed}`,
      });
      extracted = experimental_output;
    } catch (err) {
      throw mapAiError(err);
    }
    const province = (PROVINCES as readonly string[]).includes(extracted.province) ? extracted.province : "";
    return {
      first_name: extracted.first_name,
      last_name: extracted.last_name,
      avatar_url: resolveAbsoluteUrl(extracted.photo_url, data.url),
      city: extracted.city.trim().slice(0, 80),
      province,
      email: cleanEmail(extracted.email),
      office_phone: cleanPhone(extracted.office_phone),
      mobile_phone: cleanPhone(extracted.mobile_phone),
      bio: sanitizeBioHtml(extracted.bio),
      languages: extracted.languages.map((l) => l.trim()).filter(Boolean).slice(0, 15),
      services: extracted.services.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      daily_rate_range: extracted.daily_rate_range.trim().slice(0, 120),
      availability_notes: extracted.availability_notes.trim().slice(0, 500),
      is_mediator: !!extracted.is_mediator,
      is_arbitrator: !!extracted.is_arbitrator,
      mediator_accreditation: extracted.mediator_accreditation.trim().slice(0, 200),
      mediator_style: extracted.mediator_style.trim().slice(0, 200),
      mediator_sectors: extracted.mediator_sectors.map((s) => s.trim()).filter(Boolean).slice(0, 15),
      arbitrator_accreditation: extracted.arbitrator_accreditation.trim().slice(0, 200),
      arbitrator_types: extracted.arbitrator_types.map((s) => s.trim()).filter(Boolean).slice(0, 15),
      arbitrator_experience_years: extracted.arbitrator_experience_years,
      website_url: data.url.slice(0, 500),
    };
  });

// ---------- Firm import ----------

const firmBranchSchema = z.object({
  name: sText,
  address: sText,
  city: sText,
  province: sText,
  country: sText,
  phone: sText,
  email: sText,
  is_head_office: sBool,
});

const firmExtractionSchema = z.object({
  name: sText,
  registration_number: sText,
  description: sText,
  website: sText,
  phone: sText,
  email: sText,
  address: sText,
  city: sText,
  province: sText,
  logo_url: sText,
  services: sStrArr,
  branches: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(firmBranchSchema),
  ).default([]),
});

export const importFirmProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const trimmed = await scrapeMarkdown(data.url);
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();
    let extracted: z.infer<typeof firmExtractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: firmExtractionSchema }),
        system:
          "You extract a South African law firm profile from the firm's website (typically the home / about / contact / offices page). " +
          "If a field is not present, use an empty string or empty array. Do not invent information. " +
          "name: REQUIRED. The firm/practice name as displayed on the site. " +
          "description: HTML overview of the firm using ONLY <p>, <ul>, <li>, <strong>, <em>. No headings. " +
          `Allowed province values: ${PROVINCES.join(", ")}. ` +
          "services / practice areas: short labels (max ~12 items). " +
          "logo_url: URL of the firm's logo image. Prefer SVG/PNG. Resolve relative URLs against source URL. " +
          "phone / email / address / city: the firm's MAIN (head office) contact details if shown. " +
          "website: the firm's primary website URL if different from the source URL. " +
          // Branches
          "branches: an array of EVERY office/branch location of the firm mentioned on the page (Cape Town office, Johannesburg office, Stellenbosch office, Nairobi office, etc.). " +
          "Include the head office as one of the branches with is_head_office=true. For each branch include: " +
          "name (a short label like 'Cape Town' or 'Sandton' — usually the city), address (street address if shown), city, province (only if in the allowed South African list above; leave empty for foreign offices), " +
          "country (e.g. 'South Africa', 'Kenya', 'Namibia' — default 'South Africa' if not stated and the province is South African), " +
          "phone, email, is_head_office (true only for the main/registered office). " +
          "Do NOT duplicate the same office twice. If no branch information is on the page, return an empty array.",
        prompt: `Source URL: ${data.url}\n\nPage content (markdown):\n\n${trimmed}`,
      });
      extracted = experimental_output;
    } catch (err) {
      throw mapAiError(err);
    }
    const province = (PROVINCES as readonly string[]).includes(extracted.province) ? extracted.province : "";

    const branches = extracted.branches
      .map((b) => {
        const bProvince = (PROVINCES as readonly string[]).includes(b.province) ? b.province : "";
        const country = b.country.trim().slice(0, 80) || (bProvince ? "South Africa" : "");
        return {
          name: b.name.trim().slice(0, 120),
          address: b.address.trim().slice(0, 300),
          city: b.city.trim().slice(0, 80),
          province: bProvince,
          country: country || "South Africa",
          phone: cleanPhone(b.phone),
          email: cleanEmail(b.email),
          is_head_office: !!b.is_head_office,
        };
      })
      .filter((b) => b.name || b.city || b.address)
      .slice(0, 25);

    return {
      name: extracted.name.trim().slice(0, 200),
      registration_number: extracted.registration_number.trim().slice(0, 60),
      description: sanitizeBioHtml(extracted.description),
      website: resolveAbsoluteUrl(extracted.website || data.url, data.url, 500),
      phone: cleanPhone(extracted.phone),
      email: cleanEmail(extracted.email),
      address: extracted.address.trim().slice(0, 300),
      city: extracted.city.trim().slice(0, 80),
      province,
      logo_url: resolveAbsoluteUrl(extracted.logo_url, data.url),
      services: extracted.services.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      branches,
    };
  });
