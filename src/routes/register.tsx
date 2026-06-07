import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Scale, Handshake, Gavel, Microscope, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  registerFirmForCurrentUser,
  registerLawyerForCurrentUser,
  registerExpertForCurrentUser,
} from "../lib/registration.functions";
import { ProvinceCityFields } from "../components/ProvinceCityFields";
import { RichTextEditor } from "../components/RichTextEditor";
import { sanitizeBioHtml } from "../lib/sanitize";
import { TypePill } from "../components/TypePill";
import {
  MEDIATION_ACCREDITATIONS,
  MEDIATION_SECTORS,
  MEDIATION_STYLES,
  ARBITRATION_ACCREDITATIONS,
  ARBITRATION_TYPES,
} from "../lib/expert-constants";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register on Lawexpert.co.za — Firms, Advocates, Mediators, Arbitrators & Experts" },
      { name: "description", content: "List your law firm, advocate, mediator, arbitrator or expert-witness profile on Lawexpert.co.za. Free 3-month trial — no card required." },
      { property: "og:title", content: "Register on Lawexpert.co.za" },
      { property: "og:description", content: "List your law firm, advocate, mediator, arbitrator or expert-witness profile on Lawexpert.co.za." },
    ],
  }),
  component: RegisterPage,
});

type Kind = "firm" | "advocate" | "mediator" | "arbitrator" | "expert";

const TYPES: { kind: Kind; label: string; icon: typeof Building2; pill: "firm" | "advocate" | "mediator" | "arbitrator" | "expert"; blurb: string }[] = [
  { kind: "firm", label: "Law Firm", icon: Building2, pill: "firm", blurb: "Register your firm and add your attorneys." },
  { kind: "advocate", label: "Advocate", icon: Scale, pill: "advocate", blurb: "Individual advocate at the Bar, with chambers." },
  { kind: "mediator", label: "Mediator", icon: Handshake, pill: "mediator", blurb: "Accredited mediator — lawyer or non-lawyer." },
  { kind: "arbitrator", label: "Arbitrator", icon: Gavel, pill: "arbitrator", blurb: "Arbitrator — lawyer or non-lawyer." },
  { kind: "expert", label: "Expert Witness", icon: Microscope, pill: "expert", blurb: "Specialist expert across any discipline." },
];

