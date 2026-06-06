/**
 * Lightweight HTML sanitizer for bio fields.
 * Works in any JS runtime (no DOM required) — safe for Workers SSR, Node, and browser.
 * Allowlists tags + strips all attributes. Sufficient for trusted-internal rich text
 * (admin-entered or AI-generated) where we just need to neutralize <script>, event
 * handlers, javascript: URLs, and unexpected markup.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "b", "i", "u",
  "h2", "h3", "ul", "ol", "li",
]);

const VOID_TAGS = new Set(["br"]);

export function sanitizeBioHtml(html: string): string {
  if (!html) return "";

  // 1. Drop dangerous blocks entirely (including content)
  let out = html.replace(/<(script|style|iframe|object|embed|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // 2. Drop HTML comments
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Walk all tags; keep allowed ones with no attributes, drop the rest
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (_match, rawName: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    const isClose = _match.startsWith("</");
    if (isClose) return `</${name}>`;
    return VOID_TAGS.has(name) ? `<${name}>` : `<${name}>`;
  });

  // 4. Collapse excessive whitespace between block tags
  out = out.replace(/\s+\n/g, "\n").trim();

  return out;
}
