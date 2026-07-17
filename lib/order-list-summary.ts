import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type {
  DecorationType,
  JobImprint,
  Order,
  PrepCheckpointStatus,
  ScheduleBlock,
  StationJobRun,
} from "@/types";
import type { ResolvedProductionEvent } from "@/lib/production-event-status";
import { countOrderScheduleProgress } from "@/lib/event-basket";
import { approvalSummary, isInProductionPhase, isQuoteApproved } from "@/lib/order-approval";
import {
  getDecorationWorkflowStep,
  getDecorationWorkflowSteps,
} from "@/lib/decoration-workflow";
import {
  pendingMaterialLines,
  MATERIAL_KIND_LABELS,
  describePendingGarmentReceiving,
  orderHasPendingGarmentReceiving,
} from "@/lib/order-materials";
import { isOrderFulfillmentReady } from "@/lib/order-shipping";
import { getOrderProductionSteps } from "@/lib/order-production";
import { isHistoricalOrder } from "@/lib/order-list-filters";
import { resolveProductionEvent } from "@/lib/production-event-status";
import { computeReceivingCheckpoints, blanksColumnLabel, getOrderScreenFiles } from "@/lib/order-receiving-checkpoints";
import { orderHasScreenPrintEvents } from "@/lib/order-materials";

export type CheckpointRollupStatus =
  | "done"
  | "in_progress"
  | "pending"
  | "not_applicable"
  | "blocked";

export type OrderCheckpoint = {
  key:
    | "artwork"
    | "ink"
    | "screens"
    | "screen_files"
    | "blanks"
    | "dtf_transfers"
    | "blank_source"
    | "materials"
    | "prep"
    | "scheduled"
    | "floor";
  label: string;
  shortLabel: string;
  status: CheckpointRollupStatus;
  detail: string;
  title: string;
};

export type OrderAttentionLevel = "critical" | "warning" | "ok" | "neutral";

export type OrderListSummary = {
  eventCount: number;
  completedCount: number;
  runningCount: number;
  blockedCount: number;
  checkpoints: OrderCheckpoint[];
  nextStep: string;
  attention: OrderAttentionLevel;
  dueDays: number | null;
  needsArt: boolean;
  needsSchedule: boolean;
  onFloor: boolean;
  isBlocked: boolean;
};

export type OrderQuickFilter =
  | "all"
  | "needs_art"
  | "needs_schedule"
  | "on_floor"
  | "blocked";

export type OrdersListKpis = {
  total: number;
  needsArt: number;
  needsSchedule: number;
  onFloor: number;
  blocked: number;
};

function computeDueDays(order: Order): number | null {
  if (!order.inHandsDate) return null;
  try {
    return differenceInCalendarDays(
      startOfDay(parseISO(order.inHandsDate)),
      startOfDay(new Date())
    );
  } catch {
    return null;
  }
}

function rollupCheckpointStatus(
  values: PrepCheckpointStatus[]
): CheckpointRollupStatus {
  if (values.length === 0) return "not_applicable";
  if (values.every((value) => value === "done")) return "done";
  if (values.some((value) => value === "pending") && !values.some((value) => value === "done")) {
    return values.some((value) => value === "in_progress") ? "in_progress" : "pending";
  }
  if (values.some((value) => value === "in_progress")) return "in_progress";
  return "in_progress";
}

function buildArtworkCheckpoint(
  order: Order,
  approval: ReturnType<typeof approvalSummary>
): OrderCheckpoint {
  const { artworkTotal, artworkApprovedCount, artworkApproved } = approval;

  let status: CheckpointRollupStatus = "pending";
  if (artworkTotal === 0) {
    status = "not_applicable";
  } else if (artworkApproved) {
    status = "done";
  } else if (artworkApprovedCount > 0) {
    status = "in_progress";
  }

  const quoteNote =
    !isInProductionPhase(order) && !isQuoteApproved(order)
      ? " Estimate still needs approval."
      : "";

  return {
    key: "artwork",
    label: "Proof approval",
    shortLabel: "Proofs",
    status,
    detail:
      artworkTotal === 0 ? "N/A" : `${artworkApprovedCount}/${artworkTotal}`,
    title:
      artworkTotal === 0
        ? "No decoration proofs on this order"
        : artworkApproved
          ? `All ${artworkTotal} proof${artworkTotal !== 1 ? "s" : ""} approved${quoteNote}`
          : `${artworkTotal - artworkApprovedCount} of ${artworkTotal} proof${artworkTotal - artworkApprovedCount !== 1 ? "s" : ""} still need approval${quoteNote}`,
  };
}

