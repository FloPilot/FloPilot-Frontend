"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { ShopTasksPanel } from "@/components/tasks/shop-tasks-panel";
import type { DashboardAttentionItem } from "@/lib/dashboard-insights";
import type { DashboardLiveStats } from "@/lib/dashboard-insights";
import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { buildExpandedShopTasks } from "@/lib/shop-tasks";
import {
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { Button } from "@/components/ui/button";
import type { Order, ScheduleBlock, StationJobRun, Task } from "@/types";
import { cn } from "@/lib/utils";

export function DashboardTasksSection({
  attentionItems,
  productionTasks,
  schedulingQueue,
  artworkPendingEntries,
  awaitingApprovalOrders,
  rushOrdersList,
  overdueOrders,
  readyToShipOrders,
  orders,
  scheduleBlocks,
  jobRuns,
  stats,
  limit = 8,
}: {
  attentionItems: DashboardAttentionItem[];
  productionTasks: Task[];
  schedulingQueue: SchedulingQueueOrder[];
  artworkPendingEntries: ArtworkQueueEntry[];
  awaitingApprovalOrders: Order[];
  rushOrdersList: Order[];
  overdueOrders: Order[];
  readyToShipOrders: Order[];
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  stats: Pick<
    DashboardLiveStats,
    "toSchedule" | "toScheduleOrders" | "lowStockItems"
  >;
  limit?: number;
}) {
  const actionCount = useMemo(() => {
    const tasks = buildExpandedShopTasks({
      attentionItems,
      productionTasks,
      schedulingQueue,
      artworkPendingEntries,
      awaitingApprovalOrders,
      rushOrdersList,
      overdueOrders,
      readyToShipOrders,
      lowStockItems: stats.lowStockItems,
      orders,
      scheduleBlocks,
      jobRuns,
    });
    return tasks.filter((task) => task.workflowStatus !== "completed").length;
  }, [
    attentionItems,
    productionTasks,
    schedulingQueue,
    artworkPendingEntries,
    awaitingApprovalOrders,
    rushOrdersList,
    overdueOrders,
    readyToShipOrders,
    stats.lowStockItems,
    orders,
    scheduleBlocks,
    jobRuns,
  ]);

  return (
    <section className="mt-4 space-y-4 border-t border-[#e3e3e3] pt-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className={dashboardSectionTitleClass}>Tasks</h2>
          {actionCount > 0 ? (
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {actionCount} item{actionCount !== 1 ? "s" : ""} need your attention
            </p>
          ) : (
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              You&apos;re caught up — nothing urgent on the floor
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-lg px-2.5 text-[13px] text-brand-primary"
          nativeButton={false}
          render={<Link href="/app/tasks" />}
        >
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <ShopTasksPanel
        attentionItems={attentionItems}
        productionTasks={productionTasks}
        schedulingQueue={schedulingQueue}
        artworkPendingEntries={artworkPendingEntries}
        awaitingApprovalOrders={awaitingApprovalOrders}
        rushOrdersList={rushOrdersList}
        overdueOrders={overdueOrders}
        readyToShipOrders={readyToShipOrders}
        orders={orders}
        scheduleBlocks={scheduleBlocks}
        jobRuns={jobRuns}
        stats={stats}
        limit={limit}
      />
    </section>
  );
}
