import { parseISO } from "date-fns";
import type { DecorationType, Order, OrderStatus } from "@/types";
import { isArchivedOrder } from "@/lib/order-archive";
import { orderHasDecorationType } from "@/lib/order-decoration-summary";

export type OrderListScope = "active" | "historical" | "archived" | "all";

export type OrderJobTypeFilter = DecorationType | "all";

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "quote_sent",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_to_ship",
];

export const HISTORICAL_ORDER_STATUSES: OrderStatus[] = ["shipped", "completed"];

/** @deprecated Use isHistoricalOrder */
export const PREVIOUS_ORDER_STATUSES = HISTORICAL_ORDER_STATUSES;

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_ORDER_STATUSES.includes(order.status);
}

export function isHistoricalOrder(order: Order): boolean {
  return HISTORICAL_ORDER_STATUSES.includes(order.status);
}

/** @deprecated Use isHistoricalOrder */
export const isPreviousOrder = isHistoricalOrder;

export function filterOrdersList(
  orders: Order[],
  {
    scope,
    jobType = "all",
  }: {
    scope: OrderListScope;
    jobType?: OrderJobTypeFilter;
  }
): Order[] {
  return orders.filter((order) => {
    if (scope === "archived") {
      if (!isArchivedOrder(order)) return false;
    } else if (scope !== "all" && isArchivedOrder(order)) {
      return false;
    }

    if (scope === "active" && !isActiveOrder(order)) return false;
    if (scope === "historical" && !isHistoricalOrder(order)) return false;
    if (jobType !== "all" && !orderHasDecorationType(order, jobType)) {
      return false;
    }
    return true;
  });
}

export function sortOrdersList(orders: Order[], scope: OrderListScope): Order[] {
  const list = [...orders];
  if (scope === "archived") {
    return list.sort((a, b) => {
      const aTime = a.archivedAt ? parseISO(a.archivedAt).getTime() : 0;
      const bTime = b.archivedAt ? parseISO(b.archivedAt).getTime() : 0;
      return bTime - aTime;
    });
  }
  if (scope === "active") {
    return list.sort(
      (a, b) =>
        parseISO(a.inHandsDate).getTime() - parseISO(b.inHandsDate).getTime()
    );
  }
  return list.sort(
    (a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
  );
}

export const JOB_TYPE_FILTER_TABS: {
  value: OrderJobTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All job types" },
  { value: "screen_print", label: "Screen print" },
  { value: "dtf", label: "DTF" },
  { value: "embroidery", label: "Embroidery" },
  { value: "vinyl", label: "Vinyl" },
];

export const SCOPE_TABS: { value: OrderListScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "historical", label: "Historical" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];
