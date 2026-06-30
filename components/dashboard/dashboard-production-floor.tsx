"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Play } from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import { useSchedule } from "@/components/providers/schedule-provider";
import type { TodayFloorItem } from "@/lib/dashboard-insights";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const MACHINE_DOT: Record<string, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
};

function FloorRow({
  item,
  onSelect,
}: {
  item: TodayFloorItem;
  onSelect: (item: TodayFloorItem) => void;
}) {
  const isRunning = item.kind === "running";

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        dashboardInsetSurfaceClass,
        "group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-[border-color,box-shadow,background-color]",
        "hover:border-[#c9cccf] hover:bg-[#fafafa]",
        isRunning && "border-[#b8ddb0] bg-[#f9fdf8] hover:border-[#9ecf9a]"
      )}
    >
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          item.machineColor
            ? MACHINE_DOT[item.machineColor] ?? "bg-[#2c6ecb]"
            : isRunning
              ? "bg-[#108043]"
              : "bg-[#2c6ecb]"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={dashboardTaskTitleClass}>{item.orderNumber}</span>
          {isRunning ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#e3f1df] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#108043]">
              <Play className="size-2.5 fill-current" />
              Running
            </span>
          ) : null}
        </div>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          {item.machineName} · {item.imprintLabel}
          {item.timeLabel ? ` · ${item.timeLabel}` : ""}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#616161] opacity-60 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function DayColumn({
  title,
  count,
  items,
  emptyLabel,
  onSelectItem,
}: {
  title: string;
  count: number;
  items: TodayFloorItem[];
  emptyLabel: string;
  onSelectItem: (item: TodayFloorItem) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#616161]">
          {title} · {count}
        </p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-[#616161]">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          {items.slice(0, 6).map((item) => (
            <li key={item.id}>
              <FloorRow item={item} onSelect={onSelectItem} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardProductionFloor({
  today,
  tomorrow,
  runningNow,
  scheduledToday,
  className,
}: {
  today: TodayFloorItem[];
  tomorrow: TodayFloorItem[];
  runningNow: number;
  scheduledToday: number;
  className?: string;
}) {
  const { scheduleBlocks } = useSchedule();
  const [selectedItem, setSelectedItem] = useState<TodayFloorItem | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const editingBlock = useMemo(
    () =>
      selectedItem
        ? scheduleBlocks.find((block) => block.id === selectedItem.scheduleBlockId)
        : undefined,
    [selectedItem, scheduleBlocks]
  );

  const selectedEvent = useMemo(() => {
    if (!editingBlock) return null;
    return {
      orderId: editingBlock.orderId,
      jobId: editingBlock.jobId,
      imprintId: editingBlock.imprintId,
    };
  }, [editingBlock]);

  const todayScheduled = today.filter((item) => item.kind === "scheduled");
  const showFooter =
    (today.length === 0 && tomorrow.length === 0) ||
    (todayScheduled.length > 0 && runningNow === 0);

  return (
    <>
      <section
        className={cn(
          dashboardCardClass,
          "flex min-h-[280px] flex-col overflow-hidden",
          className
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-[#303030]">Shop floor</p>
            <p className="mt-0.5 text-xs text-[#616161]">
              Tap an event to update status, assign, or reschedule
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#616161]">
            {runningNow > 0 ? (
              <span className="rounded-sm bg-[#e3f1df] px-2 py-1 font-semibold text-[#108043]">
                {runningNow} running
              </span>
            ) : null}
            <span className="rounded-sm border border-[#e3e3e3] bg-white px-2 py-1 font-medium text-[#303030]">
              {scheduledToday} on calendar today
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2 lg:divide-x lg:divide-[#ebebeb]">
          <DayColumn
            title="Today"
            count={today.length}
            items={today}
            emptyLabel="Nothing on the floor today — check the calendar to schedule runs."
            onSelectItem={setSelectedItem}
          />
          <DayColumn
            title="Tomorrow"
            count={tomorrow.length}
            items={tomorrow}
            emptyLabel="No events scheduled for tomorrow yet."
            onSelectItem={setSelectedItem}
          />
        </div>

        {showFooter ? (
          <div className="shrink-0 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
            {today.length === 0 && tomorrow.length === 0 ? (
              <Link
                href="/app/calendar"
                className={cn(
                  dashboardControlClass,
                  "inline-flex h-9 text-xs font-semibold text-[#303030]"
                )}
              >
                Open calendar to schedule
                <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-[#616161]">
                {todayScheduled.length} event
                {todayScheduled.length !== 1 ? "s" : ""} scheduled today — none
                marked running yet
              </p>
            )}
          </div>
        ) : null}
      </section>

      <ProductionEventSheet
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        orderId={selectedEvent?.orderId ?? null}
        jobId={selectedEvent?.jobId ?? null}
        imprintId={selectedEvent?.imprintId ?? null}
        onSchedule={() => {
          if (editingBlock) setRescheduleOpen(true);
        }}
      />

      <ScheduleJobDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        editingBlock={editingBlock}
      />
    </>
  );
}
