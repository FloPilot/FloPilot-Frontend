import { getDueDateUrgency } from "@/lib/order-health";
import {
  getGarmentReceivingLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { blankSourceLabel } from "@/lib/order-receiving-checkpoints";
import type {
  BlankSource,
  MaterialReceiveStatus,
  Order,
  OrderMaterialLine,
} from "@/types";

export type ReceivingFilter = "open" | "partial" | "complete" | "all";

export type ReceivingOrderGroup = {
  order: Order;
  garmentLines: OrderMaterialLine[];
  jobs: { id: string; name: string }[];
  blankSource?: BlankSource;
  totalExpected: number;
  totalReceived: number;
  openLineCount: number;
  aggregateStatus: MaterialReceiveStatus;
  urgency: ReturnType<typeof getDueDateUrgency>;
};

function aggregateGarmentStatus(
  lines: OrderMaterialLine[]
): MaterialReceiveStatus {
  if (lines.length === 0) return "received";
  if (lines.every((line) => line.status === "received")) return "received";
  if (lines.every((line) => line.status === "waiting")) return "waiting";
  return "partial";
}

function productionOrders(orders: Order[]): Order[] {
  return orders.filter(
    (order) =>
      !["shipped", "completed", "cancelled", "draft"].includes(order.status) &&
      order.lineItems.length > 0
  );
}

export function buildReceivingQueue(orders: Order[]): ReceivingOrderGroup[] {
  const groups: ReceivingOrderGroup[] = [];

  for (const order of productionOrders(orders)) {
    const materials = mergeOrderMaterials(order);
    const garmentLines = getGarmentReceivingLines(materials);
    if (garmentLines.length === 0) continue;

    const totalExpected = garmentLines.reduce(
      (sum, line) => sum + line.expectedQty,
      0
    );
    const totalReceived = garmentLines.reduce(
      (sum, line) => sum + line.receivedQty,
      0
    );
    const openLineCount = garmentLines.filter(
      (line) => line.status !== "received"
    ).length;

    const jobs = order.jobs
      .filter((job) => job.kind !== "finishing")
      .map((job) => ({ id: job.id, name: job.name }));

    groups.push({
      order,
      garmentLines,
      jobs,
      blankSource: materials.blankSource,
      totalExpected,
      totalReceived,
      openLineCount,
      aggregateStatus: aggregateGarmentStatus(garmentLines),
      urgency: getDueDateUrgency(order),
    });
  }

  return groups.sort((a, b) => {
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    const rank = (entry: ReceivingOrderGroup) => {
      if (entry.aggregateStatus === "waiting") return 0;
      if (entry.aggregateStatus === "partial") return 1;
      return 2;
    };
    const statusDiff = rank(a) - rank(b);
    if (statusDiff !== 0) return statusDiff;
    return (
      new Date(a.order.inHandsDate).getTime() -
      new Date(b.order.inHandsDate).getTime()
    );
  });
}

export function filterReceivingQueue(
  groups: ReceivingOrderGroup[],
  filter: ReceivingFilter,
  query: string
): ReceivingOrderGroup[] {
  const normalized = query.trim().toLowerCase();

  return groups.filter((group) => {
    if (filter === "open" && group.aggregateStatus === "received") return false;
    if (filter === "partial" && group.aggregateStatus !== "partial") {
      return false;
    }
    if (filter === "complete" && group.aggregateStatus !== "received") {
      return false;
    }

    if (!normalized) return true;

    const haystack = [
      group.order.number,
      group.order.customerName,
      blankSourceLabel(group.blankSource),
      ...group.garmentLines.map(
        (line) =>
          `${line.productName} ${line.brand} ${line.color} ${line.size}`
      ),
      ...group.jobs.map((job) => job.name),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function receivingQueueStats(groups: ReceivingOrderGroup[]) {
  const openOrders = groups.filter(
    (group) => group.aggregateStatus !== "received"
  ).length;
  const missingLines = groups.reduce(
    (sum, group) =>
      sum +
      group.garmentLines.filter((line) => line.status === "waiting").length,
    0
  );
  const partialLines = groups.reduce(
    (sum, group) =>
      sum +
      group.garmentLines.filter((line) => line.status === "partial").length,
    0
  );
  const piecesOutstanding = groups.reduce(
    (sum, group) => sum + Math.max(0, group.totalExpected - group.totalReceived),
    0
  );

  return { openOrders, missingLines, partialLines, piecesOutstanding };
}
