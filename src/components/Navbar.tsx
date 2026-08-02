import { LogoLockup } from "./BrandMark";
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
    <header className="sticky top-0 z-50 border-b border-rule bg-paper-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Lawexpert home" className="flex items-center">
          <LogoLockup variant="light" className="text-[15px]" />
        </Link>

        <nav className="hidden items-center gap-6 lg:gap-7 md:flex">
          {publicLinks.map(l => (
            <Link key={`${l.to}-${l.label}`} to={l.to} search={l.search as never} className="text-sm font-medium text-ink transition-colors hover:text-brand-hover">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link to="/pricing" className="text-sm font-medium text-ink-muted transition-colors hover:text-brand-hover">
            Pricing
          </Link>
          {session ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
                  Dashboard
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">My Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-listing">My Listing & Billing</Link>
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
                          <DropdownMenuItem asChild>
                            <Link to="/admin/claims">Profile Claims</Link>
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
              <button onClick={signOut} className="text-sm font-medium text-ink-muted transition-colors hover:text-brand-hover">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-ink-muted transition-colors hover:text-brand-hover">
                Sign In
              </Link>
              <Link to="/register" className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
                Register Your Firm
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="text-ink md:hidden" aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-rule bg-paper-white md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {publicLinks.map(l => (
              <Link key={`${l.to}-${l.label}`} to={l.to} search={l.search as never} onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-brand-tint/50">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-rule pt-3">
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-brand-primary">Dashboard</Link>
                  <Link to="/my-listing" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-brand-primary">My Listing &amp; Billing</Link>
                  {isPlatformAdmin && (
                    <>
                      <span className="eyebrow block px-3 py-2 text-ink-muted">Admin</span>
                      <Link to="/admin" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-medium text-brand-primary">Admin Hub</Link>
                      <div className="grid grid-cols-2 gap-1 px-3 pb-2">
                        <Link to="/admin/claims" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Claims</Link>
                        <Link to="/admin/firms" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Firms</Link>
                        <Link to="/admin/attorneys" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Attorneys</Link>
                        <Link to="/admin/advocates" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Advocates</Link>
                        <Link to="/admin/experts" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Experts</Link>
                        <Link to="/admin/mediators" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Mediators</Link>
                        <Link to="/admin/arbitrators" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Arbitrators</Link>
                        <Link to="/admin/bars" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Bars</Link>
                        <Link to="/admin/chambers" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Chambers</Link>
                        <Link to="/admin/towns" onClick={() => setOpen(false)} className="rounded px-2 py-1.5 text-sm text-ink hover:bg-brand-tint/50">Towns</Link>
                      </div>
                    </>
                  )}
                  <button onClick={() => { signOut(); setOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm text-ink-muted">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/pricing" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-ink">Pricing</Link>
                  <Link to="/auth" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-ink">Sign In</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="mt-2 block rounded bg-brand-primary px-3 py-2 text-center text-sm font-medium text-white">Register Your Firm</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
