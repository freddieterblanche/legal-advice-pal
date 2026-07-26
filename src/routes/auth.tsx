import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex min-h-[80vh] items-center justify-center bg-paper-ivory px-4 py-12">
      <div className="w-full max-w-md rounded border border-rule bg-paper-white p-8">
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
            className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-rule bg-paper-white px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded bg-brass px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9a7526] disabled:opacity-50">
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>Don't have an account? <button onClick={() => setMode("signup")} className="font-medium text-brand-primary transition-colors hover:text-brand-hover">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode("signin")} className="font-medium text-brand-primary transition-colors hover:text-brand-hover">Sign in</button></>
          )}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Registering a new firm? <Link to="/register" className="font-medium text-brand-primary transition-colors hover:text-brand-hover">Start firm registration →</Link>
        </p>
      </div>
    </div>
  );
}