function prepLabelsForDecorations(decorations: DecorationType[]): {
  label: string;
  shortLabel: string;
} {
  const unique = [...new Set(decorations)];
  if (unique.length === 1) {
    const prep = getDecorationWorkflowStep(unique[0], "prep");
    if (prep) {
      return { label: prep.label, shortLabel: prep.shortLabel };
    }
  }
  return { label: "Decoration setup", shortLabel: "Setup" };
}

function orderStatusNextStep(order: Order): string {
  switch (order.status) {
    case "draft":
      return "Still being built — add jobs and decorations";
    case "quote_sent":
      return "Estimate sent — send proofs and wait for approval";
    case "awaiting_approval":
      return "Customer reviewing estimate and proofs";
    case "approved":
      return "Ready for scheduling — put events on the calendar";
    case "in_production":
      return "In production — finish receiving and run the floor";
    case "ready_to_ship":
      return "Production done — ready to ship";
    case "shipped":
      return "Shipped — mark delivered when received";
    case "ready_to_invoice":
      return "Ready to invoice — send bill and collect payment";
    case "invoice_sent":
      return "Invoice sent — waiting for payment";
    case "completed":
      return "Order complete";
    default:
      return "Open this order for details";
  }
}

function deriveNextStep({
  order,
  blockedCount,
  artworkStatuses,
  artTotal,
  materialsStatuses,
  materialsTotal,
  prepStatuses,
  prepTotal,
  prepLabel,
  hasPendingGarments,
  scheduleProgress,
  runningCount,
  completedCount,
  eventCount,
}: {
  order: Order;
  blockedCount: number;
  artworkStatuses: PrepCheckpointStatus[];
  artTotal: number;
  materialsStatuses: PrepCheckpointStatus[];
  materialsTotal: number;
  prepStatuses: PrepCheckpointStatus[];
  prepTotal: number;
  prepLabel: string;
  hasPendingGarments: boolean;
  scheduleProgress: { scheduled: number; total: number };
  runningCount: number;
  completedCount: number;
  eventCount: number;
}): string {
  if (isHistoricalOrder(order)) {
    return order.status === "shipped" ? "Shipped" : "Completed";
  }

  if (order.status === "ready_to_ship") {
    return "Ready to ship — production is done";
  }

  if (order.status === "ready_to_invoice") {
    return "Ready to invoice — send bill and collect payment";
  }

  if (order.status === "invoice_sent") {
    return "Invoice sent — waiting for payment";
  }

  if (
    isInProductionPhase(order) &&
    isOrderFulfillmentReady(order) &&
    order.status === "in_production"
  ) {
    return "All goods fulfilled — ready to invoice";
  }

  if (eventCount === 0) {
    return orderStatusNextStep(order);
  }

  if (!isInProductionPhase(order)) {
    const approval = approvalSummary(order);
    if (!approval.quoteApproved && !approval.artworkApproved) {
      return "Send estimate and proofs for customer approval";
    }
    if (!approval.quoteApproved) {
      return "Waiting for customer to approve the estimate";
    }
    if (!approval.artworkApproved) {
      return approval.artworkTotal === 1
        ? "Waiting for customer to approve the proof"
        : `Proofs ${approval.artworkApprovedCount}/${approval.artworkTotal} approved`;
    }
    if (hasPendingGarments) {
      return (
        describePendingGarmentReceiving(order, blanksColumnLabel(order).toLowerCase()) ??
        `Still waiting on ${blanksColumnLabel(order).toLowerCase()}`
      );
    }
    return "Estimate and proofs approved — moving to production";
  }

  if (blockedCount > 0) {
    return blockedCount === 1
      ? "Stopped — one decoration is blocked"
      : `Stopped — ${blockedCount} decorations need a decision`;
  }

  const artPending = artworkStatuses.filter((status) => status !== "done").length;
  if (artPending > 0) {
    return artPending === 1
      ? "Art not approved yet — check proofs"
      : `Art not approved on ${artPending} decorations`;
  }

  if (
    orderHasScreenPrintEvents(order) &&
    getOrderScreenFiles(order).length === 0
  ) {
    return "Upload screen files on the Screens tab";
  }

  if (hasPendingGarments && isQuoteApproved(order)) {
    return (
      describePendingGarmentReceiving(order, blanksColumnLabel(order).toLowerCase()) ??
      `Still waiting on ${blanksColumnLabel(order).toLowerCase()}`
    );
  }

  const materialsPending = materialsStatuses.filter(
    (status) => status !== "done"
  ).length;
  if (materialsPending > 0 && isInProductionPhase(order)) {
    const pendingLines = pendingMaterialLines(order);
    if (pendingLines.length === 1) {
      return `${MATERIAL_KIND_LABELS[pendingLines[0].kind]} not confirmed yet`;
    }
    if (pendingLines.length > 1) {
      return `${pendingLines.length} receiving items still open`;
    }
    return "Finish receiving on Blanks, DTF sheets, or Screens first";
  }

  const prepPending = prepStatuses.filter((status) => status !== "done").length;
  if (prepPending > 0) {
    return prepPending === 1
      ? `${prepLabel} not finished yet`
      : `${prepLabel} not finished on ${prepPending} decorations`;
  }

  const unscheduled = scheduleProgress.total - scheduleProgress.scheduled;
  if (unscheduled > 0) {
    return unscheduled === 1
      ? "One decoration ready for scheduling"
      : `${unscheduled} decorations ready for scheduling`;
  }

  if (runningCount > 0) {
    return runningCount === 1
      ? "On the floor right now"
      : `${runningCount} decorations running on the floor`;
  }

  if (completedCount === eventCount) {
    return "All decorations completed";
  }

  if (scheduleProgress.scheduled > 0) {
    return "Scheduled — waiting to start on the floor";
  }

  return orderStatusNextStep(order);
}

