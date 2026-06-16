"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  FlowProgressDots,
  FlowStepList,
} from "@/components/calendar/order-production-flow";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RushBadge } from "@/components/status-badges";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  buildSchedulingQueueOrders,
  getOrdersBlockedFromSchedulingQueue,
  getUnscheduledEvents,
  type EventBasketSort,
  type SchedulingQueueOrder,
} from "@/lib/event-basket";
import { decorationLabel, formatDate } from "@/lib/format";
import type { HealthStatus } from "@/lib/order-health";
import { eventsLabel, formatEventXOfY, formatMoreEvents } from "@/lib/terminology";
import { cn } from "@/lib/utils";

type QueueFilter = "ready" | "all" | "rush" | "overdue";

const SORT_OPTIONS: { value: EventBasketSort; label: string }[] = [
  { value: "urgency", label: "Urgency" },
  { value: "due_date", label: "Client ETA" },
  { value: "submitted_oldest", label: "Submitted (oldest)" },
  { value: "quantity_high", label: "Quantity" },
];

function urgencyStyles(status: HealthStatus) {
  switch (status) {
    case "critical":
      return "text-red-700";
    case "warning":
      return "text-amber-800";
    default:
      return "text-brand-muted";
  }
}

function sortQueueOrders(
  items: SchedulingQueueOrder[],
  sort: EventBasketSort
): SchedulingQueueOrder[] {
  const list = [...items];

  switch (sort) {
    case "due_date":
      return list.sort(
        (a, b) =>
          new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
      );
    case "submitted_oldest":
      return list.sort(
        (a, b) =>
          new Date(a.orderCreatedAt).getTime() -
          new Date(b.orderCreatedAt).getTime()
      );
    case "quantity_high":
      return list.sort((a, b) => b.totalPieceCount - a.totalPieceCount);
    default:
      return list.sort((a, b) => {
        const rank = (item: SchedulingQueueOrder) => {
          if (item.dueUrgency === "critical") return 0;
          if (item.rush) return 1;
          if (item.dueUrgency === "warning") return 2;
          return 3;
        };
        return (
          rank(a) - rank(b) ||
          new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
        );
      });
  }
}

