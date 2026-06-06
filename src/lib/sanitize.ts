import DOMPurify from "isomorphic-dompurify";

const BIO_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "h2", "h3", "ul", "ol", "li"],
  ALLOWED_ATTR: [] as string[],
};

/** Sanitize HTML for storage/rendering (bio fields). */
export function sanitizeBioHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, BIO_CONFIG);
}
