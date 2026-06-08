export type ViewMode = "cards" | "list";

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-background p-1">
      {([
        { key: "cards" as const, label: "Cards" },
        { key: "list" as const, label: "List" },
      ]).map((v) => {
        const active = value === v.key;
        return (
          <button
            key={v.key}
            onClick={() => onChange(v.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
