import { Star } from "lucide-react";

/**
 * Premium "Featured" badge for paid top-of-list listings.
 * Gold accent to stand out from regular type pills.
 */
export function FeaturedBadge({ className = "", size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const padding = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title="Featured listing"
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-ink ring-1 ring-inset ring-amber-600/50 font-semibold shadow-sm ${padding} ${className}`}
    >
      <Star className="h-3 w-3 fill-ink" />
      Featured
    </span>
  );
}
