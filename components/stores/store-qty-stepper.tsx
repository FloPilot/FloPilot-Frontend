"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_QTY = 99999;

export function StoreQtyStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY,
  disabled = false,
  size = "md",
  className,
  inputAriaLabel = "Quantity",
}: {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  inputAriaLabel?: string;
}) {
  const floor = Math.max(1, Math.floor(Number(min) || 1));
  const ceiling = Math.max(floor, Math.floor(Number(max) || MAX_QTY));
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Math.floor(Number(String(raw).replace(/[^\d]/g, "")));
    const next = Number.isFinite(parsed)
      ? Math.min(ceiling, Math.max(floor, parsed))
      : floor;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const buttonClass =
    size === "sm"
      ? "flex size-8 items-center justify-center text-[#616161] transition-colors hover:bg-[#f6f6f7] disabled:opacity-40"
      : "inline-flex size-10 items-center justify-center text-[#616161] hover:bg-[#f6f6f7] disabled:opacity-40";
  const inputClass =
    size === "sm"
      ? "h-8 w-12 border-0 bg-transparent p-0 text-center text-[13px] tabular-nums text-[#303030] shadow-none outline-none focus-visible:ring-0"
      : "h-10 w-14 border-0 bg-transparent p-0 text-center text-[14px] font-semibold tabular-nums text-[#303030] shadow-none outline-none focus-visible:ring-0";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-[#e3e3e3] bg-white",
        disabled && "opacity-60",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= floor}
        className={buttonClass}
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(floor, value - 1))}
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={inputAriaLabel}
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, "");
          setDraft(next);
          if (!next) return;
          const parsed = Math.floor(Number(next));
          if (!Number.isFinite(parsed)) return;
          // Don't clamp mid-keystroke (e.g. typing 500 with MOQ 72).
          if (parsed >= floor && parsed <= ceiling && parsed !== value) {
            onChange(parsed);
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        onFocus={(event) => event.currentTarget.select()}
        className={inputClass}
      />
      <button
        type="button"
        disabled={disabled || value >= ceiling}
        className={buttonClass}
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(ceiling, value + 1))}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
