/**
 * The LawExpert brand mark — the flowing-L strands from the logo.
 * Use size to scale; strokes stay proportional.
 */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-30 -50 76 90"
      fill="none"
      strokeLinecap="round"
      strokeWidth="5"
      aria-hidden="true"
      className={className}
    >
      <path stroke="#C9A24B" d="M -18 -38 C -22 -14 -24 6 -14 20 C -6 30 14 34 30 26" />
      <path stroke="#DCC17E" d="M -8 -42 C -12 -16 -14 7 -4 22 C 4 32 20 34 34 23" />
      <path stroke="#F0E6CF" d="M 2 -44 C -2 -18 -4 9 6 24 C 13 33 26 32 38 19" />
    </svg>
  );
}

/**
 * Triple-strand horizontal divider — the brand mark's strands as a page
 * element. Place at the base of dark hero sections.
 */
export function BrandStrandDivider() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="mt-[3px] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="mt-[3px] h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </div>
  );
}
