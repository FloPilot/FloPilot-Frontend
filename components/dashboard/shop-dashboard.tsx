"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Package,
  Palette,
} from "lucide-react";
import { DashboardKpiSection } from "@/components/dashboard/dashboard-kpi-section";
import { DashboardAttentionPanel } from "@/components/dashboard/dashboard-attention-panel";
import { DashboardSchedulingQueue } from "@/components/dashboard/dashboard-scheduling-queue";
import { NewOrderButton } from "@/components/providers/new-order-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { StaffHeader } from "@/components/layout/staff-header";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import {
  computeDashboardInsights,
  type DashboardAttentionItem,
  type TodayFloorItem,
} from "@/lib/dashboard-insights";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  formatEventsToSchedule,
  formatProductionEventsAcrossOrders,
  productionEventsWaitingMessage,
} from "@/lib/terminology";
import { machineColorStyles } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";
import type { Order, Task } from "@/types";

function DashboardPanel({
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
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border border-white/80 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-3.5 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-brand-ink">{title}</h2>
          {description && (
            <p className="text-xs text-brand-muted mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col px-5 py-4 sm:px-6">{children}</div>
    </section>
  );
}

function EmptyPanelState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-8 text-center text-sm text-brand-muted",
        className
      )}
    >
      {children}
    </div>
  );
}

