import { useMemo, useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { PROVINCES } from "../lib/constants";
import { ComboboxCreatable } from "./ComboboxCreatable";

/**
 * Custom select that mimics a native <select> but avoids Google Translate
 * breaking React reconciliation of <option> text nodes (which manifests on
 * Android Chrome as "tapping the dropdown does nothing" / "selection
 * doesn't stick"). The menu is portalled to body so it isn't clipped by
 * parent overflow.
 */
function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 4;
      const pad = 12;
      const below = window.innerHeight - rect.bottom - pad;
      const above = rect.top - pad;
      const openAbove = below < 200 && above > below;
      const maxHeight = Math.max(160, Math.min(320, openAbove ? above - gap : below - gap));
      setStyle({
        position: "fixed",
        left: rect.left,
        top: openAbove ? Math.max(pad, rect.top - gap - maxHeight) : rect.bottom + gap,
        width: rect.width,
        maxHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        translate="no"
        onClick={() => setOpen((v) => !v)}
        className={`${className ?? ""} text-left flex items-center justify-between gap-2`}
      >
        <span className={selected ? "" : "text-muted-foreground"} translate="no">
          {selected?.label ?? placeholder}
        </span>
        <span aria-hidden className="opacity-60">▾</span>
      </button>
      {open && style && createPortal(
        <div
          ref={menuRef}
          style={style}
          translate="no"
          className="z-[9999] overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${!value ? "bg-muted font-medium" : ""}`}
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${value === o.value ? "bg-muted font-medium" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

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

  return (
    <>
      {showCountry && (
        <SimpleSelect
          value={effectiveCountry}
          onChange={(next) => {
            if (!next) return;
            onCountry?.(next);
            if ((next === "South Africa") !== isSA) {
              onProvince("");
              onCity("");
            }
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
              onProvince(v);
              onCity("");
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
