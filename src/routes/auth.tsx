import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Lawexpert.co.za" }] }),
  component: AuthPage,
});

const authSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = authSchema.parse({ email, password });
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed);
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You can now sign in.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-3xl text-ink">{mode === "signin" ? "Sign in to Lawexpert.co.za" : "Create an account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Access your firm dashboard." : "Sign up to manage your firm and lawyers."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            maxLength={255}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button type="submit" disabled={loading} className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-ink/90 disabled:opacity-50">
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>Don't have an account? <button onClick={() => setMode("signup")} className="font-medium text-forest hover:text-gold">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode("signin")} className="font-medium text-forest hover:text-gold">Sign in</button></>
          )}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Registering a new firm? <Link to="/register" className="font-medium text-forest hover:text-gold">Start firm registration →</Link>
        </p>
      </div>
    </div>
  );
}
