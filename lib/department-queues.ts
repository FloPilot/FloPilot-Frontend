import { addDays, format, parseISO, subDays } from "date-fns";
import {
  collectArtworkQueue,
  type ArtworkQueueEntry,
} from "@/lib/artwork-queue";
import { PREP_LEAD_DAYS_BEFORE_SCHEDULE } from "@/lib/departments";
import {
  computeInkPrepProgress,
  inkColorsForPrep,
} from "@/lib/ink-prep";
import { isArchivedOrder } from "@/lib/order-archive";
import { buildReceivingQueue } from "@/lib/receiving-queue";
import { getOrderScreenFiles } from "@/lib/order-receiving-checkpoints";
import {
  getInkPrepLines,
  getScreenSetupLine,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { getOrderProductionSteps } from "@/lib/order-production";
import type {
  JobImprint,
  Machine,
  MaterialReceiveStatus,
  Order,
  OrderMaterialLine,
  ScheduleBlock,
  StationJobRun,
  Task,
} from "@/types";
import {
  getActiveRunForMachine,
  getStaleIncompleteRunsForMachine,
  getUpcomingRunsForMachine,
} from "@/lib/station-runs";

export type PrepScheduleHint = {
  earliestScheduledAt: string;
  suggestedBy: string;
};

export function orderHasScheduledScreenPrint(
  order: Order,
  scheduleBlocks: ScheduleBlock[]
): boolean {
  const screenPrintImprints = new Set(
    getOrderProductionSteps(order)
      .filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration === "screen_print"
      )
      .map(({ job, imprint }) => `${job.id}:${imprint.id}`)
  );

  return scheduleBlocks.some(
    (block) =>
      block.orderId === order.id &&
      Boolean(block.jobId) &&
      Boolean(block.imprintId) &&
      screenPrintImprints.has(`${block.jobId}:${block.imprintId}`)
  );
}

function computeScreenPrepScheduleHint(
  order: Order,
  scheduleBlocks: ScheduleBlock[]
): PrepScheduleHint | null {
  const screenPrintImprints = new Set(
    getOrderProductionSteps(order)
      .filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration === "screen_print"
      )
      .map(({ job, imprint }) => `${job.id}:${imprint.id}`)
  );
  const screenPrintBlocks = scheduleBlocks.filter(
    (block) =>
      block.orderId === order.id &&
      Boolean(block.jobId) &&
      Boolean(block.imprintId) &&
      screenPrintImprints.has(`${block.jobId}:${block.imprintId}`)
  );
  return computePrepScheduleHint(screenPrintBlocks, order.id);
}

export function imprintHasSchedule(
  orderId: string,
  jobId: string,
  imprintId: string,
  scheduleBlocks: ScheduleBlock[]
): boolean {
  return scheduleBlocks.some(
    (block) =>
      block.orderId === orderId &&
      block.jobId === jobId &&
      block.imprintId === imprintId
  );
}

export function computePrepScheduleHint(
  scheduleBlocks: ScheduleBlock[],
  orderId: string,
  options?: { jobId?: string; imprintId?: string },
  leadDays = PREP_LEAD_DAYS_BEFORE_SCHEDULE
): PrepScheduleHint | null {
  const relevant = scheduleBlocks.filter((block) => {
    if (block.orderId !== orderId) return false;
    if (options?.jobId && block.jobId !== options.jobId) return false;
    if (options?.imprintId && block.imprintId !== options.imprintId) {
      return false;
    }
    return true;
  });

  if (relevant.length === 0) return null;

  const earliest = relevant.reduce((min, block) => {
    const start = parseISO(block.startAt);
    return start < parseISO(min) ? block.startAt : min;
  }, relevant[0]!.startAt);

  return {
    earliestScheduledAt: earliest,
    suggestedBy: format(
      subDays(parseISO(earliest), leadDays),
      "yyyy-MM-dd"
    ),
  };
}

function isActiveProductionOrder(order: Order): boolean {
  return (
    !isArchivedOrder(order) &&
    !["shipped", "completed", "cancelled"].includes(order.status)
  );
}

export function collectArtworkDepartmentQueue(
  orders: Order[]
): ArtworkQueueEntry[] {
  return collectArtworkQueue(orders).filter(
    (entry) =>
      !entry.archived &&
      (entry.artwork.status === "pending" ||
        entry.artwork.status === "revision_requested")
  );
}

export type ScreenQueueEntry = {
  order: Order;
  screenLine: OrderMaterialLine;
  status: MaterialReceiveStatus;
  screenPrintCount: number;
  scheduleHint: PrepScheduleHint | null;
  prepDueAt?: string;
  hasProductionFiles: boolean;
  productionFileCount: number;
};

export type ScreenQueueCluster =
  | { type: "single"; entry: ScreenQueueEntry }
  | { type: "run"; runId: string; orderCount: number; entries: ScreenQueueEntry[] };

