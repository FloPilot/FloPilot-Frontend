"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DashboardSchedulingQueue } from "@/components/dashboard/dashboard-scheduling-queue";
import { RushBadge, OrderStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import type { DashboardFinancialContext } from "@/lib/dashboard-charts";
import {
  buildCollectionsRows,
  buildMachineLoadRows,
  buildShippingRows,
  buildTopCustomerRows,
  orderListLabel,
} from "@/lib/dashboard-extra-widgets";
import { DEPARTMENT_DEFINITIONS } from "@/lib/departments";
import { departmentQueueCounts } from "@/lib/department-queues";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { formatCurrency, formatDate } from "@/lib/format";
import { isWillCallOrder } from "@/lib/order-shipping";
import {
  buildReceivingQueue,
  receivingQueueStats,
} from "@/lib/receiving-queue";
import { blankSourceLabel } from "@/lib/order-receiving-checkpoints";
import type { ShopModuleKey } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";
import type {
  Customer,
  Machine,
  Order,
  ScheduleBlock,
  StationJobRun,
  Task,
} from "@/types";

function WidgetPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={dashboardCardClass}>
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

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-[#303030]">{title}</p>
      <p className={cn("mt-1", dashboardTaskDetailClass)}>{detail}</p>
    </div>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 rounded-lg px-2.5 text-[13px] text-brand-primary"
      nativeButton={false}
      render={<Link href={href} />}
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Button>
  );
}

export function DashboardSchedulingQueueWidget({
  items,
}: {
  items: SchedulingQueueOrder[];
}) {
  return (
    <WidgetPanel
      title="To schedule"
      description={
        items.length === 0
          ? "All production events are on the calendar"
          : `${items.length} order${items.length === 1 ? "" : "s"} waiting for calendar time`
      }
      action={<ViewLink href="/app/calendar" label="Open calendar" />}
    >
      <DashboardSchedulingQueue items={items.slice(0, 6)} />
    </WidgetPanel>
  );
}

