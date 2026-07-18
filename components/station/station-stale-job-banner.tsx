"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import type { ScheduleBlock, StationJobRun } from "@/types";
import { formatScheduleBlockDisplayLine } from "@/lib/order-display";
import {
  dashboardElevatedShadow,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function StationStaleJobBanner({
  block,
  run,
  remainingCount = 0,
  onMarkComplete,
  onOpenOrder,
}: {
  block: ScheduleBlock;
  run: StationJobRun;
  remainingCount?: number;
  onMarkComplete: () => Promise<void> | void;
  onOpenOrder?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onMarkComplete();
    } finally {
      setSaving(false);
    }
  };

  const whenLabel = format(parseISO(block.startAt), "EEE, MMM d · h:mm a");
  const statusHint =
    run.status === "running"
      ? "Still marked running"
      : run.status === "paused"
        ? "Left paused"
        : "Never closed out";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3.5 sm:px-5",
        dashboardElevatedShadow
      )}
      role="status"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5e6c8] text-[#8a6116]">
        <HelpCircle className="size-4" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#8a6116]">
          Is this job complete?
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-[#8a6116]/90">
          {onOpenOrder ? (
            <button
              type="button"
              onClick={onOpenOrder}
              className="font-medium text-[#6b4a10] underline-offset-2 hover:underline"
            >
              {formatScheduleBlockDisplayLine(block)}
            </button>
          ) : (
            <span className="font-medium text-[#6b4a10]">
              {formatScheduleBlockDisplayLine(block)}
            </span>
          )}
          <span className="text-[#8a6116]/80">
            {" "}
            · {block.imprintLabel} · {whenLabel}
          </span>
        </p>
        <p className="mt-1 text-[12px] text-[#8a6116]/75">
          {statusHint}
          {remainingCount > 0
            ? ` · ${remainingCount} more unfinished on this station`
            : null}
        </p>
      </div>

      <button
        type="button"
        className={cn(dashboardPrimaryButtonClass, "h-9 shrink-0")}
        onClick={() => void handleComplete()}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
        Mark as complete
      </button>
    </div>
  );
}
