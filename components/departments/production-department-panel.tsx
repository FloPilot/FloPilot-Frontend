"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Factory,
  Pause,
  PlayCircle,
} from "lucide-react";
import {
  DepartmentEmptyState,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { ScheduleBlockOrderLine } from "@/components/orders/order-display-line";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Badge } from "@/components/ui/badge";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { departmentProductionMachineHref } from "@/lib/departments";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import {
  formatRunElapsed,
  getActiveRunForMachine,
  getStaleIncompleteRunsForMachine,
  getUpcomingRunsForMachine,
} from "@/lib/station-runs";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ProductionFilter =
  | "all"
  | "running"
  | "needs_close"
  | "queued"
  | "offline";

const FILTERS: { value: ProductionFilter; label: string }[] = [
  { value: "all", label: "All stations" },
  { value: "running", label: "Running" },
  { value: "needs_close", label: "Needs close" },
  { value: "queued", label: "Queued" },
  { value: "offline", label: "Offline" },
];

export function ProductionDepartmentPanel() {
  const { machines, activeScheduleBlocks, jobRuns, shopDataLoading } =
    useSchedule();
  const { filterMachines } = useStaffAccess();
  const [filter, setFilter] = useState<ProductionFilter>("all");

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleMachines = useMemo(
    () => filterMachines(machines),
    [filterMachines, machines]
  );

  const decorated = useMemo(() => {
    const today = new Date();
    return [...visibleMachines]
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((machine) => {
        const activeRun = getActiveRunForMachine(jobRuns, machine.id);
        const activeBlock = activeRun
          ? activeScheduleBlocks.find(
              (block) => block.id === activeRun.scheduleBlockId
            )
          : undefined;
        const upcoming = getUpcomingRunsForMachine(
          activeScheduleBlocks,
          jobRuns,
          machine.id
        );
        const stale = getStaleIncompleteRunsForMachine(
          activeScheduleBlocks,
          jobRuns,
          machine.id
        );
        const upcomingToday = upcoming.filter(({ block }) =>
          isSameDay(parseISO(block.startAt), today)
        );

        return {
          machine,
          activeRun,
          activeBlock,
          upcoming,
          upcomingToday,
          stale,
          nextJob: upcoming[0]?.block,
        };
      });
  }, [visibleMachines, activeScheduleBlocks, jobRuns]);

  const filterCounts = useMemo(
    () => ({
      all: decorated.length,
      running: decorated.filter((d) => d.activeRun).length,
      needs_close: decorated.filter((d) => d.stale.length > 0).length,
      queued: decorated.filter(
        (d) => !d.activeRun && d.upcoming.length > 0
      ).length,
      offline: decorated.filter((d) => !d.machine.active).length,
    }),
    [decorated]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "running":
        return decorated.filter((d) => d.activeRun);
      case "needs_close":
        return decorated.filter((d) => d.stale.length > 0);
      case "queued":
        return decorated.filter((d) => !d.activeRun && d.upcoming.length > 0);
      case "offline":
        return decorated.filter((d) => !d.machine.active);
      default:
        return decorated;
    }
  }, [decorated, filter]);

  return (
    <DepartmentsShell
      activeSlug="production"
      title="Production stations"
      description="Open a press or station to run jobs, clear the queue, and close out anything left unfinished from earlier days."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => {
          const count = filterCounts[item.value];
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                filter === item.value
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              {item.label}
              {count > 0 ? ` (${count})` : null}
            </button>
          );
        })}
      </div>

      {shopDataLoading && decorated.length === 0 ? (
        <DepartmentEmptyState
          icon={Factory}
          title="Loading stations…"
          description="Pulling the latest machine schedule."
        />
      ) : decorated.length === 0 ? (
        <DepartmentEmptyState
          icon={Factory}
          title="No stations yet"
          description="Add machines in Machines settings, then they’ll show up here for the floor."
        />
      ) : filtered.length === 0 ? (
        <DepartmentEmptyState
          icon={Factory}
          title="Nothing in this filter"
          description="Try another filter, or clear back to all stations."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(
            ({
              machine,
              activeRun,
              activeBlock,
              upcoming,
              upcomingToday,
              stale,
              nextJob,
            }) => {
              const styles = machineColorStyles[machine.color];
              const needsClose = stale.length > 0;

              return (
                <Link
                  key={machine.id}
                  href={departmentProductionMachineHref(machine.id)}
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "group flex flex-col rounded-xl border border-[#e3e3e3] transition-[border-color,box-shadow] hover:border-[#2c6ecb]/35 hover:shadow-sm",
                    needsClose && "border-[#f0d9a8] bg-[#fffdf8]",
                    activeBlock && !needsClose && "border-[#c4d7f2] bg-[#fafcff]",
                    !machine.active && "opacity-90"
                  )}
                >
                  <div className={cn("h-1.5 w-full rounded-t-xl", styles.cap)} />

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#303030] transition-colors group-hover:text-[#2c6ecb]">
                          {machine.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#616161]">
                          {RESOURCE_TYPE_LABELS[machine.type]} ·{" "}
                          {formatOperatingHoursSummary(machine)}
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
                      <div className="mt-3 rounded-lg border border-[#c4d7f2] bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                            {activeRun?.status === "paused" ? (
                              <Pause className="size-3" />
                            ) : (
                              <PlayCircle className="size-3" />
                            )}
                            {activeRun?.status === "paused"
                              ? "Paused"
                              : "Running now"}
                          </p>
                          {activeRun?.status === "running" &&
                          activeRun.startedAt ? (
                            <span className="text-[11px] font-medium tabular-nums text-[#2c6ecb]">
                              {formatRunElapsed(activeRun.startedAt)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                          {activeBlock.imprintLabel || activeBlock.jobName}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                          <ScheduleBlockOrderLine block={activeBlock} /> ·{" "}
                          {activeBlock.customerName}
                        </p>
                      </div>
                    ) : needsClose ? (
                      <div className="mt-3 rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a6116]">
                          Needs close-out
                        </p>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                          {stale[0]?.block.imprintLabel ||
                            stale[0]?.block.jobName}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8a6116]/85">
                          {stale.length === 1
                            ? "1 unfinished job from an earlier day"
                            : `${stale.length} unfinished jobs from earlier days`}
                        </p>
                      </div>
                    ) : nextJob ? (
                      <div className="mt-3 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                          Up next
                        </p>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                          {nextJob.imprintLabel || nextJob.jobName}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                          <ScheduleBlockOrderLine block={nextJob} /> ·{" "}
                          {format(parseISO(nextJob.startAt), "EEE h:mm a")}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-2.5">
                        <p className="text-[13px] text-[#616161]">
                          Queue is clear
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-medium text-[#616161]">
                        {upcoming.length} queued
                      </span>
                      {upcomingToday.length > 0 ? (
                        <span className="rounded-md bg-[#e8f0fb] px-2 py-0.5 text-[11px] font-medium text-[#2c6ecb]">
                          {upcomingToday.length} today
                        </span>
                      ) : null}
                      {needsClose ? (
                        <span className="rounded-md bg-[#fff1d6] px-2 py-0.5 text-[11px] font-semibold text-[#8a6116]">
                          {stale.length} to close
                        </span>
                      ) : null}
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-medium text-[#2c6ecb] opacity-0 transition-opacity group-hover:opacity-100">
                        Open
                        <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}
    </DepartmentsShell>
  );
}
