import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import type {
  DashboardStats,
  Machine,
  Order,
  ScheduleBlock,
  StationJobRun,
  Task,
} from "@/types";
import { collectArtworkQueue, countArtworkQueue } from "@/lib/artwork-queue";
import {
  buildSchedulingQueueOrders,
  getUnscheduledEvents,
} from "@/lib/event-basket";
import { getDueDateUrgency } from "@/lib/order-health";
import { formatProductionEventsToSchedule } from "@/lib/terminology";

export type DashboardAttentionKind =
  | "schedule"
  | "artwork"
  | "approval"
  | "rush"
  | "overdue"
  | "ready_to_ship"
  | "inventory";

export type DashboardAttentionItem = {
  id: string;
  kind: DashboardAttentionKind;
  label: string;
  detail?: string;
  href: string;
  tone: "default" | "warning" | "critical";
};

export type DashboardLiveStats = {
  activeOrders: number;
  toSchedule: number;
  toScheduleOrders: number;
  dueThisWeek: number;
  awaitingApproval: number;
  artworkPending: number;
  readyToShip: number;
  lowStockItems: number;
  scheduledToday: number;
  runningNow: number;
  rushOrders: number;
  openPipeline: number;
};

export type TodayFloorItem =
  | {
      kind: "scheduled";
      id: string;
      machineName: string;
      machineColor?: Machine["color"];
      orderNumber: string;
      imprintLabel: string;
      timeLabel: string;
      href: string;
    }
  | {
      kind: "running";
      id: string;
      machineName: string;
      orderNumber: string;
      imprintLabel: string;
      href: string;
    };

