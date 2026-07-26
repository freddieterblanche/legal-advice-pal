import { Star } from "lucide-react";

/**
 * Premium "Featured" badge for paid top-of-list listings.
 * Brass accent — the one place brass is allowed on a result row.
 */
export function FeaturedBadge({ className = "", size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title="Featured listing"
      className={`inline-flex items-center gap-1 rounded-[3px] border border-brass/40 bg-brass/10 font-mono font-medium uppercase tracking-wide text-[#7A5E1C] ${padding} ${className}`}
    >
      <Star className="h-3 w-3 fill-brass text-brass" />
      Featured
    </span>
  );
}
