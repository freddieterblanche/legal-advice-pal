import { Link } from "@tanstack/react-router";
import { LogoLockup } from "./BrandMark";

export function Footer() {
  return (
    <footer className="bg-brand-deep text-paper-ivory/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" aria-label="Lawexpert home" className="inline-flex">
              <LogoLockup variant="dark" tagline className="text-[15px]" />
            </Link>
            <p className="mt-4 font-mono text-xs leading-relaxed text-paper-ivory/60">
              South Africa's directory of
              <br />
              legal professionals.
            </p>
          </div>
          <div>
            <h4 className="eyebrow text-paper-ivory">Browse</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/search" className="transition-colors hover:text-paper-ivory">Find a Lawyer</Link></li>
              <li><Link to="/practice-areas" className="transition-colors hover:text-paper-ivory">Practice Areas</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="eyebrow text-paper-ivory">For Firms</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/pricing" className="transition-colors hover:text-paper-ivory">Pricing</Link></li>
              <li><Link to="/register" className="transition-colors hover:text-paper-ivory">Register Your Firm</Link></li>
              <li><Link to="/auth" className="transition-colors hover:text-paper-ivory">Firm Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="eyebrow text-paper-ivory">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><span className="text-paper-ivory/50">Terms of Service</span></li>
              <li><span className="text-paper-ivory/50">Privacy Policy</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-paper-ivory/15 pt-6 font-mono text-xs text-paper-ivory/50">
          © {new Date().getFullYear()} Lawexpert.co.za. Independent directory. Not affiliated with the Legal Practice Council.
        </div>
      </div>
    </footer>
  );
}