function TodayFloorList({ items }: { items: TodayFloorItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyPanelState className="flex flex-1 items-center justify-center">
        Nothing on the floor today.{" "}
        <Link href="/app/calendar" className="text-brand-primary hover:underline">
          Schedule work
        </Link>
      </EmptyPanelState>
    );
  }

  return (
    <ul className="w-full space-y-2">
      {items.slice(0, 6).map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-slate-50/40 px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            {item.kind === "scheduled" && item.machineColor && (
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  machineColorStyles[item.machineColor].dot
                )}
              />
            )}
            {item.kind === "running" && (
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-brand-ink">
                  {item.orderNumber}
                </span>
                {item.kind === "running" && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Running
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-muted truncate">
                {item.imprintLabel} · {item.machineName}
              </p>
              {item.kind === "scheduled" && (
                <p className="text-xs text-brand-muted/80 mt-0.5">
                  {item.timeLabel}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentOrdersList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <EmptyPanelState>
        <p className="font-medium text-brand-ink">No orders yet</p>
        <p className="mt-1">Create your first order to see activity here.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white"
            nativeButton={false}
            render={<Link href="/app/customers" />}
          >
            Add customer
          </Button>
          <NewOrderButton label="New order" />
        </div>
      </EmptyPanelState>
    );
  }

  return (
    <div className="w-full divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/app/orders/${order.id}`}
          className="flex items-center justify-between gap-4 bg-slate-50/30 px-4 py-3.5 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-brand-ink">
                {order.number}
              </span>
              <OrderStatusBadge status={order.status} />
              {order.rush && <RushBadge />}
            </div>
            <p className="text-xs text-brand-muted truncate mt-0.5">
              {order.company} · Due {formatDate(order.inHandsDate)}
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums text-brand-ink shrink-0">
            {formatCurrency(order.total)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyPanelState className="flex flex-1 items-center justify-center py-10">
        No open production tasks.
      </EmptyPanelState>
    );
  }

  return (
    <ul className="w-full space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="rounded-xl border border-border/50 bg-slate-50/40 px-4 py-3"
        >
          <p className="text-sm font-medium text-brand-ink leading-snug">
            {task.title}
          </p>
          <p className="text-xs text-brand-muted mt-1">
            {task.orderNumber} · {task.department}
            {task.dueDate && ` · Due ${formatDate(task.dueDate)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ShopDashboard() {
  const {
    orders,
    scheduleBlocks,
    jobRuns,
    machines,
    productionTasks,
    dashboardStats,
    shopDataLoading,
    shopDataError,
    refreshShopData,
  } = useSchedule();
  const { isModuleEnabled } = useShopSettings();

  const insights = useMemo(
    () =>
      computeDashboardInsights({
        orders,
        scheduleBlocks,
        jobRuns,
        machines,
        productionTasks,
        apiStats: dashboardStats,
      }),
    [
      orders,
      scheduleBlocks,
      jobRuns,
      machines,
      productionTasks,
      dashboardStats,
    ]
  );

  const {
    stats,
    attention,
    schedulingQueue,
    activeOrdersList,
    dueThisWeekOrders,
    artworkPendingEntries,
    awaitingApprovalOrders,
    rushOrdersList,
    overdueOrders,
    recentOrders,
    todayFloor,
    openTasks,
    readyToShipOrders,
  } = insights;

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

  const showArtwork = isModuleEnabled("artwork");
  const showInventory = isModuleEnabled("inventory");
  const showProductionTasks = isModuleEnabled("productionTasks");

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <StaffHeader
        title="Dashboard"
        description="Live overview of orders, production, and what needs you today"
        action={<NewOrderButton label="New Order" />}
      />

      <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
        {shopDataError && (
          <div className="rounded-xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3 shadow-sm">
            <span>{shopDataError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full shrink-0 bg-white"
              onClick={() => void refreshShopData()}
            >
              Retry
            </Button>
          </div>
        )}

        {shopDataLoading || (!shopDataError && orders.length === 0 && !dashboardStats) ? (
          <AppLoadingScreen label="Loading shop data…" />
        ) : (
          <>
            <DashboardKpiSection
              stats={stats}
              activeOrdersList={activeOrdersList}
              schedulingQueue={schedulingQueue}
              dueThisWeekOrders={dueThisWeekOrders}
              artworkPendingEntries={artworkPendingEntries}
              showProofsKpi={showArtwork}
            />

            <DashboardPanel
              title="Scheduling queue"
              description={
                stats.toSchedule > 0
                  ? formatProductionEventsAcrossOrders(
                      stats.toSchedule,
                      stats.toScheduleOrders
                    )
                  : productionEventsWaitingMessage
              }
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs text-brand-primary h-8"
                  nativeButton={false}
                  render={<Link href="/app/calendar" />}
                >
                  Open calendar
                  <ArrowRight className="size-3.5" />
                </Button>
              }
            >
              <DashboardSchedulingQueue items={schedulingQueue} />
            </DashboardPanel>

            <div className="grid w-full items-stretch gap-5 lg:grid-cols-5 lg:gap-6">
              <DashboardPanel
                className="lg:col-span-3"
                title="Needs attention"
                description="Tap a row to review and take action"
              >
                <DashboardAttentionPanel
                  items={filteredAttention}
                  schedulingQueue={schedulingQueue}
                  artworkPendingEntries={artworkPendingEntries}
                  awaitingApprovalOrders={awaitingApprovalOrders}
                  rushOrdersList={rushOrdersList}
                  overdueOrders={overdueOrders}
                  readyToShipOrders={readyToShipOrders}
                  stats={{
                    toSchedule: stats.toSchedule,
                    toScheduleOrders: stats.toScheduleOrders,
                    lowStockItems: stats.lowStockItems,
                  }}
                />
              </DashboardPanel>

              <DashboardPanel
                className="lg:col-span-2"
                title="On the floor today"
                description={
                  stats.runningNow > 0
                    ? `${stats.runningNow} running · ${stats.scheduledToday} scheduled`
                    : `${stats.scheduledToday} scheduled`
                }
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs text-brand-primary h-8"
                    nativeButton={false}
                    render={<Link href="/app/calendar" />}
                  >
                    Calendar
                  </Button>
                }
              >
                <TodayFloorList items={todayFloor} />
              </DashboardPanel>
            </div>

            <div
              className={cn(
                "grid w-full items-stretch gap-5 lg:gap-6",
                showProductionTasks ? "lg:grid-cols-3" : "lg:grid-cols-1"
              )}
            >
              <DashboardPanel
                className={showProductionTasks ? "lg:col-span-2" : undefined}
                title="Recent orders"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs h-8"
                    nativeButton={false}
                    render={<Link href="/app/orders" />}
                  >
                    View all
                    <ArrowRight className="size-3.5" />
                  </Button>
                }
              >
                <RecentOrdersList orders={recentOrders} />
              </DashboardPanel>

              {showProductionTasks && (
              <DashboardPanel
                title="Production tasks"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs h-8"
                    nativeButton={false}
                    render={<Link href="/app/production" />}
                  >
                    View all
                  </Button>
                }
              >
                <TaskList tasks={openTasks} />
              </DashboardPanel>
              )}
            </div>

            <section
              className={cn(
                "grid w-full grid-cols-2 gap-3 sm:gap-4",
                showArtwork && showInventory
                  ? "lg:grid-cols-4"
                  : showArtwork || showInventory
                    ? "lg:grid-cols-3"
                    : "lg:grid-cols-2"
              )}
            >
              <QuickLink
                href="/app/calendar"
                icon={Calendar}
                label="Calendar"
                detail={
                  stats.toSchedule > 0
                    ? formatEventsToSchedule(stats.toSchedule)
                    : "Production schedule"
                }
                active={stats.toSchedule > 0}
              />
              {showArtwork && (
              <QuickLink
                href="/app/artwork"
                icon={Palette}
                label="Artwork"
                detail={
                  stats.artworkPending > 0
                    ? `${stats.artworkPending} proofs pending`
                    : "Proof queue"
                }
                active={stats.artworkPending > 0}
              />
              )}
              {showInventory && (
              <QuickLink
                href="/app/inventory"
                icon={Package}
                label="Inventory"
                detail={
                  stats.lowStockItems > 0
                    ? `${stats.lowStockItems} low stock`
                    : "Stock levels"
                }
                active={stats.lowStockItems > 0}
              />
              )}
              <QuickLink
                href="/app/orders"
                icon={ClipboardList}
                label="Orders"
                detail={
                  stats.readyToShip > 0
                    ? `${stats.readyToShip} ready to ship`
                    : `${stats.openPipeline} in pipeline`
                }
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
  active,
}: {
  href: string;
  icon: typeof Calendar;
  label: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[4.5rem] items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-sm transition-all hover:shadow-md sm:px-5",
        active
          ? "border-brand-primary/20 hover:border-brand-primary/30"
          : "border-white/80 hover:border-border"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-brand-primary/10 text-brand-primary"
            : "bg-slate-100 text-brand-muted"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-ink">{label}</p>
        <p className="text-xs text-brand-muted truncate">{detail}</p>
      </div>
    </Link>
  );
}
