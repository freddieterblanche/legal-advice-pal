import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, ArrowLeft, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { LawyerFormModal, type LawyerRow } from "../../components/LawyerFormModal";
import { StatusCell } from "../../components/StatusCell";
import { SimpleSelect } from "../../components/SimpleSelect";

type AttorneyRow = LawyerRow & { created_at: string | null };


export const Route = createFileRoute("/_authenticated/admin/attorneys")({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    sort: s.sort === "experience" || s.sort === "listed" || s.sort === "firm" ? s.sort : "surname",
    dir: s.dir === "desc" ? "desc" : "asc",
  }),
  head: () => ({ meta: [{ title: "Admin · Attorneys — Lawexpert.co.za" }] }),
  component: AdminAttorneysPage,
});

function AdminAttorneysPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<AttorneyRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: firms } = useQuery({
    queryKey: ["firms-options"],
    queryFn: async () => (await supabase.from("firms").select("id, name, city, province").order("name")).data ?? [],
  });

  const { data: attorneys, isLoading } = useQuery({
    queryKey: ["admin-attorneys"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .or("provider_type.eq.attorney,and(provider_type.is.null,firm_id.not.is.null)")
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as AttorneyRow[];
    },
  });

  useEffect(() => {
    if (!search.edit || !attorneys) return;
    const found = attorneys.find((a) => a.id === search.edit);
    if (found && (!editing || editing.id !== found.id)) setEditing(found);
  }, [search.edit, attorneys, editing]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attorney deleted"); qc.invalidateQueries({ queryKey: ["admin-attorneys"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("service_providers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.status === "suspended" ? "Listing suspended" : "Listing activated"); qc.invalidateQueries({ queryKey: ["admin-attorneys"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-heading text-2xl text-ink">Not authorised</h1></div>;
  }

  const firmName = (id: string | null) => firms?.find((f) => f.id === id)?.name ?? "—";
  const filtered = (attorneys ?? []).filter((a) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return `${a.first_name} ${a.last_name}`.toLowerCase().includes(s)
      || firmName(a.firm_id).toLowerCase().includes(s)
      || (a.city ?? "").toLowerCase().includes(s);
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = search.dir === "desc" ? -1 : 1;
    const sort = search.sort;
    if (sort === "experience") {
      const currentYear = new Date().getFullYear();
      list.sort((a, b) => {
        const ya = a.year_of_admission ? currentYear - a.year_of_admission : 0;
        const yb = b.year_of_admission ? currentYear - b.year_of_admission : 0;
        return (ya - yb) * dir;
      });
    } else if (sort === "listed") {
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (da - db) * dir;
      });
    } else if (sort === "firm") {
      list.sort((a, b) => firmName(a.firm_id).localeCompare(firmName(b.firm_id)) * dir);
    } else {
      list.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`) * dir);
    }
    return list;
  }, [filtered, search.sort, search.dir, firms]);

  const setSort = (field: "surname" | "firm" | "experience" | "listed") => {
    if (search.sort === field) {
      navigate({ search: (prev: typeof search) => ({ ...prev, dir: search.dir === "asc" ? "desc" : "asc" }) });
    } else {
      navigate({ search: (prev: typeof search) => ({ ...prev, sort: field, dir: "asc" }) });
    }
  };

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"><ArrowLeft className="h-3 w-3" /> Admin hub</Link>
            <h1 className="font-heading text-2xl text-ink md:text-3xl">Attorneys</h1>
            <p className="text-sm text-muted-foreground">Add and manage attorneys across all firms.</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-ink/90">
            <Plus className="h-4 w-4" /> Add Attorney
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, firm or city…" className="w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort by</span>
            {(["surname", "firm", "experience", "listed"] as const).map((field) => {
              const active = search.sort === field;
              const asc = active && search.dir === "asc";
              const label = field === "surname" ? "Surname" : field === "firm" ? "Firm" : field === "experience" ? "Years Experience" : "Date Listed";
              return (
                <button
                  key={field}
                  onClick={() => setSort(field)}
                  className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition ${active ? "border-ink bg-ink text-cream" : "border-border bg-card text-ink hover:border-ink"}`}
                >
                  {label}
                  {active ? (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Attorney</th>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setEditing(a)} className="text-left font-medium text-ink hover:text-gold hover:underline">{a.first_name} {a.last_name}</button>
                    <p className="text-xs text-muted-foreground">{[a.city, a.province].filter(Boolean).join(", ") || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{firmName(a.firm_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusCell
                      table="service_providers"
                      id={a.id}
                      status={a.status ?? null}
                      isFeatured={a.is_featured}
                      featuredCategory={{ table: "service_providers", key: "attorney" }}
                      invalidateKeys={[["admin-attorneys"]]}
                    />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(a)} className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-gold"><Pencil className="h-3 w-3" /> Edit</button>
                    {a.status === "active" || a.status === "trial" ? (
                      <Link to="/lawyers/$slug" params={{ slug: a.slug }} target="_blank" className="mr-3 text-xs font-medium text-forest hover:text-gold">Open <ExternalLink className="inline h-3 w-3" /></Link>
                    ) : null}
                    <button onClick={() => { if (confirm(`Delete ${a.first_name} ${a.last_name}?`)) remove.mutate(a.id); }} className="text-xs text-destructive"><Trash2 className="inline h-3 w-3" /></button>
                  </td>

                </tr>
              ))}
              {!isLoading && sorted.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No attorneys yet. Click <strong>Add Attorney</strong> to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && editing.firm_id && (
        <LawyerFormModal
          firmId={editing.firm_id}
          lawyer={editing}
          onClose={() => { setEditing(null); if (search.edit) navigate({ search: { edit: undefined } }); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-attorneys"] });
            setEditing(null);
            if (search.edit) navigate({ search: { edit: undefined } });
          }}
        />
      )}
      {adding && <AddAttorneyFirmPicker firms={firms ?? []} onCancel={() => setAdding(false)} onPicked={(firmId) => { setAdding(false); setEditing({ id: "", firm_id: firmId } as unknown as AttorneyRow); }} />}
    </div>
  );
}

function AddAttorneyFirmPicker({ firms, onCancel, onPicked }: { firms: { id: string; name: string }[]; onCancel: () => void; onPicked: (firmId: string) => void }) {
  const [firmId, setFirmId] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-[90vw] max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-lg text-ink">Choose firm</h3>
          <button onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Which firm does this attorney belong to?</p>
        <SimpleSelect value={firmId} onChange={setFirmId} options={firms.map((f) => ({ value: f.id, label: f.name }))} placeholder="Select a firm…" className="mb-4 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-2 text-sm">Cancel</button>
          <button onClick={() => firmId && onPicked(firmId)} disabled={!firmId} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">Continue</button>
        </div>
      </div>
    </div>
  );
}


