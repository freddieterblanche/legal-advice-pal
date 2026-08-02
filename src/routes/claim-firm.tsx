import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { acceptFirmInvite, lookupFirmInvite } from "../lib/firm-invite.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/claim-firm")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  head: () => ({ meta: [{ title: "Manage your firm — Lawexpert.co.za" }] }),
  component: ClaimFirmPage,
});

function ClaimFirmPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const lookup = useServerFn(lookupFirmInvite);
  const accept = useServerFn(acceptFirmInvite);

  const [info, setInfo] = useState<{ email: string; firm_name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Missing invite token."); return; }
    lookup({ data: { token } })
      .then((res) => {
        if (!res.ok) {
          setError(res.reason === "expired" ? "This invite has expired." : res.reason === "already_used" ? "This invite has already been used." : "Invite not found.");
        } else {
          setInfo({ email: res.email, firm_name: res.firm_name });
        }
      })
      .catch(() => setError("Could not load invite."));
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? null));
  }, [token, lookup]);

  const doAccept = async () => {
    setBusy(true);
    try {
      await accept({ data: { token } });
      toast.success("You're now an administrator of this firm.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
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
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpErr && !/already/i.test(signUpErr.message)) throw signUpErr;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: info.email, password });
      if (signInErr) throw signInErr;
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
        <Link to="/" className="mt-6 inline-block text-sm text-brand-primary transition-colors hover:text-brand-hover">Back to home</Link>
      </div>
    );
  }

  if (!info) {
    return <div className="p-12 text-center text-muted-foreground">Loading invite…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="eyebrow text-brand-primary">[Firm administrator invite]</p>
      <h1 className="mt-2 font-heading text-2xl text-ink">Manage {info.firm_name || "your firm"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You've been invited to administer <strong className="text-ink">{info.firm_name}</strong> on
        Lawexpert.co.za — manage the firm profile, its professionals and branches.
      </p>

      <div className="mt-6 rounded border border-rule bg-paper-white p-5">
        <p className="eyebrow text-ink-muted">Invited email</p>
        <p className="mt-1 font-medium text-ink">{info.email}</p>

        {currentEmail && currentEmail.toLowerCase() === info.email.toLowerCase() ? (
          <button
            onClick={doAccept}
            disabled={busy}
            className="mt-4 w-full rounded bg-brass px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] disabled:opacity-50"
          >
            {busy ? "Accepting…" : "Accept invite"}
          </button>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>New account</button>
              <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>Existing account</button>
            </div>
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              placeholder={mode === "signup" ? "Choose a password (min 8 chars)" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-rule bg-paper-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded bg-brass px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:bg-[#c39a3f] disabled:opacity-50"
            >
              {busy ? "Working…" : mode === "signup" ? "Create account & accept" : "Sign in & accept"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
