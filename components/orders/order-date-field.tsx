"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { OrderHeaderCombo } from "@/components/orders/order-header-field";
import { orderHeaderFieldLabelClass } from "@/lib/order-addresses";
import {
  formatOrderDateLabel,
  orderDatePresets,
  parseOrderDateOnly,
  toOrderDateOnly,
  type OrderDateOnly,
  type OrderDatePreset,
} from "@/lib/order-dates";
import { cn } from "@/lib/utils";

type PopoverPos = {
  top: number;
  left: number;
  openUp: boolean;
};

export function OrderDateField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  presets: presetsProp,
  size = "sm",
  labelTone = "header",
}: {
  label: string;
  value: string | null | undefined;
  onChange: (next: OrderDateOnly | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Override quick-pick chips (defaults to order ship-style presets). */
  presets?: OrderDatePreset[];
  /** `md` matches h-9 form rows (Receiving, subcontract). */
  size?: "sm" | "md";
  /** `form` matches compact Receiving / materials labels. */
  labelTone?: "header" | "form";
}) {
  const POPOVER_WIDTH = 280;
  const POPOVER_EST_HEIGHT = 340;
  const VIEWPORT_PAD = 12;
  const GAP = 6;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = parseOrderDateOnly(value);
  const [month, setMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selected) setMonth(selected);
  }, [value]);

  const updatePopoverPosition = () => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const openUp =
      spaceBelow < POPOVER_EST_HEIGHT && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PAD) {
      left = Math.max(
        VIEWPORT_PAD,
        rect.right - POPOVER_WIDTH
      );
    }
    left = Math.max(VIEWPORT_PAD, left);

    const top = openUp
      ? Math.max(VIEWPORT_PAD, rect.top - GAP)
      : rect.bottom + GAP;

    setPos({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePopoverPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePopoverPosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [month]);

  const presets = presetsProp ?? orderDatePresets();
  const display = formatOrderDateLabel(value, placeholder);

  const popover =
    open && mounted && pos
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp
                ? window.innerHeight - pos.top
                : undefined,
              left: pos.left,
              width: POPOVER_WIDTH,
              zIndex: 80,
            }}
            className="rounded-xl border border-[#e3e3e3] bg-white p-3 shadow-[0_8px_28px_rgba(26,26,26,0.12)]"
          >
            <div className="mb-2 flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const active = value === preset.date;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onChange(preset.date);
                      setMonth(parseOrderDateOnly(preset.date) ?? new Date());
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                      active
                        ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                        : "border-[#ebebeb] bg-[#fafafa] text-[#616161] hover:border-[#d7e3f4] hover:bg-[#f4f7fd] hover:text-[#2c6ecb]"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonth((current) => addMonths(current, -1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#ebebeb] text-[#616161] transition-colors hover:bg-[#f6f6f7]"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-[13px] font-semibold text-[#303030]">
                {format(month, "MMMM yyyy")}
              </p>
              <button
                type="button"
                onClick={() => setMonth((current) => addMonths(current, 1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#ebebeb] text-[#616161] transition-colors hover:bg-[#f6f6f7]"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {weeks.flat().map((day) => {
                const inMonth = isSameMonth(day, month);
                const isSelected = selected ? isSameDay(day, selected) : false;
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange(toOrderDateOnly(day));
                      setOpen(false);
                    }}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-[12px] font-medium transition-colors",
                      !inMonth && "text-[#c9c9c9]",
                      inMonth &&
                        !isSelected &&
                        "text-[#303030] hover:bg-[#f4f7fd]",
                      isToday && !isSelected && "ring-1 ring-[#d7e3f4]",
                      isSelected &&
                        "bg-brand-primary text-white hover:bg-brand-primary"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#616161] transition-colors hover:bg-[#f6f6f7]"
              >
                Clear date
              </button>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("relative flex min-w-0 flex-col gap-1", className)}>
      <span
        className={cn(
          labelTone === "form"
            ? "text-[11px] font-medium text-[#8a8a8a]"
            : orderHeaderFieldLabelClass
        )}
      >
        {label}
      </span>
      <div ref={rootRef} className="relative">
        <OrderHeaderCombo
          className={cn(
            "min-w-[10.5rem]",
            size === "md" && "h-9 rounded-xl"
          )}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setOpen((current) => !current);
            }}
            className={cn(
              "flex h-full w-full min-w-0 items-center gap-1.5 px-2.5 text-left text-[13px] font-medium outline-none",
              size === "md" ? "min-h-9" : "min-h-8",
              "hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60",
              value?.trim() ? "text-[#303030]" : "font-normal text-[#8a8a8a]"
            )}
          >
            <CalendarDays className="size-3.5 shrink-0 text-[#8a8a8a]" />
            <span className="min-w-0 truncate">{display}</span>
          </button>
        </OrderHeaderCombo>
      </div>
      {popover}
    </div>
  );
}
