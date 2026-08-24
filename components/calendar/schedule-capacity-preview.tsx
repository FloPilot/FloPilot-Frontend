"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarClock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Machine, ScheduleBlock } from "@/types";
import {
  formatScheduleLoad,
  getScheduleBlockTimeRange,
  getScheduleDayLoad,
  recommendScheduleSlot,
} from "@/lib/schedule-recommendation";
import { cn } from "@/lib/utils";

type ScheduleCapacityPreviewProps = {
  machine?: Machine;
  blocks: ScheduleBlock[];
  durationHours: number;
  selectedDate: string;
  excludeBlockId?: string;
  onApplySlot: (date: string, startTime: string) => void;
};

export function ScheduleCapacityPreview({
  machine,
  blocks,
  durationHours,
  selectedDate,
  excludeBlockId,
  onApplySlot,
}: ScheduleCapacityPreviewProps) {
  const selectedDay = new Date(`${selectedDate}T12:00:00`);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(selectedDay, { weekStartsOn: 1 })
  );
  const requiredMinutes = Math.max(1, durationHours) * 60;
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const loads = useMemo(
    () =>
      machine
        ? days.map((day) =>
            getScheduleDayLoad(machine, day, blocks, {
              excludeBlockId,
              requiredMinutes,
            })
          )
        : [],
    [machine, days, blocks, excludeBlockId, requiredMinutes]
  );
  const recommendation = useMemo(
    () =>
      recommendScheduleSlot(machine, blocks, durationHours, {
        excludeBlockId,
        from: new Date(),
      }),
    [machine, blocks, durationHours, excludeBlockId]
  );

  if (!machine) return null;

  return (
    <section className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-[#2c6ecb]" />
            <h3 className="text-[13px] font-semibold text-[#303030]">
              Machine availability
            </h3>
          </div>
          <p className="mt-1 text-[12px] text-[#616161]">
            {machine.name} · scheduled workload for the selected week
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#dbe6f5] bg-white p-0.5">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekStart((day) => addDays(day, -7))}
            className="rounded-md p-1 text-[#616161] hover:bg-[#f1f6fd] hover:text-[#2c6ecb]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-28 text-center text-[11px] font-medium text-[#4b5563]">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekStart((day) => addDays(day, 7))}
            className="rounded-md p-1 text-[#616161] hover:bg-[#f1f6fd] hover:text-[#2c6ecb]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {recommendation ? (
        <button
          type="button"
          onClick={() =>
            onApplySlot(
              format(recommendation.date, "yyyy-MM-dd"),
              recommendation.startTime
            )
          }
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-[#bfdbfe] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#7db4ef] hover:bg-[#f6faff]"
        >
          <span className="flex min-w-0 items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
            <span>
              <span className="block text-[12px] font-semibold text-[#245eaa]">
                Recommended slot: {format(recommendation.date, "EEE, MMM d")} at{" "}
                {format(new Date(`2000-01-01T${recommendation.startTime}:00`), "h:mm a")}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#616161]">
                {recommendation.reason} · fits {durationHours}h of work
              </span>
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[#2c6ecb]">
            Use slot
          </span>
        </button>
      ) : (
        <p className="mt-3 rounded-lg border border-[#f0d9a8] bg-[#fffaf0] px-3 py-2 text-[12px] text-[#8a6116]">
          No open {durationHours}h slot was found in the next six weeks. Review a
          less busy day or adjust the duration.
        </p>
      )}

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {loads.map((load) => {
          const isSelected = format(load.date, "yyyy-MM-dd") === selectedDate;
          const canFit = load.firstAvailableStartMin !== undefined;
          return (
            <button
              key={load.date.toISOString()}
              type="button"
              disabled={!canFit}
              onClick={() =>
                onApplySlot(
                  format(load.date, "yyyy-MM-dd"),
                  String(Math.floor(load.firstAvailableStartMin! / 60)).padStart(
                    2,
                    "0"
                  ) +
                    ":" +
                    String(load.firstAvailableStartMin! % 60).padStart(2, "0")
                )
              }
              title={
                load.blocks.length
                  ? load.blocks
                      .map(
                        (block) =>
                          `${getScheduleBlockTimeRange(block)} ${block.orderNumber}`
                      )
                      .join("\n")
                  : undefined
              }
              className={cn(
                "min-w-0 rounded-lg border bg-white p-2 text-left transition-colors",
                isSelected && "border-[#2c6ecb] ring-1 ring-[#2c6ecb]/30",
                !isSelected && "border-[#dbe6f5]",
                canFit
                  ? "hover:border-[#7db4ef] hover:bg-[#f6faff]"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                {format(load.date, "EEE")}
              </span>
              <span className="mt-0.5 block text-[13px] font-semibold text-[#303030]">
                {format(load.date, "d")}
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#edf1f5]">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    load.utilization >= 85
                      ? "bg-[#d45252]"
                      : load.utilization >= 60
                        ? "bg-[#d39424]"
                        : "bg-[#4c9b6c]"
                  )}
                  style={{ width: `${load.utilization}%` }}
                />
              </span>
              <span className="mt-1.5 block truncate text-[10px] text-[#616161]">
                {formatScheduleLoad(load)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[#616161]">
        Select an open day to place this event in its first available time window.
      </p>
    </section>
  );
}
