import { differenceInCalendarDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
  JobImprint,
  Order,
  ScheduleBlock,
} from "@/types";
import { schedulableJobKey } from "@/lib/job-imprints";
import {
  findScheduleBlockForStep,
  formatScheduleBlockSummary,
  getOrderProductionSteps,
  type ProductionStep,
} from "@/lib/order-production";

/** Standard shop floor sequence — neck/labels first, garment prints, sleeves, finishing last */
const LOCATION_FLOW_RANK: Record<ImprintLocationKey, number> = {
  nape: 10,
  front_left_chest: 20,
  front_chest: 25,
  full_front: 30,
  back: 40,
  full_back: 45,
  left_sleeve: 50,
  right_sleeve: 55,
  other: 60,
};

const DECORATION_FLOW_RANK: Record<DecorationType, number> = {
  screen_print: 0,
  embroidery: 5,
  dtf: 10,
  vinyl: 15,
  finishing: 100,
};

export type FlowStepStatus = "scheduled" | "ready" | "blocked" | "unscheduled";

export type OrderFlowStep = {
  key: string;
  jobId: string;
  imprintId: string;
  flowIndex: number;
  flowTotal: number;
  flowRank: number;
  jobName: string;
  imprintLabel: string;
  decoration: DecorationType;
  locationKey: ImprintLocationKey;
  pieceCount: number;
  status: FlowStepStatus;
  blockedByLabel?: string;
  blockedByKey?: string;
  scheduleBlock?: ScheduleBlock;
  scheduledSummary?: string;
};

export function getStepFlowRank(job: Job, imprint: JobImprint, jobIndex: number): number {
  if (job.kind === "finishing" || imprint.decoration === "finishing") {
    return 900 + jobIndex;
  }
  const location = LOCATION_FLOW_RANK[imprint.locationKey] ?? 60;
  const decoration = DECORATION_FLOW_RANK[imprint.decoration] ?? 0;
  return location * 10 + decoration + jobIndex * 0.01;
}

export function sortProductionStepsByFlow(
  order: Order,
  steps: ProductionStep[] = getOrderProductionSteps(order)
): ProductionStep[] {
  return [...steps].sort((a, b) => {
    const aJobIndex = order.jobs.findIndex((job) => job.id === a.job.id);
    const bJobIndex = order.jobs.findIndex((job) => job.id === b.job.id);
    return (
      getStepFlowRank(a.job, a.imprint, aJobIndex) -
      getStepFlowRank(b.job, b.imprint, bJobIndex)
    );
  });
}

export function getOrderPieceCount(order: Order): number {
  return order.lineItems.reduce(
    (sum, lineItem) =>
      sum +
      lineItem.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );
}

export function analyzeOrderProductionFlow(
  order: Order,
  scheduleBlocks: ScheduleBlock[]
): OrderFlowStep[] {
  const pieceCount = getOrderPieceCount(order);
  const ordered = sortProductionStepsByFlow(order);
  const flowTotal = ordered.length;

  return ordered.map((step, index) => {
    const jobIndex = order.jobs.findIndex((job) => job.id === step.job.id);
    const block = findScheduleBlockForStep(
      scheduleBlocks,
      order.id,
      step.job.id,
      step.imprint.id
    );

    let status: FlowStepStatus;
    let blockedByLabel: string | undefined;
    let blockedByKey: string | undefined;

    if (block) {
      status = "scheduled";
    } else {
      const blockingPrior = ordered.slice(0, index).find(
        (prior) =>
          !findScheduleBlockForStep(
            scheduleBlocks,
            order.id,
            prior.job.id,
            prior.imprint.id
          )
      );

      if (blockingPrior) {
        status = "blocked";
        blockedByLabel = blockingPrior.imprint.label;
        blockedByKey = schedulableJobKey(
          order.id,
          blockingPrior.job.id,
          blockingPrior.imprint.id
        );
      } else {
        status = "ready";
      }
    }

    return {
      key: schedulableJobKey(order.id, step.job.id, step.imprint.id),
      jobId: step.job.id,
      imprintId: step.imprint.id,
      flowIndex: index + 1,
      flowTotal,
      flowRank: getStepFlowRank(step.job, step.imprint, jobIndex),
      jobName: step.job.name,
      imprintLabel: step.imprint.label,
      decoration: step.imprint.decoration,
      locationKey: step.imprint.locationKey,
      pieceCount,
      status,
      blockedByLabel,
      blockedByKey,
      scheduleBlock: block,
      scheduledSummary: block ? formatScheduleBlockSummary(block) : undefined,
    };
  });
}

