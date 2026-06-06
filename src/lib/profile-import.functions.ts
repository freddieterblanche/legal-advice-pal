import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { DESIGNATIONS, PROVINCES } from "./constants";
import { sanitizeBioHtml } from "./sanitize";

const inputSchema = z.object({
  url: z.string().trim().url().max(500).refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  }),
});

const extractionSchema = z.object({
  first_name: z.string().max(80).default(""),
  last_name: z.string().max(80).default(""),
  designation: z.string().max(40).default("Attorney"),
  city: z.string().max(80).default(""),
  province: z.string().max(40).default(""),
  bio: z.string().max(10000).default(""),
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
          "You extract a lawyer's profile from a law-firm webpage. Map free-text values to the allowed enums. " +
          "If a field is not present, use an empty string (or empty array for practice areas). Do not invent information. " +
          "first_name / last_name: REQUIRED. The page describes one lawyer — extract their full personal name. " +
          "Look at the page title, the main heading, the URL slug, repeated mentions in the bio, the alt text of the headshot, and any 'About <Name>' phrasing. " +
          "Strip titles (Mr, Mrs, Ms, Dr, Adv, Adv., Attorney, Prof). Split into first and last name. Never leave both blank if any human name appears anywhere on the page. " +
          `Allowed designation values: ${DESIGNATIONS.join(", ")}. ` +
          `Allowed province values (South Africa): ${PROVINCES.join(", ")}. ` +
          `Allowed practice_area_slugs: ${practiceAreas.map((p) => p.slug).join(", ")}. ` +
          "Bio: return HTML (NOT markdown) with these tags only: <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <br>. " +
          "Use <h2>/<h3> for natural section headings such as 'Experience', 'Education', 'Recognition', 'Practice Areas'. " +
          "Use <p> for paragraphs (separate ideas into multiple paragraphs for readability). Use lists where appropriate. " +
          "Do NOT include the lawyer's name as a heading, and do not include inline styles, classes, links, or images. " +
          "Aim for ~800–4000 characters of well-structured HTML. " +
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
    const designation = (DESIGNATIONS as readonly string[]).includes(extracted.designation)
      ? extracted.designation
      : "Attorney";
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

    return {
      first_name: extracted.first_name,
      last_name: extracted.last_name,
      designation,
      city: extracted.city,
      province,
      bio: sanitizeBioHtml(extracted.bio),
      avatar_url,
      email,
      phone,
      linkedin_url,
      practice_areas: practiceAreaIds,
    };
  });

