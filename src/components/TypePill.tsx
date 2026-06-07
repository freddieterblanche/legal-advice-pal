/**
 * Colour-coded pill for listing types.
 * Each listing type (attorney, advocate, expert, mediator, arbitrator, firm)
 * gets its own distinct colour so users can tell them apart at a glance.
 */
type Variant = "attorney" | "advocate" | "expert" | "mediator" | "arbitrator" | "firm" | "neutral";

const STYLES: Record<Variant, string> = {
  // Attorney — cool blue
  attorney:   "bg-sky-500/15 text-sky-200 ring-sky-400/40",
  // Advocate — emerald
  advocate:   "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40",
  // Expert witness — gold (matches site accent)
  expert:     "bg-amber-400/15 text-amber-200 ring-amber-300/40",
  // Mediator — violet
  mediator:   "bg-violet-500/15 text-violet-200 ring-violet-400/40",
  // Arbitrator — rose
  arbitrator: "bg-rose-500/15 text-rose-200 ring-rose-400/40",
  // Law firm — slate
  firm:       "bg-slate-400/15 text-slate-100 ring-slate-300/40",
  neutral:    "bg-cream/10 text-cream ring-cream/30",
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
