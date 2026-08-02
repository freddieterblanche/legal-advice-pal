import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { getMyListing, createTierChangeCheckout, cancelMySubscription } from "../lib/billing.functions";
import { TIERS, TIER_BY_SLUG, annualRands, formatRands, type TierSlug } from "../lib/tiers";
import { toast } from "sonner";

export const Route = createFileRoute("/my-listing")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    payment: s.payment === "success" || s.payment === "cancelled" ? s.payment : undefined,
  }),
  head: () => ({ meta: [{ title: "My Listing — Lawexpert.co.za" }] }),
  component: MyListingPage,
});

function MyListingPage() {
  const { payment } = Route.useSearch();
  const qc = useQueryClient();
  const listingFn = useServerFn(getMyListing);
  const checkoutFn = useServerFn(createTierChangeCheckout);
  const cancelFn = useServerFn(cancelMySubscription);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busyTier, setBusyTier] = useState<TierSlug | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-listing"],
    enabled: authed === true,
    queryFn: async () => listingFn(),
  });

  // After returning from PayFast, poll briefly while the webhook applies the change.
  useEffect(() => {
    if (payment !== "success" || authed !== true) return;
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ["my-listing"] }), 4000);
    const stop = setTimeout(() => clearInterval(t), 60000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [payment, authed, qc]);

  const payNow = async (tier: TierSlug) => {
    setBusyTier(tier);
    try {
      const { action, fields } = await checkoutFn({ data: { tier, frequency } });
      const form = document.createElement("form");
      form.method = "POST";
      form.action = action;
      for (const [k, v] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start payment");
      setBusyTier(null);
    }
  };

  const doCancel = async () => {
    if (!window.confirm("Cancel your subscription? Your listing stays in the directory; paid features run to the end of the paid period.")) return;
    setCancelling(true);
    try {
      await cancelFn();
      toast.success("Subscription cancelled.");
      qc.invalidateQueries({ queryKey: ["my-listing"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancelling(false);
    }
  };

  if (authed === false) {
    return (
      <Shell>
        <h1 className="font-heading text-2xl text-ink">Sign in to manage your listing</h1>
        <p className="mt-2 text-sm text-ink-muted">Your listing tools live behind your account.</p>
        <Link to="/auth" className="mt-5 inline-block rounded bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
          Sign in
        </Link>
      </Shell>
    );
  }
  if (authed === null || isLoading) return <Shell><p className="text-ink-muted">Loading your listing…</p></Shell>;

  const provider = data?.provider;
  if (!provider) {
    return (
      <Shell>
        <h1 className="font-heading text-2xl text-ink">No listing linked yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Your account isn't linked to a professional listing. If you're already in the directory,
          find your profile and claim it — otherwise register a new listing.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/search" className="rounded bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">Find your profile</Link>
          <Link to="/register" className="rounded border border-rule bg-paper-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand-primary">Register</Link>
        </div>
      </Shell>
    );
  }

  const sub = data?.subscription;
  const currentTier = TIER_BY_SLUG[(provider.listing_tier ?? "basic") as TierSlug];
  const firmName = (provider.firms as { name: string | null } | null)?.name;

  return (
    <div className="bg-paper-ivory">
      <section className="bg-brand-deep py-10 text-paper-ivory">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow text-paper-ivory/70">[My listing]</p>
          <h1 className="mt-2 font-heading text-3xl">{provider.first_name} {provider.last_name}</h1>
          <p className="mt-1 font-mono text-[13px] text-paper-ivory/75">
            {[provider.designation, firmName, [provider.city, provider.province].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {payment === "success" && sub?.status !== "active" && (
          <div className="mb-6 rounded border border-brand-primary/25 bg-brand-tint/50 p-4 text-sm text-ink">
            Payment received — applying your new plan now. This page refreshes automatically.
          </div>
        )}
        {payment === "cancelled" && (
          <div className="mb-6 rounded border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Payment was cancelled — no charge was made.
          </div>
        )}

        {/* Current plan */}
        <div className="rounded border border-rule bg-paper-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-ink-muted">Current plan</p>
              <p className="mt-1 font-heading text-2xl text-ink">
                {currentTier?.name ?? provider.listing_tier}
                {sub?.status === "active" && (
                  <span className="ml-3 align-middle font-mono text-xs text-ink-muted">
                    {formatRands(Number(sub.amount_rands))} / {sub.frequency === "annual" ? "year" : "month"}
                    {sub.current_period_end ? ` · paid until ${new Date(sub.current_period_end).toLocaleDateString("en-ZA")}` : ""}
                  </span>
                )}
                {!sub && (
                  <span className="ml-3 align-middle font-mono text-xs text-ink-muted">no active subscription</span>
                )}
              </p>
            </div>
            {sub?.status === "active" && (
              <button
                onClick={doCancel}
                disabled={cancelling}
                className="rounded border border-rule bg-paper-white px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel subscription"}
              </button>
            )}
          </div>
          <div className="mt-3 border-t border-rule pt-3">
            <Link
              to={provider.provider_type === "expert" ? "/expert-witnesses/$slug" : "/lawyers/$slug"}
              params={{ slug: provider.slug ?? "" }}
              className="text-sm text-brand-primary transition-colors hover:text-brand-hover"
            >
              View your public profile →
            </Link>
          </div>
        </div>

        {/* Change tier */}
        <h2 className="mt-10 font-heading text-2xl text-ink">Change your tier</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Switching starts a new subscription at the new price and retires the old one automatically —
          you'll never be billed twice.
        </p>
        <div className="mt-4 flex gap-2">
          {([
            { key: "monthly" as const, label: "Monthly billing" },
            { key: "annual" as const, label: "Annual — 2 months free" },
          ]).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFrequency(f.key)}
              aria-pressed={frequency === f.key}
              className={`rounded border px-4 py-2 text-sm transition-colors ${
                frequency === f.key
                  ? "border-brand-primary bg-brand-tint text-brand-primary"
                  : "border-rule bg-paper-white text-ink-muted hover:border-brand-primary/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t) => {
            const isCurrent = t.slug === currentTier?.slug && sub?.status === "active";
            const amount = t.annualOnly || frequency === "annual" ? annualRands(t) : t.monthlyRands;
            return (
              <div
                key={t.slug}
                className={`flex flex-col rounded border bg-paper-white p-4 ${
                  isCurrent ? "border-brand-primary ring-1 ring-brand-primary" : "border-rule"
                }`}
              >
                <span className="eyebrow text-brand-primary">[{t.name}]</span>
                <span className="mt-2 font-heading text-xl text-ink">
                  {formatRands(amount)}
                  <span className="font-body text-xs text-ink-muted">
                    {t.annualOnly ? " /12-month seat" : frequency === "annual" ? " /year" : " /month"}
                  </span>
                </span>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {t.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-muted">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-primary" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="mt-4 rounded bg-brand-tint px-3 py-2 text-center font-mono text-xs uppercase tracking-wide text-brand-primary">
                    Current plan
                  </span>
                ) : (
                  <button
                    onClick={() => payNow(t.slug)}
                    disabled={busyTier !== null}
                    className="mt-4 rounded bg-brand-primary px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                  >
                    {busyTier === t.slug ? "Redirecting…" : `Switch — pay ${formatRands(amount)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Payments are processed securely by PayFast. Elite is billed as a fixed 12-month seat and
          never auto-renews. See <Link to="/pricing" className="text-brand-primary hover:text-brand-hover">full tier details</Link>.
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded border border-rule bg-paper-white p-6">{children}</div>
    </div>
  );
}
