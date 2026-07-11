import {
  differenceInCalendarDays,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Machine, Order, ScheduleBlock, StationJobRun } from "@/types";
import { getOrderPaymentDisplay } from "@/lib/order-payment";
import {
  countScheduledSteps,
  findScheduleBlockForStep,
  getOrderProductionSteps,
} from "@/lib/order-production";
import { getRunForBlock } from "@/lib/station-runs";
import { getOutsideHoursBlockIds } from "@/lib/machine-hours";
import { scheduleBlocksOverlap } from "@/lib/schedule-reschedule";

export type HealthStatus = "good" | "warning" | "critical" | "neutral";

export interface HealthMetric {
  label: string;
  value: string;
  status: HealthStatus;
  detail?: string;
}

export interface OrderHealthMetrics {
  artwork: HealthMetric;
  production: HealthMetric;
  schedule: HealthMetric;
  currentJob: HealthMetric;
  payment: HealthMetric;
  shipDate: HealthMetric;
}

function countArtwork(order: Order): {
  approved: number;
  total: number;
  pending: number;
} {
  let approved = 0;
  let pending = 0;
  let total = 0;
  for (const job of order.jobs) {
    for (const imprint of job.imprints) {
      if (job.kind === "finishing" && imprint.artwork.name === "n/a") continue;
      total++;
      if (imprint.artwork.status === "approved") approved++;
      else pending++;
    }
  }
  return { approved, total, pending };
}

function scheduleHasIssues(
  orderBlocks: ScheduleBlock[],
  machines: Machine[]
): boolean {
  for (const block of orderBlocks) {
    const machine = machines.find((m) => m.id === block.machineId);
    if (!machine) continue;
    if (getOutsideHoursBlockIds(machine, [block]).has(block.id)) return true;
    for (const other of orderBlocks) {
      if (
        other.id !== block.id &&
        scheduleBlocksOverlap(block, other)
      ) {
        return true;
      }
    }
  }
  return false;
}

function isStepComplete(
  order: Order,
  jobId: string,
  imprintId: string,
  scheduleBlocks: ScheduleBlock[],
  jobRuns: StationJobRun[]
): boolean {
  const blocks = scheduleBlocks.filter(
    (b) =>
      b.orderId === order.id &&
      b.jobId === jobId &&
      b.imprintId === imprintId
  );
  if (blocks.length === 0) return false;
  return blocks.some((b) => getRunForBlock(jobRuns, b.id)?.status === "finished");
}

function computeCurrentJobMetric(
  order: Order,
  scheduleBlocks: ScheduleBlock[],
  jobRuns: StationJobRun[]
): HealthMetric {
  const steps = getOrderProductionSteps(order);
  const total = steps.length;

  if (total === 0) {
    return {
      label: "Current event",
      value: "No events yet",
      status: "neutral",
    };
  }

  const orderBlocks = scheduleBlocks.filter((b) => b.orderId === order.id);
  const completedCount = steps.filter((step) =>
    isStepComplete(
      order,
      step.job.id,
      step.imprint.id,
      scheduleBlocks,
      jobRuns
    )
  ).length;

  if (completedCount === total) {
    return {
      label: "Current event",
      value: "All events complete",
      status: "good",
      detail: `${total} of ${total} done`,
    };
  }

  const activeBlock = orderBlocks.find((b) => {
    const run = getRunForBlock(jobRuns, b.id);
    return run?.status === "running" || run?.status === "paused";
  });

  if (activeBlock) {
    const stepIndex = steps.findIndex(
      (s) =>
        s.job.id === activeBlock.jobId &&
        s.imprint.id === activeBlock.imprintId
    );
    const stepNum = stepIndex >= 0 ? stepIndex + 1 : completedCount + 1;
    const run = getRunForBlock(jobRuns, activeBlock.id);
    const prefix = run?.status === "paused" ? "Paused" : "Running";

    return {
      label: "Current event",
      value: `${prefix} · ${activeBlock.imprintLabel}`,
      status: "warning",
      detail: `Event ${stepNum} of ${total}`,
    };
  }

  const nextStepIndex = steps.findIndex(
    (step) =>
      !isStepComplete(
        order,
        step.job.id,
        step.imprint.id,
        scheduleBlocks,
        jobRuns
      )
  );
  const nextStep = nextStepIndex >= 0 ? steps[nextStepIndex] : steps[0];
  const stepNum = nextStepIndex >= 0 ? nextStepIndex + 1 : 1;
  const block = findScheduleBlockForStep(
    scheduleBlocks,
    order.id,
    nextStep.job.id,
    nextStep.imprint.id
  );

  return {
    label: "Current event",
    value: `Next · ${nextStep.imprint.label}`,
    status: "warning",
    detail: block
      ? `Event ${stepNum} of ${total}`
      : `Event ${stepNum} of ${total} · not scheduled`,
  };
}

