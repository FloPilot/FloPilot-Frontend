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
import {
  getInkPrepLines,
  getScreenSetupLine,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { getOrderProductionSteps } from "@/lib/order-production";
import type {
  JobImprint,
  MaterialReceiveStatus,
  Order,
  OrderMaterialLine,
  ScheduleBlock,
  Task,
} from "@/types";

export type PrepScheduleHint = {
  earliestScheduledAt: string;
  suggestedBy: string;
};

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
};

export function collectScreenQueue(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[]
): ScreenQueueEntry[] {
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
    if (!screenLine || screenLine.status === "received") continue;

    const screenPrintCount = order.jobs.reduce(
      (sum, job) =>
        sum +
        job.imprints.filter((imp) => imp.decoration === "screen_print").length,
      0
    );

    const scheduleHint = computePrepScheduleHint(scheduleBlocks, order.id, {
      jobId: undefined,
    });

    entries.push({
      order,
      screenLine,
      status: screenLine.status,
      screenPrintCount,
      scheduleHint,
      prepDueAt: screenLine.prepDueAt,
    });
  }

  return entries.sort((a, b) => {
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    const aDate =
      a.prepDueAt ??
      a.scheduleHint?.suggestedBy ??
      a.order.inHandsDate;
    const bDate =
      b.prepDueAt ??
      b.scheduleHint?.suggestedBy ??
      b.order.inHandsDate;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
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
};

export function collectInkQueue(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[]
): InkQueueEntry[] {
  const entries: InkQueueEntry[] = [];

  for (const order of orders) {
    if (!isActiveProductionOrder(order)) continue;

    const materials = mergeOrderMaterials(order);
    const inkLines = getInkPrepLines(materials).filter(
      (line) => line.status !== "received"
    );

    for (const line of inkLines) {
      if (!line.jobId || !line.imprintId) continue;

      const step = getOrderProductionSteps(order).find(
        (entry) =>
          entry.job.id === line.jobId && entry.imprint.id === line.imprintId
      );
      if (!step) continue;
      if (step.imprint.artwork.status !== "approved") continue;

      const inkColors = inkColorsForPrep(step.imprint);
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
        scheduleHint: computePrepScheduleHint(
          scheduleBlocks,
          order.id,
          { jobId: line.jobId, imprintId: line.imprintId }
        ),
        prepDueAt: line.prepDueAt,
        inkColors,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    const aDate =
      a.prepDueAt ??
      a.scheduleHint?.suggestedBy ??
      a.order.inHandsDate;
    const bDate =
      b.prepDueAt ??
      b.scheduleHint?.suggestedBy ??
      b.order.inHandsDate;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
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

  return {
    artwork: artwork.length,
    screens: screens.length,
    inks: inks.length,
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
