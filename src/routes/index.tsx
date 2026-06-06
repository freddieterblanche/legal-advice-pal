import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Scale,
  Shield,
  Users,
  Briefcase,
  Home,
  HeartHandshake,
  Gavel,
  Phone,
  ArrowRight,
  Star,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lawexperts | Expert Legal Counsel" },
      { name: "description", content: "Trusted legal services for individuals and businesses. Specializing in corporate law, criminal defense, family law, real estate, and personal injury. Free consultations." },
      { property: "og:title", content: "Lawexperts | Expert Legal Counsel" },
      { property: "og:description", content: "Trusted legal services for individuals and businesses. Free consultations available." },
    ],
  }),
  component: Index,
});

const practiceAreas = [
  {
    icon: Briefcase,
    title: "Corporate Law",
    description: "Mergers, acquisitions, contracts, and business formation tailored to your strategic goals.",
  },
  {
    icon: Shield,
    title: "Criminal Defense",
    description: "Aggressive representation protecting your rights from investigation through trial.",
  },
  {
    icon: HeartHandshake,
    title: "Family Law",
    description: "Compassionate guidance through divorce, custody, and adoption proceedings.",
  },
  {
    icon: Home,
    title: "Real Estate",
    description: "Seamless transactions, disputes, and development guidance for property matters.",
  },
  {
    icon: Gavel,
    title: "Personal Injury",
    description: "Fighting for maximum compensation when you've been wrongfully injured.",
  },
  {
    icon: Users,
    title: "Employment Law",
    description: "Advocating for fair treatment, wrongful termination, and workplace disputes.",
  },
];

const stats = [
  { value: "25+", label: "Years Experience" },
  { value: "3,500+", label: "Cases Won" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "50+", label: "Legal Experts" },
];

const testimonials = [
  {
    quote: "Lawexperts navigated our complex merger with precision. Their strategic counsel saved us millions and months of delays.",
    author: "Michael Chen",
    role: "CEO, Apex Technologies",
  },
  {
    quote: "When my family needed help, they treated us with dignity and fought relentlessly. I cannot recommend them highly enough.",
    author: "Sarah Williams",
    role: "Family Law Client",
  },
  {
    quote: "The defense team was exceptional. They believed in my innocence and secured a dismissal that changed my life.",
    author: "David Park",
    role: "Criminal Defense Client",
  },
];

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-office.jpg"
            alt="Lawexperts modern office"
            className="h-full w-full object-cover"
            loading="eager"
            width={1536}
            height={768}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 text-center md:py-40 md:text-left">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Star className="h-3.5 w-3.5 fill-accent" />
              Award-Winning Legal Firm
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Justice Delivered
              <br />
              <span className="text-accent">With Expertise</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
              For over 25 years, Lawexperts has provided unwavering legal counsel
              to individuals and businesses navigating complex legal challenges.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-8 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Phone className="h-4 w-4" />
                Free Consultation
              </Link>
              <Link
                to="/practice-areas"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-primary-foreground/30 bg-transparent px-8 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                Our Practice Areas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Areas */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              What We Do
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Practice Areas
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Comprehensive legal expertise across a wide spectrum of disciplines,
              ensuring you have the right counsel for any challenge.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {practiceAreas.map((area) => (
              <Link
                key={area.title}
                to="/practice-areas"
                className="group rounded-xl border border-border bg-card p-8 transition-all hover:border-accent/50 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex rounded-lg bg-accent/10 p-3 text-accent">
                  <area.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-card-foreground group-hover:text-accent">
                  {area.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {area.description}
                </p>
                <div className="mt-5 flex items-center gap-1 text-sm font-medium text-accent">
                  Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 divide-y divide-primary-foreground/10 md:grid-cols-4 md:divide-x md:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-4 text-center md:py-0">
                <span className="font-heading text-4xl font-bold text-accent md:text-5xl">
                  {stat.value}
                </span>
                <span className="mt-2 text-sm font-medium text-primary-foreground/70">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                About Lawexperts
              </span>
              <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
                A Legacy of Legal Excellence
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Founded in 1998, Lawexperts has grown from a small partnership into
                one of the region's most respected full-service law firms. Our team
                of over 50 attorneys combines deep expertise with a client-first
                philosophy that has earned us a 98% satisfaction rating.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                We believe every client deserves personalized attention, strategic
                thinking, and unwavering advocacy — whether you're a Fortune 500
                company or an individual facing a life-changing legal matter.
              </p>
              <div className="mt-8 flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2.5 text-accent">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-foreground">Award Winning</p>
                    <p className="text-xs text-muted-foreground">Top 100 Law Firm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2.5 text-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-foreground">24/7 Support</p>
                    <p className="text-xs text-muted-foreground">Always Available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2.5 text-accent">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-foreground">Proven Results</p>
                    <p className="text-xs text-muted-foreground">3,500+ Cases Won</p>
                  </div>
                </div>
              </div>
              <Link
                to="/about"
                className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Meet Our Team
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <Scale className="h-24 w-24 text-accent/30" />
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden rounded-xl bg-card p-6 shadow-xl lg:block">
                <p className="font-heading text-3xl font-bold text-foreground">25+</p>
                <p className="text-sm text-muted-foreground">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Client Stories
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              What Our Clients Say
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="rounded-xl border border-border bg-card p-8"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-card-foreground italic">
                  "{t.quote}"
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Ready to Discuss Your Case?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Schedule a free, no-obligation consultation with one of our experienced
            attorneys. We're here to help you navigate your legal challenges.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="h-4 w-4" />
              Schedule Consultation
            </Link>
            <a
              href="tel:+15551234567"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-foreground hover:text-accent"
            >
              <Phone className="h-4 w-4" />
              (555) 123-4567
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
