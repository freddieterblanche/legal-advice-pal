import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Shield,
  HeartHandshake,
  Home,
  Gavel,
  Users,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/practice-areas")({
  head: () => ({
    meta: [
      { title: "Practice Areas | Lawexperts" },
      { name: "description", content: "Explore Lawexperts' comprehensive legal services including corporate law, criminal defense, family law, real estate, personal injury, and employment law." },
      { property: "og:title", content: "Practice Areas | Lawexperts" },
      { property: "og:description", content: "Comprehensive legal services across corporate, criminal, family, real estate, personal injury, and employment law." },
    ],
  }),
  component: PracticeAreasPage,
});

const areas = [
  {
    icon: Briefcase,
    title: "Corporate Law",
    description:
      "From startup formation to complex mergers and acquisitions, our corporate team provides strategic counsel that protects your business interests and accelerates growth.",
    services: [
      "Business Formation & Structuring",
      "Mergers & Acquisitions",
      "Contract Negotiation & Drafting",
      "Corporate Governance",
      "Securities & Compliance",
      "Intellectual Property Protection",
    ],
  },
  {
    icon: Shield,
    title: "Criminal Defense",
    description:
      "When your freedom is on the line, you need aggressive, experienced advocates. Our criminal defense team has secured dismissals, acquittals, and favorable plea agreements in thousands of cases.",
    services: [
      "White Collar Crime Defense",
      "DUI & Traffic Violations",
      "Drug Offenses",
      "Violent Crime Defense",
      "Federal Criminal Defense",
      "Appeals & Post-Conviction",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Family Law",
    description:
      "Family legal matters require both legal expertise and emotional intelligence. Our compassionate attorneys guide you through divorce, custody, and adoption with dignity and discretion.",
    services: [
      "Divorce & Separation",
      "Child Custody & Support",
      "Adoption & Surrogacy",
      "Prenuptial Agreements",
      "Estate Planning for Families",
      "Domestic Violence Protection",
    ],
  },
  {
    icon: Home,
    title: "Real Estate",
    description:
      "Whether you're closing on your first home or developing a commercial property portfolio, our real estate attorneys ensure your transactions are seamless and your interests protected.",
    services: [
      "Residential & Commercial Closings",
      "Title Examination & Insurance",
      "Zoning & Land Use",
      "Property Disputes & Litigation",
      "Development & Construction",
      "Landlord-Tenant Matters",
    ],
  },
  {
    icon: Gavel,
    title: "Personal Injury",
    description:
      "If you've been injured due to someone else's negligence, we fight tirelessly to secure the compensation you deserve for medical bills, lost wages, and pain and suffering.",
    services: [
      "Motor Vehicle Accidents",
      "Medical Malpractice",
      "Slip & Fall Injuries",
      "Product Liability",
      "Wrongful Death Claims",
      "Catastrophic Injury",
    ],
  },
  {
    icon: Users,
    title: "Employment Law",
    description:
      "We advocate for fair treatment in the workplace. Our employment law practice represents both employees and employers in disputes, negotiations, and compliance matters.",
    services: [
      "Wrongful Termination",
      "Discrimination & Harassment",
      "Wage & Hour Disputes",
      "Employment Contracts",
      "Non-Compete Agreements",
      "Workplace Investigations",
    ],
  },
];

function PracticeAreasPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-32 pt-40 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Expertise
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-primary-foreground md:text-5xl">
            Practice Areas
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
            Comprehensive legal services spanning the full spectrum of personal
            and business law. Whatever challenge you face, we have the expertise
            to guide you through it.
          </p>
        </div>
      </section>

      {/* Areas Detail */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12">
            {areas.map((area, idx) => (
              <div
                key={area.title}
                className={`grid items-start gap-8 rounded-2xl border border-border bg-card p-8 md:grid-cols-2 md:p-12 ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div>
                  <div className="mb-5 inline-flex rounded-lg bg-accent/10 p-3 text-accent">
                    <area.icon className="h-7 w-7" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-card-foreground md:text-3xl">
                    {area.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {area.description}
                  </p>
                  <a
                    href="/contact"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                  >
                    Schedule a consultation <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="rounded-xl bg-secondary/50 p-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key Services
                  </h4>
                  <ul className="mt-4 space-y-3">
                    {area.services.map((service) => (
                      <li key={service} className="flex items-center gap-3 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
