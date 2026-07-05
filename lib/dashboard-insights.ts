import {
  addDays,
  differenceInHours,
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
  excludeArchivedOrders,
  excludeScheduleBlocksForArchivedOrders,
  getArchivedOrderIds,
} from "@/lib/order-archive";
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
  dueToday: number;
  overdue: number;
  dueThisWeek: number;
  awaitingApproval: number;
  staleAwaitingApproval: number;
  artworkPending: number;
  readyToShip: number;
  lowStockItems: number;
  scheduledToday: number;
  runningNow: number;
  inProductionOrders: number;
  rushOrders: number;
  openPipeline: number;
};

export type TodayFloorItem = {
  kind: "scheduled" | "running";
  /** Run id when running; schedule block id when scheduled only */
  id: string;
  scheduleBlockId: string;
  runId?: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  machineId: string;
  machineName: string;
  machineColor?: Machine["color"];
  jobName: string;
  imprintLabel: string;
  pieceCount?: number;
  startAt: string;
  endAt: string;
  timeLabel: string;
  notes?: string;
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
  const archivedOrderIds = getArchivedOrderIds(orders);
  const operationalOrders = excludeArchivedOrders(orders);
  const activeScheduleBlocks = excludeScheduleBlocksForArchivedOrders(
    scheduleBlocks,
    archivedOrderIds
  );
  const activeProductionTasks = productionTasks.filter(
    (task) => !archivedOrderIds.has(task.orderId)
  );
  const activeJobRuns = jobRuns.filter((run) => {
    const block = scheduleBlocks.find((item) => item.id === run.scheduleBlockId);
    return block ? !archivedOrderIds.has(block.orderId) : true;
  });

  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = addDays(today, 7);

  const openOrders = operationalOrders.filter(
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

  const dueTodayOrders = openOrders
    .filter((order) => {
      try {
        return isSameDay(startOfDay(parseISO(order.inHandsDate)), today);
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const dueToday = dueTodayOrders.length;

  const awaitingApprovalOrders = openOrders
    .filter((order) =>
      ["quote_sent", "awaiting_approval"].includes(order.status)
    )
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const awaitingApproval = awaitingApprovalOrders.length;

  const staleAwaitingApproval = awaitingApprovalOrders.filter((order) => {
    const statusActivity = order.activity?.find(
      (event) =>
        event.type === "status" &&
        (event.title?.toLowerCase().includes("awaiting") ||
          event.title?.toLowerCase().includes("quote"))
    );
    const anchor = statusActivity?.timestamp ?? order.createdAt;
    try {
      return differenceInHours(now, parseISO(anchor)) >= 48;
    } catch {
      return false;
    }
  }).length;

  const inProductionOrders = openOrders.filter(
    (order) => order.status === "in_production"
  ).length;

  const rushOrdersList = openOrders
    .filter((order) => order.rush)
    .sort(
      (a, b) =>
        new Date(a.inHandsDate).getTime() - new Date(b.inHandsDate).getTime()
    );

  const artworkCounts = countArtworkQueue(collectArtworkQueue(operationalOrders));
  const artworkPendingEntries = collectArtworkQueue(operationalOrders).filter(
    (entry) =>
      ["pending", "revision_requested"].includes(entry.artwork.status)
  );
  const artworkPending =
    artworkCounts.pending + artworkCounts.revision_requested;

  const schedulingQueue = buildSchedulingQueueOrders(
    operationalOrders,
    activeScheduleBlocks,
    {
      ignoreArtworkApproval: true,
    }
  );
  const unscheduledEvents = getUnscheduledEvents(
    operationalOrders,
    activeScheduleBlocks,
    {
      ignoreArtworkApproval: true,
    }
  );
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

  const blocksToday = activeScheduleBlocks
    .filter((block) => isSameDay(parseISO(block.startAt), now))
    .sort(
      (a, b) =>
        parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
    );

  const runningRuns = activeJobRuns.filter((run) => run.status === "running");

  const machineById = new Map(machines.map((machine) => [machine.id, machine]));
  const blockById = new Map(
    activeScheduleBlocks.map((block) => [block.id, block])
  );

  const runningFloor: TodayFloorItem[] = runningRuns.map((run) => {
    const block = blockById.get(run.scheduleBlockId);
    const machine = machineById.get(run.machineId);
    const start = block ? parseISO(block.startAt) : null;
    const end = block ? parseISO(block.endAt) : null;
    return {
      kind: "running" as const,
      id: run.id,
      scheduleBlockId: run.scheduleBlockId,
      runId: run.id,
      orderId: block?.orderId ?? "",
      machineName: machine?.name ?? "Machine",
      machineId: run.machineId,
      machineColor: machine?.color,
      orderNumber: block?.orderNumber ?? "—",
      customerName: block?.customerName ?? "",
      jobName: block?.jobName ?? "Production",
      imprintLabel: block?.imprintLabel ?? "In progress",
      pieceCount: block?.pieceCount,
      startAt: block?.startAt ?? run.startedAt ?? "",
      endAt: block?.endAt ?? "",
      timeLabel:
        start && end
          ? `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
          : "In progress on the floor",
      notes: block?.notes,
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
        scheduleBlockId: block.id,
        orderId: block.orderId,
        machineName: machine?.name ?? "Machine",
        machineId: block.machineId,
        machineColor: machine?.color,
        orderNumber: block.orderNumber,
        customerName: block.customerName,
        jobName: block.jobName,
        imprintLabel: block.imprintLabel,
        pieceCount: block.pieceCount,
        startAt: block.startAt,
        endAt: block.endAt,
        timeLabel: `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`,
        notes: block.notes,
        href: `/app/orders/${block.orderId}`,
      };
    });

  const todayFloor: TodayFloorItem[] = [...runningFloor, ...scheduledFloor];

  const blocksTomorrow = activeScheduleBlocks
    .filter((block) => isSameDay(parseISO(block.startAt), addDays(now, 1)))
    .sort(
      (a, b) =>
        parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
    );

  const tomorrowFloor: TodayFloorItem[] = blocksTomorrow.map((block) => {
    const machine = machineById.get(block.machineId);
    const start = parseISO(block.startAt);
    const end = parseISO(block.endAt);
    return {
      kind: "scheduled" as const,
      id: block.id,
      scheduleBlockId: block.id,
      orderId: block.orderId,
      machineName: machine?.name ?? "Machine",
      machineId: block.machineId,
      machineColor: machine?.color,
      orderNumber: block.orderNumber,
      customerName: block.customerName,
      jobName: block.jobName,
      imprintLabel: block.imprintLabel,
      pieceCount: block.pieceCount,
      startAt: block.startAt,
      endAt: block.endAt,
      timeLabel: `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`,
      notes: block.notes,
      href: `/app/orders/${block.orderId}`,
    };
  });

  const recentOrders = [...operationalOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const openTasks = activeProductionTasks
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
      detail: "Review warehouse stock before upcoming runs",
      href: "/app/inventory",
      tone: "warning",
    });
  }

  const stats: DashboardLiveStats = {
    activeOrders,
    toSchedule,
    toScheduleOrders,
    dueToday,
    overdue: overdueOrders.length,
    dueThisWeek,
    awaitingApproval,
    staleAwaitingApproval,
    artworkPending,
    readyToShip: readyToShipOrders.length,
    lowStockItems: lowStock,
    scheduledToday: blocksToday.length,
    runningNow: runningRuns.length,
    inProductionOrders,
    rushOrders,
    openPipeline,
  };

  return {
    stats,
    attention,
    schedulingQueue,
    activeOrdersList,
    dueTodayOrders,
    dueThisWeekOrders,
    artworkPendingEntries,
    awaitingApprovalOrders,
    rushOrdersList,
    overdueOrders,
    recentOrders,
    todayFloor,
    tomorrowFloor,
    openTasks,
    readyToShipOrders,
  };
}
