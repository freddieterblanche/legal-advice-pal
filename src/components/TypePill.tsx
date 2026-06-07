/**
 * Colour-coded pill for listing types.
 * Each listing type (attorney, advocate, expert, mediator, arbitrator, firm)
 * gets its own distinct colour so users can tell them apart at a glance.
 */
type Variant = "attorney" | "advocate" | "expert" | "mediator" | "arbitrator" | "firm" | "neutral";

const STYLES: Record<Variant, string> = {
  // Attorney — cool blue
  attorney:   "bg-sky-500/25 text-ink ring-sky-500/50",
  // Advocate — emerald
  advocate:   "bg-emerald-500/25 text-ink ring-emerald-500/50",
  // Expert witness — gold (matches site accent)
  expert:     "bg-amber-400/30 text-ink ring-amber-500/50",
  // Mediator — violet
  mediator:   "bg-violet-500/25 text-ink ring-violet-500/50",
  // Arbitrator — rose
  arbitrator: "bg-rose-500/25 text-ink ring-rose-500/50",
  // Law firm — slate
  firm:       "bg-slate-400/25 text-ink ring-slate-500/50",
  neutral:    "bg-ink/10 text-ink ring-ink/30",
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
