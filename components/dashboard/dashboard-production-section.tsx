"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DashboardProductionFloor } from "@/components/dashboard/dashboard-production-floor";
import { DashboardProductionKpiRow } from "@/components/dashboard/dashboard-production-kpi-row";
import { DashboardProductionPipeline } from "@/components/dashboard/dashboard-production-pipeline";
import { Button } from "@/components/ui/button";
import type { TodayFloorItem } from "@/lib/dashboard-insights";
import { computeProductionDashboardMetrics, buildProductionPipelineSnapshot } from "@/lib/dashboard-production";
import {
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import type { Order, ScheduleBlock, StationJobRun, Task } from "@/types";

export function DashboardProductionSection({
  orders,
  scheduleBlocks,
  jobRuns,
  productionTasks,
  todayFloor,
  tomorrowFloor,
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  productionTasks: Task[];
  todayFloor: TodayFloorItem[];
  tomorrowFloor: TodayFloorItem[];
}) {
  const metrics = useMemo(
    () =>
      computeProductionDashboardMetrics({
        orders,
        scheduleBlocks,
        jobRuns,
        productionTasks,
      }),
    [orders, scheduleBlocks, jobRuns, productionTasks]
  );

  const pipelineSnapshot = useMemo(
    () =>
      buildProductionPipelineSnapshot({
        orders,
        scheduleBlocks,
        jobRuns,
        productionTasks,
      }),
    [orders, scheduleBlocks, jobRuns, productionTasks]
  );

  const floorSummary = useMemo(() => {
    const parts: string[] = [];
    if (metrics.runningNow > 0) {
      parts.push(
        `${metrics.runningNow} machine${metrics.runningNow !== 1 ? "s" : ""} running`
      );
    }
    const upcoming = metrics.upcomingEvents;
    if (upcoming > 0) {
      parts.push(
        `${upcoming} event${upcoming !== 1 ? "s" : ""} on the calendar`
      );
    }
    if (metrics.inProgressTasks > 0) {
      parts.push(`${metrics.inProgressTasks} task${metrics.inProgressTasks !== 1 ? "s" : ""} in progress`);
    }
    return parts.length > 0
      ? parts.join(" · ")
      : "Floor is quiet — schedule the next run on the calendar";
  }, [
    metrics,
    todayFloor.length,
    tomorrowFloor.length,
  ]);

  return (
    <section className="mt-4 space-y-4 border-t border-[#e3e3e3] pt-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className={dashboardSectionTitleClass}>Production</h2>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>{floorSummary}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-lg px-2.5 text-[13px] text-brand-primary"
          nativeButton={false}
          render={<Link href="/app/production" />}
        >
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <DashboardProductionKpiRow metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch lg:gap-5">
        <div className="flex min-h-0 lg:col-span-3">
          <DashboardProductionFloor
            className="flex-1"
            today={todayFloor}
            tomorrow={tomorrowFloor}
            runningNow={metrics.runningNow}
            scheduledToday={metrics.scheduledToday}
          />
        </div>
        <div className="flex min-h-0 lg:col-span-2">
          <DashboardProductionPipeline
            className="flex-1"
            snapshot={pipelineSnapshot}
            upcomingEvents={metrics.upcomingEvents}
          />
        </div>
      </div>
    </section>
  );
}
