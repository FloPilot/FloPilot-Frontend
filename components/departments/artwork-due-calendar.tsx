"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { artDueDateKey } from "@/lib/artwork-status";
import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import { cn } from "@/lib/utils";

export function ArtworkDueCalendar({
  entries,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: {
  entries: ArtworkQueueEntry[];
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDay: string | null;
  onSelectDay: (dayKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const key = artDueDateKey(entry.artwork.artDueAt);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dueThisMonth = useMemo(() => {
    let total = 0;
    for (const [key, count] of counts) {
      const [y, m] = key.split("-").map(Number);
      if (y === month.getFullYear() && m === month.getMonth() + 1) {
        total += count;
      }
    }
    return total;
  }, [counts, month]);

  return (
    <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#fafafa]"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#2c6ecb]">
            <CalendarDays className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#303030]">
              Artwork due calendar
            </p>
            <p className={cn(dashboardTaskDetailClass, "text-[11px]")}>
              {selectedDay
                ? `Filtered to ${format(parseISO(`${selectedDay}T12:00:00`), "MMM d")}`
                : dueThisMonth > 0
                  ? `${dueThisMonth} due this month · click to ${open ? "hide" : "view"}`
                  : `No due dates this month · click to ${open ? "hide" : "view"}`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#8a8a8a] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[#ebebeb] px-3 pb-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8a8a8a]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2c6ecb] text-[10px] font-semibold text-white">
                  {format(new Date(), "d")}
                </span>
                Today
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#2c6ecb]" />
                Has due art
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "size-7 p-0")}
                onClick={() => onMonthChange(subMonths(month, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <p className="min-w-[8rem] text-center text-[12px] font-semibold text-[#303030]">
                {format(month, "MMMM yyyy")}
              </p>
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "size-7 p-0")}
                onClick={() => onMonthChange(addMonths(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e3e3e3] bg-white">
            <div className="grid grid-cols-7 border-b border-[#ebebeb] bg-[#fafafa]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-[11px] font-semibold text-[#8a8a8a]"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const key = format(day, "yyyy-MM-dd");
                const count = counts.get(key) || 0;
                const inMonth = isSameMonth(day, month);
                const selected = selectedDay === key;
                const today = isToday(day);
                const isLastCol = (index + 1) % 7 === 0;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => onSelectDay(selected ? null : key)}
                    className={cn(
                      "relative flex min-h-[52px] flex-col items-center justify-center gap-1 border-b border-[#ebebeb] px-1 py-1.5 text-[12px] transition-colors sm:min-h-[56px]",
                      !isLastCol && "border-r border-[#ebebeb]",
                      !inMonth && "bg-[#fcfcfc] text-[#c9c9c9]",
                      inMonth &&
                        !selected &&
                        !today &&
                        "bg-white text-[#303030] hover:bg-[#f4f7fd]",
                      today &&
                        inMonth &&
                        !selected &&
                        "bg-[#eef4ff] text-[#1f4b99]",
                      selected && "bg-[#2c6ecb] text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[12px] leading-none",
                        today &&
                          inMonth &&
                          !selected &&
                          "bg-[#2c6ecb] font-semibold text-white",
                        today && selected && "bg-white/20 font-semibold",
                        !today && inMonth && count > 0 && "font-semibold"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4",
                          selected
                            ? "bg-white/20 text-white"
                            : "bg-[#e8f1ff] text-[#1f4b99]"
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="h-4" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-[#616161]">
                Showing proofs due{" "}
                <span className="font-semibold text-[#303030]">
                  {format(parseISO(`${selectedDay}T12:00:00`), "MMM d, yyyy")}
                </span>
              </p>
              <button
                type="button"
                className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
                onClick={() => onSelectDay(null)}
              >
                Clear day filter
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