function deriveAttention({
  order,
  blockedCount,
  runningCount,
  completedCount,
  eventCount,
  artworkStatuses,
  scheduleProgress,
  dueDays,
  hasPendingGarments,
}: {
  order: Order;
  blockedCount: number;
  runningCount: number;
  completedCount: number;
  eventCount: number;
  artworkStatuses: PrepCheckpointStatus[];
  scheduleProgress: { scheduled: number; total: number };
  dueDays: number | null;
  hasPendingGarments: boolean;
}): OrderAttentionLevel {
  if (isHistoricalOrder(order) || order.status === "ready_to_ship") {
    return "neutral";
  }

  if (blockedCount > 0 || (dueDays !== null && dueDays < 0)) {
    return "critical";
  }

  if (order.rush || (dueDays !== null && dueDays <= 2)) {
    return "warning";
  }

  if (hasPendingGarments && isQuoteApproved(order)) {
    return "warning";
  }

  const artPending = artworkStatuses.some((status) => status !== "done");
  const notScheduled =
    eventCount > 0 && scheduleProgress.scheduled < scheduleProgress.total;

  if (artPending || notScheduled) {
    return "warning";
  }

  if (runningCount > 0 || completedCount === eventCount) {
    return "ok";
  }

  return "neutral";
}

export function computeOrderListSummary(
  order: Order,
  scheduleBlocks: ScheduleBlock[],
  jobRuns: StationJobRun[]
): OrderListSummary {
  const steps = getOrderProductionSteps(order);
  const eventCount = steps.length;
  const dueDays = computeDueDays(order);

  if (eventCount === 0) {
    const hasPendingGarments = orderHasPendingGarmentReceiving(order);
    const garmentMessage =
      hasPendingGarments && isQuoteApproved(order)
        ? describePendingGarmentReceiving(
            order,
            blanksColumnLabel(order).toLowerCase()
          )
        : null;

    return {
      eventCount: 0,
      completedCount: 0,
      runningCount: 0,
      blockedCount: 0,
      checkpoints: [],
      nextStep: garmentMessage ?? orderStatusNextStep(order),
      attention: deriveAttention({
        order,
        blockedCount: 0,
        runningCount: 0,
        completedCount: 0,
        eventCount: 0,
        artworkStatuses: [],
        scheduleProgress: { scheduled: 0, total: 0 },
        dueDays,
        hasPendingGarments,
      }),
      dueDays,
      needsArt: false,
      needsSchedule: false,
      onFloor: false,
      isBlocked: false,
    };
  }

  let completedCount = 0;
  let runningCount = 0;
  let blockedCount = 0;

  const artworkStatuses: PrepCheckpointStatus[] = [];
  const materialsStatuses: PrepCheckpointStatus[] = [];
  const prepStatuses: PrepCheckpointStatus[] = [];
  const decorations: DecorationType[] = [];

  for (const { job, imprint } of steps) {
    decorations.push(imprint.decoration);
    const resolved = resolveProductionEvent({
      order,
      job,
      imprint,
      scheduleBlocks,
      jobRuns,
    });

    if (resolved.status === "completed") completedCount++;
    else if (resolved.status === "in_progress") runningCount++;
    else if (resolved.status === "blocked") blockedCount++;

    const checkpoints = resolved.checkpoints;
    if (checkpoints.artwork !== undefined) {
      artworkStatuses.push(checkpoints.artwork);
    }
    if (checkpoints.materials !== undefined) {
      materialsStatuses.push(checkpoints.materials);
    }
    if (checkpoints.prep !== undefined) {
      prepStatuses.push(checkpoints.prep);
    }
  }

  const scheduleProgress = countOrderScheduleProgress(order, scheduleBlocks);
  const prepLabels = prepLabelsForDecorations(decorations);
  const prepDone = prepStatuses.filter((status) => status === "done").length;
  const hasPendingGarments = orderHasPendingGarmentReceiving(order);
  const approval = approvalSummary(order);

  const artworkCheckpoint = buildArtworkCheckpoint(order, approval);

  const checkpoints: OrderCheckpoint[] = [
    artworkCheckpoint,
    ...computeReceivingCheckpoints(order),
    {
      key: "prep",
      label: prepLabels.label,
      shortLabel: prepLabels.shortLabel,
      status:
        prepStatuses.length === 0
          ? "not_applicable"
          : rollupCheckpointStatus(prepStatuses),
      detail:
        prepStatuses.length === 0 ? "N/A" : `${prepDone}/${prepStatuses.length}`,
      title:
        prepStatuses.length === 0
          ? "No setup checklist"
          : `${prepDone} of ${prepStatuses.length} have ${prepLabels.label.toLowerCase()} done`,
    },
    {
      key: "scheduled",
      label: "Scheduled",
      shortLabel: "Scheduled",
      status:
        scheduleProgress.total === 0
          ? "not_applicable"
          : scheduleProgress.scheduled >= scheduleProgress.total
            ? "done"
            : scheduleProgress.scheduled > 0
              ? "in_progress"
              : "pending",
      detail: `${scheduleProgress.scheduled}/${scheduleProgress.total}`,
      title:
        scheduleProgress.scheduled >= scheduleProgress.total
          ? "Every decoration is on the calendar"
          : `${scheduleProgress.scheduled} of ${scheduleProgress.total} decorations scheduled`,
    },
    {
      key: "floor",
      label: "On the floor",
      shortLabel: "Floor",
      status:
        completedCount === eventCount
          ? "done"
          : runningCount > 0
            ? "in_progress"
            : completedCount > 0
              ? "in_progress"
              : "pending",
      detail:
        completedCount === eventCount
          ? "Completed"
          : runningCount > 0
            ? "Running"
            : `${completedCount}/${eventCount}`,
      title:
        completedCount === eventCount
          ? "All decorations completed"
          : runningCount > 0
            ? `${runningCount} decoration${runningCount !== 1 ? "s" : ""} running now`
            : `${completedCount} of ${eventCount} decorations finished`,
    },
  ];

  const needsArt =
    approval.artworkTotal > 0 && !approval.artworkApproved;
  const needsSchedule =
    eventCount > 0 && scheduleProgress.scheduled < scheduleProgress.total;
  const onFloor = runningCount > 0;
  const isBlocked = blockedCount > 0;

  return {
    eventCount,
    completedCount,
    runningCount,
    blockedCount,
    checkpoints,
    nextStep: deriveNextStep({
      order,
      blockedCount,
      artworkStatuses,
      artTotal: artworkStatuses.length,
      materialsStatuses,
      materialsTotal: materialsStatuses.length,
      prepStatuses,
      prepTotal: prepStatuses.length,
      prepLabel: prepLabels.label,
      hasPendingGarments,
      scheduleProgress,
      runningCount,
      completedCount,
      eventCount,
    }),
    attention: deriveAttention({
      order,
      blockedCount,
      runningCount,
      completedCount,
      eventCount,
      artworkStatuses,
      scheduleProgress,
      dueDays,
      hasPendingGarments,
    }),
    dueDays,
    needsArt,
    needsSchedule,
    onFloor,
    isBlocked,
  };
}

