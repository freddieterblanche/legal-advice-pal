import { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string };

/**
 * Typeable combobox that picks from a list and (optionally) lets the user
 * create a new entry via a "+ Add ‘…’" affordance at the bottom of the list.
 * Use for reference data (Bars, Chambers) where duplicates must be prevented
 * but new genuine entries are sometimes needed.
 */
export function ComboboxCreatable({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  emptyLabel = "—",
  disabled = false,
  onCreate,
  createLabel = "Add",
}: {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** If provided, shows a "+ Add ‘<query>’" button when the typed query has no exact match. Must resolve to the new option's value (id). */
  onCreate?: (name: string) => Promise<string | null>;
  createLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = open ? query : selected?.label ?? "";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const exactMatch = q && options.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const showCreate = !!onCreate && !!q && !exactMatch && !creating;

  const doCreate = async () => {
    if (!onCreate || !q) return;
    setCreating(true);
    try {
      const newId = await onCreate(q);
      if (newId) {
        onChange(newId);
        setOpen(false);
        setQuery("");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={display}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={placeholder}
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${!value ? "bg-muted font-medium" : ""}`}
          >
            {emptyLabel}
          </button>
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${value === o.value ? "bg-muted font-medium" : ""}`}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
          )}
          {showCreate && (
            <button
              type="button"
              onClick={doCreate}
              disabled={creating}
              className="block w-full border-t border-border bg-gold/5 px-3 py-2 text-left text-sm font-medium text-forest hover:bg-gold/10"
            >
              + {createLabel} “{q}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
