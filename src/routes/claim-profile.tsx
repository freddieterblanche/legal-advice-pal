import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { submitClaimRequest, getMyClaimRequest } from "../lib/claim.functions";
import { createClaimCheckout } from "../lib/billing.functions";
import { TIERS, TIER_BY_SLUG, annualRands, formatRands, type TierSlug } from "../lib/tiers";
import { toast } from "sonner";

export const Route = createFileRoute("/claim-profile")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    provider: typeof s.provider === "string" ? s.provider : "",
    payment: s.payment === "success" || s.payment === "cancelled" ? s.payment : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Claim your profile — Lawexpert.co.za" },
      { name: "description", content: "Claim your professional profile on Lawexpert.co.za, choose a listing tier, and take control of how clients find you." },
    ],
  }),
  component: ClaimProfilePage,
});

function ClaimProfilePage() {
  const { provider: slug, payment } = Route.useSearch();
  const submit = useServerFn(submitClaimRequest);
  const myRequest = useServerFn(getMyClaimRequest);
  const checkout = useServerFn(createClaimCheckout);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState<TierSlug>("standard");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existing, setExisting] = useState<{ id: string; status: string; requested_tier: string; decision_note: string | null } | null>(null);
  const [frequency, setFrequency] = useState<"monthly" | "annual">("monthly");

  const { data: provider, isLoading } = useQuery({
    queryKey: ["claim-provider", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, slug, first_name, last_name, designation, provider_type, city, province, is_claimed, profile_id, firms(name)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed || !provider?.id) return;
    myRequest({ data: { service_provider_id: provider.id } })
      .then((res) => {
        if (res.request) setExisting(res.request as typeof existing);
      })
      .catch(() => {});
  }, [authed, provider?.id, myRequest]);

  // After returning from PayFast, poll briefly while the webhook lands.
  useEffect(() => {
    if (payment !== "success" || !provider?.id || !authed) return;
    if (existing?.status === "approved") return;
    const t = setInterval(() => {
      myRequest({ data: { service_provider_id: provider.id } })
        .then((res) => { if (res.request) setExisting(res.request as typeof existing); })
        .catch(() => {});
    }, 4000);
    const stop = setTimeout(() => clearInterval(t), 60000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [payment, provider?.id, authed, existing?.status, myRequest]);

  const payNow = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      const { action, fields } = await checkout({ data: { claim_request_id: existing.id, frequency } });
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
      setBusy(false);
    }
  };

  const doAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpErr && !/already/i.test(signUpErr.message)) throw signUpErr;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);

  const MAX_DOC_BYTES = 8 * 1024 * 1024;

  const uploadDoc = async (userId: string, kind: "selfie" | "id-doc", file: File) => {
    if (file.size > MAX_DOC_BYTES) throw new Error(`${kind === "selfie" ? "Selfie" : "ID document"} is too large (max 8 MB).`);
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("verification-docs").upload(path, file, {
      cacheControl: "0",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(`Could not upload ${kind === "selfie" ? "selfie" : "ID document"}: ${error.message}`);
    return path;
  };

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    if (!phone.trim()) { toast.error("Please add your phone number."); return; }
    if (!selfieFile) { toast.error("Please attach a selfie."); return; }
    if (!idDocFile) { toast.error("Please attach your ID document."); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const selfiePath = await uploadDoc(user.id, "selfie", selfieFile);
      const idDocPath = await uploadDoc(user.id, "id-doc", idDocFile);
      await submit({
        data: {
          service_provider_id: provider.id,
          phone,
          message,
          requested_tier: tier,
          selfie_path: selfiePath,
          id_doc_path: idDocPath,
        },
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit claim");
    } finally {
      setBusy(false);
    }
  };

  if (!slug) {
    return (
      <Shell>
        <p className="text-ink-muted">No profile specified.</p>
        <Link to="/search" className="mt-4 inline-block text-sm text-brand-primary hover:text-brand-hover">Find your profile →</Link>
      </Shell>
    );
  }
  if (isLoading) return <Shell><p className="text-ink-muted">Loading profile…</p></Shell>;
  if (!provider) {
    return (
      <Shell>
        <p className="text-ink-muted">We couldn't find that profile.</p>
        <Link to="/search" className="mt-4 inline-block text-sm text-brand-primary hover:text-brand-hover">Search the directory →</Link>
      </Shell>
    );
  }

  const name = `${provider.first_name} ${provider.last_name}`;
  const firmName = (provider.firms as { name: string | null } | null)?.name;

  if (provider.is_claimed || provider.profile_id) {
    return (
      <Shell>
        <h1 className="font-heading text-2xl text-ink">Already claimed</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The profile for <strong className="text-ink">{name}</strong> is already managed by its owner.
          If you believe this is a mistake, contact us.
        </p>
      </Shell>
    );
  }

  if (submitted || existing?.status === "pending") {
    return (
      <Shell>
        <p className="eyebrow text-brand-primary">[Claim under review]</p>
        <h1 className="mt-2 font-heading text-2xl text-ink">Thanks — we're on it.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Your claim for <strong className="text-ink">{name}</strong> is being reviewed. We verify every
          claim to protect professionals from impersonation. We'll email you the next steps, including
          payment for your chosen tier, usually within one business day.
        </p>
      </Shell>
    );
  }

  if (existing?.status === "verified") {
    const verifiedTier = TIER_BY_SLUG[existing.requested_tier as TierSlug];
    if (payment === "success") {
      return (
        <Shell>
          <p className="eyebrow text-brand-primary">[Payment received]</p>
          <h1 className="mt-2 font-heading text-2xl text-ink">Activating your listing…</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Thanks — PayFast has confirmed your payment and we're handing the profile over to you now.
            This page will update automatically; it usually takes under a minute.
          </p>
        </Shell>
      );
    }
    return (
      <Shell>
        <p className="eyebrow text-brand-primary">[Claim verified]</p>
        <h1 className="mt-2 font-heading text-2xl text-ink">You're verified — activate your listing.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Your claim for <strong className="text-ink">{name}</strong> has been verified. Pay for your{" "}
          <strong className="text-ink">{verifiedTier?.name ?? existing.requested_tier}</strong> listing to
          unlock full edit access.
        </p>
        {payment === "cancelled" && (
          <p className="mt-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Payment was cancelled — no charge was made. You can try again below.
          </p>
        )}
        {verifiedTier && (
          <div className="mt-5 space-y-3">
            {verifiedTier.annualOnly ? (
              <div className="rounded border border-rule bg-paper-ivory p-3 text-sm text-ink-muted">
                <span className="font-medium text-ink">{verifiedTier.name} is a 12-month seat</span> — one
                payment of {formatRands(annualRands(verifiedTier))} covers a fixed annual term. Seats are
                limited per practice area and province; renewal is a fresh purchase at the then-current
                price, with a waitlist when your area is full.
              </div>
            ) : (
            <div className="flex gap-2">
              {([
                { key: "monthly" as const, label: `${formatRands(verifiedTier.monthlyRands)} / month` },
                { key: "annual" as const, label: `${formatRands(annualRands(verifiedTier))} / year · 2 months free` },
              ]).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFrequency(f.key)}
                  aria-pressed={frequency === f.key}
                  className={`flex-1 rounded border px-3 py-2.5 text-sm transition-colors ${
                    frequency === f.key
                      ? "border-brand-primary bg-brand-tint text-brand-primary"
                      : "border-rule bg-paper-white text-ink-muted hover:border-brand-primary/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            )}
            <button
              onClick={payNow}
              disabled={busy}
              className="w-full rounded bg-brass px-4 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] disabled:opacity-50"
            >
              {busy
                ? "Redirecting to PayFast…"
                : `Pay ${formatRands(verifiedTier.annualOnly || frequency === "annual" ? annualRands(verifiedTier) : verifiedTier.monthlyRands)} with PayFast`}
            </button>
            <p className="text-xs text-ink-muted">
              Secure recurring billing via PayFast. Cancel any time — your listing stays in the directory.
            </p>
          </div>
        )}
      </Shell>
    );
  }

  if (existing?.status === "rejected") {
    return (
      <Shell>
        <p className="eyebrow text-destructive">[Claim declined]</p>
        <h1 className="mt-2 font-heading text-2xl text-ink">We couldn't verify this claim.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {existing.decision_note || "We couldn't confirm that this profile belongs to you."} If you think
          this is a mistake, reply to our email or submit a new claim with more detail.
        </p>
      </Shell>
    );
  }

  if (existing?.status === "approved") {
    return (
      <Shell>
        <p className="eyebrow text-brand-primary">[Claim approved]</p>
        <h1 className="mt-2 font-heading text-2xl text-ink">This profile is yours.</h1>
        <p className="mt-3 text-sm text-ink-muted">Manage it from your dashboard.</p>
        <Link to="/dashboard" className="mt-5 inline-block rounded bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
          Go to dashboard
        </Link>
      </Shell>
    );
  }

  return (
    <div className="bg-paper-ivory">
      <section className="bg-brand-deep py-12 text-paper-ivory">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow text-paper-ivory/70">[Claim your profile]</p>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl">Is this you?</h1>
          <p className="mt-3 max-w-2xl text-paper-ivory/75">
            <strong className="text-paper-ivory">{name}</strong>
            {provider.designation ? ` · ${provider.designation}` : ""}
            {firmName ? ` · ${firmName}` : ""}
            {provider.city ? ` · ${provider.city}, ${provider.province}` : ""}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-paper-ivory/60">
            Take control of your listing: correct your details, add your qualifications and services,
            and choose how prominently you appear.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Tier selection */}
        <h2 className="font-heading text-2xl text-ink">Choose your listing tier</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Billed monthly. Pay annually and get two months free. You can change tier at any time.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t) => {
            const selected = tier === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTier(t.slug)}
                aria-pressed={selected}
                className={`flex flex-col rounded border bg-paper-white p-4 text-left transition-colors ${
                  selected ? "border-brand-primary ring-1 ring-brand-primary" : "border-rule hover:border-brand-primary/60"
                }`}
              >
                <span className="eyebrow text-brand-primary">[{t.name}]</span>
                {t.annualOnly ? (
                  <>
                    <span className="mt-2 font-heading text-2xl text-ink">
                      {formatRands(annualRands(t))}
                      <span className="font-body text-xs text-ink-muted"> /12-month seat</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      ≈ {formatRands(t.monthlyRands)}/month · annual only
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mt-2 font-heading text-2xl text-ink">
                      {formatRands(t.monthlyRands)}
                      <span className="font-body text-xs text-ink-muted"> /month</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {formatRands(annualRands(t))}/year
                    </span>
                  </>
                )}
                <span className="mt-2 text-xs leading-relaxed text-ink-muted">{t.blurb}</span>
                <ul className="mt-3 space-y-1.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-muted">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-primary" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Auth or claim form */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded border border-rule bg-paper-white p-6">
            {authed ? (
              <form onSubmit={doSubmit} className="space-y-3">
                <h3 className="font-heading text-xl text-ink">Submit your claim</h3>
                <p className="text-sm text-ink-muted">
                  To protect professionals from impersonation, we verify every claim against a selfie
                  and an ID document. Your documents are stored privately and deleted after review.
                </p>
                <input
                  type="tel"
                  required
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                  className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <label className="block text-sm">
                  <span className="mb-1 block text-ink">
                    Selfie <span className="text-ink-muted">(clear photo of your face)</span>
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    capture="user"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                    className="block w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm text-ink-muted file:mr-3 file:rounded file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink">
                    ID document <span className="text-ink-muted">(SA ID, passport or driver's licence — photo or PDF)</span>
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => setIdDocFile(e.target.files?.[0] ?? null)}
                    className="block w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm text-ink-muted file:mr-3 file:rounded file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-primary"
                  />
                </label>
                <textarea
                  rows={3}
                  placeholder="Anything that helps us verify it's you (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded bg-brass px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] disabled:opacity-50"
                >
                  {busy ? "Uploading & submitting…" : "Submit claim for review"}
                </button>
                <p className="text-xs text-ink-muted">
                  No payment now — we'll send payment details for your chosen tier once your claim is verified.
                </p>
              </form>
            ) : (
              <form onSubmit={doAuth} className="space-y-3">
                <h3 className="font-heading text-xl text-ink">First, create your account</h3>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>New account</button>
                  <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>Existing account</button>
                </div>
                <input
                  type="email"
                  required
                  placeholder="Your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder={mode === "signup" ? "Choose a password (min 8 chars)" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {busy ? "Working…" : mode === "signup" ? "Create account & continue" : "Sign in & continue"}
                </button>
              </form>
            )}
          </div>

          <div className="rounded border border-rule bg-paper-white p-6">
            <h3 className="eyebrow text-ink-muted">How claiming works</h3>
            <ol className="mt-4 space-y-3 text-sm text-ink-muted">
              <li className="flex gap-3"><span className="font-mono text-brand-primary">[1]</span> Pick a tier, then submit your claim with your phone number, a selfie and your ID document.</li>
              <li className="flex gap-3"><span className="font-mono text-brand-primary">[2]</span> We check your documents and verify it's really you — usually within one business day. Documents are deleted after review.</li>
              <li className="flex gap-3"><span className="font-mono text-brand-primary">[3]</span> Pay for your chosen tier to activate full edit access.</li>
              <li className="flex gap-3"><span className="font-mono text-brand-primary">[4]</span> Your profile stays live throughout — you just take the keys.</li>
            </ol>
          </div>
        </div>
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
