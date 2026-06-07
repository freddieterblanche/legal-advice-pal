import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

type Role = "mediator" | "arbitrator";

type LawyerRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  city: string | null;
  province: string | null;
  lawyer_type: string | null;
  firm_id: string | null;
  status: string | null;
  is_mediator: boolean;
  is_arbitrator: boolean;
};

const ROLE_META: Record<Role, { title: string; column: "is_mediator" | "is_arbitrator"; blurb: string }> = {
  mediator: {
    title: "Mediators",
    column: "is_mediator",
    blurb: "Attorneys and advocates flagged as mediators.",
  },
  arbitrator: {
    title: "Arbitrators",
    column: "is_arbitrator",
    blurb: "Attorneys and advocates flagged as arbitrators.",
  },
};

export function AdminRoleListPage({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-role-list", role],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select("id, slug, first_name, last_name, city, province, lawyer_type, firm_id, status, is_mediator, is_arbitrator")
        .eq(meta.column, true)
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as LawyerRow[];
    },
  });

  const setFlag = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const payload = meta.column === "is_mediator" ? { is_mediator: value } : { is_arbitrator: value };
      const { error } = await supabase.from("lawyers").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-role-list", role] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const filtered = (rows ?? []).filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(s)
      || (r.city ?? "").toLowerCase().includes(s)
      || (r.province ?? "").toLowerCase().includes(s);
  });

  const editHref = (r: LawyerRow) => {
    if (r.lawyer_type === "advocate") return `/admin/advocates?edit=${r.id}`;
    if (r.firm_id) return `/dashboard`;
    return `/admin/advocates?edit=${r.id}`;
  };

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.blurb}</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add {role === "mediator" ? "Mediator" : "Arbitrator"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or location…"
          className="mb-4 w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-ink">{r.first_name} {r.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{r.lawyer_type ?? (r.firm_id ? "attorney" : "—")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[r.city, r.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{r.status ?? "—"}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Link to={editHref(r)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</Link>
                    <Link to="/lawyers/$slug" params={{ slug: r.slug }} target="_blank" className="mr-3 text-xs font-medium text-forest hover:text-gold">Open <ExternalLink className="inline h-3 w-3" /></Link>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${r.first_name} ${r.last_name} as ${role}?`)) {
                          setFlag.mutate({ id: r.id, value: false });
                        }
                      }}
                      className="text-xs text-destructive"
                      title={`Remove ${role} flag`}
                    >
                      <Trash2 className="inline h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No {meta.title.toLowerCase()} yet. Click <strong>Add {role === "mediator" ? "Mediator" : "Arbitrator"}</strong> to flag an existing lawyer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <AddRoleModal
          role={role}
          column={meta.column}
          onClose={() => setAdding(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-role-list", role] });
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function AddRoleModal({ role, column, onClose, onSaved }: {
  role: Role;
  column: "is_mediator" | "is_arbitrator";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const { data: candidates } = useQuery({
    queryKey: ["admin-role-candidates", column, q],
    queryFn: async () => {
      let query = supabase
        .from("lawyers")
        .select("id, first_name, last_name, lawyer_type, firm_id, city, province, is_mediator, is_arbitrator")
        .eq(column, false)
        .order("last_name")
        .limit(50);
      if (q.trim()) {
        const s = `%${q.trim()}%`;
        query = query.or(`first_name.ilike.${s},last_name.ilike.${s}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = async (id: string, name: string) => {
    setSaving(id);
    const payload = column === "is_mediator" ? { is_mediator: true } : { is_arbitrator: true };
    const { error } = await supabase.from("lawyers").update(payload).eq("id", id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} added as ${role}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg text-ink">Add {role === "mediator" ? "Mediator" : "Arbitrator"}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-border px-5">
          <div className="-mb-px flex gap-1">
            <button
              onClick={() => setTab("existing")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "existing" ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"}`}
            >
              Flag existing lawyer
            </button>
            <button
              onClick={() => setTab("new")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "new" ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"}`}
            >
              Create new {role}
            </button>
          </div>
        </div>
        <div className="p-5">
          {tab === "existing" ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Select an existing attorney or advocate to flag as a {role}.</p>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name…"
                autoFocus
                className="mb-4 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="max-h-[50vh] overflow-y-auto rounded border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {(candidates ?? []).map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{c.first_name} {c.last_name}</div>
                          <div className="text-xs capitalize text-muted-foreground">
                            {c.lawyer_type ?? (c.firm_id ? "attorney" : "—")}
                            {([c.city, c.province].filter(Boolean).join(", ") && ` · ${[c.city, c.province].filter(Boolean).join(", ")}`)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            disabled={saving === c.id}
                            onClick={() => add(c.id, `${c.first_name} ${c.last_name}`)}
                            className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream hover:bg-ink/90 disabled:opacity-60"
                          >
                            {saving === c.id ? "Adding…" : "Add"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(candidates ?? []).length === 0 && (
                      <tr><td className="px-3 py-8 text-center text-sm text-muted-foreground">No matching lawyers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <CreateNewPersonForm role={role} column={column} onSaved={onSaved} />
          )}
        </div>
      </div>
    </div>
  );
}

function CreateNewPersonForm({ role, column, onSaved }: {
  role: Role;
  column: "is_mediator" | "is_arbitrator";
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [background, setBackground] = useState<"retired_advocate" | "retired_attorney" | "other">("retired_advocate");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [saving, setSaving] = useState(false);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    const baseSlug = slugify(`${firstName} ${lastName}`);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
    const lawyer_type = background === "retired_attorney" ? "attorney" : background === "retired_advocate" ? "advocate" : null;
    const payload = {
      slug,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      lawyer_type,
      city: city.trim() || null,
      province: province.trim() || null,
      status: "active",
      is_mediator: column === "is_mediator",
      is_arbitrator: column === "is_arbitrator",
    };
    const { error } = await supabase.from("lawyers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${firstName} ${lastName} created as ${role}`);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create a new {role} who is not already on the platform — e.g. a retired advocate or attorney.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink">First name *</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink">Last name *</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink">Background</span>
        <select value={background} onChange={(e) => setBackground(e.target.value as typeof background)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
          <option value="retired_advocate">Retired advocate</option>
          <option value="retired_attorney">Retired attorney</option>
          <option value="other">Other</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink">Province</span>
          <input value={province} onChange={(e) => setProvince(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        You can fill in bio, qualifications, accolades and other details after creation by clicking <strong>Edit</strong>.
      </p>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90 disabled:opacity-60">
          {saving ? "Creating…" : `Create ${role}`}
        </button>
      </div>
    </form>
  );
}
