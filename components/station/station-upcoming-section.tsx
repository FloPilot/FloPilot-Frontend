"use client";

import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { MachineTimelineCalendar } from "@/components/station/machine-timeline-calendar";
import { StationJobCard } from "@/components/station/station-job-card";
import { StationRunStatusBadge } from "@/components/station/station-run-status-badge";
import { Button } from "@/components/ui/button";
import type { Machine, ScheduleBlock, StationJobRun } from "@/types";
import { groupUpcomingByDay } from "@/lib/station-runs";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";

export function StationUpcomingSection({
  machine,
  upcoming,
  onOpenOrder,
  onEditSchedule,
}: {
  machine: Machine;
  upcoming: { block: ScheduleBlock; run: StationJobRun }[];
  onOpenOrder: (orderId: string, block: ScheduleBlock) => void;
  onEditSchedule: (block: ScheduleBlock) => void;
}) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const grouped = groupUpcomingByDay(upcoming);
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
            Upcoming
          </h2>
          <p className="mt-0.5 text-sm text-[#616161]">
            {upcoming.length === 0
              ? "Nothing queued on this machine."
              : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} in queue`}
          </p>
        </div>

        <div
          className={cn(
            "flex gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
            dashboardElevatedShadow
          )}
        >
          {(
            [
              { id: "calendar", label: "Calendar", icon: CalendarDays },
              { id: "list", label: "List", icon: List },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  view === option.id
                    ? "bg-[#f4f7fd] text-[#2c6ecb]"
                    : "text-[#616161] hover:text-[#303030]"
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-12 text-center">
          <p className="text-sm text-[#616161]">
            Schedule work from the{" "}
            <span className="font-medium text-[#2c6ecb]">
              production calendar
            </span>
            .
          </p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#616161]">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.items.map(({ block, run }) => (
                  <div key={block.id} className="relative">
                    <div className="absolute right-3.5 top-3.5 z-10">
                      <StationRunStatusBadge status={run.status} />
                    </div>
                    <StationJobCard
                      block={block}
                      color={machine.color}
                      onOpenOrder={onOpenOrder}
                      onEditSchedule={onEditSchedule}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={dashboardCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-[#303030]">{weekLabel}</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                className={cn(dashboardControlClass, "size-8 p-0")}
                onClick={() => setWeekStart((d) => addDays(d, -7))}
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-[#2c6ecb]"
                onClick={() =>
                  setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                }
              >
                This week
              </Button>
              <Button
                type="button"
                className={cn(dashboardControlClass, "size-8 p-0")}
                onClick={() => setWeekStart((d) => addDays(d, 7))}
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-xs text-[#616161]">
              Drag to reschedule ·{" "}
              <span className="font-medium text-red-700">Red</span> indicates
              overlap or hours conflict
            </p>
            <MachineTimelineCalendar
              machine={machine}
              weekStart={weekStart}
              enableBlockActions
              onEditBlock={onEditSchedule}
              onViewOrderBlock={(block) => onOpenOrder(block.orderId, block)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
