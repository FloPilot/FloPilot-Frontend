"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TodayFloorItem } from "@/lib/dashboard-insights";
import {
  dashboardCardClass,
  dashboardPanelHeaderClass,
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

function FloorRow({ item }: { item: TodayFloorItem }) {
  const isRunning = item.kind === "running";

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)] transition-colors hover:border-[#d4d4d4] hover:shadow-[0_1px_0_rgba(26,26,26,0.05),0_2px_4px_rgba(26,26,26,0.08)]"
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          item.kind === "scheduled" && item.machineColor
            ? MACHINE_DOT[item.machineColor] ?? "bg-brand-primary"
            : "bg-emerald-500"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-brand-ink group-hover:text-brand-primary">
            {item.orderNumber}
          </span>
          {isRunning && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              <Play className="size-2.5 fill-current" />
              Running
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-brand-muted">
          {item.machineName} · {item.imprintLabel}
          {item.kind === "scheduled" && item.timeLabel
            ? ` · ${item.timeLabel}`
            : ""}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-brand-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function DayColumn({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: TodayFloorItem[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-muted">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-6 text-center text-sm text-[#616161] shadow-[inset_0_1px_2px_rgba(26,26,26,0.03)]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <FloorRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardProductionStrip({
  today,
  tomorrow,
  scheduledToday,
  runningNow,
}: {
  today: TodayFloorItem[];
  tomorrow: TodayFloorItem[];
  scheduledToday: number;
  runningNow: number;
}) {
  const totalUpcoming = today.length + tomorrow.length;

  return (
    <section className={dashboardCardClass}>
      <div className={dashboardPanelHeaderClass}>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-muted" strokeWidth={1.75} />
          <h2 className="text-[13px] font-medium text-[#303030]">
            Production schedule
          </h2>
          {totalUpcoming > 0 && (
            <span className="text-xs text-brand-muted">
              {runningNow} running · {scheduledToday} today
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2 text-xs text-brand-primary"
          nativeButton={false}
          render={<Link href="/app/calendar" />}
        >
          Open calendar
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5">
        <DayColumn
          title="Today"
          items={today}
          emptyLabel="Nothing scheduled on the floor today."
        />
        <DayColumn
          title="Tomorrow"
          items={tomorrow}
          emptyLabel="No jobs queued for tomorrow yet."
        />
      </div>
    </section>
  );
}
