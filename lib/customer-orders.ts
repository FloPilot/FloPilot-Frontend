import { parseISO } from "date-fns";
import type { Order, OrderStatus } from "@/types";

export type OrderHistorySort = "newest" | "oldest" | "due_soon";

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
      order.type,
      order.status,
      order.inHandsDate,
      String(order.total),
      order.jobs.map((j) => j.name).join(" "),
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
  const activeStatuses: OrderStatus[] = [
    "approved",
    "in_production",
    "ready_to_ship",
    "awaiting_approval",
    "quote_sent",
  ];

  const openBalance = orders.reduce((sum, o) => sum + o.balance, 0);
  const activeCount = orders.filter((o) =>
    activeStatuses.includes(o.status)
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === "completed" || o.status === "shipped"
  ).length;

  const sorted = sortCustomerOrders(orders, "newest");
  const lastOrder = sorted[0];

  return {
    openBalance,
    activeCount,
    completedCount,
    totalOrders: orders.length,
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
  { value: "approved", label: "Approved" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "completed", label: "Completed" },
  { value: "shipped", label: "Shipped" },
];
