"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DashboardAreaChart } from "@/components/dashboard/dashboard-area-chart";
import { DashboardTasksSection } from "@/components/dashboard/dashboard-tasks-section";
import { DashboardKpiSection } from "@/components/dashboard/dashboard-kpi-section";
import { DashboardProductionSection } from "@/components/dashboard/dashboard-production-section";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { buildDashboardKpiSnapshot, buildDashboardOrderFinancials } from "@/lib/dashboard-charts";
import {
  applyDashboardFilters,
  buildDashboardCustomerOptions,
  buildDashboardMachineOptions,
  DEFAULT_DASHBOARD_FILTERS,
  getDashboardDateRange,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import { computeDashboardInsights } from "@/lib/dashboard-insights";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import type { DashboardAttentionItem } from "@/lib/dashboard-insights";

function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-[#303030]">{title}</h3>
          {description ? (
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ShopDashboard() {
  const {
    activeOrders,
    activeScheduleBlocks,
    jobRuns,
    machines,
    customers,
    productionTasks,
    dashboardStats,
    shopDataLoading,
    shopDataError,
    refreshShopData,
    getCustomerById,
  } = useSchedule();
  const { settings, isModuleEnabled } = useShopSettings();
  const [filters, setFilters] = useState<DashboardFilters>(
    DEFAULT_DASHBOARD_FILTERS
  );

  const dateRange = getDashboardDateRange(filters.dateRangeKey);

  const filteredData = useMemo(
    () =>
      applyDashboardFilters({
        orders: activeOrders,
        scheduleBlocks: activeScheduleBlocks,
        jobRuns,
        filters,
      }),
    [activeOrders, activeScheduleBlocks, jobRuns, filters]
  );

  const machineOptions = useMemo(
    () => buildDashboardMachineOptions(machines),
    [machines]
  );

  const customerOptions = useMemo(
    () => buildDashboardCustomerOptions(activeOrders, customers),
    [activeOrders, customers]
  );

  const insights = useMemo(
    () =>
      computeDashboardInsights({
        orders: filteredData.orders,
        scheduleBlocks: filteredData.scheduleBlocks,
        jobRuns: filteredData.jobRuns,
        machines,
        productionTasks,
        apiStats: dashboardStats,
      }),
    [
      filteredData.orders,
      filteredData.scheduleBlocks,
      filteredData.jobRuns,
      machines,
      productionTasks,
      dashboardStats,
    ]
  );

  const {
    stats,
    attention,
    recentOrders,
    todayFloor,
    tomorrowFloor,
    schedulingQueue,
    artworkPendingEntries,
    awaitingApprovalOrders,
    rushOrdersList,
    overdueOrders,
    readyToShipOrders,
  } = insights;

  const dashboardFinancials = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      getCustomer: getCustomerById,
    }),
    [settings.taxRate, settings.pricingMatrix, getCustomerById]
  );

  const financialSnapshot = useMemo(
    () =>
      buildDashboardKpiSnapshot(
        filteredData.orders,
        stats.activeOrders,
        stats.dueThisWeek,
        filteredData.scheduleBlocks,
        dateRange.trendDays,
        dashboardFinancials
      ),
    [
      filteredData.orders,
      filteredData.scheduleBlocks,
      stats.activeOrders,
      stats.dueThisWeek,
      dateRange.trendDays,
      dashboardFinancials,
    ]
  );

  const recentOrderFinancials = useMemo(
    () => buildDashboardOrderFinancials(recentOrders, dashboardFinancials),
    [recentOrders, dashboardFinancials]
  );

  const filteredAttention = useMemo(
    () =>
      attention.filter((item: DashboardAttentionItem) => {
        if (item.kind === "artwork" && !isModuleEnabled("artwork")) return false;
        if (item.kind === "inventory" && !isModuleEnabled("inventory")) {
          return false;
        }
        return true;
      }),
    [attention, isModuleEnabled]
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        {shopDataError && (
          <div
            className={cn(
              dashboardCardClass,
              "flex items-center justify-between gap-3 border-destructive/30 px-4 py-3 text-sm text-destructive"
            )}
          >
            <span>{shopDataError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 bg-white"
              onClick={() => void refreshShopData()}
            >
              Retry
            </Button>
          </div>
        )}

        {shopDataLoading ||
        (!shopDataError && activeOrders.length === 0 && !dashboardStats) ? (
          <AppLoadingScreen label="Loading shop data…" />
        ) : (
          <>
            <DashboardToolbar
              stats={stats}
              filters={filters}
              machineOptions={machineOptions}
              customerOptions={customerOptions}
              onFiltersChange={setFilters}
            />

            <DashboardKpiSection
              stats={stats}
              snapshot={financialSnapshot}
              periodLabel={dateRange.label}
            />

            <DashboardTasksSection
              attentionItems={filteredAttention}
              productionTasks={productionTasks}
              schedulingQueue={schedulingQueue}
              artworkPendingEntries={artworkPendingEntries}
              awaitingApprovalOrders={awaitingApprovalOrders}
              rushOrdersList={rushOrdersList}
              overdueOrders={overdueOrders}
              readyToShipOrders={readyToShipOrders}
              orders={filteredData.orders}
              scheduleBlocks={filteredData.scheduleBlocks}
              jobRuns={filteredData.jobRuns}
              stats={stats}
              limit={8}
            />

            <DashboardProductionSection
              orders={filteredData.orders}
              scheduleBlocks={filteredData.scheduleBlocks}
              jobRuns={filteredData.jobRuns}
              productionTasks={productionTasks}
              todayFloor={todayFloor}
              tomorrowFloor={tomorrowFloor}
            />

            <section className="mt-4 space-y-4 border-t border-[#e3e3e3] pt-5">
              <div>
                <h2 className={dashboardSectionTitleClass}>Business snapshot</h2>
                <p className={cn("mt-1", dashboardTaskDetailClass)}>
                  Order and revenue trends for {dateRange.label.toLowerCase()}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <Panel
                  title="Orders"
                  description={`New orders · ${dateRange.label.toLowerCase()}`}
                >
                  {financialSnapshot.orderTrend.some((point) => point.orders > 0) ? (
                    <DashboardAreaChart
                      points={financialSnapshot.orderTrend}
                      valueKey="orders"
                      formatValue={(value) => String(value)}
                      height={140}
                      changePct={financialSnapshot.ordersChangePct}
                    />
                  ) : (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center shadow-[inset_0_1px_2px_rgba(26,26,26,0.03)]">
                      <p className="text-sm font-semibold text-[#303030]">
                        No orders yet
                      </p>
                      <p className={cn("mt-1", dashboardTaskDetailClass)}>
                        New orders will show a trend here for{" "}
                        {dateRange.label.toLowerCase()}.
                      </p>
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Revenue"
                  description={`Collected revenue · ${dateRange.label.toLowerCase()}`}
                >
                  {financialSnapshot.revenueInPeriod > 0 ? (
                    <DashboardAreaChart
                      points={financialSnapshot.orderTrend}
                      valueKey="revenue"
                      formatValue={(value) => formatCurrency(value)}
                      height={140}
                      changePct={financialSnapshot.revenueChangePct}
                    />
                  ) : (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center shadow-[inset_0_1px_2px_rgba(26,26,26,0.03)]">
                      <p className="text-sm font-semibold text-[#303030]">
                        No revenue yet
                      </p>
                      <p className={cn("mt-1", dashboardTaskDetailClass)}>
                        Revenue for {dateRange.label.toLowerCase()} will appear
                        here.
                      </p>
                    </div>
                  )}
                </Panel>
              </div>
            </section>

            <Panel
              title="Recent orders"
              description="Latest work entering the shop"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg px-2.5 text-[13px] text-brand-primary"
                  nativeButton={false}
                  render={<Link href="/app/orders" />}
                >
                  View all
                  <ArrowRight className="size-3.5" />
                </Button>
              }
            >
              {recentOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-[#303030]">
                    No orders yet
                  </p>
                  <p className={cn("mt-1", dashboardTaskDetailClass)}>
                    Orders will appear here once you start tracking production.
                  </p>
                </div>
              ) : (
                <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#ebebeb] bg-[#fafafa] text-xs font-semibold uppercase tracking-[0.04em] text-[#616161]">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Order</th>
                        <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                          Customer
                        </th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                          In hands
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebebeb]">
                      {recentOrders.slice(0, 6).map((order) => (
                        <tr key={order.id} className="hover:bg-[#fafafa]">
                          <td className="px-3 py-3">
                            <Link
                              href={`/app/orders/${order.id}`}
                              className="text-[15px] font-semibold text-[#303030] hover:text-brand-primary"
                            >
                              {formatOrderDisplayLine(order)}
                            </Link>
                            <p className="mt-0.5 text-xs text-[#616161] sm:hidden">
                              {order.company}
                            </p>
                          </td>
                          <td className="hidden px-3 py-2.5 text-[#616161] sm:table-cell">
                            {order.company}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <OrderStatusBadge status={order.status} />
                              {order.rush && <RushBadge />}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2.5 text-[#616161] md:table-cell">
                            {formatDate(order.inHandsDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-[#303030]">
                            {formatCurrency(
                              recentOrderFinancials.get(order.id)?.total ?? 0
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </main>
    </div>
  );
}
