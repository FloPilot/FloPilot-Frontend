import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import type { DashboardAttentionItem } from "@/lib/dashboard-insights";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { schedulableJobKey } from "@/lib/job-imprints";
import { formatDate } from "@/lib/format";
import { getDueDateUrgency } from "@/lib/order-health";
import { isArchivedOrder } from "@/lib/order-archive";
import { getOrderProductionSteps } from "@/lib/order-production";
import {
  formatProductionEventDetail,
  resolveProductionEvent,
  toShopTaskWorkflowStatus,
} from "@/lib/production-event-status";
import type {
  Order,
  ScheduleBlock,
  StationJobRun,
  Task,
} from "@/types";

/** Full workflow state shown on the Tasks page */
export type ShopTaskWorkflowStatus =
  | "urgent"
  | "needs_action"
  | "in_progress"
  | "blocked"
  | "completed";

/** Simplified buckets for the dashboard preview */
export type ShopTaskDashboardStatus = "open" | "urgent" | "completed";

export type ShopTaskDashboardFilter = "all" | ShopTaskDashboardStatus;
export type ShopTaskPageFilter = "all" | ShopTaskWorkflowStatus;
export type ShopTaskFilter = ShopTaskDashboardFilter | ShopTaskPageFilter;

/** @deprecated Use ShopTaskDashboardStatus */
export type ShopTaskStatus = ShopTaskDashboardStatus;

export type ShopTask = {
  id: string;
  title: string;
  detail?: string;
  href: string;
  workflowStatus: ShopTaskWorkflowStatus;
  /** Dashboard bucket derived from workflowStatus */
  status: ShopTaskDashboardStatus;
  tone: DashboardAttentionItem["tone"];
  kind: DashboardAttentionItem["kind"] | "production" | "production_event";
  workloadCount?: number;
  attentionItem?: DashboardAttentionItem;
  scheduleJobKey?: string;
  scheduleOrderId?: string;
  artworkEntry?: ArtworkQueueEntry;
  productionTask?: Task;
  productionEvent?: {
    orderId: string;
    jobId: string;
    imprintId: string;
    jobKey: string;
  };
};

export function workflowToDashboardStatus(
  workflow: ShopTaskWorkflowStatus
): ShopTaskDashboardStatus {
  if (workflow === "urgent") return "urgent";
  if (workflow === "completed") return "completed";
  return "open";
}

export function productionWorkflowStatus(task: Task): ShopTaskWorkflowStatus {
  switch (task.status) {
    case "done":
      return "completed";
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "blocked";
    default:
      return "needs_action";
  }
}

export function attentionItemStatus(
  item: DashboardAttentionItem
): ShopTaskDashboardStatus {
  if (
    item.tone === "critical" ||
    item.kind === "overdue" ||
    item.kind === "rush"
  ) {
    return "urgent";
  }
  return "open";
}

function resolveWorkflowStatus({
  urgent,
  productionTask,
}: {
  urgent: boolean;
  productionTask?: Task;
}): ShopTaskWorkflowStatus {
  if (productionTask) {
    const workflow = productionWorkflowStatus(productionTask);
    if (workflow === "needs_action" && urgent) return "urgent";
    return workflow;
  }
  return urgent ? "urgent" : "needs_action";
}