/** Group screen burn cards that share a multi-order production run. */
export function clusterScreenQueueEntries(
  entries: ScreenQueueEntry[]
): ScreenQueueCluster[] {
  const runBuckets = new Map<string, ScreenQueueEntry[]>();
  const sequence: Array<{ kind: "run" | "single"; key: string }> = [];

  for (const entry of entries) {
    const run = entry.order.productionRun;
    const runId = run && run.members.length > 1 ? run.id : undefined;
    if (!runId) {
      sequence.push({ kind: "single", key: entry.order.id });
      continue;
    }
    if (!runBuckets.has(runId)) {
      runBuckets.set(runId, []);
      sequence.push({ kind: "run", key: runId });
    }
    runBuckets.get(runId)!.push(entry);
  }

  return sequence.map((item) => {
    if (item.kind === "single") {
      return {
        type: "single" as const,
        entry: entries.find((entry) => entry.order.id === item.key)!,
      };
    }
    const bucket = runBuckets.get(item.key) ?? [];
    const orderCount = Math.max(
      bucket[0]?.order.productionRun?.members.length ?? 0,
      bucket.length
    );
    if (bucket.length < 2) {
      return { type: "single" as const, entry: bucket[0]! };
    }
    return {
      type: "run" as const,
      runId: item.key,
      orderCount,
      entries: bucket,
    };
  });
}

export function collectScreenQueue(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  options?: { includeCompleted?: boolean }
): ScreenQueueEntry[] {
  const includeCompleted = options?.includeCompleted === true;
  const entries: ScreenQueueEntry[] = [];

  for (const order of orders) {
    if (!isActiveProductionOrder(order)) continue;

    const hasScreenPrint = order.jobs.some(
      (job) =>
        job.kind !== "finishing" &&
        job.imprints.some((imp) => imp.decoration === "screen_print")
    );
    if (!hasScreenPrint) continue;

    const materials = mergeOrderMaterials(order);
    const screenLine = getScreenSetupLine(materials);
    if (!screenLine) continue;

    const isComplete = screenLine.status === "received";
    if (isComplete && !includeCompleted) continue;

    const screenPrintCount = order.jobs.reduce(
      (sum, job) =>
        sum +
        job.imprints.filter((imp) => imp.decoration === "screen_print").length,
      0
    );
    const productionFiles = getOrderScreenFiles(order);
    const scheduleHint = computeScreenPrepScheduleHint(order, scheduleBlocks);
    if (
      !isComplete &&
      !scheduleHint &&
      productionFiles.length === 0
    ) {
      continue;
    }

    entries.push({
      order,
      screenLine,
      status: screenLine.status,
      screenPrintCount,
      scheduleHint,
      prepDueAt: screenLine.prepDueAt,
      hasProductionFiles: productionFiles.length > 0,
      productionFileCount: productionFiles.length,
    });
  }

  return entries.sort((a, b) => {
    const aDone = a.screenLine.status === "received";
    const bDone = b.screenLine.status === "received";
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aScheduled = Boolean(a.scheduleHint);
    const bScheduled = Boolean(b.scheduleHint);
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
    if (!aScheduled && !bScheduled) {
      return a.order.number.localeCompare(b.order.number);
    }
    const aDate =
      a.prepDueAt ??
      a.scheduleHint?.suggestedBy;
    const bDate =
      b.prepDueAt ??
      b.scheduleHint?.suggestedBy;
    const dateOrder =
      new Date(aDate ?? 0).getTime() - new Date(bDate ?? 0).getTime();
    if (dateOrder !== 0) return dateOrder;
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    return a.order.number.localeCompare(b.order.number);
  });
}

export type InkQueueEntry = {
  order: Order;
  line: OrderMaterialLine;
  imprint: JobImprint;
  jobName: string;
  imprintLabel: string;
  progress: { prepped: number; total: number };
  status: MaterialReceiveStatus;
  scheduleHint: PrepScheduleHint | null;
  prepDueAt?: string;
  inkColors: ReturnType<typeof inkColorsForPrep>;
  readyForPrep: boolean;
  readinessReason?: string;
};

export type InkQueueCluster =
  | { type: "single"; entry: InkQueueEntry }
  | { type: "run"; runId: string; orderCount: number; entries: InkQueueEntry[] };

/** Group ink prep cards that share a multi-order production run. */
export function clusterInkQueueEntries(
  entries: InkQueueEntry[]
): InkQueueCluster[] {
  const runBuckets = new Map<string, InkQueueEntry[]>();
  const sequence: Array<{ kind: "run" | "single"; key: string }> = [];

  for (const entry of entries) {
    const run = entry.order.productionRun;
    const runId =
      run && run.members.length > 1 ? run.id : undefined;
    if (!runId) {
      sequence.push({ kind: "single", key: entry.line.id });
      continue;
    }
    if (!runBuckets.has(runId)) {
      runBuckets.set(runId, []);
      sequence.push({ kind: "run", key: runId });
    }
    runBuckets.get(runId)!.push(entry);
  }

  return sequence.map((item) => {
    if (item.kind === "single") {
      return {
        type: "single" as const,
        entry: entries.find((entry) => entry.line.id === item.key)!,
      };
    }
    const bucket = runBuckets.get(item.key) ?? [];
    const orderCount = Math.max(
      bucket[0]?.order.productionRun?.members.length ?? 0,
      new Set(bucket.map((entry) => entry.order.id)).size
    );
    // Only wrap with the shared border when more than one card is visible.
    if (bucket.length < 2) {
      return { type: "single" as const, entry: bucket[0]! };
    }
    return {
      type: "run" as const,
      runId: item.key,
      orderCount,
      entries: bucket,
    };
  });
}

