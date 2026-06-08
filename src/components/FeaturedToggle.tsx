import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

export const FEATURED_CAP = 10;

/**
 * Category key used to enforce the per-category cap of 10 featured listings.
 * For service_providers we filter the relevant column; for firms it's just
 * the firms table.
 */
export type FeaturedCategory =
  | { table: "service_providers"; key: "attorney" | "advocate" | "expert" | "mediator" | "arbitrator" }
  | { table: "firms" };

async function countFeatured(cat: FeaturedCategory): Promise<number> {
  if (cat.table === "firms") {
    const { count } = await supabase.from("firms").select("id", { count: "exact", head: true }).eq("is_featured", true);
    return count ?? 0;
  }
  let q = supabase
    .from("service_providers")
    .select("id", { count: "exact", head: true })
    .eq("is_featured", true);
  if (cat.key === "attorney" || cat.key === "advocate" || cat.key === "expert") {
    q = q.eq("provider_type", cat.key);
  } else if (cat.key === "mediator") {
    q = q.eq("is_mediator", true);
  } else if (cat.key === "arbitrator") {
    q = q.eq("is_arbitrator", true);
  }
  const { count } = await q;
  return count ?? 0;
}

/** Hook giving you a mutation that toggles is_featured with cap enforcement. */
export function useFeaturedToggle(category: FeaturedCategory, invalidateKeys: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      if (value) {
        const current = await countFeatured(category);
        if (current >= FEATURED_CAP) {
          throw new Error(`Featured cap reached (${FEATURED_CAP}). Remove another featured listing first.`);
        }
      }
      const patch = value
        ? { is_featured: true, featured_since: new Date().toISOString() }
        : { is_featured: false, featured_since: null };
      const { error } = await supabase.from(category.table).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.value ? "Listing featured" : "Featured removed");
      for (const k of invalidateKeys) qc.invalidateQueries({ queryKey: k });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
}

/** Inline button used inside admin tables. */
export function FeaturedToggleButton({
  isFeatured,
  onClick,
  disabled,
}: {
  isFeatured: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={isFeatured ? "Remove from Featured" : "Mark as Featured (R10 000/mo, max 10 per category)"}
      className={`mr-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 transition disabled:opacity-50 ${
        isFeatured
          ? "bg-amber-400/90 text-ink ring-amber-600/60 hover:bg-amber-300"
          : "bg-transparent text-amber-700 ring-amber-400/50 hover:bg-amber-50"
      }`}
    >
      <Star className={`h-3 w-3 ${isFeatured ? "fill-ink" : ""}`} />
      {isFeatured ? "Featured" : "Feature"}
    </button>
  );
}