export function computeOrderHealth(
  order: Order,
  scheduleBlocks: ScheduleBlock[],
  machines: Machine[],
  jobRuns: StationJobRun[] = []
): OrderHealthMetrics {
  const artwork = countArtwork(order);
  const progress = countScheduledSteps(order, scheduleBlocks);
  const orderBlocks = scheduleBlocks.filter((b) => b.orderId === order.id);
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(order.inHandsDate));
  const daysUntilDue = differenceInCalendarDays(due, today);
  const scheduleIssues = scheduleHasIssues(orderBlocks, machines);

  let artworkStatus: HealthStatus = "neutral";
  let artworkValue = "No artwork";
  if (artwork.total > 0) {
    artworkValue = `${artwork.approved}/${artwork.total} approved`;
    if (artwork.approved === artwork.total) artworkStatus = "good";
    else if (artwork.pending > 0) artworkStatus = "warning";
  }

  let productionStatus: HealthStatus = "neutral";
  let productionValue = "No events";
  if (progress.total > 0) {
    productionValue = `${progress.scheduled}/${progress.total} scheduled`;
    if (progress.scheduled === progress.total) productionStatus = "good";
    else if (progress.scheduled > 0) productionStatus = "warning";
    else productionStatus = "critical";
  }

  let scheduleStatus: HealthStatus = "neutral";
  let scheduleValue = "Ready for scheduling";
  if (orderBlocks.length > 0) {
    scheduleValue =
      progress.total > 0 && progress.scheduled === progress.total
        ? "Fully scheduled"
        : `${orderBlocks.length} on floor`;
    if (scheduleIssues) {
      scheduleStatus = "critical";
      scheduleValue = "Needs attention";
    } else if (progress.scheduled === progress.total && progress.total > 0) {
      scheduleStatus = "good";
    } else {
      scheduleStatus = "warning";
    }
  }

  const payment = getOrderPaymentDisplay(order);

  let shipStatus: HealthStatus = "good";
  let shipValue = formatDueLabel(daysUntilDue);
  if (isBefore(due, today)) {
    shipStatus = "critical";
    shipValue = "Past due";
  } else if (daysUntilDue <= 3 || order.rush) {
    shipStatus = order.rush ? "critical" : "warning";
  }

  return {
    artwork: {
      label: "Artwork",
      value: artworkValue,
      status: artworkStatus,
      detail:
        artwork.pending > 0
          ? `${artwork.pending} awaiting approval`
          : undefined,
    },
    production: {
      label: "Production",
      value: productionValue,
      status: productionStatus,
    },
    schedule: {
      label: "Schedule",
      value: scheduleValue,
      status: scheduleStatus,
      detail: scheduleIssues ? "Overlap or hours conflict" : undefined,
    },
    currentJob: computeCurrentJobMetric(order, scheduleBlocks, jobRuns),
    payment: {
      label: "Payment",
      value: payment.label,
      status: payment.healthStatus,
      detail: payment.detail,
    },
    shipDate: {
      label: "In-hands",
      value: shipValue,
      status: shipStatus,
      detail: order.rush ? "Rush order" : undefined,
    },
  };
}

function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return "Past due";
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `${daysUntilDue} days`;
}

export function getDueDateUrgency(
  order: Order
): { label: string; status: HealthStatus; daysUntilDue: number } {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(order.inHandsDate));
  const daysUntilDue = differenceInCalendarDays(due, today);

  if (isBefore(due, today)) {
    return { label: "Past in-hands date", status: "critical", daysUntilDue };
  }
  if (order.rush) {
    return {
      label: `Rush · ${formatDueLabel(daysUntilDue)}`,
      status: "critical",
      daysUntilDue,
    };
  }
  if (daysUntilDue <= 3) {
    return {
      label: formatDueLabel(daysUntilDue),
      status: "warning",
      daysUntilDue,
    };
  }
  return {
    label: formatDueLabel(daysUntilDue),
    status: "good",
    daysUntilDue,
  };
}

export function collectImprintArtworkSummary(order: Order) {
  return getOrderProductionSteps(order)
    .filter(
      ({ job, imprint }) =>
        !(job.kind === "finishing" && imprint.artwork.name === "n/a")
    )
    .map(({ job, imprint }) => ({
      job,
      imprint,
      artwork: imprint.artwork,
    }));
}

export function getArtworkApprovalSummary(order: Order) {
  const items = collectImprintArtworkSummary(order);
  const approved = items.filter(
    (item) => item.artwork.status === "approved"
  ).length;
  const pending = items.filter(
    (item) => item.artwork.status === "pending"
  ).length;
  const revisionRequested = items.filter(
    (item) => item.artwork.status === "revision_requested"
  ).length;

  return {
    items,
    approved,
    pending,
    revisionRequested,
    total: items.length,
    allApproved: items.length > 0 && approved === items.length,
    needsCustomerReview: pending > 0 || revisionRequested > 0,
  };
}
