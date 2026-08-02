import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/practice-areas")({
  head: () => ({
    meta: [
      { title: "Practice Areas — Lawexpert.co.za" },
      { name: "description", content: "Browse South African attorneys and advocates by practice area, from Constitutional Law to Mining & Resources." },
    ],
  }),
  component: PracticeAreasPage,
});

function PracticeAreasPage() {
  const { data: areas } = useQuery({
    queryKey: ["practice-areas-page"],
    queryFn: async () => (await supabase.from("practice_areas").select("*").order("name")).data ?? [],
  });

  const { data: counts } = useQuery({
    queryKey: ["pa-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const c: Record<string, number> = {};
      const { data, error } = await supabase.from("practice_area_counts").select("*");
      if (!error && data) {
        data.forEach((r) => { if (r.practice_area_id) c[r.practice_area_id] = r.provider_count ?? 0; });
        return c;
      }
      const { data: rows } = await supabase.from("provider_practice_areas").select("practice_area_id");
      rows?.forEach((r) => { c[r.practice_area_id] = (c[r.practice_area_id] ?? 0) + 1; });
      return c;
    },
  });

  return (
    <div className="bg-paper-ivory">
      <div className="border-b border-border bg-card py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <span className="eyebrow text-ink-muted">[Browse]</span>
          <h1 className="mt-2 font-heading text-4xl text-ink md:text-5xl">Practice Areas</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Find attorneys and advocates across every major area of South African law.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded border border-rule bg-paper-white p-6 sm:p-8">
          <div className="columns-1 gap-x-12 sm:columns-2 lg:columns-3">
            {areas?.map((a) => {
              const n = counts?.[a.id] ?? 0;
              return (
                <Link
                  key={a.id}
                  to="/search"
                  search={{ area: a.slug } as never}
                  className="group flex items-baseline justify-between gap-3 break-inside-avoid border-b border-rule/70 py-2.5"
                >
                  <span className="text-[15px] text-ink transition-colors group-hover:text-brand-hover">{a.name}</span>
                  <span className="font-mono text-xs text-ink-muted">
                    {n > 0 ? `${n} lawyer${n === 1 ? "" : "s"}` : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
