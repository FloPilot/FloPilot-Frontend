import {
  differenceInCalendarDays,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { countTasksByStatus } from "@/lib/production-board";
import { buildProductionBoardTasks } from "@/lib/production-events-board";
import type { Order, OrderStatus, ScheduleBlock, StationJobRun, Task, TaskStatus } from "@/types";

export type ActiveProductionOrder = {
  id: string;
  number: string;
  company: string;
  status: OrderStatus;
  departmentTaskCount: number;
  openDepartmentTaskCount: number;
};

export type ProductionPipelineSnapshot = {
  openTasks: Task[];
  statusCounts: Record<TaskStatus, number>;
  activeOrders: ActiveProductionOrder[];
};

export function getActiveProductionOrderIds(
  orders: Order[],
  scheduleBlocks: ScheduleBlock[],
  now = new Date()
): Set<string> {
  const todayMs = startOfDay(now).getTime();
  const activeOrderIds = new Set<string>();

  for (const order of orders) {
    if (["in_production", "ready_to_ship"].includes(order.status)) {
      activeOrderIds.add(order.id);
    }
  }

  for (const block of scheduleBlocks) {
    try {
      const end = startOfDay(parseISO(block.endAt));
      if (end.getTime() >= todayMs) {
        activeOrderIds.add(block.orderId);
      }
    } catch {
      continue;
    }
  }

  return activeOrderIds;
}

function taskRank(status: TaskStatus) {
  if (status === "blocked") return 0;
  if (status === "in_progress") return 1;
  if (status === "pending") return 2;
  return 3;
}

export function buildProductionPipelineSnapshot({
  orders,
  scheduleBlocks,
  jobRuns,
  productionTasks,
  now = new Date(),
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  productionTasks: Task[];
  now?: Date;
}): ProductionPipelineSnapshot {
  const activeOrderIds = getActiveProductionOrderIds(
    orders,
    scheduleBlocks,
    now
  );

  const boardTasks = buildProductionBoardTasks({
    orders,
    scheduleBlocks,
    jobRuns,
    includeCompleted: false,
  });

  const relevantTasks = boardTasks.filter((task) =>
    activeOrderIds.has(task.orderId)
  );

  const openTasks = relevantTasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => taskRank(a.status) - taskRank(b.status));

  const activeOrders = orders
    .filter((order) => activeOrderIds.has(order.id))
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    )
    .map((order) => {
      const orderTasks = boardTasks.filter((task) => task.orderId === order.id);
      return {
        id: order.id,
        number: order.number,
        company: order.company,
        status: order.status,
        departmentTaskCount: orderTasks.length,
        openDepartmentTaskCount: orderTasks.filter(
          (task) => task.status !== "done"
        ).length,
      };
    });

  return {
    openTasks,
    statusCounts: countTasksByStatus(relevantTasks),
    activeOrders,
  };
}

export type ProductionDashboardMetrics = {
  /** Orders in production or with upcoming calendar events */
  activeOrders: number;
  /** Production events on the calendar (today or later) */
  upcomingEvents: number;
  completedThisMonth: number;
  avgTurnaroundDays: number | null;
  onTimeRatePct: number | null;
  runningNow: number;
  scheduledToday: number;
  inProgressTasks: number;
  blockedTasks: number;
};

function resolveCompletionDate(order: Order): Date | null {
  if (!["shipped", "completed"].includes(order.status)) return null;

  const statusEvents =
    order.activity?.filter((event) => event.type === "status") ?? [];
  const completionEvent = [...statusEvents].reverse().find((event) => {
    const title = event.title?.toLowerCase() ?? "";
    return (
      title.includes("shipped") ||
      title.includes("completed") ||
      title.includes("delivered")
    );
  });

  if (completionEvent?.timestamp) {
    try {
      return startOfDay(parseISO(completionEvent.timestamp));
    } catch {
      /* fall through */
    }
  }

  try {
    return startOfDay(parseISO(order.inHandsDate));
  } catch {
    return null;
  }
}

export function computeProductionDashboardMetrics({
  orders,
  scheduleBlocks,
  jobRuns,
  productionTasks,
  now = new Date(),
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  productionTasks: Task[];
  now?: Date;
}): ProductionDashboardMetrics {
  const today = startOfDay(now);
  const monthStart = startOfMonth(today);
  const todayMs = today.getTime();

  const activeOrderIds = getActiveProductionOrderIds(
    orders,
    scheduleBlocks,
    now
  );

  let upcomingEvents = 0;

  for (const block of scheduleBlocks) {
    try {
      const end = startOfDay(parseISO(block.endAt));
      if (end.getTime() >= todayMs) {
        upcomingEvents += 1;
      }
    } catch {
      continue;
    }
  }

  const activeOrders = activeOrderIds.size;

  const completedOrders = orders.filter((order) =>
    ["shipped", "completed"].includes(order.status)
  );

  const completedThisMonth = completedOrders.filter((order) => {
    const completedAt = resolveCompletionDate(order);
    if (!completedAt) return false;
    return isWithinInterval(completedAt, { start: monthStart, end: today });
  });

  const turnaroundSamples: number[] = [];
  const onTimeSamples: { onTime: boolean }[] = [];

  for (const order of completedThisMonth) {
    const completedAt = resolveCompletionDate(order);
    if (!completedAt) continue;

    try {
      const created = startOfDay(parseISO(order.createdAt));
      const due = startOfDay(parseISO(order.inHandsDate));
      turnaroundSamples.push(
        Math.max(0, differenceInCalendarDays(completedAt, created))
      );
      onTimeSamples.push({ onTime: completedAt <= due });
    } catch {
      continue;
    }
  }

  const avgTurnaroundDays =
    turnaroundSamples.length > 0
      ? turnaroundSamples.reduce((sum, days) => sum + days, 0) /
        turnaroundSamples.length
      : null;

  const onTimeRatePct =
    onTimeSamples.length > 0
      ? Math.round(
          (onTimeSamples.filter((sample) => sample.onTime).length /
            onTimeSamples.length) *
            100
        )
      : null;

  const runningNow = jobRuns.filter((run) => run.status === "running").length;

  const scheduledToday = scheduleBlocks.filter((block) => {
    try {
      return (
        startOfDay(parseISO(block.startAt)).getTime() === today.getTime()
      );
    } catch {
      return false;
    }
  }).length;

  const boardTasks = buildProductionBoardTasks({
    orders,
    scheduleBlocks,
    jobRuns,
    includeCompleted: false,
  });

  const openTasks = boardTasks.filter((task) => task.status !== "done");

  return {
    activeOrders,
    upcomingEvents,
    completedThisMonth: completedThisMonth.length,
    avgTurnaroundDays,
    onTimeRatePct,
    runningNow,
    scheduledToday,
    inProgressTasks: openTasks.filter((task) => task.status === "in_progress")
      .length,
    blockedTasks: openTasks.filter((task) => task.status === "blocked").length,
  };
}