export function getNextReadyFlowStep(
  order: Order,
  scheduleBlocks: ScheduleBlock[]
): OrderFlowStep | undefined {
  return analyzeOrderProductionFlow(order, scheduleBlocks).find(
    (step) => step.status === "ready"
  );
}

export function canScheduleFlowStep(
  order: Order,
  jobId: string,
  imprintId: string,
  scheduleBlocks: ScheduleBlock[]
): { ok: true } | { ok: false; reason: string; scheduleFirstKey?: string } {
  const flow = analyzeOrderProductionFlow(order, scheduleBlocks);
  const step = flow.find((entry) => entry.jobId === jobId && entry.imprintId === imprintId);

  if (!step) {
    return { ok: false, reason: "Event not found on this order." };
  }

  if (step.status === "scheduled") {
    return { ok: false, reason: "This event is already on the calendar." };
  }

  if (step.status === "blocked" && step.blockedByLabel) {
    return {
      ok: false,
      reason: `Schedule ${step.blockedByLabel} first to keep production in the correct order.`,
      scheduleFirstKey: step.blockedByKey,
    };
  }

  return { ok: true };
}

export function validateFlowScheduleTiming(
  order: Order,
  jobId: string,
  imprintId: string,
  proposedStartAt: string,
  scheduleBlocks: ScheduleBlock[]
): { ok: true } | { ok: false; reason: string } {
  const flow = analyzeOrderProductionFlow(order, scheduleBlocks);
  const stepIndex = flow.findIndex(
    (entry) => entry.jobId === jobId && entry.imprintId === imprintId
  );
  if (stepIndex <= 0) return { ok: true };

  const proposedStart = parseISO(proposedStartAt);
  const priorScheduled = flow
    .slice(0, stepIndex)
    .filter((entry) => entry.scheduleBlock)
    .map((entry) => entry.scheduleBlock!);

  for (const prior of priorScheduled) {
    const priorEnd = parseISO(prior.endAt);
    if (isBefore(proposedStart, priorEnd)) {
      return {
        ok: false,
        reason: `Start after ${prior.imprintLabel} finishes (${format(priorEnd, "EEE MMM d · h:mm a")}).`,
      };
    }
  }

  return { ok: true };
}

export function countFlowIssues(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[]
): { outOfSequence: number; timingConflicts: number } {
  let outOfSequence = 0;
  let timingConflicts = 0;

  for (const order of orders) {
    const flow = analyzeOrderProductionFlow(order, scheduleBlocks);
    const scheduled = flow.filter((step) => step.scheduleBlock);

    for (const step of flow) {
      if (step.status === "blocked") outOfSequence++;
    }

    for (let i = 1; i < scheduled.length; i++) {
      const current = scheduled[i].scheduleBlock!;
      const prior = scheduled[i - 1].scheduleBlock!;
      if (isBefore(parseISO(current.startAt), parseISO(prior.endAt))) {
        timingConflicts++;
      }
    }
  }

  return { outOfSequence, timingConflicts };
}

export function daysSinceSubmitted(createdAt: string): number {
  const today = startOfDay(new Date());
  const submitted = startOfDay(parseISO(createdAt));
  return differenceInCalendarDays(today, submitted);
}

export function priorityTierLabel(rush: boolean): "Rush" | "Standard" {
  return rush ? "Rush" : "Standard";
}