export function computeDashboardInsights({
  orders,
  scheduleBlocks,
  jobRuns,
  machines,
  productionTasks,
  apiStats,
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  machines: Machine[];
  productionTasks: Task[];
  apiStats: DashboardStats | null;
}) {
  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = addDays(today, 7);

  const openOrders = orders.filter(
    (order) => !["shipped", "completed"].includes(order.status)
  );

  const activeOrdersList = openOrders
    .filter((order) =>
      ["approved", "in_production", "ready_to_ship"].includes(order.status)
    )
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const activeOrders = activeOrdersList.length;

  const openPipeline = openOrders.filter((order) =>
    ["draft", "quote_sent", "awaiting_approval"].includes(order.status)
  ).length;

  const dueThisWeekOrders = openOrders
    .filter((order) => {
      try {
        const due = startOfDay(parseISO(order.inHandsDate));
        return isWithinInterval(due, { start: today, end: weekEnd });
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const dueThisWeek = dueThisWeekOrders.length;

  const awaitingApprovalOrders = openOrders
    .filter((order) =>
      ["quote_sent", "awaiting_approval"].includes(order.status)
    )
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const awaitingApproval = awaitingApprovalOrders.length;

  const rushOrdersList = openOrders
    .filter((order) => order.rush)
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const artworkCounts = countArtworkQueue(collectArtworkQueue(orders));
  const artworkPendingEntries = collectArtworkQueue(orders).filter((entry) =>
    ["pending", "revision_requested"].includes(entry.artwork.status)
  );
  const artworkPending =
    artworkCounts.pending + artworkCounts.revision_requested;

  const schedulingQueue = buildSchedulingQueueOrders(orders, scheduleBlocks, {
    ignoreArtworkApproval: true,
  });
  const unscheduledEvents = getUnscheduledEvents(orders, scheduleBlocks, {
    ignoreArtworkApproval: true,
  });
  const toSchedule = unscheduledEvents.length;
  const toScheduleOrders = schedulingQueue.length;

  const rushOrders = openOrders.filter((order) => order.rush).length;

  const overdueOrders = openOrders.filter((order) => {
    const urgency = getDueDateUrgency(order);
    return urgency.daysUntilDue < 0;
  });

  const readyToShipOrders = openOrders.filter(
    (order) => order.status === "ready_to_ship"
  );

  const blocksToday = scheduleBlocks
    .filter((block) => isSameDay(parseISO(block.startAt), now))
    .sort(
      (a, b) =>
        parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
    );

  const runningRuns = jobRuns.filter((run) => run.status === "running");

  const machineById = new Map(machines.map((machine) => [machine.id, machine]));
  const blockById = new Map(scheduleBlocks.map((block) => [block.id, block]));

  const runningFloor: TodayFloorItem[] = runningRuns.map((run) => {
    const block = blockById.get(run.scheduleBlockId);
    const machine = machineById.get(run.machineId);
    return {
      kind: "running" as const,
      id: run.id,
      machineName: machine?.name ?? "Machine",
      orderNumber: block?.orderNumber ?? "—",
      imprintLabel: block?.imprintLabel ?? "In progress",
      href: block ? `/app/orders/${block.orderId}` : "/app/calendar",
    };
  });

  const runningBlockIds = new Set(runningRuns.map((run) => run.scheduleBlockId));

  const scheduledFloor: TodayFloorItem[] = blocksToday
    .filter((block) => !runningBlockIds.has(block.id))
    .map((block) => {
      const machine = machineById.get(block.machineId);
      const start = parseISO(block.startAt);
      const end = parseISO(block.endAt);
      return {
        kind: "scheduled" as const,
        id: block.id,
        machineName: machine?.name ?? "Machine",
        machineColor: machine?.color,
        orderNumber: block.orderNumber,
        imprintLabel: block.imprintLabel,
        timeLabel: `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`,
        href: `/app/orders/${block.orderId}`,
      };
    });

  const todayFloor: TodayFloorItem[] = [...runningFloor, ...scheduledFloor];

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const openTasks = productionTasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      const rank = (status: Task["status"]) =>
        status === "blocked" ? 0 : status === "in_progress" ? 1 : 2;
      return rank(a.status) - rank(b.status);
    })
    .slice(0, 4);

  const attention: DashboardAttentionItem[] = [];

  if (toSchedule > 0) {
    attention.push({
      id: "schedule",
      kind: "schedule",
      label: formatProductionEventsToSchedule(toSchedule),
      detail:
        toScheduleOrders === 1
          ? "1 order in the scheduling queue"
          : `${toScheduleOrders} orders in the scheduling queue`,
      href: "/app/calendar",
      tone: "default",
    });
  }

  if (artworkPending > 0) {
    attention.push({
      id: "artwork",
      kind: "artwork",
      label: `${artworkPending} proof${artworkPending !== 1 ? "s" : ""} need attention`,
      detail: "Review artwork and send proofs",
      href: "/app/artwork",
      tone: "warning",
    });
  }

  if (awaitingApproval > 0) {
    attention.push({
      id: "approval",
      kind: "approval",
      label: `${awaitingApproval} order${awaitingApproval !== 1 ? "s" : ""} awaiting customer approval`,
      detail: "Follow up or convert approved quotes to sales orders",
      href: "/app/orders",
      tone: "warning",
    });
  }

  if (overdueOrders.length > 0) {
    attention.push({
      id: "overdue",
      kind: "overdue",
      label: `${overdueOrders.length} order${overdueOrders.length !== 1 ? "s" : ""} past in-hands`,
      detail: overdueOrders
        .slice(0, 3)
        .map((order) => order.number)
        .join(", "),
      href: "/app/orders",
      tone: "critical",
    });
  }

  if (rushOrders > 0) {
    attention.push({
      id: "rush",
      kind: "rush",
      label: `${rushOrders} active rush order${rushOrders !== 1 ? "s" : ""}`,
      detail: "Prioritize scheduling and production",
      href: "/app/orders",
      tone: "critical",
    });
  }

  if (readyToShipOrders.length > 0) {
    attention.push({
      id: "ready_to_ship",
      kind: "ready_to_ship",
      label: `${readyToShipOrders.length} order${readyToShipOrders.length !== 1 ? "s" : ""} ready to ship`,
      detail: readyToShipOrders
        .slice(0, 3)
        .map((order) => order.number)
        .join(", "),
      href: "/app/orders",
      tone: "default",
    });
  }

  const lowStock = apiStats?.lowStockItems ?? 0;
  if (lowStock > 0) {
    attention.push({
      id: "inventory",
      kind: "inventory",
      label: `${lowStock} low stock item${lowStock !== 1 ? "s" : ""}`,
      detail: "Review inventory before upcoming runs",
      href: "/app/inventory",
      tone: "warning",
    });
  }

  const stats: DashboardLiveStats = {
    activeOrders,
    toSchedule,
    toScheduleOrders,
    dueThisWeek,
    awaitingApproval,
    artworkPending,
    readyToShip: readyToShipOrders.length,
    lowStockItems: lowStock,
    scheduledToday: blocksToday.length,
    runningNow: runningRuns.length,
    rushOrders,
    openPipeline,
  };

  return {
    stats,
    attention: attention.slice(0, 6),
    schedulingQueue,
    activeOrdersList,
    dueThisWeekOrders,
    artworkPendingEntries,
    awaitingApprovalOrders,
    rushOrdersList,
    overdueOrders,
    recentOrders,
    todayFloor,
    openTasks,
    readyToShipOrders,
  };
}
