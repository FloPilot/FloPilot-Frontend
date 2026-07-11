"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  PlayCircle,
  Power,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import { ScheduleBlockOrderLine } from "@/components/orders/order-display-line";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import {
  formatRunElapsed,
  getActiveRunForMachine,
  getUpcomingRunsForMachine,
} from "@/lib/station-runs";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardKpiTitleClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type StatFilter = "all" | "online" | "running" | "today" | "attention";
type StatTone = "neutral" | "blue" | "amber" | "green";

const TONE_STYLES: Record<
  StatTone,
  {
    surface: string;
    border: string;
    iconWrap: string;
    iconColor: string;
    valueColor: string;
  }
> = {
  neutral: {
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  },
  blue: {
    surface: "bg-[#f4f7fd]",
    border: "border-[#c4d7f2]",
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#2c6ecb]",
  },
  amber: {
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  },
  green: {
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
};

export function MachinesOverview({
  machineFilter,
  canManage = false,
}: {
  machineFilter?: string[] | null;
  canManage?: boolean;
}) {
  const { machines, activeScheduleBlocks, jobRuns, shopDataLoading } =
    useSchedule();
  const [filter, setFilter] = useState<StatFilter>("all");

  // Re-render periodically so live "elapsed" timers stay current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const decorated = useMemo(() => {
    const visible = machineFilter?.length
      ? machines.filter((machine) => machineFilter.includes(machine.id))
      : machines;
    const today = new Date();

    return [...visible]
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((machine) => {
        const activeRun = getActiveRunForMachine(jobRuns, machine.id);
        const activeBlock = activeRun
          ? activeScheduleBlocks.find((b) => b.id === activeRun.scheduleBlockId)
          : undefined;
        const upcoming = getUpcomingRunsForMachine(
          activeScheduleBlocks,
          jobRuns,
          machine.id
        );
        const upcomingToday = upcoming.filter(({ block }) =>
          isSameDay(parseISO(block.startAt), today)
        ).length;

        return {
          machine,
          activeRun,
          activeBlock,
          upcoming,
          nextJob: upcoming[0]?.block,
          isOnline: machine.active,
          isRunning: Boolean(activeRun),
          hasUpcomingToday: upcomingToday > 0,
          needsAttention: !machine.active && Boolean(machine.statusMessage),
        };
      });
  }, [machines, machineFilter, activeScheduleBlocks, jobRuns]);

  const stats = useMemo(
    () => ({
      total: decorated.length,
      online: decorated.filter((d) => d.isOnline).length,
      running: decorated.filter((d) => d.isRunning).length,
      upcomingToday: decorated.filter((d) => d.hasUpcomingToday).length,
      needsAttention: decorated.filter((d) => d.needsAttention).length,
    }),
    [decorated]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "online":
        return decorated.filter((d) => d.isOnline);
      case "running":
        return decorated.filter((d) => d.isRunning);
      case "today":
        return decorated.filter((d) => d.hasUpcomingToday);
      case "attention":
        return decorated.filter((d) => d.needsAttention);
      default:
        return decorated;
    }
  }, [decorated, filter]);

  const toggle = (next: StatFilter) =>
    setFilter((current) => (current === next ? "all" : next));

  if (shopDataLoading && decorated.length === 0) {
    return <MachinesOverviewSkeleton canManage={canManage} />;
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Machines</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            {stats.needsAttention > 0
              ? `${stats.needsAttention} station${stats.needsAttention !== 1 ? "s" : ""} need attention — open a machine to run events on the floor`
              : "Station overview — open a machine to scan events, manage the active run, and see what's next"}
          </p>
        </div>
        {canManage && (
          <Button
            className={cn(dashboardControlClass, "h-9")}
            nativeButton={false}
            render={<Link href="/app/machines/settings" />}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Stations online"
          value={`${stats.online}/${stats.total}`}
          hint="Available for scheduling"
          icon={Power}
          tone={
            stats.total > 0 && stats.online === stats.total ? "green" : "neutral"
          }
          active={filter === "online"}
          onClick={() => toggle("online")}
        />
        <StatTile
          label="Events running"
          value={String(stats.running)}
          hint="Active runs on the floor"
          icon={PlayCircle}
          tone={stats.running > 0 ? "blue" : "neutral"}
          active={filter === "running"}
          disabled={stats.running === 0}
          onClick={() => toggle("running")}
        />
        <StatTile
          label="Upcoming today"
          value={String(stats.upcomingToday)}
          hint="Stations with work queued today"
          icon={CalendarClock}
          tone="neutral"
          active={filter === "today"}
          disabled={stats.upcomingToday === 0}
          onClick={() => toggle("today")}
        />
        <StatTile
          label="Needs attention"
          value={String(stats.needsAttention)}
          hint="Offline with a reported issue"
          icon={AlertTriangle}
          tone={stats.needsAttention > 0 ? "amber" : "green"}
          active={filter === "attention"}
          disabled={stats.needsAttention === 0}
          onClick={() => toggle("attention")}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
            {filter === "all" ? "Your stations" : `Showing ${FILTER_LABELS[filter]}`}
          </h2>
          <p className="mt-1 text-sm text-[#616161]">
            {filter === "all"
              ? "Open a station to scan events, manage the active run, and view what's coming up next."
              : `${filtered.length} of ${stats.total} station${stats.total !== 1 ? "s" : ""}`}
          </p>
        </div>
        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              dashboardControlClass,
              "h-8 gap-1.5 px-2.5 text-[12px] text-[#616161] hover:text-[#303030]"
            )}
          >
            Clear filter
          </button>
        )}
      </div>

      {decorated.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-14 text-center">
          <p className="text-sm font-medium text-[#303030]">
            No stations match this filter
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-1 text-sm font-medium text-[#2c6ecb] hover:underline"
          >
            Show all stations
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(
            ({ machine, activeRun, activeBlock, upcoming, nextJob }) => {
              const styles = machineColorStyles[machine.color];

              return (
                <Link
                  key={machine.id}
                  href={`/app/machines/${machine.id}`}
                  className={cn(
                    dashboardCardClass,
                    "group flex flex-col transition-[border-color,box-shadow] hover:border-[#c9cccf]",
                    !machine.active && "opacity-90"
                  )}
                >
                  <div className={cn("h-1.5 w-full shrink-0", styles.cap)} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#303030] transition-colors group-hover:text-[#2c6ecb]">
                          {machine.name}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[#616161]">
                          {RESOURCE_TYPE_LABELS[machine.type]}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 gap-1 rounded-md",
                          machine.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        )}
                      >
                        {machine.active ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            Online
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="size-3" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>

                    {activeBlock ? (
                      <div className="mt-4 rounded-lg border border-[#c4d7f2] bg-[#f4f7fd] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2c6ecb] opacity-75" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-[#2c6ecb]" />
                            </span>
                            Running now
                          </p>
                          {activeRun?.status === "running" &&
                            activeRun.startedAt && (
                              <span className="text-[11px] font-medium tabular-nums text-[#2c6ecb]">
                                {formatRunElapsed(activeRun.startedAt)}
                              </span>
                            )}
                          {activeRun?.status === "paused" && (
                            <span className="text-[11px] font-medium text-[#8a6116]">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                          {activeBlock.jobName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#616161]">
                          <ScheduleBlockOrderLine block={activeBlock} /> · {activeBlock.customerName}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#f6f6f7] px-3 py-2.5">
                        <p className="text-xs text-[#616161]">No active event</p>
                        {nextJob ? (
                          <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                            Next: {nextJob.jobName}
                          </p>
                        ) : (
                          <p className="mt-1 text-[13px] text-[#616161]">
                            Queue is clear
                          </p>
                        )}
                      </div>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-[#616161]">Upcoming</dt>
                        <dd className="mt-0.5 font-medium text-[#303030]">
                          {upcoming.length} event
                          {upcoming.length !== 1 ? "s" : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#616161]">Next start</dt>
                        <dd className="mt-0.5 truncate font-medium text-[#303030]">
                          {nextJob
                            ? format(parseISO(nextJob.startAt), "MMM d · h:mm a")
                            : "—"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="flex items-center gap-1 text-xs text-[#616161]">
                          <Clock className="size-3" />
                          Hours
                        </dt>
                        <dd className="mt-0.5 text-xs font-medium leading-snug text-[#303030]">
                          {formatOperatingHoursSummary(machine)}
                        </dd>
                      </div>
                    </dl>

                    {!machine.active && machine.statusMessage && (
                      <p className="mt-3 line-clamp-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                        {machine.statusMessage}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-[#ebebeb] pt-3 text-[13px] font-medium text-[#2c6ecb]">
                      Open station
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}
    </main>
  );
}

const FILTER_LABELS: Record<Exclude<StatFilter, "all">, string> = {
  online: "online stations",
  running: "running stations",
  today: "stations with work today",
  attention: "stations needing attention",
};

function EmptyState() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
        <Cpu className="size-6" />
      </div>
      <p className="text-sm font-medium text-[#303030]">No machines yet</p>
      <p className="mt-2 text-sm leading-relaxed text-[#616161]">
        Add your presses and workstations to track active runs, schedule events,
        and manage the floor from here.
      </p>
      <Button
        className={cn(dashboardControlClass, "mt-5 h-9")}
        nativeButton={false}
        render={<Link href="/app/machines/settings" />}
      >
        <SlidersHorizontal className="size-3.5" />
        Add your first machine
      </Button>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: StatTone;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const toneStyles = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex min-h-[128px] flex-col rounded-lg border p-4 text-left transition-[border-color,box-shadow]",
        toneStyles.surface,
        toneStyles.border,
        dashboardElevatedShadow,
        !disabled && "cursor-pointer hover:border-[#c9cccf]",
        disabled && "cursor-default",
        active && "ring-2 ring-[#2c6ecb]/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            toneStyles.iconWrap
          )}
        >
          <Icon
            className={cn("size-3.5", toneStyles.iconColor)}
            strokeWidth={1.75}
          />
        </div>
        <p className={dashboardKpiTitleClass}>{label}</p>
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5", toneStyles.valueColor)}>
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
    </button>
  );
}

function MachinesOverviewSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-[#ebebeb]" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#f1f1f1]" />
        </div>
        {canManage && (
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[#ebebeb]" />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "min-h-[128px] rounded-lg border border-[#e3e3e3] bg-white p-4",
              dashboardElevatedShadow
            )}
          >
            <div className="flex items-center gap-2">
              <div className="size-8 animate-pulse rounded-lg bg-[#f1f1f1]" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-[#f1f1f1]" />
            </div>
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-[#ebebeb]" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#f1f1f1]" />
          </div>
        ))}
      </div>

      <div className="h-5 w-40 animate-pulse rounded bg-[#ebebeb]" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(dashboardCardClass, "flex flex-col")}
          >
            <div className="h-1.5 w-full bg-[#ebebeb]" />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-[#ebebeb]" />
                  <div className="h-3 w-20 animate-pulse rounded bg-[#f1f1f1]" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-md bg-[#f1f1f1]" />
              </div>
              <div className="h-14 w-full animate-pulse rounded-lg bg-[#f6f6f7]" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-8 animate-pulse rounded bg-[#f1f1f1]" />
                <div className="h-8 animate-pulse rounded bg-[#f1f1f1]" />
              </div>
              <div className="h-8 w-full animate-pulse rounded bg-[#f1f1f1]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
