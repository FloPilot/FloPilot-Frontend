import { schedulableJobKey, parseSchedulableJobKey } from "@/lib/job-imprints";
import { getOrderProductionSteps } from "@/lib/order-production";
import { isArchivedOrder } from "@/lib/order-archive";
import {
  resolveProductionEvent,
  type ResolvedProductionEvent,
} from "@/lib/production-event-status";
import type {
  Job,
  JobImprint,
  Order,
  ProductionEventWorkflowStatus,
  ScheduleBlock,
  StationJobRun,
  Task,
  TaskStatus,
} from "@/types";

const EVENT_TASK_PREFIX = "event-";

export function isProductionEventTaskId(taskId: string): boolean {
  return taskId.startsWith(EVENT_TASK_PREFIX);
}

export function parseProductionEventTaskId(taskId: string): {
  orderId: string;
  jobId: string;
  imprintId: string;
} | null {
  if (!isProductionEventTaskId(taskId)) return null;
  return parseSchedulableJobKey(taskId.slice(EVENT_TASK_PREFIX.length));
}

export function productionEventTaskId(
  orderId: string,
  jobId: string,
  imprintId: string
): string {
  return `${EVENT_TASK_PREFIX}${schedulableJobKey(orderId, jobId, imprintId)}`;
}

export function workflowToBoardStatus(
  resolved: ResolvedProductionEvent
): TaskStatus {
  switch (resolved.status) {
    case "completed":
      return "done";
    case "blocked":
      return "blocked";
    case "in_progress":
      return "in_progress";
    default:
      return "pending";
  }
}

export function boardStatusToWorkflow(
  status: TaskStatus
): ProductionEventWorkflowStatus {
  switch (status) {
    case "done":
      return "completed";
    case "blocked":
      return "blocked";
    case "in_progress":
      return "in_progress";
    default:
      return "needs_attention";
  }
}

export function departmentForProductionEvent(
  job: Job,
  imprint: JobImprint,
  resolved: ResolvedProductionEvent
): string {
  if (
    job.kind !== "finishing" &&
    imprint.artwork.status !== "approved" &&
    imprint.artwork.name !== "n/a"
  ) {
    return "Art Department";
  }

  const prep = resolved.checkpoints.prep;
  if (prep === "pending" || prep === "in_progress") {
    if (imprint.decoration === "screen_print") return "Screen Prep";
    if (imprint.decoration === "embroidery") return "Embroidery";
  }

  switch (imprint.decoration) {
    case "embroidery":
      return "Embroidery";
    case "finishing":
      return "QC & Packing";
    default:
      return "Press Floor";
  }
}

export function buildProductionBoardTasks({
  orders,
  scheduleBlocks,
  jobRuns,
  includeCompleted = true,
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  includeCompleted?: boolean;
}): Task[] {
  const tasks: Task[] = [];
  const pipelineOrders = orders.filter(
    (order) =>
      !isArchivedOrder(order) &&
      !["shipped", "completed"].includes(order.status)
  );

  for (const order of pipelineOrders) {
    for (const step of getOrderProductionSteps(order)) {
      const resolved = resolveProductionEvent({
        order,
        job: step.job,
        imprint: step.imprint,
        scheduleBlocks,
        jobRuns,
      });

      const status = workflowToBoardStatus(resolved);
      if (status === "done" && !includeCompleted) continue;

      const title =
        step.job.name !== step.imprint.label
          ? `${step.imprint.label} · ${step.job.name}`
          : step.imprint.label;

      tasks.push({
        id: productionEventTaskId(order.id, step.job.id, step.imprint.id),
        title,
        department: departmentForProductionEvent(
          step.job,
          step.imprint,
          resolved
        ),
        assignee: resolved.assignee?.trim() || "Unassigned",
        status,
        dueDate: order.inHandsDate,
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customerId,
        customerName: order.company,
        phase: resolved.phase,
        productionEvent: {
          jobId: step.job.id,
          imprintId: step.imprint.id,
        },
      });
    }
  }

  const rank = (status: TaskStatus) => {
    if (status === "blocked") return 0;
    if (status === "in_progress") return 1;
    if (status === "pending") return 2;
    return 3;
  };

  return tasks.sort((a, b) => rank(a.status) - rank(b.status));
}
