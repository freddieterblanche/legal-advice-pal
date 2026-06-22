import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { ComboboxCreatable } from "./ComboboxCreatable";
import { SimpleSelect } from "./SimpleSelect";

/**
 * Shared Country + Province + City/Town picker.
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
  const pendingLocationClearRef = useRef(false);
  const pendingCityClearRef = useRef(false);

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
    return list.map((c) => ({ value: c, label: c }));
  }, [countries, effectiveCountry]);

  const provinceOptions = useMemo(
    () => PROVINCES.map((p) => ({ value: p, label: p })),
    [],
  );

  useEffect(() => {
    if (!pendingLocationClearRef.current) return;
    pendingLocationClearRef.current = false;
    pendingCityClearRef.current = true;
    if (province) onProvince("");
    else if (city) onCity("");
  }, [effectiveCountry, province, city, onProvince, onCity]);

  useEffect(() => {
    if (!pendingCityClearRef.current) return;
    pendingCityClearRef.current = false;
    if (city) onCity("");
  }, [province, city, onCity]);

  return (
    <>
      {showCountry && (
        <SimpleSelect
          value={effectiveCountry}
          onChange={(next) => {
            if (!next) return;
            if ((next === "South Africa") !== isSA) pendingLocationClearRef.current = true;
            onCountry?.(next);
          }}
          options={countryOptions}
          placeholder=""
          className={selectClassName}
        />
      )}
      {isSA ? (
        <>
          <SimpleSelect
            value={province}
            onChange={(v) => {
              if (v !== province) pendingCityClearRef.current = true;
              onProvince(v);
            }}
            options={provinceOptions}
            placeholder="Select province"
            className={selectClassName}
          />
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