export function DashboardCollectionsWidget({ orders }: { orders: Order[] }) {
  const { rows, totalBalance, count } = useMemo(
    () => buildCollectionsRows(orders),
    [orders]
  );
  const visible = rows.slice(0, 6);

  return (
    <WidgetPanel
      title="Collections"
      description={
        count === 0
          ? "No open balances right now"
          : `${formatCurrency(totalBalance)} outstanding · ${count} order${count === 1 ? "" : "s"}`
      }
      action={<ViewLink href="/app/orders" label="View orders" />}
    >
      {visible.length === 0 ? (
        <EmptyState
          title="Caught up on payments"
          detail="Orders with an open balance will show here."
        />
      ) : (
        <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#ebebeb] bg-[#fafafa] text-xs font-semibold uppercase tracking-[0.04em] text-[#616161]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Order</th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {visible.map((row) => (
                <tr key={row.order.id} className="hover:bg-[#fafafa]">
                  <td className="px-3 py-3">
                    <Link
                      href={`/app/orders/${row.order.id}`}
                      className="text-[15px] font-semibold text-[#303030] hover:text-brand-primary"
                    >
                      {orderListLabel(row.order)}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#616161]">
                      {row.order.company}
                      {row.order.rush ? " · Rush" : ""}
                    </p>
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <span className="text-[13px] text-[#616161]">
                      {row.paymentLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums text-[#303030]">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetPanel>
  );
}

export function DashboardReceivingWidget({ orders }: { orders: Order[] }) {
  const queue = useMemo(() => buildReceivingQueue(orders), [orders]);
  const open = useMemo(
    () => queue.filter((group) => group.openLineCount > 0),
    [queue]
  );
  const stats = useMemo(() => receivingQueueStats(queue), [queue]);
  const visible = open.slice(0, 6);

  return (
    <WidgetPanel
      title="Receiving"
      description={
        open.length === 0
          ? "No open garment check-ins"
          : `${stats.piecesOutstanding.toLocaleString()} pcs outstanding · ${open.length} order${open.length === 1 ? "" : "s"}`
      }
      action={
        <ViewLink href="/app/departments/receiving" label="Open receiving" />
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          title="Receiving is clear"
          detail="Orders waiting on blanks or materials will land here."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((group) => (
            <li key={group.order.id}>
              <Link
                href={`/app/orders/${group.order.id}`}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-[#fafafa]"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#303030]">
                      {orderListLabel(group.order)}
                    </span>
                    {group.order.rush ? <RushBadge /> : null}
                  </div>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {group.order.company}
                    {group.blankSource
                      ? ` · ${blankSourceLabel(group.blankSource)}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
                    {group.totalReceived}/{group.totalExpected}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-[#616161]">
                    {group.aggregateStatus}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetPanel>
  );
}

export function DashboardDepartmentLoadWidget({
  orders,
  scheduleBlocks,
  productionBoardTasks,
  isModuleEnabled,
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  productionBoardTasks: Task[];
  isModuleEnabled: (key: ShopModuleKey) => boolean;
}) {
  const counts = useMemo(
    () =>
      departmentQueueCounts({
        orders,
        scheduleBlocks,
        productionBoardTasks,
      }),
    [orders, scheduleBlocks, productionBoardTasks]
  );

  const departments = DEPARTMENT_DEFINITIONS.filter(
    (dept) => !dept.moduleKey || isModuleEnabled(dept.moduleKey)
  );
  const total = departments.reduce((sum, dept) => sum + counts[dept.slug], 0);

  return (
    <WidgetPanel
      title="Department load"
      description={
        total === 0
          ? "All department queues are clear"
          : `${total} open item${total === 1 ? "" : "s"} across departments`
      }
      action={<ViewLink href="/app/departments" label="Overview" />}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {departments.map((dept) => {
          const Icon = dept.icon;
          const count = counts[dept.slug];
          const clear = count === 0;
          return (
            <Link
              key={dept.slug}
              href={dept.href}
              className={cn(
                dashboardInsetSurfaceClass,
                "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[#fafafa]",
                !clear && "border-[#c4d7f2] bg-[#fafcff]"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  clear ? "bg-[#f1f1f1]" : "bg-[#e8f0fb]"
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    clear ? "text-[#616161]" : "text-[#2c6ecb]"
                  )}
                  strokeWidth={1.75}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#303030]">
                  {dept.shortLabel}
                </span>
                <span className="block text-[11px] text-[#616161]">
                  {clear ? "Clear" : `${count} open`}
                </span>
              </span>
              {clear ? (
                <CheckCircle2 className="size-4 text-[#0d5c2e]" />
              ) : (
                <span className="rounded-full bg-[#2c6ecb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </WidgetPanel>
  );
}

export function DashboardShippingWidget({ orders }: { orders: Order[] }) {
  const rows = useMemo(() => buildShippingRows(orders), [orders]);
  const visible = rows.slice(0, 7);

  return (
    <WidgetPanel
      title="Shipping"
      description={
        rows.length === 0
          ? "Nothing waiting to ship or label"
          : `${rows.length} item${rows.length === 1 ? "" : "s"} need ship attention`
      }
      action={<ViewLink href="/app/orders" label="View orders" />}
    >
      {visible.length === 0 ? (
        <EmptyState
          title="Shipping is clear"
          detail="Ready-to-ship orders and incomplete shipments will show here."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                href={`/app/orders/${row.order.id}`}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-[#fafafa]"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#303030]">
                      {orderListLabel(row.order)}
                    </span>
                    {row.order.rush ? <RushBadge /> : null}
                  </div>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {row.detail}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <OrderStatusBadge
                    status={row.order.status}
                    willCall={isWillCallOrder(
                      row.order.shipping,
                      row.order.shipments ?? []
                    )}
                  />
                  <p className="mt-1 text-[11px] text-[#616161]">
                    {formatDate(row.order.inHandsDate)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetPanel>
  );
}

export function DashboardDueHorizonWidget({
  overdueOrders,
  dueThisWeekOrders,
}: {
  overdueOrders: Order[];
  dueThisWeekOrders: Order[];
}) {
  const rows = useMemo(() => {
    const overdueIds = new Set(overdueOrders.map((order) => order.id));
    const upcoming = dueThisWeekOrders.filter(
      (order) => !overdueIds.has(order.id)
    );
    return [
      ...overdueOrders.map((order) => ({ order, overdue: true })),
      ...upcoming.map((order) => ({ order, overdue: false })),
    ].slice(0, 8);
  }, [overdueOrders, dueThisWeekOrders]);

  const overdueCount = overdueOrders.length;
  const weekCount = dueThisWeekOrders.length;

  return (
    <WidgetPanel
      title="Due this week"
      description={
        rows.length === 0
          ? "No in-hands dates due in the next seven days"
          : `${overdueCount > 0 ? `${overdueCount} overdue · ` : ""}${weekCount} due this week`
      }
      action={<ViewLink href="/app/orders" label="View orders" />}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing due soon"
          detail="Overdue work and this week’s in-hands dates will show here."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ order, overdue }) => (
            <li key={order.id}>
              <Link
                href={`/app/orders/${order.id}`}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-[#fafafa]",
                  overdue && "border-red-200/80 bg-red-50/40"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#303030]">
                      {orderListLabel(order)}
                    </span>
                    {order.rush ? <RushBadge /> : null}
                  </div>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {order.company}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-[13px] font-semibold",
                      overdue ? "text-red-700" : "text-[#303030]"
                    )}
                  >
                    {overdue ? "Overdue" : formatDate(order.inHandsDate)}
                  </p>
                  {overdue ? (
                    <p className="mt-0.5 text-[11px] text-red-700/80">
                      {formatDate(order.inHandsDate)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetPanel>
  );
}

export function DashboardMachineLoadWidget({
  machines,
  scheduleBlocks,
  jobRuns,
}: {
  machines: Machine[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
}) {
  const rows = useMemo(
    () => buildMachineLoadRows({ machines, scheduleBlocks, jobRuns }),
    [machines, scheduleBlocks, jobRuns]
  );

  return (
    <WidgetPanel
      title="Machine load"
      description="Booked hours vs capacity for the next 7 days"
      action={<ViewLink href="/app/calendar" label="Open calendar" />}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No active machines"
          detail="Add machines in settings to track capacity here."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const pct =
              row.utilization == null
                ? null
                : Math.round(row.utilization * 100);
            return (
              <li
                key={row.machine.id}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "px-3 py-3",
                  row.overbooked && "border-amber-200/90 bg-amber-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#303030]">
                        {row.machine.name}
                      </span>
                      {row.running ? (
                        <span className="rounded-full bg-[#e8f5ee] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
                          Running
                        </span>
                      ) : null}
                      {row.overbooked ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          Overbooked
                        </span>
                      ) : null}
                    </div>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      {row.bookedHours.toFixed(1)}h booked
                      {row.capacityHours > 0
                        ? ` / ${row.capacityHours.toFixed(0)}h capacity`
                        : ""}
                      {row.pieceCount > 0
                        ? ` · ${row.pieceCount.toLocaleString()} pcs`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[15px] font-semibold tabular-nums",
                      row.overbooked ? "text-amber-900" : "text-[#303030]"
                    )}
                  >
                    {pct == null ? "—" : `${pct}%`}
                  </span>
                </div>
                {pct != null ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ebebeb]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.overbooked ? "bg-amber-500" : "bg-[#2c6ecb]"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </WidgetPanel>
  );
}

export function DashboardTopCustomersWidget({
  orders,
  customers,
  financials,
  periodLabel,
}: {
  orders: Order[];
  customers: Customer[];
  financials: DashboardFinancialContext;
  periodLabel: string;
}) {
  const rows = useMemo(
    () => buildTopCustomerRows({ orders, customers, financials }),
    [orders, customers, financials]
  );

  return (
    <WidgetPanel
      title="Top customers"
      description={`Highest revenue in ${periodLabel.toLowerCase()}`}
      action={<ViewLink href="/app/customers" label="View customers" />}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No customer revenue yet"
          detail="Once orders are in this period, top accounts will rank here."
        />
      ) : (
        <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#ebebeb] bg-[#fafafa] text-xs font-semibold uppercase tracking-[0.04em] text-[#616161]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Open
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {rows.map((row) => (
                <tr key={row.customerId} className="hover:bg-[#fafafa]">
                  <td className="px-3 py-3">
                    <Link
                      href={`/app/customers/${row.customerId}`}
                      className="text-[15px] font-semibold text-[#303030] hover:text-brand-primary"
                    >
                      {row.name}
                    </Link>
                    {row.openBalance > 0 ? (
                      <p className="mt-0.5 text-xs text-[#616161]">
                        {formatCurrency(row.openBalance)} open balance
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-2.5 tabular-nums text-[#616161] sm:table-cell">
                    {row.openOrders}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums text-[#303030]">
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetPanel>
  );
}
