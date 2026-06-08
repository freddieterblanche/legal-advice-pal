import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";

export function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => setRole((data as any)?.role ?? null));
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
    router.invalidate();
  };

  const isPlatformAdmin = role === "platform_admin";

  const publicLinks: Array<{ to: string; label: string; search?: Record<string, string> }> = [
    { to: "/search", label: "Attorneys", search: { type: "attorney" } },
    { to: "/search", label: "Advocates", search: { type: "advocate" } },
    { to: "/expert-witnesses", label: "Expert Witnesses" },
    { to: "/mediators", label: "Mediators" },
    { to: "/arbitrators", label: "Arbitrators" },
    { to: "/firms", label: "Law Firms" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-ink">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-white">
          Lawexpert.co.za
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {publicLinks.map(l => (
            <Link key={`${l.to}-${l.label}`} to={l.to} search={l.search as never} className="text-sm font-medium text-cream/80 transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gold/90 focus:outline-none">
                  Dashboard
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">My Dashboard</Link>
                  </DropdownMenuItem>
                  {isPlatformAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Admin Hub</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-52">
                          <DropdownMenuItem asChild>
                            <Link to="/admin">Overview</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin/firms">Firms</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/attorneys">Attorneys</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/advocates">Advocates</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/experts">Expert Witnesses</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/mediators">Mediators</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/arbitrators">Arbitrators</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin/bars">Bars</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/chambers">Chambers</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/towns">Towns & Cities</Link>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={signOut} className="text-sm font-medium text-cream/70 hover:text-cream">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-cream/80 hover:text-cream">
                Sign In
              </Link>
              <Link to="/register" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold/90">
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
              <Link key={`${l.to}-${l.label}`} to={l.to} search={l.search as never} onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm text-cream/90 hover:bg-cream/5">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-cream/10 pt-3">
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-gold">Dashboard</Link>
                  {isPlatformAdmin && (
                    <>
                      <span className="block px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cream/50">Admin</span>
                      <Link to="/admin" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-gold">Admin Hub</Link>
                      <div className="grid grid-cols-2 gap-1 px-3 pb-2">
                        <Link to="/admin/firms" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Firms</Link>
                        <Link to="/admin/attorneys" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Attorneys</Link>
                        <Link to="/admin/advocates" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Advocates</Link>
                        <Link to="/admin/experts" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Experts</Link>
                        <Link to="/admin/mediators" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Mediators</Link>
                        <Link to="/admin/arbitrators" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Arbitrators</Link>
                        <Link to="/admin/bars" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Bars</Link>
                        <Link to="/admin/chambers" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Chambers</Link>
                        <Link to="/admin/towns" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-cream/80 hover:bg-cream/5">Towns</Link>
                      </div>
                    </>
                  )}
                  <button onClick={() => { signOut(); setOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm text-cream/80">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-cream/90">Sign In</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="mt-2 block rounded bg-gold px-3 py-2 text-center text-sm font-semibold text-white">Register Your Firm</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
