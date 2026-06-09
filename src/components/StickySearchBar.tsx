import { useState, type FormEvent, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

type Props = {
  visible: boolean;
  q: string;
  setQ: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder?: string;
  filters?: ReactNode;
};

export function StickySearchBar({
  visible,
  q,
  setQ,
  onSubmit,
  placeholder = "Search…",
  filters,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 border-b border-ink/20 bg-ink text-cream shadow-lg transition-transform duration-200 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              maxLength={240}
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          {filters ? (
            <>
              <div className="hidden flex-wrap items-center gap-2 lg:flex">{filters}</div>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cream/30 bg-ink/40 px-3 py-2 text-xs font-semibold text-cream hover:bg-ink/60 lg:hidden"
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
                Filters
              </button>
            </>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90"
          >
            Search
          </button>
        </form>
        {filters && filtersOpen ? (
          <div className="mt-2 grid gap-2 border-t border-cream/15 pt-2 lg:hidden">
            {filters}
          </div>
        ) : null}
      </div>
    </div>
  );
}
