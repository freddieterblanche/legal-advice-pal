import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

export type SortOption<K extends string> = {
  key: K;
  label: string;
};

type SortBarProps<K extends string> = {
  options: ReadonlyArray<SortOption<K>>;
  sort: K;
  dir: SortDir;
  onChange: (sort: K, dir: SortDir) => void;
};

export function SortBar<K extends string>({ options, sort, dir, onChange }: SortBarProps<K>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sort by
      </span>
      {options.map((opt) => {
        const active = sort === opt.key;
        const asc = active && dir === "asc";
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (active) {
                onChange(opt.key, asc ? "desc" : "asc");
              } else {
                onChange(opt.key, "asc");
              }
            }}
            className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border-ink bg-ink text-cream"
                : "border-border bg-card text-ink hover:border-ink"
            }`}
          >
            {opt.label}
            {active ? (
              asc ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </button>
        );
      })}
    </div>
  );
}
