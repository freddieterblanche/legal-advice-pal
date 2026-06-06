import { Link } from "@tanstack/react-router";
import { Scale, Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-accent" />
              <span className="font-heading text-lg font-bold">Lawexperts</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
              Trusted legal counsel delivering exceptional results for individuals
              and businesses since 1998.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider">
              Practice Areas
            </h4>
            <ul className="mt-4 space-y-2">
              {[
                "Corporate Law",
                "Criminal Defense",
                "Family Law",
                "Real Estate",
                "Personal Injury",
                "Employment Law",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/practice-areas"
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2">
              {[
                { label: "About Us", to: "/about" },
                { label: "Our Team", to: "/about" },
                { label: "Case Results", to: "/practice-areas" },
                { label: "Contact", to: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider">
              Contact
            </h4>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-accent" />
                <span className="text-sm text-primary-foreground/70">
                  (555) 123-4567
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-accent" />
                <span className="text-sm text-primary-foreground/70">
                  contact@lawexperts.com
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                <span className="text-sm text-primary-foreground/70">
                  350 Fifth Avenue, Suite 4200
                  <br />
                  New York, NY 10118
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
          <p className="text-xs text-primary-foreground/50">
            &copy; {new Date().getFullYear()} Lawexperts. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Disclaimer"].map((item) => (
              <span
                key={item}
                className="cursor-pointer text-xs text-primary-foreground/50 transition-colors hover:text-accent"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
