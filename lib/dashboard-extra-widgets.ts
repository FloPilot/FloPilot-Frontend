import {
  addDays,
  differenceInMinutes,
  parseISO,
  startOfDay,
} from "date-fns";
import type { DashboardFinancialContext } from "@/lib/dashboard-charts";
import { resolveOrderFinancialsInContext } from "@/lib/order-financial-context";
import { getOrderPaymentStatus } from "@/lib/order-payment";
import { formatOrderDisplayLine } from "@/lib/order-display";
import type {
  Customer,
  Machine,
  Order,
  ScheduleBlock,
  StationJobRun,
} from "@/types";

export type CollectionsRow = {
  order: Order;
  balance: number;
  paymentLabel: string;
  priority: number;
};

export function buildCollectionsRows(orders: Order[]): {
  rows: CollectionsRow[];
  totalBalance: number;
  count: number;
} {
  const rows = orders
    .filter(
      (order) =>
        !order.archived &&
        order.balance > 0.009
    )
    .map((order) => {
      const status = getOrderPaymentStatus(order);
      const priority =
        order.status === "ready_to_ship" || order.status === "shipped"
          ? 0
          : status === "partial"
            ? 1
            : 2;
      return {
        order,
        balance: order.balance,
        paymentLabel:
          status === "partial"
            ? "Partial"
            : status === "invoiced"
              ? "Open invoice"
              : "Balance due",
        priority,
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.order.rush !== b.order.rush) return a.order.rush ? -1 : 1;
      return b.balance - a.balance;
    });

  return {
    rows,
    totalBalance: rows.reduce((sum, row) => sum + row.balance, 0),
    count: rows.length,
  };
}

export type ShippingRow = {
  id: string;
  order: Order;
  kind: "ready_to_ship" | "needs_label" | "needs_tracking";
  detail: string;
};

export function buildShippingRows(orders: Order[]): ShippingRow[] {
  const rows: ShippingRow[] = [];

  for (const order of orders) {
    if (order.archived || order.status === "completed") {
      continue;
    }

    if (order.status === "ready_to_ship") {
      rows.push({
        id: `${order.id}-ready`,
        order,
        kind: "ready_to_ship",
        detail: "Ready to pack & ship",
      });
    }

    for (const shipment of order.shipments || []) {
      if (shipment.status === "delivered" || shipment.status === "picked_up") {
        continue;
      }
      if (shipment.status === "pending") {
        rows.push({
          id: `${order.id}-${shipment.id}-label`,
          order,
          kind: "needs_label",
          detail: shipment.label
            ? `${shipment.label} · needs label`
            : `${shipment.method || "Shipment"} · needs label`,
        });
      } else if (!shipment.trackingNumber) {
        rows.push({
          id: `${order.id}-${shipment.id}-track`,
          order,
          kind: "needs_tracking",
          detail: shipment.label
            ? `${shipment.label} · missing tracking`
            : `${shipment.method || "Shipment"} · missing tracking`,
        });
      }
    }
  }

  const kindRank = (kind: ShippingRow["kind"]) =>
    kind === "ready_to_ship" ? 0 : kind === "needs_label" ? 1 : 2;

  return rows.sort((a, b) => {
    const rank = kindRank(a.kind) - kindRank(b.kind);
    if (rank !== 0) return rank;
    return (
      new Date(a.order.inHandsDate).getTime() -
      new Date(b.order.inHandsDate).getTime()
    );
  });
}

function parseHm(value: string | undefined): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function weeklyCapacityHours(machine: Machine, from: Date, to: Date): number {
  const hours = machine.operatingHours;
  const open = parseHm(hours?.openTime) ?? 8 * 60;
  const close = parseHm(hours?.closeTime) ?? 17 * 60;
  const dayMinutes = Math.max(0, close - open);
  if (dayMinutes <= 0) return 0;

  const daysOpen = new Set(
    hours?.daysOpen?.length ? hours.daysOpen : [1, 2, 3, 4, 5]
  );

  let total = 0;
  for (
    let cursor = startOfDay(from);
    cursor < to;
    cursor = addDays(cursor, 1)
  ) {
    if (daysOpen.has(cursor.getDay())) {
      total += dayMinutes / 60;
    }
  }
  return total;
}

export type MachineLoadRow = {
  machine: Machine;
  bookedHours: number;
  capacityHours: number;
  utilization: number | null;
  pieceCount: number;
  running: boolean;
  overbooked: boolean;
};

export function buildMachineLoadRows({
  machines,
  scheduleBlocks,
  jobRuns,
}: {
  machines: Machine[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
}): MachineLoadRow[] {
  const now = new Date();
  const from = startOfDay(now);
  const to = addDays(from, 7);
  const runningMachineIds = new Set(
    jobRuns
      .filter((run) => run.status === "running")
      .map((run) => run.machineId)
  );

  return machines
    .filter((machine) => machine.active)
    .map((machine) => {
      const blocks = scheduleBlocks.filter((block) => {
        if (block.machineId !== machine.id) return false;
        try {
          const start = parseISO(block.startAt);
          return start >= from && start < to;
        } catch {
          return false;
        }
      });

      const bookedHours = blocks.reduce((sum, block) => {
        try {
          const minutes = differenceInMinutes(
            parseISO(block.endAt),
            parseISO(block.startAt)
          );
          return sum + Math.max(0, minutes) / 60;
        } catch {
          return sum;
        }
      }, 0);

      const pieceCount = blocks.reduce(
        (sum, block) => sum + (block.pieceCount ?? 0),
        0
      );
      const capacityHours = weeklyCapacityHours(machine, from, to);
      const utilization =
        capacityHours > 0 ? bookedHours / capacityHours : null;

      return {
        machine,
        bookedHours,
        capacityHours,
        utilization,
        pieceCount,
        running: runningMachineIds.has(machine.id),
        overbooked: utilization != null && utilization > 1.05,
      };
    })
    .sort((a, b) => {
      if (a.overbooked !== b.overbooked) return a.overbooked ? -1 : 1;
      if (a.running !== b.running) return a.running ? -1 : 1;
      return (b.utilization ?? 0) - (a.utilization ?? 0);
    });
}

export type TopCustomerRow = {
  customerId: string;
  name: string;
  revenue: number;
  openOrders: number;
  openBalance: number;
};

export function buildTopCustomerRows({
  orders,
  customers,
  financials,
  limit = 5,
}: {
  orders: Order[];
  customers: Customer[];
  financials: DashboardFinancialContext;
  limit?: number;
}): TopCustomerRow[] {
  const customerName = new Map(
    customers.map((customer) => [customer.id, customer.name])
  );
  const byCustomer = new Map<string, TopCustomerRow>();

  for (const order of orders) {
    if (order.archived) continue;
    const customerId = order.customerId;
    if (!customerId) continue;

    const financialsForOrder = resolveOrderFinancialsInContext(
      order,
      financials
    );
    const current = byCustomer.get(customerId) ?? {
      customerId,
      name:
        customerName.get(customerId) ||
        order.company ||
        order.customerName ||
        "Customer",
      revenue: 0,
      openOrders: 0,
      openBalance: 0,
    };

    current.revenue += financialsForOrder.total;
    if (!["shipped", "completed"].includes(order.status)) {
      current.openOrders += 1;
      current.openBalance += Math.max(0, order.balance);
    }
    byCustomer.set(customerId, current);
  }

  return [...byCustomer.values()]
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function orderListLabel(order: Order): string {
  return formatOrderDisplayLine(order);
}
