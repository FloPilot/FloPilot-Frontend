"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarPlus, ChevronRight, Palette } from "lucide-react";
import { FlowProgressDots } from "@/components/calendar/order-production-flow";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import type {
  DashboardAttentionItem,
  DashboardAttentionKind,
} from "@/lib/dashboard-insights";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { decorationLabel, formatDate } from "@/lib/format";
import type { HealthStatus } from "@/lib/order-health";
import {
  eventsToScheduleLabel,
  formatEventXOfY,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { Order } from "@/types";

function ModalEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center text-sm text-[#616161]">
      {children}
    </div>
  );
}

function urgencyStyles(status: HealthStatus) {
  switch (status) {
    case "critical":
      return "text-[#d82c0d] font-medium";
    case "warning":
      return "text-amber-800 font-medium";
    default:
      return "text-[#616161]";
  }
}

function OrderAttentionRow({
  order,
  action,
}: {
  order: Order;
  action?: React.ReactNode;
}) {
  return (
    <li className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Link href={`/app/orders/${order.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-[#303030] hover:text-brand-primary">
              {order.number}
            </span>
            <OrderStatusBadge status={order.status} />
            {order.rush && <RushBadge />}
          </div>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {order.company} · In hands {formatDate(order.inHandsDate)}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <Button
            variant="outline"
            size="sm"
            className={cn(dashboardControlClass, "h-9 px-3 text-xs")}
            nativeButton={false}
            render={<Link href={`/app/orders/${order.id}`} />}
          >
            Open
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function AttentionScheduleList({
  queue,
  onSchedule,
  onOpenOrder,
}: {
  queue: SchedulingQueueOrder[];
  onSchedule: (jobKey: string, orderId: string) => void;
  onOpenOrder?: (orderId: string, jobKey?: string) => void;
}) {
  const ordersWithEvents = useMemo(
    () =>
      queue
        .map((item) => ({
          ...item,
          events:
            item.unscheduledEvents?.length > 0
              ? item.unscheduledEvents
              : item.nextEvent
                ? [item.nextEvent]
                : [],
        }))
        .filter((item) => item.events.length > 0),
    [queue]
  );

  if (ordersWithEvents.length === 0) {
    return (
      <ModalEmptyState>
        Nothing waiting to schedule — you&apos;re caught up.
      </ModalEmptyState>
    );
  }

  return (
    <ul className="space-y-4">
      {ordersWithEvents.map((item) => (
        <li
          key={item.orderId}
          className={cn(
            dashboardCardClass,
            "overflow-hidden",
            item.rush && "border-l-[3px] border-l-orange-500"
          )}
        >
          <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/orders/${item.orderId}`}
                    className="text-[15px] font-semibold text-[#303030] hover:text-brand-primary"
                  >
                    {item.orderNumber}
                  </Link>
                  <span className="text-sm text-[#616161]">
                    {item.customerName}
                  </span>
                  {item.rush ? <RushBadge /> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={urgencyStyles(item.dueUrgency)}>
                    {item.dueLabel}
                  </span>
                  <span className="text-[#616161]">
                    In hands {formatDate(item.inHandsDate)}
                  </span>
                  <span className="text-[#616161]">
                    {item.progress.scheduled}/{item.progress.total} on calendar
                  </span>
                </div>
                {item.flowSteps.length > 1 ? (
                  <FlowProgressDots
                    steps={item.flowSteps}
                    className="mt-2"
                  />
                ) : null}
              </div>
              {onOpenOrder && item.events.length > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(dashboardControlClass, "h-9 shrink-0 text-xs")}
                  onClick={() => onOpenOrder(item.orderId, item.events[0]?.key)}
                >
                  View all {item.events.length} events
                </Button>
              ) : null}
            </div>
          </div>

          <ul className="divide-y divide-[#ebebeb]">
            {item.events.map((event) => (
              <li key={event.key}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#303030]">
                      {event.imprintLabel}
                    </p>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      {decorationLabel(event.decoration)}
                      {event.pieceCount > 0
                        ? ` · ${event.pieceCount.toLocaleString()} pcs`
                        : ""}
                      {event.flowTotal > 1
                        ? ` · ${formatEventXOfY(event.flowStep, event.flowTotal)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
                    onClick={() => onSchedule(event.key, item.orderId)}
                  >
                    <CalendarPlus className="size-3.5" />
                    Schedule
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function AttentionArtworkList({
  entries,
  onReview,
}: {
  entries: ArtworkQueueEntry[];
  onReview: (entry: ArtworkQueueEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <ModalEmptyState>No proofs waiting for review right now.</ModalEmptyState>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={`${entry.orderId}-${entry.imprintId}`} className={dashboardCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onReview(entry)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold text-[#303030]">
                  {entry.orderNumber}
                </span>
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    entry.artwork.status === "revision_requested"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-[#ebf4ff] text-[#2c6ecb]"
                  )}
                >
                  {entry.artwork.status === "revision_requested"
                    ? "Revision"
                    : "Pending"}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#303030]">
                {entry.imprintLabel}
              </p>
              <p className={cn("mt-0.5 truncate", dashboardTaskDetailClass)}>
                {entry.company} · {decorationLabel(entry.decoration)} · Due{" "}
                {formatDate(entry.inHandsDate)}
              </p>
            </button>
            <Button
              size="sm"
              className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
              onClick={() => onReview(entry)}
            >
              <Palette className="size-3.5" />
              Review proof
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AttentionOrderList({
  orders,
  emptyMessage,
  renderAction,
}: {
  orders: Order[];
  emptyMessage: string;
  renderAction?: (order: Order) => React.ReactNode;
}) {
  if (orders.length === 0) {
    return <ModalEmptyState>{emptyMessage}</ModalEmptyState>;
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <OrderAttentionRow
          key={order.id}
          order={order}
          action={renderAction?.(order)}
        />
      ))}
    </ul>
  );
}

export const ATTENTION_MODAL_COPY: Record<
  DashboardAttentionKind,
  { title: string; description?: (item: DashboardAttentionItem) => string }
> = {
  schedule: {
    title: eventsToScheduleLabel,
    description: () =>
      "Each row is one production event. Schedule any event in any order.",
  },
  artwork: {
    title: "Proofs to review",
    description: () =>
      "Approve artwork or send revisions before production can move forward.",
  },
  approval: {
    title: "Awaiting customer approval",
    description: () =>
      "Follow up on quotes or convert approved orders into production.",
  },
  rush: {
    title: "Rush orders",
    description: () =>
      "These jobs need priority on the calendar and shop floor today.",
  },
  overdue: {
    title: "Past in-hands date",
    description: () =>
      "These orders missed their target date and need immediate action.",
  },
  ready_to_ship: {
    title: "Ready to ship",
    description: () =>
      "Production is complete — finalize packing and shipping.",
  },
  inventory: {
    title: "Low stock",
    description: () =>
      "Review blanks and supplies before committing to large runs.",
  },
};