export function buildExpandedShopTasks({
  attentionItems,
  productionTasks,
  schedulingQueue,
  artworkPendingEntries,
  awaitingApprovalOrders,
  rushOrdersList,
  overdueOrders,
  readyToShipOrders,
  lowStockItems,
  orders = [],
  scheduleBlocks = [],
  jobRuns = [],
  includeCompleted = false,
}: {
  attentionItems: DashboardAttentionItem[];
  productionTasks: Task[];
  schedulingQueue: SchedulingQueueOrder[];
  artworkPendingEntries: ArtworkQueueEntry[];
  awaitingApprovalOrders: Order[];
  rushOrdersList: Order[];
  overdueOrders: Order[];
  readyToShipOrders: Order[];
  lowStockItems: number;
  orders?: Order[];
  scheduleBlocks?: ScheduleBlock[];
  jobRuns?: StationJobRun[];
  includeCompleted?: boolean;
}): ShopTask[] {
  const tasks: ShopTask[] = [];
  const archivedOrderIds = new Set(
    orders.filter(isArchivedOrder).map((order) => order.id)
  );
  const activeRushOrders = rushOrdersList.filter(
    (order) => !isArchivedOrder(order)
  );
  const activeOverdueOrders = overdueOrders.filter(
    (order) => !isArchivedOrder(order)
  );
  const activeAwaitingApprovalOrders = awaitingApprovalOrders.filter(
    (order) => !isArchivedOrder(order)
  );
  const activeReadyToShipOrders = readyToShipOrders.filter(
    (order) => !isArchivedOrder(order)
  );
  const activeSchedulingQueue = schedulingQueue.filter(
    (item) => !archivedOrderIds.has(item.orderId)
  );
  const activeArtworkPendingEntries = artworkPendingEntries.filter(
    (entry) => !archivedOrderIds.has(entry.orderId)
  );
  const activeProductionTasks = productionTasks.filter(
    (task) => !archivedOrderIds.has(task.orderId)
  );
  const rushIds = new Set(activeRushOrders.map((order) => order.id));

  const pushTask = (
    task: Omit<ShopTask, "workflowStatus" | "status"> & {
      urgent?: boolean;
      productionTask?: Task;
    }
  ) => {
    const workflowStatus = resolveWorkflowStatus({
      urgent: task.urgent ?? false,
      productionTask: task.productionTask,
    });
    const { urgent: _urgent, ...rest } = task;
    tasks.push({
      ...rest,
      workflowStatus,
      status: workflowToDashboardStatus(workflowStatus),
    });
  };

  for (const order of activeRushOrders) {
    pushTask({
      id: `rush-${order.id}`,
      title: order.number,
      detail: `Rush · ${order.company} · Due ${formatDate(order.inHandsDate)}`,
      href: `/app/orders/${order.id}`,
      tone: "critical",
      kind: "rush",
      urgent: true,
    });
  }

  for (const order of activeOverdueOrders) {
    if (rushIds.has(order.id)) continue;
    pushTask({
      id: `overdue-${order.id}`,
      title: order.number,
      detail: `Overdue · ${order.company} · Was due ${formatDate(order.inHandsDate)}`,
      href: `/app/orders/${order.id}`,
      tone: "critical",
      kind: "overdue",
      urgent: true,
    });
  }

  const pipelineOrders = orders.filter(
    (order) =>
      !isArchivedOrder(order) &&
      !["shipped", "completed"].includes(order.status)
  );

  for (const order of pipelineOrders) {
    const dueUrgency = getDueDateUrgency(order);
    const urgent =
      order.rush ||
      dueUrgency.status === "critical" ||
      dueUrgency.status === "warning";

    for (const step of getOrderProductionSteps(order)) {
      const resolved = resolveProductionEvent({
        order,
        job: step.job,
        imprint: step.imprint,
        scheduleBlocks,
        jobRuns,
      });

      if (resolved.status === "completed" && !includeCompleted) continue;

      const jobKey = schedulableJobKey(order.id, step.job.id, step.imprint.id);
      const workflowStatus = toShopTaskWorkflowStatus(resolved, { urgent });

      tasks.push({
        id: `event-${jobKey}`,
        title: `${order.number} · ${step.imprint.label}`,
        detail: formatProductionEventDetail({
          order,
          job: step.job,
          imprint: step.imprint,
          resolved,
        }),
        href: `/app/orders/${order.id}`,
        workflowStatus,
        status: workflowToDashboardStatus(workflowStatus),
        tone:
          workflowStatus === "urgent"
            ? "critical"
            : workflowStatus === "blocked"
              ? "warning"
              : "default",
        kind: "production_event",
        scheduleJobKey: jobKey,
        scheduleOrderId: order.id,
        productionEvent: {
          orderId: order.id,
          jobId: step.job.id,
          imprintId: step.imprint.id,
          jobKey,
        },
      });
    }
  }

  if (pipelineOrders.length === 0) {
    for (const item of activeSchedulingQueue) {
      const events =
        item.unscheduledEvents?.length > 0
          ? item.unscheduledEvents
          : item.nextEvent
            ? [item.nextEvent]
            : [];

      for (const event of events) {
        const eventUrgent =
          item.rush ||
          item.dueUrgency === "critical" ||
          item.dueUrgency === "warning";
        const flowHint =
          event.flowTotal > 1
            ? ` · Event ${event.flowStep} of ${event.flowTotal}`
            : "";

        pushTask({
          id: `schedule-${item.orderId}-${event.key}`,
          title: `${item.orderNumber} · ${event.imprintLabel}`,
          detail: `${item.customerName} · ${item.dueLabel}${flowHint}`,
          href: `/app/orders/${item.orderId}`,
          tone: eventUrgent ? "critical" : "default",
          kind: "schedule",
          scheduleJobKey: event.key,
          scheduleOrderId: item.orderId,
          urgent: eventUrgent,
        });
      }
    }

    for (const entry of activeArtworkPendingEntries) {
      const entryUrgent = entry.artwork.status === "revision_requested";
      pushTask({
        id: `artwork-${entry.orderId}-${entry.imprintId}`,
        title: entry.orderNumber,
        detail: `Proof · ${entry.imprintLabel} · ${entry.company}`,
        href: `/app/orders/${entry.orderId}`,
        tone: "warning",
        kind: "artwork",
        artworkEntry: entry,
        urgent: entryUrgent,
      });
    }
  }

  for (const order of activeAwaitingApprovalOrders) {
    const urgency = getDueDateUrgency(order);
    pushTask({
      id: `approval-${order.id}`,
      title: order.number,
      detail: `Awaiting approval · ${order.company} · ${formatDate(order.inHandsDate)}`,
      href: `/app/orders/${order.id}`,
      tone: "warning",
      kind: "approval",
      urgent:
        urgency.status === "critical" || urgency.status === "warning",
    });
  }

  for (const order of activeReadyToShipOrders) {
    pushTask({
      id: `ship-${order.id}`,
      title: order.number,
      detail: `Ready to ship · ${order.company}`,
      href: `/app/orders/${order.id}`,
      tone: "default",
      kind: "ready_to_ship",
    });
  }

  if (lowStockItems > 0) {
    pushTask({
      id: "inventory",
      title: `${lowStockItems} low stock item${lowStockItems !== 1 ? "s" : ""}`,
      detail: "Review inventory before upcoming production runs",
      href: "/app/inventory",
      tone: "warning",
      kind: "inventory",
      workloadCount: lowStockItems,
      attentionItem: attentionItems.find((item) => item.kind === "inventory"),
    });
  }

  for (const task of activeProductionTasks) {
    if (!includeCompleted && task.status === "done") continue;
    pushTask({
      id: `production-${task.id}`,
      title: task.title,
      detail: `${task.orderNumber} · ${task.customerName} · ${task.department}`,
      href: `/app/orders/${task.orderId}`,
      tone: task.status === "blocked" ? "critical" : "default",
      kind: "production",
      productionTask: task,
      urgent: task.status === "blocked",
    });
  }

  const rank = (task: ShopTask) => {
    switch (task.workflowStatus) {
      case "urgent":
        return 0;
      case "needs_action":
        return 1;
      case "blocked":
        return 2;
      case "in_progress":
        return 3;
      default:
        return 4;
    }
  };

  return tasks.sort((a, b) => rank(a) - rank(b));
}

