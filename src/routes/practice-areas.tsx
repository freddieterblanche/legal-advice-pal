import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { getPracticeAreaIcon } from "../lib/practice-area-icons";

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
    queryFn: async () => {
      const { data } = await supabase.from("provider_practice_areas").select("practice_area_id");
      const c: Record<string, number> = {};
      data?.forEach((r) => { c[r.practice_area_id] = (c[r.practice_area_id] ?? 0) + 1; });
      return c;
    },
  });

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-card py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Browse</span>
          <h1 className="mt-2 font-heading text-4xl text-ink md:text-5xl">Practice Areas</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Find attorneys and advocates across every major area of South African law.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {areas?.map((a) => {
            const Icon = getPracticeAreaIcon(a.slug);
            return (
              <Link
                key={a.id}
                to="/search"
                search={{ area: a.slug } as never}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-ink">{a.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {counts?.[a.id] ?? 0} lawyer{(counts?.[a.id] ?? 0) === 1 ? "" : "s"} listed
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
