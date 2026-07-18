"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Inbox,
  Layers3,
} from "lucide-react";
import {
  FlowProgressDots,
  FlowStepList,
} from "@/components/calendar/order-production-flow";
import { ProductionRunGroup } from "@/components/production-run-group";
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
  getCustomerAccent,
  getCustomerInitials,
} from "@/lib/production-customer-colors";
import {
  dashboardCardClass,
  dashboardControlClass,
} from "@/lib/dashboard-styles";
import {
  buildSchedulingQueueOrders,
  getOrdersBlockedFromSchedulingQueue,
  getUnscheduledEvents,
  type EventBasketSort,
  type SchedulingQueueOrder,
} from "@/lib/event-basket";
import { decorationLabel, formatDate } from "@/lib/format";
import { formatOrderDisplayLine, formatOrderRef } from "@/lib/order-display";
import type { HealthStatus } from "@/lib/order-health";
import { eventsLabel, formatEventXOfY, formatMoreEvents } from "@/lib/terminology";
import { cn } from "@/lib/utils";

type QueueFilter = "ready" | "all" | "rush" | "overdue";

type QueueOrderCluster =
  | { type: "run"; runId: string; items: SchedulingQueueOrder[] }
  | { type: "single"; item: SchedulingQueueOrder };

const SORT_OPTIONS: { value: EventBasketSort; label: string }[] = [
  { value: "urgency", label: "Urgency" },
  { value: "due_date", label: "Client ETA" },
  { value: "submitted_oldest", label: "Submitted (oldest)" },
  { value: "quantity_high", label: "Quantity" },
];

