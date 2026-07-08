import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://lawexpert.co.za";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/search", changefreq: "daily", priority: "0.9" },
          { path: "/practice-areas", changefreq: "weekly", priority: "0.9" },
          { path: "/firms", changefreq: "daily", priority: "0.9" },
          { path: "/expert-witnesses", changefreq: "daily", priority: "0.8" },
          { path: "/mediators", changefreq: "daily", priority: "0.8" },
          { path: "/arbitrators", changefreq: "daily", priority: "0.8" },
          { path: "/register", changefreq: "monthly", priority: "0.5" },
        ];

        // Add every live profile page from the database. Uses the public
        // (RLS-protected) client so only trial/active records are exposed.
        try {
          const { supabaseAdmin } = await import("../integrations/supabase/client.server");

          const [{ data: providers }, { data: firms }] = await Promise.all([
            supabaseAdmin
              .from("service_providers")
              .select("slug, provider_type, updated_at")
              .in("status", ["trial", "active"]),
            supabaseAdmin
              .from("firms")
              .select("slug, updated_at")
              .eq("status", "active"),
          ]);

          for (const p of providers ?? []) {
            if (!p.slug) continue;
            const base = p.provider_type === "expert" ? "/expert-witnesses" : "/lawyers";
            entries.push({
              path: `${base}/${p.slug}`,
              lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
          for (const f of firms ?? []) {
            if (!f.slug) continue;
            entries.push({
              path: `/firms/${f.slug}`,
              lastmod: f.updated_at ? String(f.updated_at).slice(0, 10) : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch (err) {
          // If the DB is unreachable we still serve the static pages rather
          // than failing the whole sitemap.
          console.error("[sitemap] Failed to load dynamic entries:", err);
        }

        const escapeXml = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${escapeXml(e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
