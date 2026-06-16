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
          <h2 className="text-base font-semibold text-brand-ink">Upcoming</h2>
          <p className="text-sm text-brand-muted mt-0.5">
            {upcoming.length === 0
              ? "Nothing queued on this machine."
              : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} in queue`}
          </p>
        </div>

        <div className="flex rounded-full border border-border/70 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              view === "calendar"
                ? "bg-brand-primary text-white"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            <CalendarDays className="size-3.5" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-brand-primary text-white"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            <List className="size-3.5" />
            List
          </button>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-white px-6 py-12 text-center">
          <p className="text-sm text-brand-muted">
            Schedule work from the{" "}
            <span className="text-brand-primary">production calendar</span>.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-3">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.items.map(({ block, run }) => (
                  <div key={block.id} className="relative">
                    <div className="absolute top-3.5 right-3.5 z-10">
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
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-brand-ink">
              {weekLabel}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setWeekStart((d) => addDays(d, -7))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-brand-primary text-xs h-8"
                onClick={() =>
                  setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                }
              >
                This week
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setWeekStart((d) => addDays(d, 7))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs text-brand-muted mb-4">
              Drag to reschedule ·{" "}
              <span className="text-red-700 font-medium">Red</span> indicates
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
