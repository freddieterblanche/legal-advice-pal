import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { PROVINCES } from "./constants";
import { ATTORNEY_DESIGNATIONS } from "./designation";
import { sanitizeBioHtml } from "./sanitize";

const CURRENT_YEAR = new Date().getFullYear();

const inputSchema = z.object({
  url: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  }),
});

const extractionSchema = z.object({
  first_name: z.string().max(80).default(""),
  last_name: z.string().max(80).default(""),
  // Structured designation
  provider_type: z.enum(["attorney", "advocate", ""]).default(""),
  is_senior_counsel: z.boolean().default(false),
  designation_code: z.string().max(60).default(""),
  designation_custom: z.string().max(60).default(""),
  year_of_admission: z.number().int().min(1900).max(CURRENT_YEAR).nullable().default(null),
  city: z.string().max(80).default(""),
  province: z.string().max(40).default(""),
  // Structured bio sections (HTML)
  overview: z.string().max(10000).default(""),
  qualifications: z.string().max(10000).default(""),
  accolades: z.string().max(10000).default(""),
  noteworthy_matters: z.string().max(10000).default(""),
  practice_area_slugs: z.array(z.string().max(60)).max(15).default([]),
  photo_url: z.string().max(2000).default(""),
  email: z.string().max(200).default(""),
  phone: z.string().max(60).default(""),
  linkedin_url: z.string().max(500).default(""),
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
      year_of_admission: extracted.year_of_admission,
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
      practice_areas: practiceAreaIds,
    };
  });
