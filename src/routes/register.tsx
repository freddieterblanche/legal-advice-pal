import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { PROVINCES, slugify } from "../lib/constants";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Your Firm — LexSA" },
      { name: "description", content: "List your South African law firm on LexSA. R99/lawyer/month. First 3 months free." },
    ],
  }),
  component: RegisterPage,
});

const firmSchema = z.object({
  name: z.string().trim().min(2).max(120),
  registration_number: z.string().trim().max(60).optional(),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]),
  city: z.string().trim().min(1).max(80),
  website: z.string().trim().url().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

const adminSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firm, setFirm] = useState({ name: "", registration_number: "", province: "", city: "", website: "", phone: "", address: "" });
  const [admin, setAdmin] = useState({ first_name: "", last_name: "", email: "", password: "" });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const firmParsed = firmSchema.parse(firm);
      const adminParsed = adminSchema.parse(admin);

      // 1. Sign up admin
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: adminParsed.email,
        password: adminParsed.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: adminParsed.first_name, last_name: adminParsed.last_name },
        },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Sign in to get auth context
      await supabase.auth.signInWithPassword({ email: adminParsed.email, password: adminParsed.password });

      // 3. Create firm
      const slug = `${slugify(firmParsed.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: firmRow, error: firmErr } = await supabase
        .from("firms")
        .insert({ ...firmParsed, slug, status: "pending" })
        .select()
        .single();
      if (firmErr) throw firmErr;

      // 4. Update admin profile
      await supabase.from("profiles").update({
        firm_id: firmRow.id,
        role: "firm_admin",
        first_name: adminParsed.first_name,
        last_name: adminParsed.last_name,
      }).eq("id", authData.user.id);

      toast.success("Firm registered. Welcome to LexSA.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="font-heading text-3xl text-ink md:text-4xl">Register Your Firm</h1>
        <p className="mt-2 text-muted-foreground">3 quick steps · no card required to start</p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step >= s ? "bg-gold text-ink" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 flex-1 ${step > s ? "bg-gold" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl text-ink">Firm Details</h2>
              <Input placeholder="Firm name" value={firm.name} onChange={(v) => setFirm({ ...firm, name: v })} required />
              <Input placeholder="Registration number (optional)" value={firm.registration_number} onChange={(v) => setFirm({ ...firm, registration_number: v })} />
              <select value={firm.province} onChange={(e) => setFirm({ ...firm, province: e.target.value })} required className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Select province</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input placeholder="City" value={firm.city} onChange={(v) => setFirm({ ...firm, city: v })} required />
              <Input placeholder="Address (optional)" value={firm.address} onChange={(v) => setFirm({ ...firm, address: v })} />
              <Input placeholder="Website (https://…)" value={firm.website} onChange={(v) => setFirm({ ...firm, website: v })} />
              <Input placeholder="Phone (optional)" value={firm.phone} onChange={(v) => setFirm({ ...firm, phone: v })} />
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)} disabled={!firm.name || !firm.province || !firm.city} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl text-ink">Admin Contact</h2>
              <p className="text-sm text-muted-foreground">This person manages the firm account.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="First name" value={admin.first_name} onChange={(v) => setAdmin({ ...admin, first_name: v })} required />
                <Input placeholder="Last name" value={admin.last_name} onChange={(v) => setAdmin({ ...admin, last_name: v })} required />
              </div>
              <Input type="email" placeholder="Email" value={admin.email} onChange={(v) => setAdmin({ ...admin, email: v })} required />
              <Input type="password" placeholder="Password (min 8 chars)" value={admin.password} onChange={(v) => setAdmin({ ...admin, password: v })} required />
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-ink">← Back</button>
                <button onClick={() => setStep(3)} disabled={!admin.email || admin.password.length < 8 || !admin.first_name || !admin.last_name} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-ink">Subscription</h2>
              <div className="space-y-2 rounded bg-cream p-5 text-sm">
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> <span><strong>R99 per lawyer per month</strong></span></p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> <span><strong>First 3 months free</strong> per lawyer — no card required to start</span></p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Billing begins after trial via PayFast</p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Add unlimited lawyers — only active listings are billed</p>
              </div>
              <p className="text-xs text-muted-foreground">By registering, your firm enters review. Once approved by LexSA, your profile and lawyers go live.</p>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-ink">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="rounded bg-gold px-5 py-2 text-sm font-semibold text-ink hover:bg-gold/90 disabled:opacity-50">
                  {loading ? "Registering…" : "Complete Registration"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, required }: { value: string; onChange: (v: string) => void; type?: string; placeholder: string; required?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      maxLength={255}
      className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
    />
  );
}
