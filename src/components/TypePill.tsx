/**
 * Pill for listing types (attorney, advocate, expert, mediator, arbitrator,
 * firm). Editorial token styling — one tint family, differentiated by label.
 */
type Variant = "attorney" | "advocate" | "expert" | "mediator" | "arbitrator" | "firm" | "neutral";

const STYLES: Record<Variant, string> = {
  attorney:   "bg-brand-tint text-brand-primary",
  advocate:   "bg-brand-tint text-brand-primary",
  expert:     "bg-brand-tint text-brand-primary",
  mediator:   "bg-brand-tint text-brand-primary",
  arbitrator: "bg-brand-tint text-brand-primary",
  firm:       "bg-brand-tint text-brand-primary",
  neutral:    "bg-muted text-ink-muted",
};

export function TypePill({
  variant,
  children,
  className = "",
}: {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-2.5 py-1 font-mono text-xs font-medium ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
