"use client";

import { ChevronRight, Package, Pause, Play } from "lucide-react";
import type { FloorEventStatus, ProductionFloorEvent } from "@/lib/production-floor-overview";
import { formatFloorEventTimeRange } from "@/lib/production-floor-overview";
import { formatOrderRef } from "@/lib/order-display";
import { machineColorStyles } from "@/lib/machine-styles";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import type { MachineCalendarColor } from "@/types";

const STATUS_META: Record<
  FloorEventStatus,
  { label: string; className: string; icon?: "play" | "pause" }
> = {
  running: {
    label: "Running",
    className: "bg-[#e3f1df] text-[#108043]",
    icon: "play",
  },
  paused: {
    label: "Paused",
    className: "bg-[#fcf1cd] text-[#916a00]",
    icon: "pause",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-[#f0f5ff] text-[#2c6ecb]",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-[#f0f5ff] text-[#2c6ecb]",
  },
  finished: {
    label: "Done",
    className: "bg-[#eef5f1] text-[#1a6b46]",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#fbeae5] text-[#c73d21]",
  },
  blocked: {
    label: "Blocked",
    className: "bg-[#fff5ea] text-[#b98900]",
  },
};

export function ProductionEventRow({
  event,
  onSelect,
  showMachine = true,
  showDateHint = false,
}: {
  event: ProductionFloorEvent;
  onSelect: (event: ProductionFloorEvent) => void;
  showMachine?: boolean;
  showDateHint?: boolean;
}) {
  const status = STATUS_META[event.floorStatus];
  const colorStyles = event.machineColor
    ? machineColorStyles[event.machineColor as MachineCalendarColor]
    : null;
  const isLive =
    event.floorStatus === "running" || event.floorStatus === "paused";
  const timeLabel = formatFloorEventTimeRange(event.startAt, event.endAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={cn(
        dashboardInsetSurfaceClass,
        "group relative flex w-full items-stretch gap-0 overflow-hidden text-left transition-[border-color,box-shadow,background-color]",
        "hover:border-[#c9cccf] hover:bg-[#fafafa]",
        isLive && "border-[#b8ddb0] bg-[#f9fdf8] hover:border-[#9ecf9a]"
      )}
    >
      <span
        className={cn(
          "w-1 shrink-0 self-stretch",
          colorStyles?.cap ?? (isLive ? "bg-[#108043]" : "bg-[#2c6ecb]")
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-[7.5rem] shrink-0">
          <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
            {timeLabel || "—"}
          </p>
          {showDateHint ? (
            <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
              {event.floorStatus === "running" ? "Live on floor" : "Scheduled"}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={dashboardTaskTitleClass}>
              {formatOrderRef(event)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                status.className
              )}
            >
              {status.icon === "play" ? (
                <Play className="size-2.5 fill-current" />
              ) : null}
              {status.icon === "pause" ? (
                <Pause className="size-2.5 fill-current" />
              ) : null}
              {status.label}
            </span>
          </div>
          <p className={cn("mt-1 truncate", dashboardTaskDetailClass)}>
            {event.customerName}
            <span className="text-[#c4c4c4]"> · </span>
            {event.imprintLabel || event.jobName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#616161] sm:justify-end">
          {showMachine ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#303030]">
              <span
                className={cn(
                  "size-2 rounded-full",
                  colorStyles?.dot ?? "bg-[#2c6ecb]"
                )}
              />
              {event.machineName}
            </span>
          ) : null}
          {event.pieceCount != null && event.pieceCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Package className="size-3.5" />
              {event.pieceCount} pcs
            </span>
          ) : null}
          <ChevronRight className="size-4 shrink-0 text-[#c4c4c4] transition-colors group-hover:text-[#616161]" />
        </div>
      </div>
    </button>
  );
}
