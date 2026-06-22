import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { useFeaturedToggle, type FeaturedCategory } from "./FeaturedToggle";
import { SimpleSelect } from "./SimpleSelect";

type Option = { value: string; label: string };

const SP_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];
const FIRM_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending review" },
  { value: "inactive", label: "Inactive" },
];

function selectClass(status: string | null) {
  const base = "rounded-full border px-2 py-0.5 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-gold transition";
  switch (status) {
    case "active":
      return `${base} border-forest/30 bg-forest/10 text-forest`;
    case "trial":
      return `${base} border-sky-500/30 bg-sky-500/10 text-sky-700`;
    case "pending":
    case "pending_payment":
      return `${base} border-amber-500/40 bg-amber-500/10 text-amber-800`;
    case "suspended":
      return `${base} border-destructive/40 bg-destructive/10 text-destructive`;
    case "inactive":
    default:
      return `${base} border-border bg-muted text-muted-foreground`;
  }
}

export function StatusCell({
  table,
  id,
  status,
  isFeatured,
  featuredCategory,
  options,
  invalidateKeys = [],
}: {
  table: "service_providers" | "firms";
  id: string;
  status: string | null;
  isFeatured?: boolean | null;
  featuredCategory: FeaturedCategory;
  options?: Option[];
  invalidateKeys?: unknown[][];
}) {
  const qc = useQueryClient();
  const opts = options ?? (table === "firms" ? FIRM_OPTIONS : SP_OPTIONS);

  const setStatus = useMutation({
    mutationFn: async (next: string) => {
      const { error } = await supabase.from(table).update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(next === "suspended" ? "Listing suspended" : "Status updated");
      for (const k of invalidateKeys) qc.invalidateQueries({ queryKey: k });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const featuredMut = useFeaturedToggle(featuredCategory, invalidateKeys);
  const featured = !!isFeatured;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        value={status ?? ""}
        disabled={setStatus.isPending}
        onChange={(next) => {
          if (next === "suspended" && !confirm("Suspend this listing? It will be hidden from public listings.")) return;
          setStatus.mutate(next);
        }}
        options={[...(!opts.some((o) => o.value === (status ?? "")) && status ? [{ value: status, label: status }] : []), ...opts]}
        placeholder="Status"
        className={selectClass(status)}
      />
      <button
        type="button"
        disabled={featuredMut.isPending}
        onClick={() => featuredMut.mutate({ id, value: !featured })}
        title={featured ? "Remove from Featured" : "Mark as Featured (R10 000/mo, max 10 per category)"}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 transition disabled:opacity-50 ${
          featured
            ? "bg-amber-400/90 text-ink ring-amber-600/60 hover:bg-amber-300"
            : "bg-transparent text-amber-700 ring-amber-400/50 hover:bg-amber-50"
        }`}
      >
        <Star className={`h-3 w-3 ${featured ? "fill-ink" : ""}`} />
        {featured ? "Featured" : "Feature"}
      </button>
    </div>
  );
}
