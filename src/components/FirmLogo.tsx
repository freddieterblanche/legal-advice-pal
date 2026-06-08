import { Building2 } from "lucide-react";

type Size = "sm" | "md" | "lg" | "card";

const sizeMap: Record<Size, { tile: string; icon: string; pad: string }> = {
  sm: { tile: "h-10 w-10 rounded-md", icon: "h-5 w-5", pad: "p-1" },
  md: { tile: "h-14 w-14 rounded-md", icon: "h-6 w-6", pad: "p-1.5" },
  lg: { tile: "h-24 w-24 rounded-lg", icon: "h-9 w-9", pad: "p-2" },
  // 16:9 logo plate sized to match the attorney card (h-28 ≈ 112px tall, ≈200px wide).
  card: { tile: "h-28 w-full sm:h-28 sm:w-[200px] aspect-video rounded-none", icon: "h-10 w-10", pad: "p-3" },
};

/**
 * Firm logo tile. Renders a neutral (or firm-specified) background so
 * white-on-transparent logos remain visible. Falls back to a building icon
 * when there's no logo or the image fails to load.
 */
export function FirmLogo({
  src,
  alt,
  size = "sm",
  className = "",
  accentColor,
}: {
  src?: string | null;
  alt: string;
  size?: Size;
  className?: string;
  accentColor?: string | null;
}) {
  const s = sizeMap[size];
  const hasAccent = !!accentColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentColor);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-slate-200 ${s.tile} ${s.pad} ${hasAccent ? "" : "bg-slate-100"} ${className}`}
      style={hasAccent ? { backgroundColor: accentColor! } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = "none";
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className={`${src ? "hidden" : "flex"} h-full w-full items-center justify-center text-slate-400`}
      >
        <Building2 className={s.icon} strokeWidth={1.5} />
      </div>
    </div>
  );
}
