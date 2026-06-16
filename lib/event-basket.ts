import {
  differenceInCalendarDays,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type {
  ArtworkFile,
  DecorationType,
  Machine,
  Order,
  OrderStatus,
  ScheduleBlock,
} from "@/types";
import { schedulableJobKey } from "@/lib/job-imprints";
import {
  findScheduleBlockForStep,
  getOrderProductionSteps,
} from "@/lib/order-production";
import {
  getOrdersWithUnscheduledEvents,
  getSchedulableJobs,
  getSchedulingQueueBlockReason,
  isOrderEligibleForSchedulingQueue,
} from "@/lib/production-schedule";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import type { HealthStatus } from "@/lib/order-health";
import {
  analyzeOrderProductionFlow,
  daysSinceSubmitted,
  getOrderPieceCount,
  priorityTierLabel,
  type FlowStepStatus,
  type OrderFlowStep,
} from "@/lib/production-flow";

export type { OrderFlowStep };

export type UnscheduledEvent = {
  key: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  jobId: string;
  jobName: string;
  imprintId: string;
  imprintLabel: string;
  decoration: DecorationType;
  inHandsDate: string;
  pieceCount: number;
  rush: boolean;
  orderStatus: OrderStatus;
  artworkStatus: ArtworkFile["status"];
  colorCount?: number;
  flashCount?: number;
  dimensions?: string;
  placement?: string;
  instructions?: string;
  daysUntilDue: number;
  dueUrgency: HealthStatus;
  dueLabel: string;
  orderCreatedAt: string;
  orderProgress: { scheduled: number; total: number };
  flowStep: number;
  flowTotal: number;
  flowStatus: Extract<FlowStepStatus, "ready" | "blocked">;
  blockedByLabel?: string;
  blockedByKey?: string;
  priorityTier: "Rush" | "Standard";
  daysSinceSubmitted: number;
  totalPieceCount: number;
};

export type EventBasketFilter =
  | "all"
  | "rush"
  | "standard"
  | "due_soon"
  | "overdue"
  | "ready_now"
  | "screen_print"
  | "embroidery"
  | "dtf"
  | "vinyl"
  | "finishing";

export type EventBasketSort =
  | "urgency"
  | "due_date"
  | "submitted_oldest"
  | "submitted_newest"
  | "quantity_high"
  | "customer"
  | "production_flow";

export type EventBasketGroup = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  rush: boolean;
  priorityTier: "Rush" | "Standard";
  inHandsDate: string;
  orderCreatedAt: string;
  daysSinceSubmitted: number;
  totalPieceCount: number;
  dueLabel: string;
  dueUrgency: HealthStatus;
  progress: { scheduled: number; total: number };
  flowSteps: OrderFlowStep[];
  nextReadyKey?: string;
  events: UnscheduledEvent[];
};

function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return "Past due";
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

function dueUrgencyFor(
  daysUntilDue: number,
  rush: boolean
): { label: string; status: HealthStatus } {
  if (daysUntilDue < 0) {
    return { label: "Past in-hands date", status: "critical" };
  }
  if (rush) {
    return {
      label: `Rush · ${formatDueLabel(daysUntilDue)}`,
      status: "critical",
    };
  }
  if (daysUntilDue <= 3) {
    return { label: formatDueLabel(daysUntilDue), status: "warning" };
  }
  if (daysUntilDue <= 7) {
    return { label: formatDueLabel(daysUntilDue), status: "neutral" };
  }
  return { label: formatDueLabel(daysUntilDue), status: "good" };
}

export type SchedulingQueueOptions = {
  /** Include orders before artwork is fully approved (dashboard overview) */
  ignoreArtworkApproval?: boolean;
};

