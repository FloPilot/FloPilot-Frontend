"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useStaffUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { cn } from "@/lib/utils";

export function StaffUnsavedChangesBar({
  className,
}: {
  className?: string;
}) {
  const { dirty, saving, label, shaking, attention, save, discard } =
    useStaffUnsavedChanges();

  if (!dirty) return null;

  return (
    <div
      className={cn("relative w-full", className)}
      role="status"
      aria-live="polite"
      data-unsaved-changes-bar
    >
      <div
        className={cn(
          "flex h-[34px] w-full items-center justify-between gap-3 rounded-lg border px-3 transition-[background-color,border-color,box-shadow,color] duration-300",
          "shadow-[inset_0_1px_1px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.04)]",
          attention
            ? "border-brand-primary bg-brand-primary text-white shadow-[0_0_0_1px_rgba(39,98,255,0.45),0_0_24px_rgba(39,98,255,0.35)]"
            : "border-[#3a3a3a] bg-[#303030] text-[#f5f5f5]",
          shaking && "animate-[unsaved-shake_0.5s_ease-in-out]"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <AlertCircle
            className={cn(
              "size-3.5 shrink-0",
              attention ? "text-white" : "text-[#c9c9c9]"
            )}
            strokeWidth={1.75}
          />
          <span className="truncate text-[13px] font-medium tracking-tight">
            {label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              discard();
            }}
            className={cn(
              "inline-flex h-[24px] items-center rounded-md px-2.5 text-[12px] font-medium transition-colors disabled:opacity-60",
              attention
                ? "bg-white/15 text-white hover:bg-white/20"
                : "bg-[#3f3f3f] text-[#f0f0f0] hover:bg-[#4a4a4a]"
            )}
          >
            Discard
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void save();
            }}
            className={cn(
              "inline-flex h-[24px] items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition-colors disabled:opacity-60",
              attention
                ? "bg-white text-brand-primary hover:bg-white/95"
                : "bg-white text-[#171717] hover:bg-[#f3f3f3]"
            )}
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
