import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-ink text-cream/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="font-heading text-2xl font-bold text-gold">LexSA</Link>
            <p className="mt-3 text-sm text-cream/60">
              South Africa's legal directory.<br />Verified profiles. Linked cases.
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream">Browse</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-gold">Find a Lawyer</Link></li>
              <li><Link to="/practice-areas" className="hover:text-gold">Practice Areas</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream">For Firms</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-gold">Register Your Firm</Link></li>
              <li><Link to="/auth" className="hover:text-gold">Firm Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><span className="text-cream/50">Terms of Service</span></li>
              <li><span className="text-cream/50">Privacy Policy</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-cream/10 pt-6 text-xs text-cream/50">
          © {new Date().getFullYear()} LexSA. Independent directory. Not affiliated with the Legal Practice Council.
        </div>
      </div>
    </footer>
  );
}
