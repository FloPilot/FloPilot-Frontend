import { getDueDateUrgency } from "@/lib/order-health";
import {
  getGarmentReceivingLines,
  isGarmentLineOpen,
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
  openGarmentLines: OrderMaterialLine[];
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
  if (lines.every((line) => !isGarmentLineOpen(line))) return "received";
  if (lines.every((line) => line.receivedQty === 0)) return "waiting";
  return "partial";
}

function receivableOrders(orders: Order[]): Order[] {
  return orders.filter(
    (order) =>
      !order.archived &&
      !["shipped", "completed", "cancelled"].includes(order.status) &&
      order.lineItems.length > 0
  );
}

export function buildReceivingQueue(orders: Order[]): ReceivingOrderGroup[] {
  const groups: ReceivingOrderGroup[] = [];

  for (const order of receivableOrders(orders)) {
    const materials = mergeOrderMaterials(order);
    const garmentLines = getGarmentReceivingLines(materials);
    if (garmentLines.length === 0) continue;

    const openGarmentLines = garmentLines.filter(isGarmentLineOpen);
    const totalExpected = garmentLines.reduce(
      (sum, line) => sum + line.expectedQty,
      0
    );
    const totalReceived = garmentLines.reduce(
      (sum, line) => sum + line.receivedQty,
      0
    );

    const jobs = order.jobs
      .filter((job) => job.kind !== "finishing")
      .map((job) => ({ id: job.id, name: job.name }));

    groups.push({
      order,
      garmentLines,
      openGarmentLines,
      jobs,
      blankSource: materials.blankSource,
      totalExpected,
      totalReceived,
      openLineCount: openGarmentLines.length,
      aggregateStatus: aggregateGarmentStatus(garmentLines),
      urgency: getDueDateUrgency(order),
    });
  }

  return groups.sort((a, b) => {
    if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
    const rank = (entry: ReceivingOrderGroup) => {
      if (entry.openLineCount === 0) return 3;
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
    if (filter === "open" && group.openLineCount === 0) return false;
    if (filter === "partial" && group.aggregateStatus !== "partial") {
      return false;
    }
    if (filter === "complete" && group.openLineCount > 0) {
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
  const openOrders = groups.filter((group) => group.openLineCount > 0).length;
  const missingLines = groups.reduce(
    (sum, group) =>
      sum +
      group.openGarmentLines.filter((line) => line.status === "waiting")
        .length,
    0
  );
  const partialLines = groups.reduce(
    (sum, group) =>
      sum +
      group.openGarmentLines.filter((line) => line.status === "partial").length,
    0
  );
  const piecesOutstanding = groups.reduce(
    (sum, group) =>
      sum +
      group.openGarmentLines.reduce(
        (lineSum, line) =>
          lineSum + Math.max(0, line.expectedQty - line.receivedQty),
        0
      ),
    0
  );

  return { openOrders, missingLines, partialLines, piecesOutstanding };
}
