import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

/**
 * Tag input: type a value and press Enter (or comma) to add it as a pill.
 * Backspace on an empty input removes the last tag. Click × on a pill to remove it.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter to add…",
  maxLength = 60,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (value.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      remove(value.length - 1);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-gold ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-ink"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${tag}`}
              className="rounded-full p-0.5 text-ink/60 hover:bg-ink/10 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length ? "" : placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="flex-1 min-w-[140px] bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