export function countShopTasksByDashboardStatus(tasks: ShopTask[]) {
  return tasks.reduce(
    (counts, task) => {
      counts[task.status] += 1;
      return counts;
    },
    { open: 0, urgent: 0, completed: 0 }
  );
}

/** @deprecated Use countShopTasksByDashboardStatus */
export const countShopTasksByStatus = countShopTasksByDashboardStatus;

export function countShopTasksByWorkflow(tasks: ShopTask[]) {
  return tasks.reduce(
    (counts, task) => {
      counts[task.workflowStatus] += 1;
      return counts;
    },
    {
      urgent: 0,
      needs_action: 0,
      in_progress: 0,
      blocked: 0,
      completed: 0,
    } satisfies Record<ShopTaskWorkflowStatus, number>
  );
}

export function filterShopTasks(
  tasks: ShopTask[],
  filter: ShopTaskFilter,
  layout: "dashboard" | "page" = "dashboard"
): ShopTask[] {
  if (filter === "all") {
    return layout === "page"
      ? tasks
      : tasks.filter((task) => task.workflowStatus !== "completed");
  }

  if (layout === "dashboard") {
    if (filter === "open") {
      return tasks.filter((task) => task.status === "open");
    }
    if (filter === "urgent" || filter === "completed") {
      return tasks.filter((task) => task.status === filter);
    }
  }

  return tasks.filter((task) => task.workflowStatus === filter);
}

