import { createFileRoute } from "@tanstack/react-router";
import { Scale, Award, Globe, BookOpen } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Lawexperts" },
      { name: "description", content: "Learn about Lawexperts' 25-year legacy of legal excellence, our mission, values, and team of award-winning attorneys." },
      { property: "og:title", content: "About Us | Lawexperts" },
      { property: "og:description", content: "Discover the story behind Lawexperts and our commitment to exceptional legal counsel." },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Scale,
    title: "Integrity",
    description: "We uphold the highest ethical standards in every case, ensuring transparent and honest counsel.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Our attorneys are recognized leaders in their fields, delivering results that exceed expectations.",
  },
  {
    icon: Globe,
    title: "Accessibility",
    description: "Legal expertise should be available to all. We offer flexible consultations and clear communication.",
  },
  {
    icon: BookOpen,
    title: "Innovation",
    description: "We combine time-tested legal strategies with cutting-edge approaches to complex modern challenges.",
  },
];

const team = [
  {
    name: "Victoria Harrington",
    role: "Managing Partner",
    bio: "25 years of experience in corporate litigation and M&A. Former federal clerk.",
  },
  {
    name: "James Morrison",
    role: "Senior Partner",
    bio: "Criminal defense specialist with over 200 jury trials. Board-certified advocate.",
  },
  {
    name: "Elena Rodriguez",
    role: "Partner, Family Law",
    bio: "Recognized by Super Lawyers for excellence in family law and child advocacy.",
  },
  {
    name: "David Chen",
    role: "Partner, Real Estate",
    bio: "Advised on $2B+ in commercial real estate transactions across 15 states.",
  },
];

function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-32 pt-40 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Our Story
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-primary-foreground md:text-5xl">
            About Lawexperts
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
            For over two decades, we have stood as a beacon of justice, delivering
            exceptional legal counsel with unwavering integrity and compassion.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
                Our Mission
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Lawexperts was founded on a simple but powerful belief: that every
                person and business deserves access to world-class legal representation.
                What began as a two-attorney practice in 1998 has grown into a
                full-service firm with over 50 legal professionals, yet our core
                mission remains unchanged.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                We exist to level the playing field. Whether you're a startup
                negotiating its first funding round or a family navigating a difficult
                divorce, we bring the same level of dedication, strategic thinking,
                and tireless advocacy to your case.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-secondary p-8 text-center">
                <p className="font-heading text-4xl font-bold text-accent">1998</p>
                <p className="mt-2 text-sm text-muted-foreground">Year Founded</p>
              </div>
              <div className="rounded-xl bg-secondary p-8 text-center">
                <p className="font-heading text-4xl font-bold text-accent">50+</p>
                <p className="mt-2 text-sm text-muted-foreground">Attorneys</p>
              </div>
              <div className="rounded-xl bg-secondary p-8 text-center">
                <p className="font-heading text-4xl font-bold text-accent">12</p>
                <p className="mt-2 text-sm text-muted-foreground">Practice Areas</p>
              </div>
              <div className="rounded-xl bg-secondary p-8 text-center">
                <p className="font-heading text-4xl font-bold text-accent">3</p>
                <p className="mt-2 text-sm text-muted-foreground">Office Locations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              What Drives Us
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Our Core Values
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl bg-card p-8 text-center">
                <div className="mx-auto mb-5 inline-flex rounded-full bg-accent/10 p-4 text-accent">
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  {v.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Leadership
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Meet Our Partners
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div key={member.name} className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-accent/10" />
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-accent">{member.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