export function getUnscheduledEvents(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  options?: SchedulingQueueOptions
): UnscheduledEvent[] {
  const schedulable = getSchedulableJobs(orders, options);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const today = startOfDay(new Date());
  const events: UnscheduledEvent[] = [];

  for (const job of schedulable) {
    if (
      findScheduleBlockForStep(
        scheduleBlocks,
        job.orderId,
        job.jobId,
        job.imprintId
      )
    ) {
      continue;
    }

    const order = orderById.get(job.orderId);
    if (!order) continue;

    const orderJob = order.jobs.find((entry) => entry.id === job.jobId);
    const imprint = orderJob?.imprints.find((entry) => entry.id === job.imprintId);
    const due = startOfDay(parseISO(order.inHandsDate));
    const daysUntilDue = differenceInCalendarDays(due, today);
    const dueMeta = dueUrgencyFor(daysUntilDue, order.rush);
    const flowSteps = analyzeOrderProductionFlow(order, scheduleBlocks);
    const flowStep = flowSteps.find(
      (step) => step.jobId === job.jobId && step.imprintId === job.imprintId
    );

    events.push({
      key: schedulableJobKey(job.orderId, job.jobId, job.imprintId),
      orderId: job.orderId,
      orderNumber: job.orderNumber,
      customerName: job.customerName,
      jobId: job.jobId,
      jobName: job.jobName,
      imprintId: job.imprintId,
      imprintLabel: job.imprintLabel,
      decoration: job.decoration,
      inHandsDate: job.inHandsDate,
      pieceCount: job.pieceCount,
      rush: order.rush,
      orderStatus: order.status,
      artworkStatus: imprint?.artwork.status ?? "pending",
      colorCount: imprint?.notes?.colorCount ?? imprint?.inkColors?.length,
      flashCount: imprint?.notes?.flashCount,
      dimensions: imprint?.notes?.dimensions,
      placement: imprint?.notes?.placement,
      instructions: imprint?.notes?.instructions,
      daysUntilDue,
      dueUrgency: dueMeta.status,
      dueLabel: dueMeta.label,
      orderCreatedAt: order.createdAt,
      orderProgress: countOrderScheduleProgress(order, scheduleBlocks),
      flowStep: flowStep?.flowIndex ?? 0,
      flowTotal: flowStep?.flowTotal ?? 0,
      flowStatus:
        flowStep?.status === "blocked" ? "blocked" : "ready",
      blockedByLabel: flowStep?.blockedByLabel,
      blockedByKey: flowStep?.blockedByKey,
      priorityTier: priorityTierLabel(order.rush),
      daysSinceSubmitted: daysSinceSubmitted(order.createdAt),
      totalPieceCount: getOrderPieceCount(order),
    });
  }

  return events;
}

export function countOrderScheduleProgress(
  order: Order,
  scheduleBlocks: ScheduleBlock[]
): { scheduled: number; total: number } {
  const steps = getOrderProductionSteps(order);
  const scheduled = steps.filter((step) =>
    findScheduleBlockForStep(
      scheduleBlocks,
      order.id,
      step.job.id,
      step.imprint.id
    )
  ).length;
  return { scheduled, total: steps.length };
}

function urgencyRank(event: UnscheduledEvent): number {
  if (event.daysUntilDue < 0) return 0;
  if (event.rush) return 1;
  if (event.daysUntilDue <= 3) return 2;
  if (event.daysUntilDue <= 7) return 3;
  return 4;
}

