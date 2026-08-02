import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { TIERS, annualRands, formatRands } from "../lib/tiers";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lawexpert.co.za" },
      { name: "description", content: "Listing tiers for South African legal professionals on Lawexpert.co.za — from Basic to Elite. Claim your profile, choose your tier, and control how clients find you." },
      { property: "og:title", content: "Pricing — Lawexpert.co.za" },
      { property: "og:description", content: "Listing tiers from Basic to Elite. Claim your profile and control how clients find you." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-paper-ivory">
      {/* Hero */}
      <section className="bg-brand-deep py-14 text-paper-ivory md:py-18">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="eyebrow text-paper-ivory/70">[Pricing]</p>
          <h1 className="mt-3 font-heading text-3xl md:text-[40px]">
            Own your listing. Choose your prominence.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-paper-ivory/75">
            Every professional in the directory stays searchable. A paid tier gives you control of
            your profile, richer content, and better placement — billed securely via PayFast, cancel
            any time.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t) => (
            <div
              key={t.slug}
              className={`flex flex-col rounded border bg-paper-white p-5 ${
                t.highlight ? "border-brand-primary ring-1 ring-brand-primary" : "border-rule"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="eyebrow text-brand-primary">[{t.name}]</span>
                {t.highlight && (
                  <span className="rounded-[3px] bg-brand-tint px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-primary">
                    Popular
                  </span>
                )}
                {t.scarce && (
                  <span className="rounded-[3px] border border-brass/40 bg-brass/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#7A5E1C]">
                    Limited seats
                  </span>
                )}
              </div>
              {t.annualOnly ? (
                <>
                  <div className="mt-3 font-heading text-3xl text-ink">
                    {formatRands(annualRands(t))}
                    <span className="font-body text-xs text-ink-muted"> /12-month seat</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-muted">
                    ≈ {formatRands(t.monthlyRands)}/month · annual only
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-3 font-heading text-3xl text-ink">
                    {formatRands(t.monthlyRands)}
                    <span className="font-body text-xs text-ink-muted"> /month</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-muted">
                    or {formatRands(annualRands(t))}/year — 2 months free
                  </div>
                </>
              )}
              <p className="mt-3 text-sm text-ink-muted">{t.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-ink">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/search"
                className={`mt-5 rounded px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                  t.highlight || t.scarce
                    ? "bg-brand-primary text-white hover:bg-brand-hover"
                    : "border border-rule bg-paper-white text-ink hover:border-brand-primary"
                }`}
              >
                Find your profile
              </Link>
            </div>
          ))}
        </div>

        {/* Elite terms */}
        <div className="mt-6 rounded border border-rule bg-paper-white p-5">
          <p className="eyebrow text-ink-muted">[Elite seat terms]</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
            Elite is deliberately scarce: a limited number of seats per practice area and province,
            sold as fixed 12-month terms. Seats never auto-renew — renewal is a fresh purchase at the
            then-current price, and when your area is full you can join the waitlist. That keeps the
            top of the directory contestable, and keeps an Elite listing worth having.
          </p>
        </div>
      </section>

      {/* How claiming works */}
      <section className="border-t border-rule bg-paper-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-ink-muted">[Already listed?]</p>
              <h2 className="mt-2 font-heading text-2xl text-ink md:text-3xl">Claim your profile</h2>
              <ol className="mt-5 space-y-3 text-sm text-ink-muted">
                <li className="flex gap-3"><span className="font-mono text-brand-primary">[1]</span> Find your profile in the directory and tap "Claim this profile".</li>
                <li className="flex gap-3"><span className="font-mono text-brand-primary">[2]</span> Verify your identity with a selfie, ID document and phone number — documents are deleted after review.</li>
                <li className="flex gap-3"><span className="font-mono text-brand-primary">[3]</span> Pay for your chosen tier via PayFast.</li>
                <li className="flex gap-3"><span className="font-mono text-brand-primary">[4]</span> Full edit access is handed over automatically — your profile stays live throughout.</li>
              </ol>
              <Link
                to="/search"
                className="mt-6 inline-flex items-center gap-2 rounded bg-brass px-6 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f]"
              >
                Find your profile <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
            <div>
              <p className="eyebrow text-ink-muted">[Firms]</p>
              <h2 className="mt-2 font-heading text-2xl text-ink md:text-3xl">Listing your whole firm?</h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-muted">
                Register your firm and add your professionals from one dashboard — R160 per listing
                per month, first 3 months free with no credit card required. Individual listings can
                be upgraded to any tier at any time.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 rounded bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
              >
                Register your firm <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              q: "How does billing work?",
              a: "Secure recurring billing via PayFast — monthly or annual (two months free). Elite is billed as a once-off 12-month seat.",
            },
            {
              q: "Can I cancel?",
              a: "Any time. Your paid features and placement lapse at the end of the billing period, but your listing stays in the directory — you never disappear.",
            },
            {
              q: "Can I change tier?",
              a: "Yes — upgrade or downgrade whenever you like; the change takes effect on your next billing cycle.",
            },
          ].map((f) => (
            <div key={f.q} className="rounded border border-rule bg-paper-white p-5">
              <h3 className="font-heading text-lg text-ink">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