export function collectInkQueue(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  options?: { includeCompleted?: boolean }
): InkQueueEntry[] {
  const includeCompleted = options?.includeCompleted === true;
  const entries: InkQueueEntry[] = [];

  for (const order of orders) {
    if (!isActiveProductionOrder(order)) continue;

    const materials = mergeOrderMaterials(order);
    const inkLines = getInkPrepLines(materials).filter((line) =>
      includeCompleted ? true : line.status !== "received"
    );

    for (const line of inkLines) {
      if (!line.jobId || !line.imprintId) continue;

      const step = getOrderProductionSteps(order).find(
        (entry) =>
          entry.job.id === line.jobId && entry.imprint.id === line.imprintId
      );
      if (!step) continue;

      const inkColors = inkColorsForPrep(step.imprint);
      const artworkReady = step.imprint.artwork.status === "approved";
      const colorsReady = inkColors.length > 0;
      const readyForPrep = artworkReady && colorsReady;
      const isComplete = line.status === "received";
      const scheduleHint = computePrepScheduleHint(
        scheduleBlocks,
        order.id,
        { jobId: line.jobId, imprintId: line.imprintId }
      );
      if (!isComplete && !scheduleHint && !readyForPrep) continue;
      const progress = computeInkPrepProgress(
        step.imprint,
        line.preppedInkColorIds ?? []
      );

      entries.push({
        order,
        line,
        imprint: step.imprint,
        jobName: step.job.name,
        imprintLabel: step.imprint.label,
        progress,
        status: line.status,
        scheduleHint,
        prepDueAt: line.prepDueAt,
        inkColors,
        readyForPrep,
        readinessReason: !artworkReady
          ? "Artwork must be approved before mixing ink."
          : !colorsReady
            ? "Add ink colors to this screen-print location before prep."
            : undefined,
      });
    }
  }

  return entries.sort((a, b) => {
    const aDone = a.line.status === "received";
    const bDone = b.line.status === "received";
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aScheduled = Boolean(a.scheduleHint);
    const bScheduled = Boolean(b.scheduleHint);
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
    if (!aScheduled && !bScheduled) {
      return a.order.number.localeCompare(b.order.number);
    }
    const aDate =
      a.prepDueAt ??
      a.scheduleHint?.suggestedBy;
    const bDate =
      b.prepDueAt ??
      b.scheduleHint?.suggestedBy;
    const dateOrder =
      new Date(aDate ?? 0).getTime() - new Date(bDate ?? 0).getTime();
    if (dateOrder !== 0) return dateOrder;
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    return a.order.number.localeCompare(b.order.number);
  });
}

export function collectFinishingDepartmentTasks(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) =>
      task.department === "QC & Packing" ||
      task.title.toLowerCase().includes("finishing")
  );
}

export function departmentQueueCounts(input: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  productionBoardTasks: Task[];
  machines?: Machine[];
  jobRuns?: StationJobRun[];
}) {
  const artwork = collectArtworkDepartmentQueue(input.orders);
  const screens = collectScreenQueue(input.orders, input.scheduleBlocks);
  const inks = collectInkQueue(input.orders, input.scheduleBlocks);
  const finishing = collectFinishingDepartmentTasks(
    input.productionBoardTasks
  ).filter((task) => task.status !== "done");

  const receiving = buildReceivingQueue(input.orders).filter(
    (group) => group.openLineCount > 0
  ).length;

  const machines = input.machines ?? [];
  const jobRuns = input.jobRuns ?? [];
  const production = machines.filter((machine) => {
    if (!machine.active) return false;
    const active = getActiveRunForMachine(jobRuns, machine.id);
    if (active) return true;
    const stale = getStaleIncompleteRunsForMachine(
      input.scheduleBlocks,
      jobRuns,
      machine.id
    );
    if (stale.length > 0) return true;
    const upcoming = getUpcomingRunsForMachine(
      input.scheduleBlocks,
      jobRuns,
      machine.id
    );
    return upcoming.length > 0;
  }).length;

  return {
    artwork: artwork.length,
    screens: screens.length,
    inks: inks.length,
    production,
    finishing: finishing.length,
    receiving,
  };
}

export function isPrepDateOverdue(
  dateIso: string | undefined,
  complete: boolean
): boolean {
  if (!dateIso || complete) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  return dateIso < today;
}

export function isPrepDateDueSoon(
  dateIso: string | undefined,
  complete: boolean,
  withinDays = 2
): boolean {
  if (!dateIso || complete) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  const soon = format(addDays(new Date(), withinDays), "yyyy-MM-dd");
  return dateIso >= today && dateIso <= soon;
}
