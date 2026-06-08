import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

/**
 * Reusable "Import from website" bar. Pass any TanStack server-fn that takes
 * `{ url }` and returns a result object — the bar handles the URL field,
 * loading state, and toasts. Wire `onImported(result)` to merge the
 * extracted fields into your form state.
 */
export function ProfileImportBar<T>({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverFn,
  onImported,
  label = "Import from website (optional)",
  helpText = "Paste a link to the public profile page and AI will fill the form.",
  placeholder = "https://example.co.za/team/jane-doe",
}: {
  serverFn: (args: { data: { url: string } }) => Promise<T>;
  onImported: (data: T) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
}) {
  const fn = useServerFn(serverFn as never) as unknown as (args: { data: { url: string } }) => Promise<T>;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setDone(false);
    try {
      const res = await fn({ data: { url: url.trim() } });
      onImported(res);
      setDone(true);
      toast.success("Profile imported — please review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-gold/60 bg-gold/5 p-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
        <Sparkles className="h-3.5 w-3.5 text-gold" /> {label}
      </label>
      <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
      <div className="mt-2 flex gap-2">
        <input
          type="url"
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !url.trim()}
          className="rounded bg-gold px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
      {done && <p className="mt-2 text-xs text-forest">Imported — please review fields below before saving.</p>}
    </div>
  );
}
