import {
  addDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { getArchivedOrderIds } from "@/lib/order-archive";
import { getOrdersWithUnscheduledEvents } from "@/lib/production-schedule";
import { resolveScheduleBlockProductionStatus } from "@/lib/schedule-block-display";
import { getRunForBlock } from "@/lib/station-runs";
import type {
  Machine,
  Order,
  ScheduleBlock,
  StationJobRun,
  StationJobRunStatus,
} from "@/types";

export type FloorEventStatus =
  | "running"
  | "paused"
  | "upcoming"
  | "finished"
  | "cancelled"
  | "scheduled"
  | "blocked";

export type ProductionFloorEvent = {
  id: string;
  scheduleBlockId: string;
  runId?: string;
  runStatus: StationJobRunStatus | null;
  floorStatus: FloorEventStatus;
  orderId: string;
  orderNumber: string;
  orderCustomLabel?: string;
  customerName: string;
  machineId: string;
  machineName: string;
  machineColor?: Machine["color"];
  jobName: string;
  imprintLabel: string;
  pieceCount?: number;
  startAt: string;
  endAt: string;
  notes?: string;
};

export type ProductionFloorDayGroup = {
  key: string;
  label: string;
  date: Date;
  isToday: boolean;
  isTomorrow: boolean;
  events: ProductionFloorEvent[];
};

export type ProductionFloorMachineGroup = {
  machineId: string;
  machineName: string;
  machineColor?: Machine["color"];
  active: boolean;
  runningCount: number;
  upcomingCount: number;
  events: ProductionFloorEvent[];
};

export type ProductionFloorOverview = {
  runningNow: ProductionFloorEvent[];
  upcoming: ProductionFloorEvent[];
  byDay: ProductionFloorDayGroup[];
  byMachine: ProductionFloorMachineGroup[];
  metrics: {
    runningNow: number;
    scheduledToday: number;
    upcomingWeek: number;
    needsSchedule: number;
    machinesBusy: number;
  };
};

function getBlockWorkflow(
  block: ScheduleBlock,
  orders: Order[]
): Order["jobs"][number]["imprints"][number]["workflow"] | undefined {
  const order = orders.find((entry) => entry.id === block.orderId);
  const job = order?.jobs.find((entry) => entry.id === block.jobId);
  return job?.imprints.find((entry) => entry.id === block.imprintId)?.workflow;
}

function resolveFloorStatus(
  block: ScheduleBlock,
  run: StationJobRun | undefined,
  orders: Order[],
  jobRuns: StationJobRun[]
): FloorEventStatus {
  const workflow = getBlockWorkflow(block, orders);

  // Explicit event-sheet completion wins immediately so the floor updates
  // before/while the linked station run is still syncing to finished.
  if (workflow?.status === "completed" || run?.status === "finished") {
    return "finished";
  }
  if (run?.status === "cancelled") return "cancelled";

  if (run?.status === "running") return "running";
  if (run?.status === "paused") return "paused";

  if (workflow?.status === "blocked" || workflow?.onHold) return "blocked";

  const productionStatus = resolveScheduleBlockProductionStatus(
    block,
    jobRuns,
    orders
  );
  if (productionStatus === "blocked") return "blocked";
  if (run?.status === "upcoming") return "upcoming";
  if (productionStatus === "in_progress") return "upcoming";
  return "scheduled";
}

function isInactiveFloorStatus(status: FloorEventStatus): boolean {
  return status === "finished" || status === "cancelled";
}

function toFloorEvent(
  block: ScheduleBlock,
  run: StationJobRun | undefined,
  machine: Machine | undefined,
  orders: Order[],
  jobRuns: StationJobRun[]
): ProductionFloorEvent {
  return {
    id: run?.id ?? block.id,
    scheduleBlockId: block.id,
    runId: run?.id,
    runStatus: run?.status ?? null,
    floorStatus: resolveFloorStatus(block, run, orders, jobRuns),
    orderId: block.orderId,
    orderNumber: block.orderNumber,
    orderCustomLabel: block.customLabel,
    customerName: block.customerName,
    machineId: block.machineId,
    machineName: machine?.name ?? "Unknown machine",
    machineColor: machine?.color,
    jobName: block.jobName,
    imprintLabel: block.imprintLabel,
    pieceCount: block.pieceCount,
    startAt: block.startAt,
    endAt: block.endAt,
    notes: block.notes,
  };
}

function dayLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, addDays(today, 1))) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

/**
 * Builds a shop-floor overview of machine events for the Production tab.
 * Includes live runs and scheduled work through the next 7 days.
 * Completed / cancelled events drop off the active floor automatically.
 */