export function buildOrderListSummaries(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  jobRuns: StationJobRun[]
): Map<string, OrderListSummary> {
  const map = new Map<string, OrderListSummary>();
  for (const order of orders) {
    map.set(
      order.id,
      computeOrderListSummary(order, scheduleBlocks, jobRuns)
    );
  }
  return map;
}

export function computeOrdersListKpis(
  orders: Order[],
  summaries: Map<string, OrderListSummary>
): OrdersListKpis {
  let needsArt = 0;
  let needsSchedule = 0;
  let onFloor = 0;
  let blocked = 0;

  for (const order of orders) {
    const summary = summaries.get(order.id);
    if (!summary) continue;
    if (summary.needsArt) needsArt++;
    if (summary.needsSchedule) needsSchedule++;
    if (summary.onFloor) onFloor++;
    if (summary.isBlocked) blocked++;
  }

  return {
    total: orders.length,
    needsArt,
    needsSchedule,
    onFloor,
    blocked,
  };
}

export function filterOrdersByQuickFilter(
  orders: Order[],
  summaries: Map<string, OrderListSummary>,
  filter: OrderQuickFilter
): Order[] {
  if (filter === "all") return orders;

  return orders.filter((order) => {
    const summary = summaries.get(order.id);
    if (!summary) return false;
    switch (filter) {
      case "needs_art":
        return summary.needsArt;
      case "needs_schedule":
        return summary.needsSchedule;
      case "on_floor":
        return summary.onFloor;
      case "blocked":
        return summary.isBlocked;
      default:
        return true;
    }
  });
}

