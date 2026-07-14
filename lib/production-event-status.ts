import type {
  DecorationType,
  Job,
  JobImprint,
  Order,
  PrepCheckpointStatus,
  ProductionEventCheckpoints,
  ProductionEventWorkflow,
  ProductionEventWorkflowStatus,
  ScheduleBlock,
  StationJobRun,
} from "@/types";
import { materialsRequiredForImprint, resolveOrderMaterials } from "@/lib/order-materials";
import { getDecorationPrepSteps } from "@/lib/decoration-workflow";
import { decorationLabel, formatDate } from "@/lib/format";
import { findScheduleBlockForStep, formatScheduleBlockSummary } from "@/lib/order-production";
import { getOrderScreenFiles } from "@/lib/order-receiving-checkpoints";
import { getRunForBlock } from "@/lib/station-runs";
import type { ShopTaskWorkflowStatus } from "@/lib/shop-tasks";

export type ResolvedProductionEvent = {
  status: ProductionEventWorkflowStatus;
  phase: string;
  assignee?: string;
  onHold: boolean;
  blockedReason?: string;
  checkpoints: ProductionEventCheckpoints;
  scheduleBlock?: ScheduleBlock;
  run?: StationJobRun;
  isManualStatus: boolean;
};

export type PrepCheckpointKey = keyof ProductionEventCheckpoints;

export type PrepCheckpointConfig = {
  key: PrepCheckpointKey;
  label: string;
  hint: string;
};

const PREP_CONFIG: Record<DecorationType, PrepCheckpointConfig[]> = {
  screen_print: getDecorationPrepSteps("screen_print").map((step) => ({
    key: step.key as PrepCheckpointKey,
    label: step.label,
    hint: step.doneTitle,
  })),
  embroidery: getDecorationPrepSteps("embroidery").map((step) => ({
    key: step.key as PrepCheckpointKey,
    label: step.label,
    hint: step.doneTitle,
  })),
  dtf: getDecorationPrepSteps("dtf").map((step) => ({
    key: step.key as PrepCheckpointKey,
    label: step.label,
    hint: step.doneTitle,
  })),
  vinyl: getDecorationPrepSteps("vinyl").map((step) => ({
    key: step.key as PrepCheckpointKey,
    label: step.label,
    hint: step.doneTitle,
  })),
  finishing: getDecorationPrepSteps("finishing").map((step) => ({
    key: step.key as PrepCheckpointKey,
    label: step.label,
    hint: step.doneTitle,
  })),
};

export function getPrepCheckpointsForDecoration(
  decoration: DecorationType
): PrepCheckpointConfig[] {
  return PREP_CONFIG[decoration] ?? PREP_CONFIG.screen_print;
}

function deriveArtworkCheckpoint(
  imprint: JobImprint,
  workflow?: ProductionEventWorkflow
): PrepCheckpointStatus {
  if (imprint.artwork.status === "approved") return "done";
  if (workflow?.assignee) return "in_progress";
  if (imprint.artwork.status === "revision_requested") return "pending";
  return "pending";
}

function deriveMaterialsCheckpoint(
  order: Order,
  imprint: JobImprint,
  jobId: string,
  workflow?: ProductionEventWorkflow
): PrepCheckpointStatus {
  if (imprint.decoration === "finishing") {
    return workflow?.checkpoints?.materials ?? "pending";
  }

  const required = materialsRequiredForImprint(
    order,
    imprint.decoration,
    jobId,
    imprint.id
  );
  if (required.length > 0) {
    if (required.every((line) => line.status === "received")) return "done";
    if (required.some((line) => line.status === "partial" || line.status === "received")) {
      return "in_progress";
    }
    return "pending";
  }

  const garments = order.garments;
  if (garments) {
    if (garments.status === "received") return "done";
    if (garments.status === "partial") return "in_progress";
    return "pending";
  }

  const stored = workflow?.checkpoints?.materials;
  if (stored) return stored;
  return "pending";
}