export function sortUnscheduledEvents(
  events: UnscheduledEvent[],
  sort: EventBasketSort
): UnscheduledEvent[] {
  const list = [...events];

  switch (sort) {
    case "due_date":
      return list.sort(
        (a, b) =>
          a.daysUntilDue - b.daysUntilDue ||
          a.orderNumber.localeCompare(b.orderNumber)
      );
    case "customer":
      return list.sort(
        (a, b) =>
          a.customerName.localeCompare(b.customerName) ||
          a.daysUntilDue - b.daysUntilDue
      );
    case "submitted_oldest":
      return list.sort(
        (a, b) =>
          new Date(a.orderCreatedAt).getTime() -
            new Date(b.orderCreatedAt).getTime() ||
          a.daysUntilDue - b.daysUntilDue
      );
    case "submitted_newest":
      return list.sort(
        (a, b) =>
          new Date(b.orderCreatedAt).getTime() -
            new Date(a.orderCreatedAt).getTime() ||
          a.daysUntilDue - b.daysUntilDue
      );
    case "quantity_high":
      return list.sort(
        (a, b) =>
          b.pieceCount - a.pieceCount ||
          a.daysUntilDue - b.daysUntilDue
      );
    case "production_flow":
      return list.sort(
        (a, b) =>
          a.orderNumber.localeCompare(b.orderNumber) ||
          a.flowStep - b.flowStep
      );
    case "urgency":
    default:
      return list.sort(
        (a, b) =>
          urgencyRank(a) - urgencyRank(b) ||
          a.daysUntilDue - b.daysUntilDue ||
          a.flowStep - b.flowStep ||
          new Date(a.orderCreatedAt).getTime() -
            new Date(b.orderCreatedAt).getTime()
      );
  }
}

export function filterUnscheduledEvents(
  events: UnscheduledEvent[],
  filter: EventBasketFilter
): UnscheduledEvent[] {
  switch (filter) {
    case "rush":
      return events.filter((event) => event.rush);
    case "standard":
      return events.filter((event) => !event.rush);
    case "ready_now":
      return events.filter((event) => event.flowStatus === "ready");
    case "due_soon":
      return events.filter(
        (event) => event.daysUntilDue >= 0 && event.daysUntilDue <= 7
      );
    case "overdue":
      return events.filter((event) => event.daysUntilDue < 0);
    case "screen_print":
    case "embroidery":
    case "dtf":
    case "vinyl":
    case "finishing":
      return events.filter((event) => event.decoration === filter);
    default:
      return events;
  }
}

export function groupUnscheduledEventsByOrder(
  events: UnscheduledEvent[],
  orders: Order[] = [],
  scheduleBlocks: ScheduleBlock[] = []
): EventBasketGroup[] {
  const byOrder = new Map<string, EventBasketGroup>();
  const orderById = new Map(orders.map((order) => [order.id, order]));

  for (const event of events) {
    const existing = byOrder.get(event.orderId);
    if (existing) {
      existing.events.push(event);
      continue;
    }

    const order = orderById.get(event.orderId);
    const flowSteps = order
      ? analyzeOrderProductionFlow(order, scheduleBlocks)
      : [];
    const nextReady = flowSteps.find((step) => step.status === "ready");

    byOrder.set(event.orderId, {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      customerName: event.customerName,
      rush: event.rush,
      priorityTier: event.priorityTier,
      inHandsDate: event.inHandsDate,
      orderCreatedAt: event.orderCreatedAt,
      daysSinceSubmitted: event.daysSinceSubmitted,
      totalPieceCount: event.totalPieceCount,
      dueLabel: event.dueLabel,
      dueUrgency: event.dueUrgency,
      progress: event.orderProgress,
      flowSteps,
      nextReadyKey: nextReady?.key,
      events: [event],
    });
  }

  for (const group of byOrder.values()) {
    group.events.sort((a, b) => a.flowStep - b.flowStep);
  }

  return [...byOrder.values()].sort((a, b) => {
    const aUrgency = Math.min(...a.events.map(urgencyRank));
    const bUrgency = Math.min(...b.events.map(urgencyRank));
    if (aUrgency !== bUrgency) return aUrgency - bUrgency;
    const aDue = Math.min(...a.events.map((event) => event.daysUntilDue));
    const bDue = Math.min(...b.events.map((event) => event.daysUntilDue));
    return aDue - bDue;
  });
}

