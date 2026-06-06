import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { acceptLawyerInvite, lookupLawyerInvite } from "../lib/lawyer-invite.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/claim")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  head: () => ({ meta: [{ title: "Claim your profile — Lawexpert.co.za" }] }),
  component: ClaimPage,
});

function ClaimPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const lookup = useServerFn(lookupLawyerInvite);
  const accept = useServerFn(acceptLawyerInvite);

  const [info, setInfo] = useState<{ email: string; lawyer_name: string; firm_name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Missing invite token."); return; }
    lookup({ data: { token } })
      .then((res) => {
        if (!res.ok) {
          setError(res.reason === "expired" ? "This invite has expired." : res.reason === "already_used" ? "This invite has already been used." : "Invite not found.");
        } else {
          setInfo({ email: res.email, lawyer_name: res.lawyer_name, firm_name: res.firm_name });
        }
      })
      .catch(() => setError("Could not load invite."));
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? null));
  }, [token, lookup]);

  const doAccept = async () => {
    setBusy(true);
    try {
      const res = await accept({ data: { token } });
      toast.success("Profile claimed!");
      navigate({ to: "/my-profile" });
      void res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const { error: signUpErr } = await supabase.auth.signUp({
          email: info.email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { first_name: first, last_name: last } },
        });
        if (signUpErr && !/already/i.test(signUpErr.message)) throw signUpErr;
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: info.email, password });
        if (signInErr) throw signInErr;
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: info.email, password });
        if (signInErr) throw signInErr;
      }
      await doAccept();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">Invite unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Link to="/" className="mt-6 inline-block text-sm text-forest hover:text-gold">Back to home</Link>
      </div>
    );
  }

  if (!info) {
    return <div className="p-12 text-center text-muted-foreground">Loading invite…</div>;
  }

  const emailMatches = currentEmail && currentEmail.toLowerCase() === info.email.toLowerCase();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-heading text-2xl text-ink">Claim your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You've been invited to manage <strong className="text-ink">{info.lawyer_name}</strong>
        {info.firm_name ? <> at <strong className="text-ink">{info.firm_name}</strong></> : null}.
      </p>

      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Invited email</p>
        <p className="mt-1 font-medium text-ink">{info.email}</p>

        {currentEmail && !emailMatches && (
          <p className="mt-4 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            You're signed in as {currentEmail}. Please sign out and sign in with {info.email}.
          </p>
        )}

        {emailMatches ? (
          <button onClick={doAccept} disabled={busy} className="mt-4 w-full rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
            {busy ? "Claiming…" : "Claim my profile"}
          </button>
        ) : currentEmail ? null : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-gold text-white" : "bg-muted text-muted-foreground"}`}>New account</button>
              <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-gold text-white" : "bg-muted text-muted-foreground"}`}>Existing account</button>
            </div>
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={80} className="rounded border border-border bg-background px-3 py-2 text-sm" />
                <input required placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={80} className="rounded border border-border bg-background px-3 py-2 text-sm" />
              </div>
            )}
            <input type="password" required minLength={8} maxLength={72} placeholder={mode === "signup" ? "Choose a password (min 8 chars)" : "Your password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" disabled={busy} className="w-full rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {busy ? "Working…" : mode === "signup" ? "Create account & claim" : "Sign in & claim"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