function urgencyStyles(status: HealthStatus) {
  switch (status) {
    case "critical":
      return "text-[#8f1f1f]";
    case "warning":
      return "text-[#8a6116]";
    default:
      return "text-[#616161]";
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

function clusterQueueOrders(
  items: SchedulingQueueOrder[]
): QueueOrderCluster[] {
  const runBuckets = new Map<string, SchedulingQueueOrder[]>();
  const sequence: Array<{ kind: "run" | "single"; key: string }> = [];

  for (const item of items) {
    const runId = item.productionRunId;
    if (!runId) {
      sequence.push({ kind: "single", key: item.orderId });
      continue;
    }
    if (!runBuckets.has(runId)) {
      runBuckets.set(runId, []);
      sequence.push({ kind: "run", key: runId });
    }
    runBuckets.get(runId)!.push(item);
  }

  return sequence.map((entry) => {
    if (entry.kind === "single") {
      return {
        type: "single" as const,
        item: items.find((item) => item.orderId === entry.key)!,
      };
    }
    return {
      type: "run" as const,
      runId: entry.key,
      items: runBuckets.get(entry.key) ?? [],
    };
  });
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
  const accent = getCustomerAccent(item.customerId, item.orderId);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-[#e3e3e3] bg-white px-4 py-3.5 transition-colors hover:bg-[#fafafa]",
        item.rush && "bg-[#fffdf5] hover:bg-[#fafafa]"
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-1", accent.cap)}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-1.5">
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums",
              accent.bg,
              accent.border,
              accent.text
            )}
            title={item.customerName}
          >
            {getCustomerInitials(item.customerName)}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/app/orders/${item.orderId}`}
                className="text-[13px] font-semibold text-[#303030] hover:text-[#2c6ecb] hover:underline"
              >
                {formatOrderRef(item)}
              </Link>
              <span className="truncate text-[13px] text-[#616161]">
                {item.customerName}
              </span>
              {item.rush && <RushBadge />}
              {item.productionRunId ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#b8cceb] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#315f9e]"
                  title={`${item.productionRunOrderCount ?? 2} orders running together`}
                >
                  <Layers3 className="size-3" />
                  Run {item.productionRunOrderCount ?? 2}
                </span>
              ) : null}
            </div>

            {next ? (
              <p className="text-[13px] text-[#303030]">
                <span className="text-[#616161]">Next: </span>
                {next.imprintLabel}
                <span className="text-[#616161]">
                  {" "}
                  · {decorationLabel(next.decoration)}
                  {next.pieceCount > 0 &&
                    ` · ${next.pieceCount.toLocaleString()} pcs`}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-[#616161]">
                {formatMoreEvents(item.waitingCount)} after current progress
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[12px] text-[#616161]">
              <span className={cn("font-medium", urgencyStyles(item.dueUrgency))}>
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
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.flowSteps.length > 1 && (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-[#616161] transition-colors hover:bg-[#f1f1f1] hover:text-[#303030]"
              onClick={() => setShowEvents((value) => !value)}
            >
              {showEvents ? "Hide" : eventsLabel}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  showEvents && "rotate-180"
                )}
              />
            </button>
          )}
          {next && (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand-primary bg-brand-primary px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-primary/90"
              onClick={() => onSchedule(next.key)}
            >
              Schedule
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {showEvents && item.flowSteps.length > 1 && (
        <div className="mt-3 border-t border-[#ebebeb] pt-3">
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
  const { activeOrders, activeScheduleBlocks } = useSchedule();
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("ready");
  const [sort, setSort] = useState<EventBasketSort>("urgency");

  const allEvents = useMemo(
    () => getUnscheduledEvents(activeOrders, activeScheduleBlocks),
    [activeOrders, activeScheduleBlocks]
  );

  const queueOrders = useMemo(
    () => buildSchedulingQueueOrders(activeOrders, activeScheduleBlocks),
    [activeOrders, activeScheduleBlocks]
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

  const visibleClusters = useMemo(
    () => clusterQueueOrders(visibleOrders),
    [visibleOrders]
  );

  const readyCount = queueOrders.filter((item) => item.nextEvent).length;
  const blockedOrders = useMemo(
    () =>
      getOrdersBlockedFromSchedulingQueue(activeOrders, activeScheduleBlocks),
    [activeOrders, activeScheduleBlocks]
  );

  if (allEvents.length === 0) {
    return (
      <div className="space-y-3">
        <section className="flex items-start gap-3 rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-4 py-3.5 sm:px-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0d5c2e]" />
          <div>
            <p className="text-sm font-semibold text-[#0d5c2e]">
              Nothing to schedule
            </p>
            <p className="mt-0.5 text-[13px] text-[#0d5c2e]/80">
              All {eventsLabel.toLowerCase()} are on the calendar.
            </p>
          </div>
        </section>

        {blockedOrders.length > 0 && (
          <section className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3.5 text-sm sm:px-5">
            <p className="font-semibold text-[#8a6116]">
              {blockedOrders.length} order
              {blockedOrders.length !== 1 ? "s" : ""} not in queue yet
            </p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-[#8a6116]">
              {blockedOrders.map(({ order, reason }) => (
                <li key={order.id}>
                  <Link
                    href={`/app/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {formatOrderDisplayLine(order)}
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

  const filterTabs = [
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
      count: queueOrders.filter((item) => item.dueUrgency === "critical").length,
    },
  ];

  return (
    <section className={dashboardCardClass}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-left transition-colors hover:bg-[#f4f4f5] sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#2c6ecb]">
            <Inbox className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#303030]">
              Scheduling queue
              <span className="ml-2 font-normal text-[#616161]">
                {readyCount} order{readyCount !== 1 ? "s" : ""} ready
              </span>
            </h2>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              Approved orders appear here — schedule the next event for each.
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-[#616161] transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((option) => {
                if (
                  option.value !== "ready" &&
                  option.value !== "all" &&
                  option.count === 0
                ) {
                  return null;
                }
                const active = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
                      active
                        ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
                        : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
                    )}
                  >
                    {option.label}
                    {option.count > 0 && (
                      <span className="ml-1 text-[#8a8a8a]">{option.count}</span>
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
              <SelectTrigger
                className={cn(
                  dashboardControlClass,
                  "w-[148px] data-[size=default]:h-9"
                )}
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-8 text-center text-[13px] text-[#616161]">
              {filter === "ready" ? (
                <>
                  No orders with an event ready right now.{" "}
                  <button
                    type="button"
                    className="font-medium text-[#2c6ecb] hover:underline"
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
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pb-3 pr-1">
              {visibleClusters.map((cluster) => {
                if (cluster.type === "single") {
                  return (
                    <QueueOrderRow
                      key={cluster.item.orderId}
                      item={cluster.item}
                      onSchedule={onScheduleEvent}
                    />
                  );
                }

                return (
                  <ProductionRunGroup
                    key={cluster.runId}
                    orderCount={
                      cluster.items[0]?.productionRunOrderCount ??
                      cluster.items.length
                    }
                  >
                    {cluster.items.map((item) => (
                      <QueueOrderRow
                        key={item.orderId}
                        item={item}
                        onSchedule={onScheduleEvent}
                      />
                    ))}
                  </ProductionRunGroup>
                );
              })}
            </div>
          )}

          {filter === "ready" && queueOrders.length > readyCount && (
            <p className="pt-1 text-center text-[11px] text-[#8a8a8a]">
              <button
                type="button"
                className="font-medium text-[#2c6ecb] hover:underline"
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