function derivePrepCheckpoint(
  order: Order,
  imprint: JobImprint,
  workflow?: ProductionEventWorkflow
): PrepCheckpointStatus {
  if (workflow?.checkpoints?.prep) return workflow.checkpoints.prep;

  if (imprint.decoration === "screen_print") {
    const materials = resolveOrderMaterials(order);
    const screenSetup = materials?.lines.find((line) => line.kind === "screen_setup");
    if (screenSetup?.status === "received") return "done";
  }

  return "pending";
}

function mergeCheckpoints(
  order: Order,
  imprint: JobImprint,
  jobId: string,
  workflow?: ProductionEventWorkflow
): ProductionEventCheckpoints {
  const configs = getPrepCheckpointsForDecoration(imprint.decoration);
  const merged: ProductionEventCheckpoints = {};

  for (const config of configs) {
    if (config.key === "artwork") {
      merged.artwork =
        workflow?.checkpoints?.artwork ?? deriveArtworkCheckpoint(imprint, workflow);
    } else if (config.key === "materials") {
      merged.materials =
        workflow?.checkpoints?.materials ??
        deriveMaterialsCheckpoint(order, imprint, jobId, workflow);
    } else if (config.key === "prep") {
      merged.prep =
        workflow?.checkpoints?.prep ??
        derivePrepCheckpoint(order, imprint, workflow);
    }
  }

  return merged;
}

function checkpointBlocksProgress(
  checkpoints: ProductionEventCheckpoints,
  decoration: DecorationType
): string | undefined {
  const configs = getPrepCheckpointsForDecoration(decoration);
  for (const config of configs) {
    const value = checkpoints[config.key];
    if (value === "pending") return config.label;
    if (value === "in_progress") return `${config.label} in progress`;
  }
  return undefined;
}

function computeStatus({
  order,
  job,
  imprint,
  workflow,
  scheduleBlock,
  run,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  workflow?: ProductionEventWorkflow;
  scheduleBlock?: ScheduleBlock;
  run?: StationJobRun;
}): { status: ProductionEventWorkflowStatus; phase: string } {
  const checkpoints = mergeCheckpoints(order, imprint, job.id, workflow);

  if (workflow?.onHold) {
    return {
      status: "blocked",
      phase: workflow.blockedReason?.trim() || "On hold",
    };
  }

  if (imprint.artwork.status === "revision_requested") {
    return { status: "blocked", phase: "Customer revision requested" };
  }

  if (workflow?.status === "blocked" || workflow?.blockedReason?.trim()) {
    return {
      status: "blocked",
      phase: workflow.blockedReason?.trim() || "Blocked",
    };
  }

  const prepPhase = checkpointBlocksProgress(checkpoints, imprint.decoration);
  if (prepPhase?.includes("in progress")) {
    return { status: "in_progress", phase: prepPhase };
  }

  if (workflow?.assignee && imprint.artwork.status !== "approved") {
    return {
      status: "in_progress",
      phase: `Proof in progress · ${workflow.assignee}`,
    };
  }

  for (const config of getPrepCheckpointsForDecoration(imprint.decoration)) {
    const value = checkpoints[config.key];
    if (value === "in_progress") {
      return { status: "in_progress", phase: `${config.label} in progress` };
    }
  }

  if (
    scheduleBlock &&
    imprint.decoration === "screen_print" &&
    getOrderScreenFiles(order).length === 0
  ) {
    return {
      status: "blocked",
      phase: "Waiting on production files",
    };
  }

  if (prepPhase) {
    return { status: "needs_attention", phase: prepPhase };
  }

  for (const config of getPrepCheckpointsForDecoration(imprint.decoration)) {
    const value = checkpoints[config.key];
    if (value === "pending") {
      return { status: "needs_attention", phase: config.label };
    }
  }

  if (scheduleBlock) {
    if (!run || run.status === "upcoming") {
      return {
        status: "needs_attention",
        phase: `Scheduled · ${formatScheduleBlockSummary(scheduleBlock)}`,
      };
    }
  }

  if (!scheduleBlock) {
    return { status: "needs_attention", phase: "Ready for scheduling" };
  }

  return { status: "needs_attention", phase: "Waiting to start" };
}

