import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

type Sample = {
  id: string;
  service_provider_id: string;
  project_name: string;
  synopsis: string | null;
  project_date: string | null;
};

type Props = { expertId: string };

export function ExpertWorkSamples({ expertId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Sample | "new" | null>(null);

  const { data: samples, isLoading } = useQuery({
    queryKey: ["expert-work-samples", expertId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("provider_work_samples")
        .select("id, expert_id, project_name, synopsis, project_date")
        .eq("service_provider_id", expertId)
        .order("project_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sample[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("provider_work_samples").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sample removed");
      qc.invalidateQueries({ queryKey: ["expert-work-samples", expertId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-ink">Samples of work</h4>
          <p className="text-xs text-muted-foreground">Project name + brief synopsis. Sorted newest first.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-cream hover:bg-ink/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add sample
        </button>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
      ) : !samples || samples.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No work samples yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {samples.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-ink">{s.project_name}</span>
                  {s.project_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.project_date).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                {s.synopsis && <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-line">{s.synopsis}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(s)} className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-ink" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm("Delete this sample?")) remove.mutate(s.id); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SampleModal
          expertId={expertId}
          sample={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["expert-work-samples", expertId] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SampleModal({
  expertId,
  sample,
  onClose,
  onSaved,
}: {
  expertId: string;
  sample: Sample | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!sample;
  const [form, setForm] = useState({
    project_name: sample?.project_name ?? "",
    synopsis: sample?.synopsis ?? "",
    project_date: sample?.project_date ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        project_name: form.project_name.trim().slice(0, 255),
        synopsis: form.synopsis.trim().slice(0, 2000) || null,
        project_date: form.project_date || null,
      };
      if (isEdit && sample) {
        const { error } = await (supabase as any).from("provider_work_samples").update(payload).eq("id", sample.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("provider_work_samples").insert({ ...payload, service_provider_id: expertId });
        if (error) throw error;
      }
      toast.success(isEdit ? "Sample updated" : "Sample added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg text-ink">{isEdit ? "Edit" : "Add"} work sample</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Project name *</span>
            <input
              required
              maxLength={255}
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Project date</span>
            <input
              type="date"
              value={form.project_date}
              onChange={(e) => setForm({ ...form, project_date: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Used to sort newest first.</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Brief synopsis</span>
            <textarea
              rows={4}
              maxLength={2000}
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save" : "Add sample"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
