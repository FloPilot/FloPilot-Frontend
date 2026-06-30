"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Sparkles } from "lucide-react";
import { ManualTasksBoard } from "@/components/tasks/manual-tasks-board";
import { ShopTasksPanel } from "@/components/tasks/shop-tasks-panel";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { computeDashboardInsights } from "@/lib/dashboard-insights";
import type { DashboardAttentionItem } from "@/lib/dashboard-insights";
import {
  buildExpandedShopTasks,
  parseTasksPageFilter,
  type ShopTaskFilter,
  type ShopTaskPageFilter,
} from "@/lib/shop-tasks";
import {
  dashboardElevatedShadow,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type TasksBoard = "tasks" | "actions";

export function TasksView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilter = parseTasksPageFilter(searchParams.get("filter"));
  const [filter, setFilter] = useState<ShopTaskPageFilter>(initialFilter);
  const [board, setBoard] = useState<TasksBoard>("tasks");

  useEffect(() => {
    setFilter(parseTasksPageFilter(searchParams.get("filter")));
  }, [searchParams]);
  const { isModuleEnabled } = useShopSettings();
  const {
    orders: activeOrders,
    scheduleBlocks: activeScheduleBlocks,
    jobRuns,
    machines,
    productionTasks,
    dashboardStats,
    shopDataLoading,
    shopDataError,
  } = useSchedule();

  const insights = useMemo(
    () =>
      computeDashboardInsights({
        orders: activeOrders,
        scheduleBlocks: activeScheduleBlocks,
        jobRuns,
        machines,
        productionTasks,
        apiStats: dashboardStats,
      }),
    [
      activeOrders,
      activeScheduleBlocks,
      jobRuns,
      machines,
      productionTasks,
      dashboardStats,
    ]
  );

  const attentionItems = useMemo(
    () =>
      insights.attention.filter((item: DashboardAttentionItem) => {
        if (item.kind === "artwork" && !isModuleEnabled("artwork")) return false;
        if (item.kind === "inventory" && !isModuleEnabled("inventory")) {
          return false;
        }
        return true;
      }),
    [insights.attention, isModuleEnabled]
  );

  const actionCount = useMemo(() => {
    const tasks = buildExpandedShopTasks({
      attentionItems,
      productionTasks,
      schedulingQueue: insights.schedulingQueue,
      artworkPendingEntries: insights.artworkPendingEntries,
      awaitingApprovalOrders: insights.awaitingApprovalOrders,
      rushOrdersList: insights.rushOrdersList,
      overdueOrders: insights.overdueOrders,
      readyToShipOrders: insights.readyToShipOrders,
      lowStockItems: insights.stats.lowStockItems,
      orders: activeOrders,
      scheduleBlocks: activeScheduleBlocks,
      jobRuns,
      includeCompleted: true,
    });
    return tasks.filter((task) => task.workflowStatus !== "completed").length;
  }, [
    attentionItems,
    productionTasks,
    insights.schedulingQueue,
    insights.artworkPendingEntries,
    insights.awaitingApprovalOrders,
    insights.rushOrdersList,
    insights.overdueOrders,
    insights.readyToShipOrders,
    insights.stats.lowStockItems,
    activeOrders,
    activeScheduleBlocks,
    jobRuns,
  ]);

  const handleFilterChange = useCallback(
    (next: ShopTaskFilter) => {
      const normalized: ShopTaskPageFilter =
        next === "open" ? "needs_action" : (next as ShopTaskPageFilter);
      setFilter(normalized);
      const params = new URLSearchParams();
      if (normalized !== "all") {
        params.set("filter", normalized);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  if (shopDataLoading) {
    return <AppLoadingScreen label="Loading tasks…" />;
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Tasks</h1>
          {board === "tasks" ? (
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              Create and assign tasks across your team — set deadlines and track
              them through to done.
            </p>
          ) : actionCount > 0 ? (
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {actionCount} item{actionCount !== 1 ? "s" : ""} need your attention
              across orders, production, and the floor
            </p>
          ) : (
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              You&apos;re caught up — nothing urgent on the floor
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
            dashboardElevatedShadow
          )}
        >
          {(
            [
              { id: "tasks" as const, label: "Tasks", icon: ListChecks },
              { id: "actions" as const, label: "Action items", icon: Sparkles },
            ]
          ).map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setBoard(option.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  board === option.id
                    ? "bg-[#f4f7fd] text-[#2c6ecb]"
                    : "text-[#616161] hover:text-[#303030]"
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {shopDataError ? (
        <p className="text-sm text-destructive">{shopDataError}</p>
      ) : null}

      {board === "tasks" ? (
        <ManualTasksBoard />
      ) : (
        <ShopTasksPanel
          layout="page"
          attentionItems={attentionItems}
          productionTasks={productionTasks}
          schedulingQueue={insights.schedulingQueue}
          artworkPendingEntries={insights.artworkPendingEntries}
          awaitingApprovalOrders={insights.awaitingApprovalOrders}
          rushOrdersList={insights.rushOrdersList}
          overdueOrders={insights.overdueOrders}
          readyToShipOrders={insights.readyToShipOrders}
          orders={activeOrders}
          scheduleBlocks={activeScheduleBlocks}
          jobRuns={jobRuns}
          stats={insights.stats}
          filter={filter}
          onFilterChange={handleFilterChange}
        />
      )}
    </main>
  );
}