export function resolveProductionEvent({
  order,
  job,
  imprint,
  scheduleBlocks,
  jobRuns,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
}): ResolvedProductionEvent {
  const workflow = imprint.workflow;
  const scheduleBlock = findScheduleBlockForStep(
    scheduleBlocks,
    order.id,
    job.id,
    imprint.id
  );
  const run = scheduleBlock
    ? getRunForBlock(jobRuns, scheduleBlock.id)
    : undefined;

  if (run?.status === "finished") {
    return {
      status: "completed",
      phase: "Completed",
      assignee: workflow?.assignee,
      onHold: Boolean(workflow?.onHold),
      blockedReason: workflow?.blockedReason,
      checkpoints: mergeCheckpoints(order, imprint, job.id, workflow),
      scheduleBlock,
      run,
      isManualStatus: false,
    };
  }

  if (run?.status === "running" || run?.status === "paused") {
    return {
      status: "in_progress",
      phase:
        run.status === "paused"
          ? "Paused on the floor"
          : "Running on the floor",
      assignee: workflow?.assignee,
      onHold: Boolean(workflow?.onHold),
      blockedReason: workflow?.blockedReason,
      checkpoints: mergeCheckpoints(order, imprint, job.id, workflow),
      scheduleBlock,
      run,
      isManualStatus: false,
    };
  }

  if (workflow?.status) {
    const computed = computeStatus({ order, job, imprint, workflow, scheduleBlock, run });
    return {
      status: workflow.status,
      phase: computed.phase,
      assignee: workflow.assignee,
      onHold: Boolean(workflow.onHold),
      blockedReason: workflow.blockedReason,
      checkpoints: mergeCheckpoints(order, imprint, job.id, workflow),
      scheduleBlock,
      run,
      isManualStatus: true,
    };
  }

  const computed = computeStatus({ order, job, imprint, workflow, scheduleBlock, run });
  return {
    status: computed.status,
    phase: computed.phase,
    assignee: workflow?.assignee,
    onHold: Boolean(workflow?.onHold),
    blockedReason: workflow?.blockedReason,
    checkpoints: mergeCheckpoints(order, imprint, job.id, workflow),
    scheduleBlock,
    run,
    isManualStatus: false,
  };
}

export function toShopTaskWorkflowStatus(
  resolved: ResolvedProductionEvent,
  options?: { urgent?: boolean }
): ShopTaskWorkflowStatus {
  if (options?.urgent && resolved.status !== "completed") return "urgent";
  if (resolved.status === "blocked") return "blocked";
  if (resolved.status === "completed") return "completed";
  if (resolved.status === "in_progress") return "in_progress";
  return "needs_action";
}

export function formatProductionEventDetail({
  order,
  job,
  imprint,
  resolved,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  resolved: ResolvedProductionEvent;
}): string {
  const parts = [
    decorationLabel(imprint.decoration),
    order.company,
    resolved.phase,
    `Due ${formatDate(order.inHandsDate)}`,
  ];
  if (job.name && job.name !== imprint.label) {
    parts.splice(1, 0, job.name);
  }
  return parts.filter(Boolean).join(" · ");
}

export const WORKFLOW_STATUS_OPTIONS: {
  value: ProductionEventWorkflowStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "needs_attention",
    label: "Needs attention",
    hint: "Waiting on scheduling, materials, or proof",
  },
  {
    value: "in_progress",
    label: "In progress",
    hint: "Someone is actively working on it",
  },
  {
    value: "blocked",
    label: "Blocked",
    hint: "Stopped — needs a decision",
  },
  {
    value: "completed",
    label: "Completed",
    hint: "This event is finished",
  },
];