function RegisterPage() {
  const [kind, setKind] = useState<Kind | null>(null);

  return (
    <div className="bg-cream py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="font-heading text-3xl text-ink md:text-4xl">Register your listing</h1>
        <p className="mt-2 text-muted-foreground">Choose what you'd like to list on Lawexpert.co.za.</p>

        {!kind && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.kind}
                  onClick={() => setKind(t.kind)}
                  className="group flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 text-left transition-all hover:border-gold hover:shadow-md"
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className="h-6 w-6 text-ink" />
                    <TypePill variant={t.pill}>{t.label}</TypePill>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.blurb}</p>
                </button>
              );
            })}
          </div>
        )}

        {kind && (
          <div className="mt-6">
            <button onClick={() => setKind(null)} className="mb-4 text-sm text-muted-foreground hover:text-ink">
              ← Choose a different listing type
            </button>
            {kind === "firm" && <FirmWizard />}
            {kind !== "firm" && kind !== "expert" && <LawyerWizard kind={kind as "advocate" | "mediator" | "arbitrator"} />}
            {kind === "expert" && <ExpertWizard />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const s = i + 1;
        return (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step >= s ? "bg-gold text-white" : "bg-muted text-muted-foreground"}`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < total && <div className={`h-0.5 flex-1 ${step > s ? "bg-gold" : "bg-muted"}`} />}
          </div>
        );
      })}
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

function ProvinceCitySelect({
  province, city, onProvince, onCity,
}: { province: string; city: string; onProvince: (v: string) => void; onCity: (v: string) => void }) {
  return (
    <ProvinceCityFields
      province={province}
      city={city}
      onProvince={onProvince}
      onCity={onCity}
      selectClassName="w-full rounded border border-border bg-background px-3 py-2.5 text-sm"
    />
  );
}

function useExistingUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email ?? "");
      }
    });
  }, []);
  return { existingUserId: userId, existingEmail: email };
}

const adminSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

function AccountStep({
  existingUserId, existingEmail, admin, setAdmin, onBack, onNext,
}: {
  existingUserId: string | null;
  existingEmail: string;
  admin: { first_name: string; last_name: string; email: string; password: string };
  setAdmin: (next: typeof admin) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-xl text-ink">Your Account</h2>
      {existingUserId ? (
        <div className="rounded border border-forest/30 bg-forest/5 p-4 text-sm text-ink">
          You're signed in as <strong>{existingEmail}</strong>. This account will own the listing.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Create an account to manage your listing.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="First name" value={admin.first_name} onChange={(v) => setAdmin({ ...admin, first_name: v })} required />
            <Input placeholder="Last name" value={admin.last_name} onChange={(v) => setAdmin({ ...admin, last_name: v })} required />
          </div>
          <Input type="email" placeholder="Email" value={admin.email} onChange={(v) => setAdmin({ ...admin, email: v })} required />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={admin.password}
              onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
              placeholder="Password (min 8 chars)"
              required
              minLength={8}
              maxLength={72}
              className="w-full rounded border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-ink">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-ink">← Back</button>
        <button
          onClick={onNext}
          disabled={!existingUserId && (!admin.email || admin.password.length < 8 || !admin.first_name || !admin.last_name)}
          className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

async function ensureSignedIn(
  existingUserId: string | null,
  admin: { first_name: string; last_name: string; email: string; password: string },
  navigate: ReturnType<typeof useNavigate>,
): Promise<string | null> {
  if (existingUserId) return existingUserId;
  const parsed = adminSchema.parse(admin);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: { emailRedirectTo: window.location.origin, data: { first_name: parsed.first_name, last_name: parsed.last_name } },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      toast.error("That email is already registered. Please sign in first, then register your listing.");
      navigate({ to: "/auth", search: { redirect: "/register" } as never });
      return null;
    }
    throw error;
  }
  if (!data.user) throw new Error("Failed to create user");
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: parsed.email, password: parsed.password });
  if (signInErr) throw signInErr;
  return data.user.id;
}

function ConfirmStep({ loading, onBack, onSubmit }: { loading: boolean; onBack: () => void; onSubmit: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl text-ink">Confirm</h2>
      <div className="space-y-2 rounded bg-cream p-5 text-sm">
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> <strong>Free for the first 3 months</strong> — no card required to start.</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Subscription details will be confirmed per listing type before billing begins.</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> You can edit your listing any time from your profile page or dashboard.</p>
      </div>
      <p className="text-xs text-muted-foreground">By registering, your listing enters review. Once approved, your profile goes live.</p>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-ink">← Back</button>
        <button onClick={onSubmit} disabled={loading} className="rounded bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50">
          {loading ? "Registering…" : "Complete Registration"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- FIRM WIZARD ---------------- */

function FirmWizard() {
  const navigate = useNavigate();
  const registerFirm = useServerFn(registerFirmForCurrentUser);
  const { existingUserId, existingEmail } = useExistingUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firm, setFirm] = useState({ name: "", registration_number: "", province: "", city: "", website: "", phone: "", address: "" });
  const [admin, setAdmin] = useState({ first_name: "", last_name: "", email: "", password: "" });

  const submit = async () => {
    setLoading(true);
    try {
      const userId = await ensureSignedIn(existingUserId, admin, navigate);
      if (!userId) return;
      await registerFirm({ data: { firm: { ...firm, province: firm.province as never }, admin: existingUserId ? undefined : { first_name: admin.first_name, last_name: admin.last_name } } });
      toast.success("Firm registered. Welcome to Lawexpert.co.za.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <StepDots step={step} total={3} />
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl text-ink">Firm Details</h2>
          <Input placeholder="Firm name" value={firm.name} onChange={(v) => setFirm({ ...firm, name: v })} required />
          <Input placeholder="Registration number (optional)" value={firm.registration_number} onChange={(v) => setFirm({ ...firm, registration_number: v })} />
          <ProvinceCitySelect province={firm.province} city={firm.city} onProvince={(v) => setFirm({ ...firm, province: v })} onCity={(v) => setFirm({ ...firm, city: v })} />
          <Input placeholder="Address (optional)" value={firm.address} onChange={(v) => setFirm({ ...firm, address: v })} />
          <Input placeholder="Website (https://…)" value={firm.website} onChange={(v) => setFirm({ ...firm, website: v })} />
          <Input placeholder="Phone (optional)" value={firm.phone} onChange={(v) => setFirm({ ...firm, phone: v })} />
          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} disabled={!firm.name || !firm.province || !firm.city} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue →</button>
          </div>
        </div>
      )}
      {step === 2 && <AccountStep existingUserId={existingUserId} existingEmail={existingEmail} admin={admin} setAdmin={setAdmin} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ConfirmStep loading={loading} onBack={() => setStep(2)} onSubmit={submit} />}
    </div>
  );
}

/* ---------------- LAWYER WIZARD (advocate / mediator / arbitrator) ---------------- */

type LawyerKind = "advocate" | "mediator" | "arbitrator";

function LawyerWizard({ kind }: { kind: LawyerKind }) {
  const navigate = useNavigate();
  const registerLawyer = useServerFn(registerLawyerForCurrentUser);
  const { existingUserId, existingEmail } = useExistingUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { data: bars } = useQuery({
    queryKey: ["bars"],
    queryFn: async () => (await supabase.from("bars").select("id, name").order("name")).data ?? [],
  });
  const { data: chambers } = useQuery({
    queryKey: ["chambers-all"],
    queryFn: async () => (await supabase.from("chambers").select("id, name").order("name")).data ?? [],
  });

  const [form, setForm] = useState({
    first_name: "", last_name: "", title: "", email: "", phone: "",
    province: "", city: "",
    is_lawyer: true,
    year_of_admission: "",
    is_senior_counsel: false,
    bar_id: "",
    chambers_mode: "existing" as "existing" | "new",
    chambers_id: "",
    new_chambers_name: "",
    mediator_accreditation: "",
    mediator_style: "",
    mediator_sectors: [] as string[],
    arbitrator_accreditation: "",
    arbitrator_types: [] as string[],
    arbitrator_experience_years: "",
    background: "",
  });
  const [admin, setAdmin] = useState({ first_name: "", last_name: "", email: "", password: "" });

  const canSubmitStep1 = !!form.first_name && !!form.last_name && (kind !== "advocate" || (!!form.bar_id && (form.chambers_mode === "existing" ? !!form.chambers_id : !!form.new_chambers_name)));

  const toggleArr = (key: "mediator_sectors" | "arbitrator_types", v: string) =>
    setForm({ ...form, [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v] });

  const submit = async () => {
    setLoading(true);
    try {
      const userId = await ensureSignedIn(existingUserId, admin, navigate);
      if (!userId) return;
      await registerLawyer({
        data: {
          kind,
          is_lawyer: kind === "advocate" ? true : form.is_lawyer,
          first_name: form.first_name,
          last_name: form.last_name,
          title: form.title || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          province: (form.province || undefined) as never,
          city: form.city || undefined,
          year_of_admission: form.year_of_admission ? Number(form.year_of_admission) : undefined,
          is_senior_counsel: kind === "advocate" ? form.is_senior_counsel : undefined,
          bar_id: kind === "advocate" ? form.bar_id || undefined : undefined,
          chambers_id: kind === "advocate" && form.chambers_mode === "existing" ? form.chambers_id || undefined : undefined,
          new_chambers: kind === "advocate" && form.chambers_mode === "new" && form.new_chambers_name
            ? { name: form.new_chambers_name, bar_id: form.bar_id || undefined, province: (form.province || undefined) as never, city: form.city || undefined }
            : undefined,
          mediator_accreditation: kind === "mediator" ? form.mediator_accreditation || undefined : undefined,
          mediator_style: kind === "mediator" ? form.mediator_style || undefined : undefined,
          mediator_sectors: kind === "mediator" && form.mediator_sectors.length ? form.mediator_sectors : undefined,
          arbitrator_accreditation: kind === "arbitrator" ? form.arbitrator_accreditation || undefined : undefined,
          arbitrator_types: kind === "arbitrator" && form.arbitrator_types.length ? form.arbitrator_types : undefined,
          arbitrator_experience_years: kind === "arbitrator" && form.arbitrator_experience_years ? Number(form.arbitrator_experience_years) : undefined,
          background: !form.is_lawyer && kind !== "advocate" ? form.background || undefined : undefined,
        },
      });
      toast.success("Listing registered. Welcome to Lawexpert.co.za.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  const kindLabel = kind === "advocate" ? "Advocate" : kind === "mediator" ? "Mediator" : "Arbitrator";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <StepDots step={step} total={3} />
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl text-ink">{kindLabel} Details</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
            <Input placeholder="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
          </div>
          <Input placeholder="Title (e.g. Adv., Dr., Mr.)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />

          {kind !== "advocate" && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.is_lawyer} onChange={(e) => setForm({ ...form, is_lawyer: e.target.checked })} />
              I am a qualified lawyer / advocate
            </label>
          )}

          {(kind === "advocate" || form.is_lawyer) && (
            <Input
              type="number"
              placeholder="Year of admission (e.g. 2010)"
              value={form.year_of_admission}
              onChange={(v) => setForm({ ...form, year_of_admission: v })}
            />
          )}

          {kind === "advocate" && (
            <>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={form.is_senior_counsel} onChange={(e) => setForm({ ...form, is_senior_counsel: e.target.checked })} />
                Senior Counsel (SC)
              </label>
              <select value={form.bar_id} onChange={(e) => setForm({ ...form, bar_id: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Select your Bar…</option>
                {bars?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <div className="rounded border border-border p-3">
                <div className="mb-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={form.chambers_mode === "existing"} onChange={() => setForm({ ...form, chambers_mode: "existing" })} />
                    Pick existing chambers
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={form.chambers_mode === "new"} onChange={() => setForm({ ...form, chambers_mode: "new" })} />
                    Create new chambers
                  </label>
                </div>
                {form.chambers_mode === "existing" ? (
                  <select value={form.chambers_id} onChange={(e) => setForm({ ...form, chambers_id: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                    <option value="">Select chambers…</option>
                    {chambers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <Input placeholder="New chambers name" value={form.new_chambers_name} onChange={(v) => setForm({ ...form, new_chambers_name: v })} />
                )}
              </div>
            </>
          )}

          {kind === "mediator" && (
            <>
              <select value={form.mediator_accreditation} onChange={(e) => setForm({ ...form, mediator_accreditation: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Accreditation (optional)</option>
                {MEDIATION_ACCREDITATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={form.mediator_style} onChange={(e) => setForm({ ...form, mediator_style: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Style (optional)</option>
                {MEDIATION_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sectors</p>
                <div className="flex flex-wrap gap-1.5">
                  {MEDIATION_SECTORS.map((s) => (
                    <button type="button" key={s} onClick={() => toggleArr("mediator_sectors", s)} className={`rounded-full border px-2.5 py-1 text-xs ${form.mediator_sectors.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {kind === "arbitrator" && (
            <>
              <select value={form.arbitrator_accreditation} onChange={(e) => setForm({ ...form, arbitrator_accreditation: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Accreditation (optional)</option>
                {ARBITRATION_ACCREDITATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Input type="number" placeholder="Years of arbitration experience" value={form.arbitrator_experience_years} onChange={(v) => setForm({ ...form, arbitrator_experience_years: v })} />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Arbitration types</p>
                <div className="flex flex-wrap gap-1.5">
                  {ARBITRATION_TYPES.map((s) => (
                    <button type="button" key={s} onClick={() => toggleArr("arbitrator_types", s)} className={`rounded-full border px-2.5 py-1 text-xs ${form.arbitrator_types.includes(s) ? "border-gold bg-gold/15 text-ink" : "border-border bg-background text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {kind !== "advocate" && !form.is_lawyer && (
            <textarea
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              placeholder="Briefly describe your professional background (e.g. Chartered Accountant, Engineer, Psychologist)…"
              maxLength={500}
              rows={3}
              className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          )}

          <ProvinceCitySelect province={form.province} city={form.city} onProvince={(v) => setForm({ ...form, province: v })} onCity={(v) => setForm({ ...form, city: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="email" placeholder="Contact email (optional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input placeholder="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} disabled={!canSubmitStep1} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue →</button>
          </div>
        </div>
      )}
      {step === 2 && <AccountStep existingUserId={existingUserId} existingEmail={existingEmail} admin={admin} setAdmin={setAdmin} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ConfirmStep loading={loading} onBack={() => setStep(2)} onSubmit={submit} />}
    </div>
  );
}

/* ---------------- EXPERT WIZARD ---------------- */

function ExpertWizard() {
  const navigate = useNavigate();
  const registerExpert = useServerFn(registerExpertForCurrentUser);
  const { existingUserId, existingEmail } = useExistingUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    first_name: "", last_name: "", title: "",
    qualifications: "", registration_body: "",
    company_name: "", employer: "",
    is_independent: true,
    province: "", city: "",
    contact_email: "", office_phone: "", mobile_phone: "",
  });
  const [admin, setAdmin] = useState({ first_name: "", last_name: "", email: "", password: "" });

  const submit = async () => {
    setLoading(true);
    try {
      const userId = await ensureSignedIn(existingUserId, admin, navigate);
      if (!userId) return;
      await registerExpert({
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          title: form.title || undefined,
          qualifications: form.qualifications || undefined,
          registration_body: form.registration_body || undefined,
          company_name: form.company_name || undefined,
          employer: form.employer || undefined,
          is_independent: form.is_independent,
          province: (form.province || undefined) as never,
          city: form.city || undefined,
          contact_email: form.contact_email || undefined,
          office_phone: form.office_phone || undefined,
          mobile_phone: form.mobile_phone || undefined,
        },
      });
      toast.success("Expert listing registered. Welcome to Lawexpert.co.za.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <StepDots step={step} total={3} />
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl text-ink">Expert Witness Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
            <Input placeholder="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
          </div>
          <Input placeholder="Title (e.g. Dr., Prof., CA(SA))" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Input placeholder="Qualifications (free text)" value={form.qualifications} onChange={(v) => setForm({ ...form, qualifications: v })} />
          <Input placeholder="Registration body (e.g. HPCSA, SAICA)" value={form.registration_body} onChange={(v) => setForm({ ...form, registration_body: v })} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_independent} onChange={(e) => setForm({ ...form, is_independent: e.target.checked })} />
            I practise independently
          </label>
          {form.is_independent ? (
            <Input placeholder="Company / practice name (optional)" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
          ) : (
            <Input placeholder="Employer" value={form.employer} onChange={(v) => setForm({ ...form, employer: v })} />
          )}
          <ProvinceCitySelect province={form.province} city={form.city} onProvince={(v) => setForm({ ...form, province: v })} onCity={(v) => setForm({ ...form, city: v })} />
          <Input type="email" placeholder="Contact email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Office phone (optional)" value={form.office_phone} onChange={(v) => setForm({ ...form, office_phone: v })} />
            <Input placeholder="Mobile phone (optional)" value={form.mobile_phone} onChange={(v) => setForm({ ...form, mobile_phone: v })} />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} disabled={!form.first_name || !form.last_name} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue →</button>
          </div>
        </div>
      )}
      {step === 2 && <AccountStep existingUserId={existingUserId} existingEmail={existingEmail} admin={admin} setAdmin={setAdmin} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ConfirmStep loading={loading} onBack={() => setStep(2)} onSubmit={submit} />}
    </div>
  );
}
