import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, Wallet, FileText, Settings as SettingsIcon, Sparkles, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { PROVINCES, DESIGNATIONS, slugify } from "../../lib/constants";
import { importLawyerProfile } from "../../lib/profile-import.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Firm Dashboard — Lawexpert.co.za" }] }),
  component: Dashboard,
});

type Tab = "overview" | "lawyers" | "billing" | "settings";

function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*, firms(*)").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const firm = profile?.firms;

  if (!profile) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!firm) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">No firm linked to your account</h1>
        <p className="mt-2 text-muted-foreground">You haven't registered a firm yet.</p>
        <Link to="/register" className="mt-6 inline-block rounded bg-ink px-6 py-3 text-sm font-semibold text-cream">Register a Firm</Link>
      </div>
    );
  }

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl text-ink md:text-3xl">{firm.name}</h1>
              <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize">{firm.status}</span>
                {firm.status === "pending" && " — awaiting Lawexpert.co.za review"}
              </p>
            </div>
            {firm.status === "active" && (
              <Link to="/firms/$slug" params={{ slug: firm.slug }} className="text-sm font-medium text-forest hover:text-gold">View public profile →</Link>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
            {([
              { id: "overview", label: "Overview", icon: FileText },
              { id: "lawyers", label: "Lawyers", icon: Users },
              { id: "billing", label: "Billing", icon: Wallet },
              { id: "settings", label: "Settings", icon: SettingsIcon },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-gold text-ink" : "border-transparent text-muted-foreground hover:text-ink"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "overview" && <Overview firmId={firm.id} />}
        {tab === "lawyers" && <LawyersTab firmId={firm.id} />}
        {tab === "billing" && <BillingTab firmId={firm.id} />}
        {tab === "settings" && <SettingsTab firm={firm} />}
      </div>
    </div>
  );
}

function Overview({ firmId }: { firmId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["firm-stats", firmId],
    queryFn: async () => {
      const { data } = await supabase.from("lawyers").select("status, profile_views").eq("firm_id", firmId);
      const lawyers = data ?? [];
      return {
        total: lawyers.length,
        trial: lawyers.filter((l) => l.status === "trial").length,
        active: lawyers.filter((l) => l.status === "active").length,
        pending: lawyers.filter((l) => l.status === "pending_payment").length,
        views: lawyers.reduce((s, l) => s + (l.profile_views ?? 0), 0),
      };
    },
  });

  const cards = [
    { label: "Total Lawyers", value: stats?.total ?? 0 },
    { label: "In Free Trial", value: stats?.trial ?? 0 },
    { label: "Active (Billing)", value: stats?.active ?? 0 },
    { label: "Monthly Cost", value: `R${(stats?.active ?? 0) * 99}` },
    { label: "Profile Views", value: stats?.views ?? 0 },
    { label: "Pending Payment", value: stats?.pending ?? 0 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-heading text-3xl text-ink">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

const lawyerSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  designation: z.enum(DESIGNATIONS as unknown as [string, ...string[]]),
  city: z.string().trim().min(1).max(80),
  province: z.enum(PROVINCES as unknown as [string, ...string[]]),
  bio: z.string().max(2000).optional(),
});

function LawyersTab({ firmId }: { firmId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: lawyers } = useQuery({
    queryKey: ["firm-lawyers-list", firmId],
    queryFn: async () => (await supabase.from("lawyers").select("*").eq("firm_id", firmId).order("created_at", { ascending: false })).data ?? [],
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lawyers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lawyer removed"); qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "inactive" ? "trial" : "inactive";
      const { error } = await supabase.from("lawyers").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }),
  });

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="font-heading text-xl text-ink">Lawyers ({lawyers?.length ?? 0})</h2>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
          <Plus className="h-4 w-4" /> Add Lawyer
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial Ends</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lawyers?.map((l) => {
              const daysLeft = l.trial_end_date ? Math.max(0, Math.ceil((new Date(l.trial_end_date).getTime() - Date.now()) / 86400000)) : null;
              return (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium text-ink">{l.first_name ?? ""} {l.last_name ?? ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.designation}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{l.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.status === "trial" ? `${daysLeft} days left` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.profile_views}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle.mutate({ id: l.id, status: l.status ?? "trial" })} className="mr-2 text-xs text-forest hover:text-ink">
                      {l.status === "inactive" ? "Reactivate" : "Deactivate"}
                    </button>
                    <button onClick={() => { if (confirm("Delete this lawyer?")) remove.mutate(l.id); }} className="text-xs text-destructive">Delete</button>
                  </td>
                </tr>
              );
            })}
            {(!lawyers || lawyers.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No lawyers yet. Add your first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddLawyerModal firmId={firmId} onClose={() => setShowAdd(false)} onAdded={() => { qc.invalidateQueries({ queryKey: ["firm-lawyers-list", firmId] }); setShowAdd(false); }} />}
    </div>
  );
}

function AddLawyerModal({ firmId, onClose, onAdded }: { firmId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", designation: "Attorney", city: "", province: "Gauteng", bio: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = lawyerSchema.parse(form);
      const slug = `${slugify(`${parsed.first_name}-${parsed.last_name}`)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("lawyers").insert({ ...parsed, firm_id: firmId, slug, status: "trial" });
      if (error) throw error;
      toast.success("Lawyer added");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <h3 className="font-heading text-xl text-ink">Add Lawyer</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded border border-border bg-background px-3 py-2 text-sm">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea rows={4} maxLength={2000} placeholder="Short bio (optional)" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{saving ? "Saving…" : "Add Lawyer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillingTab({ firmId }: { firmId: string }) {
  const { data: lawyers } = useQuery({
    queryKey: ["billing-lawyers", firmId],
    queryFn: async () => (await supabase.from("lawyers").select("first_name, last_name, status, trial_end_date").eq("firm_id", firmId)).data ?? [],
  });

  const activeCount = lawyers?.filter((l) => l.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="font-heading text-xl text-ink">Monthly Total</h2>
        <p className="mt-2 font-heading text-4xl text-gold">R{activeCount * 99}</p>
        <p className="text-sm text-muted-foreground">{activeCount} active lawyer{activeCount === 1 ? "" : "s"} × R99/month</p>
        <button className="mt-4 rounded border border-gold bg-transparent px-4 py-2 text-sm font-medium text-gold hover:bg-gold hover:text-ink">
          Connect PayFast (coming soon)
        </button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink">Trial Expiry Schedule</h3>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {lawyers?.filter((l) => l.status === "trial").map((l, i) => (
              <tr key={i}>
                <td className="px-4 py-3">{l.first_name} {l.last_name}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  Trial ends {l.trial_end_date ? new Date(l.trial_end_date).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {lawyers?.filter((l) => l.status === "trial").length === 0 && (
              <tr><td className="px-4 py-6 text-center text-muted-foreground">No active trials</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Invoice history will appear here once PayFast is connected.
      </div>
    </div>
  );
}

function SettingsTab({ firm }: { firm: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: firm.name ?? "",
    description: firm.description ?? "",
    website: firm.website ?? "",
    phone: firm.phone ?? "",
    address: firm.address ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("firms").update(form).eq("id", firm.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="max-w-2xl space-y-3 rounded-md border border-border bg-card p-6">
      <h2 className="font-heading text-xl text-ink">Firm Settings</h2>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Firm name" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={4} maxLength={2000} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      <button type="submit" disabled={save.isPending} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50">
        {save.isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
