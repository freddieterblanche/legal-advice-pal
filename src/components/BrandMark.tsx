/**
 * Lawexpert brand components — the citation bracket.
 * The mark is the wordmark "Law expert" (expert in brass italic) inside
 * square brackets, referencing SA case citation format [2026] ZACC 12.
 */

/** One square bracket drawn with borders so it scales with the lockup. */
function Bracket({ side, color }: { side: "left" | "right"; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="self-stretch"
      style={{
        width: "0.28em",
        borderStyle: "solid",
        borderColor: color,
        borderWidth:
          side === "left" ? "2.5px 0 2.5px 2.5px" : "2.5px 2.5px 2.5px 0",
      }}
    />
  );
}

/**
 * Horizontal wordmark lockup: [ Law expert ] with optional mono tagline.
 * variant "light" = dark-on-light (header); "dark" = reversed (footer, heroes).
 */
export function LogoLockup({
  variant = "light",
  tagline = false,
  className = "",
}: {
  variant?: "light" | "dark";
  tagline?: boolean;
  className?: string;
}) {
  const main = variant === "light" ? "var(--brand-primary)" : "var(--paper-ivory)";
  const sub = variant === "light" ? "var(--ink-muted)" : "#9FB2C4";
  return (
    <span className={`inline-flex min-w-[120px] items-stretch gap-[0.32em] ${className}`}>
      <Bracket side="left" color={main} />
      <span className="flex flex-col justify-center py-[0.18em]">
        <span
          className="font-heading leading-none"
          style={{ color: main, fontSize: "1.5em" }}
        >
          Law
          <em className="italic text-brass">expert</em>
        </span>
        {tagline && (
          <span
            className="mt-[0.45em] font-mono uppercase leading-none"
            style={{ color: sub, fontSize: "0.55em", letterSpacing: "0.32em" }}
          >
            South Africa's Legal Record
          </span>
        )}
      </span>
      <Bracket side="right" color={main} />
    </span>
  );
}

/** The [Le] monogram — favicon, app icon, avatar fallback. */
export function Monogram({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Lawexpert monogram"
      className={className}
    >
      <rect width="120" height="120" fill="var(--brand-primary)" />
      <g stroke="var(--paper-ivory)" strokeWidth="7" fill="none" strokeLinecap="square">
        <path d="M34 26 H22 V94 H34" />
        <path d="M86 26 H98 V94 H86" />
      </g>
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontFamily="'Libre Caslon Text',Georgia,serif"
        fontSize="42"
        fill="var(--paper-ivory)"
      >
        L
        <tspan fontStyle="italic" fill="var(--accent-brass)">
          e
        </tspan>
      </text>
    </svg>
  );
}

/**
 * Bracketed verification mark — square brackets enclosing a brass check.
 * Used beside "Verified practitioner" on profiles and search results.
 */
export function VerifiedMark({
  size = 16,
  className = "",
  color = "var(--brand-primary)",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      role="img"
      aria-label="Verified practitioner"
      className={className}
    >
      <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="square">
        <path d="M5 2.5 H2 V17.5 H5" />
        <path d="M15 2.5 H18 V17.5 H15" />
      </g>
      <path
        d="M6 10.2 L9 13.2 L14.2 7"
        stroke="var(--accent-brass)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** Legacy alias — the compact mark used where a square icon fits. */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Monogram size={size} className={className} />;
}

/** Hairline rule fade at the base of dark hero sections. */
export function BrandStrandDivider() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="h-px bg-gradient-to-r from-transparent via-paper-ivory/25 to-transparent" />
    </div>
  );
}
