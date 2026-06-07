import { useEffect, useRef, useState } from "react";
import { Upload, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** firm_id (folder root) — null/undefined for independent experts (platform admin only) */
  firmId?: string | null;
  expertId?: string;
};

export function ExpertPhotoField({ value, onChange, firmId, expertId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Auto-open the URL field when the existing value already looks like a
  // pasted external link (not one of our storage signed URLs), so admins can
  // immediately see and edit it on opening the form.
  const looksExternal = !!value && !value.includes("/storage/v1/object/");
  const [showUrlInput, setShowUrlInput] = useState(looksExternal);
  const [urlDraft, setUrlDraft] = useState(value ?? "");

  // Keep the local draft in sync with the parent value (e.g. after hydration
  // from an async fetch).
  useEffect(() => {
    setUrlDraft(value ?? "");
  }, [value]);


  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }

    setUploading(true);
    try {
      // Storage policy requires the first folder segment to match firm_id
      // (or platform_admin bypass). Independent experts → "independent".
      const root = firmId ?? "independent";
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${root}/experts/${expertId ?? "new"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lawyer-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("lawyer-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
      onChange(signed.signedUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt="Expert photo" className="h-20 w-20 rounded-md border border-border object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
          </button>
          <button
            type="button"
            onClick={() => { setUrlDraft(value ?? ""); setShowUrlInput((v) => !v); }}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted"
          >
            <LinkIcon className="h-3.5 w-3.5" /> Use a link instead
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-destructive hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { onChange(urlDraft.trim()); setShowUrlInput(false); }}
            className="rounded bg-ink px-3 py-2 text-xs font-semibold text-cream hover:bg-ink/90"
          >
            Use link
          </button>
        </div>
      )}
    </div>
  );
}
