import { parseISO } from "date-fns";
import type { Order, OrderStatus } from "@/types";
import { isArchivedOrder } from "@/lib/order-archive";
import {
  isActiveOrder,
  isHistoricalOrder,
} from "@/lib/order-list-filters";

export type OrderHistorySort = "newest" | "oldest" | "due_soon";

export type CustomerOrderScope = "open" | "archived" | "all";

export function splitCustomerOrders(orders: Order[]) {
  const openOrders = orders.filter((order) => !isArchivedOrder(order));
  const archivedOrders = orders.filter((order) => isArchivedOrder(order));
  return { openOrders, archivedOrders };
}

export function filterCustomerOrdersByScope(
  orders: Order[],
  scope: CustomerOrderScope
): Order[] {
  if (scope === "archived") {
    return orders.filter((order) => isArchivedOrder(order));
  }
  if (scope === "open") {
    return orders.filter((order) => !isArchivedOrder(order));
  }
  return orders;
}

export function filterCustomerOrders(
  orders: Order[],
  query: string,
  statusFilter: OrderStatus | "all"
): Order[] {
  const q = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      order.number,
      order.customLabel ?? "",
      order.type,
      order.status,
      order.inHandsDate,
      String(order.total),
      order.jobs.map((job) => job.name).join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortCustomerOrders(
  orders: Order[],
  sort: OrderHistorySort
): Order[] {
  const list = [...orders];
  switch (sort) {
    case "oldest":
      return list.sort(
        (a, b) =>
          parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime()
      );
    case "due_soon":
      return list.sort(
        (a, b) =>
          parseISO(a.inHandsDate).getTime() - parseISO(b.inHandsDate).getTime()
      );
    default:
      return list.sort(
        (a, b) =>
          parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
      );
  }
}

export function computeCustomerOrderStats(orders: Order[]) {
  const { openOrders, archivedOrders } = splitCustomerOrders(orders);

  const openBalance = openOrders.reduce((sum, order) => sum + order.balance, 0);
  const activeCount = openOrders.filter((order) => isActiveOrder(order)).length;
  const completedCount = openOrders.filter((order) =>
    isHistoricalOrder(order)
  ).length;

  const sorted = sortCustomerOrders(openOrders, "newest");
  const lastOrder = sorted[0];

  return {
    openBalance,
    activeCount,
    completedCount,
    totalOrders: openOrders.length,
    archivedCount: archivedOrders.length,
    lastOrderNumber: lastOrder?.number,
    lastOrderDate: lastOrder?.createdAt,
  };
}

export const ORDER_STATUS_FILTER_OPTIONS: {
  value: OrderStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "in_production", label: "In production" },
  { value: "approved", label: "Ready for scheduling" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "ready_to_invoice", label: "Ready to invoice" },
  { value: "invoice_sent", label: "Invoice sent" },
  { value: "completed", label: "Completed" },
  { value: "shipped", label: "Shipped" },
];

export const CUSTOMER_ORDER_SCOPE_TABS: {
  value: CustomerOrderScope;
  label: string;
}[] = [
  { value: "open", label: "Open orders" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];