function QueueOrderRow({
  item,
  onSchedule,
}: {
  item: SchedulingQueueOrder;
  onSchedule: (jobKey: string) => void;
}) {
  const [showEvents, setShowEvents] = useState(false);
  const next = item.nextEvent;
  const progressLabel = next
    ? formatEventXOfY(next.flowStep, next.flowTotal)
    : `${item.progress.scheduled}/${item.progress.total} scheduled`;

  return (
    <article
      className={cn(
        "rounded-xl border border-border/70 bg-white px-4 py-3.5",
        item.rush && "border-l-[3px] border-l-orange-500 bg-orange-50/20"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/orders/${item.orderId}`}
              className="text-sm font-semibold text-brand-ink hover:text-brand-primary"
            >
              {item.orderNumber}
            </Link>
            <span className="text-sm text-brand-muted truncate">
              {item.customerName}
            </span>
            {item.rush && <RushBadge />}
          </div>

          {next ? (
            <p className="text-sm text-brand-ink">
              <span className="text-brand-muted">Next: </span>
              {next.imprintLabel}
              <span className="text-brand-muted">
                {" "}
                · {decorationLabel(next.decoration)}
                {next.pieceCount > 0 && ` · ${next.pieceCount.toLocaleString()} pcs`}
              </span>
            </p>
          ) : (
            <p className="text-sm text-brand-muted">
              {formatMoreEvents(item.waitingCount)} after current progress
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-brand-muted">
            <span className={urgencyStyles(item.dueUrgency)}>
              {item.dueLabel}
            </span>
            <span>ETA {formatDate(item.inHandsDate)}</span>
            {item.totalPieceCount > 0 && (
              <span>{item.totalPieceCount.toLocaleString()} pcs total</span>
            )}
            {item.flowSteps.length > 1 && (
              <span className="inline-flex items-center gap-1.5">
                <FlowProgressDots steps={item.flowSteps} />
                <span>{progressLabel}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.flowSteps.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2 text-xs text-brand-muted"
              onClick={() => setShowEvents((value) => !value)}
            >
              {showEvents ? "Hide" : eventsLabel}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  showEvents && "rotate-180"
                )}
              />
            </Button>
          )}
          {next && (
            <Button
              size="sm"
              className="h-8 rounded-full px-4 text-xs font-semibold"
              onClick={() => onSchedule(next.key)}
            >
              Schedule
              <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showEvents && item.flowSteps.length > 1 && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <FlowStepList steps={item.flowSteps} />
        </div>
      )}
    </article>
  );
}

export function EventBasketPanel({
  onScheduleEvent,
}: {
  onScheduleEvent: (jobKey: string) => void;
}) {
  const { orders, scheduleBlocks } = useSchedule();
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("ready");
  const [sort, setSort] = useState<EventBasketSort>("urgency");

  const allEvents = useMemo(
    () => getUnscheduledEvents(orders, scheduleBlocks),
    [orders, scheduleBlocks]
  );

  const queueOrders = useMemo(
    () => buildSchedulingQueueOrders(orders, scheduleBlocks),
    [orders, scheduleBlocks]
  );

  const visibleOrders = useMemo(() => {
    let list = queueOrders;
    if (filter === "ready") {
      list = list.filter((item) => item.nextEvent);
    } else if (filter === "rush") {
      list = list.filter((item) => item.rush);
    } else if (filter === "overdue") {
      list = list.filter((item) => item.dueUrgency === "critical");
    }
    return sortQueueOrders(list, sort);
  }, [queueOrders, filter, sort]);

  const readyCount = queueOrders.filter((item) => item.nextEvent).length;
  const blockedOrders = useMemo(
    () => getOrdersBlockedFromSchedulingQueue(orders, scheduleBlocks),
    [orders, scheduleBlocks]
  );

  if (allEvents.length === 0) {
    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-700 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Nothing to schedule
              </p>
              <p className="mt-0.5 text-xs text-emerald-900/80">
                All {eventsLabel.toLowerCase()} are on the calendar.
              </p>
            </div>
          </div>
        </section>

        {blockedOrders.length > 0 && (
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 px-5 py-4 text-sm">
            <p className="font-medium text-amber-950">
              {blockedOrders.length} order
              {blockedOrders.length !== 1 ? "s" : ""} not in queue yet
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
              {blockedOrders.map(({ order, reason }) => (
                <li key={order.id}>
                  <Link
                    href={`/app/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {order.number}
                  </Link>
                  {" — "}
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-brand-primary/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Inbox className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-brand-ink">
              Scheduling queue
              <span className="ml-2 font-normal text-brand-muted">
                {readyCount} order{readyCount !== 1 ? "s" : ""} ready
              </span>
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              One event at a time — schedule the next one for each order.
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-brand-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/80 px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "ready" as const, label: "Ready", count: readyCount },
                  { value: "all" as const, label: "All", count: queueOrders.length },
                  {
                    value: "rush" as const,
                    label: "Rush",
                    count: queueOrders.filter((item) => item.rush).length,
                  },
                  {
                    value: "overdue" as const,
                    label: "Overdue",
                    count: queueOrders.filter(
                      (item) => item.dueUrgency === "critical"
                    ).length,
                  },
                ] as const
              ).map((option) => {
                if (option.value !== "ready" && option.value !== "all" && option.count === 0) {
                  return null;
                }
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      filter === option.value
                        ? "bg-brand-primary text-white"
                        : "text-brand-muted hover:bg-muted"
                    )}
                  >
                    {option.label}
                    {option.count > 0 && (
                      <span className="ml-1 opacity-80">{option.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <Select
              value={sort}
              onValueChange={(value) =>
                setSort((value ?? "urgency") as EventBasketSort)
              }
            >
              <SelectTrigger className="h-8 w-[130px] rounded-full text-xs border-border/80">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-brand-muted">
              {filter === "ready" ? (
                <>
                  No orders with an event ready right now.{" "}
                  <button
                    type="button"
                    className="text-brand-primary hover:underline"
                    onClick={() => setFilter("all")}
                  >
                    View all waiting orders
                  </button>
                </>
              ) : (
                "No orders match this filter."
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto pr-0.5">
              {visibleOrders.map((item) => (
                <QueueOrderRow
                  key={item.orderId}
                  item={item}
                  onSchedule={onScheduleEvent}
                />
              ))}
            </div>
          )}

          {filter === "ready" && queueOrders.length > readyCount && (
            <p className="text-[11px] text-brand-muted text-center pt-1">
              <button
                type="button"
                className="text-brand-primary hover:underline"
                onClick={() => setFilter("all")}
              >
                {queueOrders.length - readyCount} more order
                {queueOrders.length - readyCount !== 1 ? "s" : ""} waiting on
                earlier events
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
