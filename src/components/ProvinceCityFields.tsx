import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { ComboboxCreatable } from "./ComboboxCreatable";

/**
 * Shared Country + Province + City/Town picker.
 * - Country (optional): native <select> sourced from the `countries` table,
 *   shown only when `country`/`onCountry` are provided. Defaults to
 *   "South Africa" semantics for callers that don't pass it.
 * - When country is "South Africa": Province is a native <select> over the
 *   canonical PROVINCES list and City is a typeable combobox of towns in
 *   that province.
 * - When country is anything else: Province becomes a free-text "State /
 *   region" input and City becomes a free-text input — countries outside
 *   SA don't have our seeded province/town data.
 */
export function ProvinceCityFields({
  province,
  city,
  onProvince,
  onCity,
  country,
  onCountry,
  selectClassName = "w-full rounded border border-border bg-background px-3 py-2 text-sm",
}: {
  province: string;
  city: string;
  onProvince: (v: string) => void;
  onCity: (v: string) => void;
  country?: string;
  onCountry?: (v: string) => void;
  selectClassName?: string;
}) {
  const showCountry = typeof country === "string" && typeof onCountry === "function";
  const effectiveCountry = country ?? "South Africa";
  const isSA = effectiveCountry === "South Africa";

  const { data: countries } = useQuery({
    queryKey: ["countries-list"],
    queryFn: async () =>
      (await supabase.from("countries").select("name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
    enabled: showCountry,
  });

  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () =>
      (await supabase.from("provinces").select("id, name").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
    enabled: isSA,
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
    enabled: isSA,
  });

  const townOptions = useMemo(() => {
    if (!towns) return [];
    const provId = provinces?.find((p) => p.name === province)?.id;
    const filtered = provId ? towns.filter((t) => t.province_id === provId) : [];
    return filtered.map((t) => ({ value: t.name as string, label: t.name as string }));
  }, [towns, provinces, province]);

  const countryOptions = useMemo(() => {
    const list = countries?.map((c) => c.name as string) ?? [];
    if (!list.includes("South Africa")) list.unshift("South Africa");
    if (effectiveCountry && !list.includes(effectiveCountry)) list.push(effectiveCountry);
    return list;
  }, [countries, effectiveCountry]);

  return (
    <>
      {showCountry && (
        <select
          value={effectiveCountry}
          onChange={(e) => {
            const next = e.target.value;
            onCountry?.(next);
            // Reset province/city when switching country group so stale SA
            // province values don't linger on non-SA records and vice versa.
            if ((next === "South Africa") !== isSA) {
              onProvince("");
              onCity("");
            }
          }}
          className={selectClassName}
        >
          {countryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
      {isSA ? (
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
      ) : (
        <>
          <input
            value={province}
            onChange={(e) => onProvince(e.target.value)}
            placeholder="State / region (optional)"
            className={selectClassName}
          />
          <input
            value={city}
            onChange={(e) => onCity(e.target.value)}
            placeholder="City"
            className={selectClassName}
          />
        </>
      )}
    </>
  );
}
