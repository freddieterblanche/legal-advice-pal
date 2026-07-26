export type ViewMode = "cards" | "list";

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded border border-rule bg-paper-white p-1">
      {([
        { key: "cards" as const, label: "Cards" },
        { key: "list" as const, label: "List" },
      ]).map((v) => {
        const active = value === v.key;
        return (
          <button
            key={v.key}
            onClick={() => onChange(v.key)}
            className={`rounded-[3px] px-3 py-1 text-xs font-medium transition-colors ${
              active ? "bg-brand-primary text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
