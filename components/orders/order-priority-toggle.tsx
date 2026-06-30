"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { RushBadge } from "@/components/status-badges";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function OrderPriorityToggle({
  rush,
  disabled,
  onChange,
  compact,
  fullWidth,
  badgeOnly,
}: {
  rush: boolean;
  disabled?: boolean;
  onChange: (rush: boolean) => Promise<void> | void;
  compact?: boolean;
  fullWidth?: boolean;
  badgeOnly?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const setPriority = async (next: boolean) => {
    if (next === rush || pending || disabled) return;
    setPending(true);
    try {
      await onChange(next);
    } finally {
      setPending(false);
    }
  };

  if (badgeOnly) {
    return rush ? <RushBadge /> : null;
  }

  return (
    <div className={cn(!compact && "space-y-1.5")}>
      <div className={cn("flex items-center gap-2", fullWidth && "w-full")}>
        <div
          className={cn(
            dashboardControlClass,
            "grid gap-0.5 bg-[#fafafa] p-0.5",
            fullWidth ? "w-full grid-cols-2" : "inline-grid grid-cols-2",
            (disabled || pending) && "opacity-60"
          )}
        >
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => void setPriority(false)}
            className={cn(
              "flex h-8 items-center justify-center rounded-md px-2 text-[12px] font-medium transition-colors",
              !rush
                ? "bg-white text-[#303030] shadow-sm"
                : "text-[#8a8a8a] hover:text-[#303030]"
            )}
          >
            Standard
          </button>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => void setPriority(true)}
            className={cn(
              "flex h-8 items-center justify-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors",
              rush
                ? "bg-[#e67700] text-white shadow-sm"
                : "text-[#8a8a8a] hover:text-[#303030]"
            )}
          >
            <Zap className="size-3 shrink-0" />
            Rush
          </button>
        </div>
        {pending && !fullWidth && (
          <Loader2 className="size-3.5 animate-spin text-[#8a8a8a]" />
        )}
      </div>
      {!compact && (
        <p className="text-[12px] text-[#8a8a8a]">
          {rush
            ? "Rush orders sort to the top of scheduling queues."
            : "Standard priority — use Rush for tight in-hands dates."}
        </p>
      )}
    </div>
  );
}
