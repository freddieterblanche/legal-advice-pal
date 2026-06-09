import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  allLabel = "All",
}: {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  allLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = open ? query : (selected?.label ?? "");

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = ref.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      const viewportPadding = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        160,
        Math.min(320, openAbove ? spaceAbove - gap : spaceBelow - gap),
      );

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        top: openAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={display}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
      />
      {open &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="z-[9999] overflow-auto rounded-md border border-border bg-card shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${!value ? "bg-muted font-medium" : ""}`}
            >
              {allLabel}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${value === o.value ? "bg-muted font-medium" : ""}`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
