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
      className={`fixed inset-x-0 top-0 z-40 border-b border-rule bg-paper-white shadow-[0_8px_24px_-16px_rgb(11_33_56/0.25)] transition-transform duration-200 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              maxLength={240}
              className="w-full rounded border border-rule bg-paper-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          {filters ? (
            <>
              <div className="hidden flex-wrap items-center gap-2 lg:flex">{filters}</div>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded border border-rule bg-paper-white px-3 py-2 text-xs font-medium text-ink hover:border-brand-primary lg:hidden"
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
                Filters
              </button>
            </>
          ) : null}
          <button
            type="submit"
            className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Search
          </button>
        </form>
        {filters && filtersOpen ? (
          <div className="mt-2 grid gap-2 border-t border-rule pt-2 lg:hidden">
            {filters}
          </div>
        ) : null}
      </div>
    </div>
  );
}
