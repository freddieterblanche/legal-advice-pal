import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/practice-areas")({
  head: () => ({
    meta: [
      { title: "Practice Areas — Lawexperts.co.za" },
      { name: "description", content: "Browse South African lawyers by practice area, from Constitutional Law to Mining & Resources." },
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
      const { data } = await supabase.from("lawyer_practice_areas").select("practice_area_id");
      const c: Record<string, number> = {};
      data?.forEach((r) => { c[r.practice_area_id] = (c[r.practice_area_id] ?? 0) + 1; });
      return c;
    },
  });

  return (
    <div className="bg-cream">
      <div className="border-b border-border bg-ink py-16 text-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="font-heading text-4xl md:text-5xl">Practice Areas</h1>
          <p className="mt-3 max-w-2xl text-cream/70">
            Find advocates and attorneys across every major area of South African law.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {areas?.map((a) => (
            <Link
              key={a.id}
              to="/search"
              search={{ area: a.slug } as never}
              className="group flex items-start gap-4 rounded-md border border-border bg-card p-6 transition-all hover:border-gold hover:shadow-md"
            >
              <span className="text-3xl">{a.icon}</span>
              <div>
                <h3 className="font-heading text-lg text-ink group-hover:text-gold">{a.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {counts?.[a.id] ?? 0} lawyer{(counts?.[a.id] ?? 0) === 1 ? "" : "s"} listed
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