export function buildProductionFloorOverview({
  machines,
  scheduleBlocks,
  jobRuns,
  orders,
  now = new Date(),
  horizonDays = 7,
}: {
  machines: Machine[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  orders: Order[];
  now?: Date;
  horizonDays?: number;
}): ProductionFloorOverview {
  const archivedOrderIds = getArchivedOrderIds(orders);
  const today = startOfDay(now);
  const horizonEnd = addDays(today, horizonDays);
  const machinesById = new Map(machines.map((machine) => [machine.id, machine]));

  const activeBlocks = scheduleBlocks.filter(
    (block) => !archivedOrderIds.has(block.orderId)
  );

  const runningNow: ProductionFloorEvent[] = [];
  const upcoming: ProductionFloorEvent[] = [];
  let scheduledToday = 0;

  for (const block of activeBlocks) {
    let start: Date;
    let end: Date;
    try {
      start = parseISO(block.startAt);
      end = parseISO(block.endAt);
    } catch {
      continue;
    }

    const run = getRunForBlock(jobRuns, block.id);
    const machine = machinesById.get(block.machineId);
    const event = toFloorEvent(block, run, machine, orders, jobRuns);

    // Done / cancelled leave the active floor immediately.
    if (isInactiveFloorStatus(event.floorStatus)) {
      continue;
    }

    const isLive =
      event.floorStatus === "running" || event.floorStatus === "paused";

    if (isLive) {
      runningNow.push(event);
    }

    try {
      if (isSameDay(startOfDay(start), today)) {
        scheduledToday += 1;
      }
    } catch {
      /* ignore bad dates */
    }

    // Keep live runs + anything ending after now within the horizon.
    const endsAfterNow = isAfter(end, now) || isLive;
    const startsBeforeHorizon =
      isBefore(startOfDay(start), horizonEnd) ||
      isSameDay(startOfDay(start), today);

    if (endsAfterNow && startsBeforeHorizon) {
      upcoming.push(event);
    }
  }

  runningNow.sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
  );
  upcoming.sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
  );

  const byDayMap = new Map<string, ProductionFloorDayGroup>();
  for (const event of upcoming) {
    let date: Date;
    try {
      date = startOfDay(parseISO(event.startAt));
    } catch {
      continue;
    }
    const key = format(date, "yyyy-MM-dd");
    let group = byDayMap.get(key);
    if (!group) {
      group = {
        key,
        label: dayLabel(date, today),
        date,
        isToday: isSameDay(date, today),
        isTomorrow: isSameDay(date, addDays(today, 1)),
        events: [],
      };
      byDayMap.set(key, group);
    }
    group.events.push(event);
  }

  const byDay = Array.from(byDayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const byMachineMap = new Map<string, ProductionFloorMachineGroup>();
  for (const machine of machines.filter((entry) => entry.active !== false)) {
    byMachineMap.set(machine.id, {
      machineId: machine.id,
      machineName: machine.name,
      machineColor: machine.color,
      active: machine.active !== false,
      runningCount: 0,
      upcomingCount: 0,
      events: [],
    });
  }

  for (const event of upcoming) {
    let group = byMachineMap.get(event.machineId);
    if (!group) {
      group = {
        machineId: event.machineId,
        machineName: event.machineName,
        machineColor: event.machineColor,
        active: true,
        runningCount: 0,
        upcomingCount: 0,
        events: [],
      };
      byMachineMap.set(event.machineId, group);
    }
    group.events.push(event);
    if (event.floorStatus === "running" || event.floorStatus === "paused") {
      group.runningCount += 1;
    } else if (
      event.floorStatus === "upcoming" ||
      event.floorStatus === "scheduled" ||
      event.floorStatus === "blocked"
    ) {
      group.upcomingCount += 1;
    }
  }

  const byMachine = Array.from(byMachineMap.values())
    .filter((group) => group.events.length > 0)
    .sort((a, b) => {
      if (b.runningCount !== a.runningCount) {
        return b.runningCount - a.runningCount;
      }
      return a.machineName.localeCompare(b.machineName);
    });

  const needsSchedule = getOrdersWithUnscheduledEvents(orders, scheduleBlocks)
    .filter((order) =>
      ["approved", "in_production", "ready_to_ship"].includes(order.status)
    ).length;

  const machinesBusy = new Set(runningNow.map((event) => event.machineId)).size;

  return {
    runningNow,
    upcoming,
    byDay,
    byMachine,
    metrics: {
      runningNow: runningNow.length,
      scheduledToday,
      upcomingWeek: upcoming.length,
      needsSchedule,
      machinesBusy,
    },
  };
}

export function formatFloorEventTimeRange(startAt: string, endAt: string): string {
  try {
    const start = parseISO(startAt);
    const end = parseISO(endAt);
    if (isSameDay(start, end)) {
      return `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
    }
    return `${format(start, "MMM d · h:mm a")} – ${format(end, "MMM d · h:mm a")}`;
  } catch {
    return "";
  }
}
