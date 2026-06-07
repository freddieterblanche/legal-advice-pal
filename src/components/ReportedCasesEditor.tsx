import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

type ReportedCase = {
  id: string;
  case_name: string;
  citation: string | null;
  court: string | null;
  year: number | null;
  url: string | null;
  sort_order: number;
};

export function ReportedCasesEditor({ lawyerId }: { lawyerId: string }) {
  const qc = useQueryClient();
  const { data: cases } = useQuery({
    queryKey: ["lawyer-reported-cases", lawyerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lawyer_reported_cases")
        .select("*")
        .eq("lawyer_id", lawyerId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as ReportedCase[];
    },
  });

  const [draft, setDraft] = useState({ case_name: "", citation: "", court: "", year: "", url: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ case_name: "", citation: "", court: "", year: "", url: "" });
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lawyer-reported-cases", lawyerId] });

  const validateCase = (v: { case_name: string; url: string; year: string }) => {
    if (!v.case_name.trim()) { toast.error("Case name is required"); return false; }
    if (v.url && !/^https?:\/\//i.test(v.url.trim())) { toast.error("URL must start with http:// or https://"); return false; }
    const y = v.year ? Number(v.year) : null;
    if (y !== null && (Number.isNaN(y) || y < 1900 || y > 2100)) { toast.error("Enter a valid year"); return false; }
    return true;
  };

  const add = async () => {
    if (!validateCase(draft)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("lawyer_reported_cases").insert({
        lawyer_id: lawyerId,
        case_name: draft.case_name.trim().slice(0, 300),
        citation: draft.citation.trim().slice(0, 200) || null,
        court: draft.court.trim().slice(0, 200) || null,
        year: draft.year ? Number(draft.year) : null,
        url: draft.url.trim().slice(0, 500) || null,
        sort_order: cases?.length ?? 0,
      });
      if (error) throw error;
      setDraft({ case_name: "", citation: "", court: "", year: "", url: "" });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  const update = async (id: string) => {
    if (!validateCase(editForm)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("lawyer_reported_cases").update({
        case_name: editForm.case_name.trim().slice(0, 300),
        citation: editForm.citation.trim().slice(0, 200) || null,
        court: editForm.court.trim().slice(0, 200) || null,
        year: editForm.year ? Number(editForm.year) : null,
        url: editForm.url.trim().slice(0, 500) || null,
      }).eq("id", id);
      if (error) throw error;
      setEditingId(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this case?")) return;
    const { error } = await supabase.from("lawyer_reported_cases").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const inputCls = "rounded border border-border bg-background px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      {(cases ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded border border-border">
          {(cases ?? []).map((c) => (
            <li key={c.id} className="p-3">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input className={`w-full ${inputCls}`} placeholder="Case name *" value={editForm.case_name} onChange={(e) => setEditForm({ ...editForm, case_name: e.target.value })} maxLength={300} />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className={inputCls} placeholder="Citation" value={editForm.citation} onChange={(e) => setEditForm({ ...editForm, citation: e.target.value })} maxLength={200} />
                    <input className={inputCls} placeholder="Court" value={editForm.court} onChange={(e) => setEditForm({ ...editForm, court: e.target.value })} maxLength={200} />
                    <input className={inputCls} type="number" min={1900} max={2100} placeholder="Year" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
                  </div>
                  <input className={`w-full ${inputCls}`} type="url" placeholder="Link to judgment (optional)" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} maxLength={500} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs"><X className="h-3 w-3" /> Cancel</button>
                    <button type="button" disabled={saving} onClick={() => update(c.id)} className="inline-flex items-center gap-1 rounded bg-ink px-2 py-1 text-xs text-cream disabled:opacity-50"><Check className="h-3 w-3" /> Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{c.case_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.citation, c.court, c.year].filter(Boolean).join(" · ")}
                    </p>
                    {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:text-gold hover:underline break-all">{c.url}</a>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => { setEditingId(c.id); setEditForm({ case_name: c.case_name, citation: c.citation ?? "", court: c.court ?? "", year: c.year?.toString() ?? "", url: c.url ?? "" }); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-ink"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => remove(c.id)} className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded border border-dashed border-border bg-cream/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add reported case</p>
        <input className={`w-full ${inputCls}`} placeholder="Case name *" value={draft.case_name} onChange={(e) => setDraft({ ...draft, case_name: e.target.value })} maxLength={300} />
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="Citation (e.g. 2024 (1) SA 1)" value={draft.citation} onChange={(e) => setDraft({ ...draft, citation: e.target.value })} maxLength={200} />
          <input className={inputCls} placeholder="Court (e.g. SCA)" value={draft.court} onChange={(e) => setDraft({ ...draft, court: e.target.value })} maxLength={200} />
          <input className={inputCls} type="number" min={1900} max={2100} placeholder="Year" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} />
        </div>
        <input className={`w-full ${inputCls}`} type="url" placeholder="Link to judgment (optional)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} maxLength={500} />
        <div className="flex justify-end">
          <button type="button" disabled={saving} onClick={add} className="inline-flex items-center gap-1 rounded bg-gold px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-3 w-3" /> Add case</button>
        </div>
      </div>
    </div>
  );
}