function prepStatusToRollup(
  status: PrepCheckpointStatus | undefined
): CheckpointRollupStatus {
  if (!status || status === "not_needed") return "not_applicable";
  if (status === "done") return "done";
  if (status === "in_progress") return "in_progress";
  return "pending";
}

function titleForPrepCheckpoint(
  step: ReturnType<typeof getDecorationWorkflowStep>,
  status: PrepCheckpointStatus | undefined
): string {
  if (!step) return "Setup not finished";
  if (status === "done") return step.doneTitle;
  if (status === "in_progress") return step.inProgressTitle;
  return step.pendingTitle;
}

export function computeEventCheckpoints(
  imprint: JobImprint,
  resolved: ResolvedProductionEvent
): OrderCheckpoint[] {
  const checkpoints = resolved.checkpoints;
  const workflowSteps = getDecorationWorkflowSteps(imprint.decoration);

  let floorStatus: CheckpointRollupStatus = "pending";
  if (resolved.status === "completed") {
    floorStatus = "done";
  } else if (
    resolved.status === "in_progress" ||
    resolved.run?.status === "running" ||
    resolved.run?.status === "paused"
  ) {
    floorStatus = "in_progress";
  } else if (resolved.status === "blocked") {
    floorStatus = "blocked";
  }

  return workflowSteps.map((step) => {
    if (step.key === "scheduled") {
      return {
        key: "scheduled",
        label: step.label,
        shortLabel: step.shortLabel,
        status: resolved.scheduleBlock ? "done" : "pending",
        detail: "",
        title: resolved.scheduleBlock ? step.doneTitle : step.pendingTitle,
      };
    }

    if (step.key === "floor") {
      return {
        key: "floor",
        label: step.label,
        shortLabel: step.shortLabel,
        status: floorStatus,
        detail: "",
        title:
          floorStatus === "done"
            ? step.doneTitle
            : floorStatus === "in_progress"
              ? resolved.phase || step.inProgressTitle
              : step.pendingTitle,
      };
    }

    const prepStatus = checkpoints[step.key];
    const rollup = prepStatusToRollup(prepStatus);

    return {
      key: step.key,
      label: step.label,
      shortLabel: step.shortLabel,
      status: rollup,
      detail: "",
      title: titleForPrepCheckpoint(step, prepStatus),
    };
  });
}