export const SHOP_TASK_DASHBOARD_LABELS: Record<ShopTaskDashboardStatus, string> =
  {
    open: "Open",
    urgent: "Urgent",
    completed: "Completed",
  };

/** @deprecated Use SHOP_TASK_DASHBOARD_LABELS */
export const SHOP_TASK_STATUS_LABELS = SHOP_TASK_DASHBOARD_LABELS;

export const SHOP_TASK_DASHBOARD_HINTS: Record<ShopTaskDashboardStatus, string> =
  {
    open: "Needs action soon",
    urgent: "Prioritize today",
    completed: "Finished work",
  };

/** @deprecated Use SHOP_TASK_DASHBOARD_HINTS */
export const SHOP_TASK_STATUS_HINTS = SHOP_TASK_DASHBOARD_HINTS;

export const SHOP_TASK_WORKFLOW_LABELS: Record<ShopTaskWorkflowStatus, string> =
  {
    urgent: "Urgent",
    needs_action: "Needs attention",
    in_progress: "In progress",
    blocked: "Blocked",
    completed: "Completed",
  };

export const SHOP_TASK_WORKFLOW_HINTS: Record<ShopTaskWorkflowStatus, string> = {
  urgent: "Prioritize today",
  needs_action: "Waiting on you",
  in_progress: "Someone is working on it",
  blocked: "Stuck — needs a decision",
  completed: "Finished",
};

export const SHOP_TASK_WORKFLOW_ORDER: ShopTaskWorkflowStatus[] = [
  "urgent",
  "needs_action",
  "blocked",
  "in_progress",
  "completed",
];

export function parseTasksPageFilter(
  value: string | null
): ShopTaskPageFilter {
  if (value === "all") return "all";
  if (value === "open") return "needs_action";
  if (
    value === "urgent" ||
    value === "needs_action" ||
    value === "in_progress" ||
    value === "blocked" ||
    value === "completed"
  ) {
    return value;
  }
  return "all";
}

/** @deprecated Use buildExpandedShopTasks */
export function buildShopTasks(args: {
  attentionItems: DashboardAttentionItem[];
  productionTasks: Task[];
  includeCompleted?: boolean;
}): ShopTask[] {
  return buildExpandedShopTasks({
    attentionItems: args.attentionItems,
    productionTasks: args.productionTasks,
    schedulingQueue: [],
    artworkPendingEntries: [],
    awaitingApprovalOrders: [],
    rushOrdersList: [],
    overdueOrders: [],
    readyToShipOrders: [],
    lowStockItems: 0,
    includeCompleted: args.includeCompleted,
  });
}
