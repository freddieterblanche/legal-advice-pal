import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | Lawexperts" },
      { name: "description", content: "Contact Lawexperts for a free consultation. Reach us by phone, email, or visit our offices in New York." },
      { property: "og:title", content: "Contact Us | Lawexperts" },
      { property: "og:description", content: "Schedule your free consultation with Lawexperts today." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-32 pt-40 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Get in Touch
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-primary-foreground md:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
            Ready to discuss your case? Reach out for a free, confidential
            consultation. Our team is here to help you take the first step.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            {/* Info */}
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Contact Information
              </h2>
              <p className="mt-4 text-muted-foreground">
                Our offices are open Monday through Friday, and we offer
                after-hours appointments by request.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-3 text-accent">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">(555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-3 text-accent">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">contact@lawexperts.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-3 text-accent">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Address</p>
                    <p className="text-sm text-muted-foreground">
                      350 Fifth Avenue, Suite 4200
                      <br />
                      New York, NY 10118
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-3 text-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Office Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Mon – Fri: 8:30 AM – 6:00 PM
                      <br />
                      Sat: 10:00 AM – 2:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <h3 className="font-heading text-xl font-bold text-card-foreground">
                Request a Consultation
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below and we will respond within 24 hours.
              </p>
              <form className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Practice Area
                  </label>
                  <select className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent">
                    <option value="">Select a practice area</option>
                    <option value="corporate">Corporate Law</option>
                    <option value="criminal">Criminal Defense</option>
                    <option value="family">Family Law</option>
                    <option value="realestate">Real Estate</option>
                    <option value="personalinjury">Personal Injury</option>
                    <option value="employment">Employment Law</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    How Can We Help?
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="Briefly describe your legal matter..."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
