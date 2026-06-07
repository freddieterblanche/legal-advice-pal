import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { ComboboxCreatable } from "./ComboboxCreatable";

/**
 * Shared Province + City/Town picker.
 * - Province: native <select> over the canonical PROVINCES list.
 * - City: typeable combobox that suggests towns from the DB filtered by the
 *   selected province (falls back to free-typed value when no match).
 *
 * Returns a fragment with two controls so callers can slot them into any
 * grid layout. Use the `selectClassName` / `comboboxWrapperClassName` props
 * only when the surrounding form needs different sizing.
 */
export function ProvinceCityFields({
  province,
  city,
  onProvince,
  onCity,
  selectClassName = "w-full rounded border border-border bg-background px-3 py-2 text-sm",
}: {
  province: string;
  city: string;
  onProvince: (v: string) => void;
  onCity: (v: string) => void;
  selectClassName?: string;
}) {
  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () =>
      (await supabase.from("provinces").select("id, name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const { data: towns } = useQuery({
    queryKey: ["towns-all"],
    queryFn: async () =>
      (await supabase
        .from("towns")
        .select("name, province_id")
        .order("is_major_city", { ascending: false })
        .order("name")
      ).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const townOptions = useMemo(() => {
    if (!towns) return [];
    const provId = provinces?.find((p) => p.name === province)?.id;
    const filtered = provId ? towns.filter((t) => t.province_id === provId) : [];
    return filtered.map((t) => ({ value: t.name as string, label: t.name as string }));
  }, [towns, provinces, province]);

  return (
    <>
      <select
        value={province}
        onChange={(e) => {
          onProvince(e.target.value);
          onCity("");
        }}
        className={selectClassName}
      >
        <option value="">Select province</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <ComboboxCreatable
        value={city}
        onChange={onCity}
        options={townOptions}
        placeholder={province ? "Select or type a city/town…" : "Select a province first…"}
        emptyLabel="—"
        disabled={!province}
        onCreate={async (name) => name}
        createLabel="Use"
      />
    </>
  );
}
