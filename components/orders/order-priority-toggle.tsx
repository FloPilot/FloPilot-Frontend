"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { RushBadge } from "@/components/status-badges";
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
      <div
        className={cn(
          "flex items-center gap-2",
          fullWidth && "w-full"
        )}
      >
        <div
          className={cn(
            "border border-border/70 bg-muted/30 p-0.5",
            fullWidth
              ? "grid w-full grid-cols-2 gap-0.5 rounded-xl"
              : "inline-flex rounded-full",
            (disabled || pending) && "opacity-60"
          )}
        >
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => void setPriority(false)}
            className={cn(
              "text-xs font-medium transition-colors",
              fullWidth
                ? "flex h-8 items-center justify-center rounded-[10px] px-2"
                : "rounded-full px-3 py-1",
              !rush
                ? "bg-white text-brand-ink shadow-sm"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            Standard
          </button>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => void setPriority(true)}
            className={cn(
              "text-xs font-medium transition-colors",
              fullWidth
                ? "flex h-8 items-center justify-center gap-1 rounded-[10px] px-2"
                : "inline-flex items-center gap-1 rounded-full px-3 py-1",
              rush
                ? "bg-orange-500 text-white shadow-sm"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            <Zap className="size-3 shrink-0" />
            Rush
          </button>
        </div>
        {pending && !fullWidth && (
          <Loader2 className="size-3.5 animate-spin text-brand-muted" />
        )}
      </div>
      {!compact && (
        <p className="text-xs text-brand-muted">
          {rush
            ? "Rush orders sort to the top of scheduling queues and show urgent styling."
            : "Standard priority — use Rush for tight in-hands dates."}
        </p>
      )}
    </div>
  );
}