export function estimateRunHours(
  pieceCount: number,
  machines: Machine[]
): { hours: number; machineName: string; capacityPerHour: number } | null {
  const active = machines.filter(
    (machine) => machine.active && machine.capacityPerHour
  );
  if (!active.length || pieceCount <= 0) return null;

  const best = active.reduce((current, candidate) =>
    (candidate.capacityPerHour ?? 0) > (current.capacityPerHour ?? 0)
      ? candidate
      : current
  );

  const capacity = best.capacityPerHour ?? 1;
  return {
    hours: Math.max(1, Math.ceil(pieceCount / capacity)),
    machineName: best.name,
    capacityPerHour: capacity,
  };
}

export {
  getSchedulingQueueBlockReason,
  getOrdersWithUnscheduledEvents,
  isOrderEligibleForSchedulingQueue,
  isOrderEligibleForSchedulingQueue as isOrderReadyForScheduling,
};

export type SchedulingQueueOrder = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  rush: boolean;
  inHandsDate: string;
  orderCreatedAt: string;
  totalPieceCount: number;
  dueLabel: string;
  dueUrgency: HealthStatus;
  progress: { scheduled: number; total: number };
  nextEvent: UnscheduledEvent | null;
  waitingCount: number;
  flowSteps: OrderFlowStep[];
  artworkApproved: boolean;
  artworkLabel?: string;
};

export function buildSchedulingQueueOrders(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  options?: SchedulingQueueOptions
): SchedulingQueueOrder[] {
  const events = getUnscheduledEvents(orders, scheduleBlocks, options);
  const groups = groupUnscheduledEventsByOrder(events, orders, scheduleBlocks);
  const orderById = new Map(orders.map((order) => [order.id, order]));

  return groups.map((group) => {
    const order = orderById.get(group.orderId);
    const artwork = order ? getArtworkApprovalSummary(order) : null;

    return {
      orderId: group.orderId,
      orderNumber: group.orderNumber,
      customerName: group.customerName,
      rush: group.rush,
      inHandsDate: group.inHandsDate,
      orderCreatedAt: group.orderCreatedAt,
      totalPieceCount: group.totalPieceCount,
      dueLabel: group.dueLabel,
      dueUrgency: group.dueUrgency,
      progress: group.progress,
      nextEvent:
        group.events.find((event) => event.flowStatus === "ready") ?? null,
      waitingCount: group.events.filter((event) => event.flowStatus === "blocked")
        .length,
      flowSteps: group.flowSteps,
      artworkApproved: artwork?.allApproved ?? true,
      artworkLabel:
        artwork && artwork.total > 0
          ? `${artwork.approved}/${artwork.total} proofs approved`
          : undefined,
    };
  });
}

export function getOrdersBlockedFromSchedulingQueue(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[]
): Array<{ order: Order; reason: string }> {
  return getOrdersWithUnscheduledEvents(orders, scheduleBlocks)
    .filter((order) => !isOrderEligibleForSchedulingQueue(order))
    .map((order) => ({
      order,
      reason: getSchedulingQueueBlockReason(order) ?? "Not ready to schedule",
    }));
}

export function countOrdersAwaitingSchedule(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[]
): number {
  const orderIds = new Set<string>();
  for (const event of getUnscheduledEvents(orders, scheduleBlocks)) {
    orderIds.add(event.orderId);
  }
  return orderIds.size;
}

export function basketFilterCounts(events: UnscheduledEvent[]) {
  const today = startOfDay(new Date());
  return {
    all: events.length,
    rush: events.filter((event) => event.rush).length,
    standard: events.filter((event) => !event.rush).length,
    ready_now: events.filter((event) => event.flowStatus === "ready").length,
    due_soon: events.filter(
      (event) => event.daysUntilDue >= 0 && event.daysUntilDue <= 7
    ).length,
    overdue: events.filter((event) =>
      isBefore(startOfDay(parseISO(event.inHandsDate)), today)
    ).length,
  };
}
