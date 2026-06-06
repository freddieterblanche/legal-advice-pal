import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
    router.invalidate();
  };

  const publicLinks = [
    { to: "/search", label: "Find a Lawyer" },
    { to: "/practice-areas", label: "Practice Areas" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-gold">
          LexSA
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {publicLinks.map(l => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-cream/80 transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <Link to="/dashboard" className="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold hover:bg-gold hover:text-ink">
                Dashboard
              </Link>
              <button onClick={signOut} className="text-sm font-medium text-cream/70 hover:text-cream">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-cream/80 hover:text-cream">
                Sign In
              </Link>
              <Link to="/register" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold/90">
                Register Your Firm
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="text-cream md:hidden" aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-cream/10 bg-ink md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {publicLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm text-cream/90 hover:bg-cream/5">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-cream/10 pt-3">
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-gold">Dashboard</Link>
                  <button onClick={() => { signOut(); setOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm text-cream/80">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-cream/90">Sign In</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="mt-2 block rounded bg-gold px-3 py-2 text-center text-sm font-semibold text-ink">Register Your Firm</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
