import { parseISO } from "date-fns";
import type { DocumentType, Order, OrderStatus } from "@/types";

export type OrderListScope = "active" | "historical" | "all";

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
    documentType = "all",
  }: {
    scope: OrderListScope;
    documentType?: DocumentType | "all";
  }
): Order[] {
  return orders.filter((order) => {
    if (scope === "active" && !isActiveOrder(order)) return false;
    if (scope === "historical" && !isHistoricalOrder(order)) return false;
    if (documentType !== "all" && order.type !== documentType) return false;
    return true;
  });
}

export function sortOrdersList(orders: Order[], scope: OrderListScope): Order[] {
  const list = [...orders];
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

export const DOCUMENT_TYPE_TABS: {
  value: DocumentType | "all";
  label: string;
}[] = [
  { value: "all", label: "All types" },
  { value: "quote", label: "Quotes" },
  { value: "sales_order", label: "Sales orders" },
  { value: "invoice", label: "Invoices" },
];

export const SCOPE_TABS: { value: OrderListScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "historical", label: "Historical" },
  { value: "all", label: "All" },
];
