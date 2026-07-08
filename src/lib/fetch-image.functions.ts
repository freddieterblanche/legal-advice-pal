import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

// Hostnames/IP ranges that must never be fetched server-side (SSRF protection).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback / link-local
  if (h === "::1" || h.startsWith("[")) return true;
  // IPv4 private / loopback / link-local / metadata ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export const fetchImageAsDataUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ url: z.string().url().max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const parsed = new URL(data.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http(s) URLs are allowed");
    }
    if (isBlockedHost(parsed.hostname)) {
      throw new Error("That host is not allowed");
    }

    const res = await fetch(data.url, {
      headers: { "User-Agent": "Mozilla/5.0 LawExpertBot" },
      redirect: "error", // prevent redirect-based SSRF to internal hosts
    });
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("URL is not an image");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) throw new Error("Image too large (>10 MB)");
    const b64 = buf.toString("base64");
    return { dataUrl: `data:${contentType};base64,${b64}` };
  });
