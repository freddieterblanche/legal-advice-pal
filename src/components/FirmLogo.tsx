import { Building2 } from "lucide-react";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { tile: string; icon: string; pad: string }> = {
  sm: { tile: "h-10 w-10 rounded-md", icon: "h-5 w-5", pad: "p-1" },
  md: { tile: "h-14 w-14 rounded-md", icon: "h-6 w-6", pad: "p-1.5" },
  lg: { tile: "h-24 w-24 rounded-lg", icon: "h-9 w-9", pad: "p-2" },
};

/**
 * Firm logo tile. Always renders a light-neutral background so
 * white-on-transparent logos remain visible. Falls back to a building icon
 * when there's no logo or the image fails to load.
 */
export function FirmLogo({
  src,
  alt,
  size = "sm",
  className = "",
}: {
  src?: string | null;
  alt: string;
  size?: Size;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 ring-1 ring-slate-200 ${s.tile} ${s.pad} ${className}`}
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
