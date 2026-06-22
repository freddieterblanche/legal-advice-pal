import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  useEffect(() => {
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const pad = 12;
      const gap = 4;
      const width = Math.max(160, Math.min(rect.width, window.innerWidth - pad * 2));
      const left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
      const below = window.innerHeight - rect.bottom - pad;
      const above = rect.top - pad;
      const openAbove = below < 200 && above > below;
      const maxHeight = Math.max(160, Math.min(320, openAbove ? above - gap : below - gap));
      setStyle({
        position: "fixed",
        left,
        top: openAbove ? Math.max(pad, rect.top - gap - maxHeight) : rect.bottom + gap,
        width,
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
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${className ?? ""} flex min-w-0 items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-muted-foreground"}`} translate="no">
          {selected?.label ?? placeholder}
        </span>
        <span aria-hidden="true" className="shrink-0 opacity-60">▾</span>
      </button>
      {open && style && createPortal(
        <div
          ref={menuRef}
          style={{ ...style, zIndex: 9999, pointerEvents: "auto" }}
          translate="no"
          className="z-[9999] overflow-auto rounded-md border border-border bg-card text-card-foreground shadow-lg"
        >
          {placeholder ? (
            <button
              type="button"
              onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); choose(""); }}
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); choose(""); }}
              onTouchStart={(event) => { event.preventDefault(); event.stopPropagation(); choose(""); }}
              onClick={() => choose("")}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${!value ? "bg-muted font-medium" : ""}`}
            >
              {placeholder}
            </button>
          ) : null}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); choose(option.value); }}
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); choose(option.value); }}
              onTouchStart={(event) => { event.preventDefault(); event.stopPropagation(); choose(option.value); }}
              onClick={() => choose(option.value)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${value === option.value ? "bg-muted font-medium" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}