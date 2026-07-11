import { isSameDay, parseISO, startOfDay } from "date-fns";
import type { Customer, Order, OrderStatus } from "@/types";

export type OrderFilterField =
  | "customer"
  | "order_number"
  | "status"
  | "in_hands_date";

export type InHandsDateMode = "on" | "before" | "after";

export type OrderAdvancedFilter =
  | { id: string; field: "customer"; customerIds: string[] }
  | { id: string; field: "order_number"; query: string }
  | { id: string; field: "status"; statuses: OrderStatus[] }
  | {
      id: string;
      field: "in_hands_date";
      mode: InHandsDateMode;
      date: string;
    };

export const FILTER_FIELD_OPTIONS: {
  field: OrderFilterField;
  label: string;
  hint: string;
}[] = [
  {
    field: "customer",
    label: "Customer",
    hint: "Filter by account or company",
  },
  {
    field: "order_number",
    label: "Order number",
    hint: "Search by SO #, quote #, or invoice #",
  },
  {
    field: "status",
    label: "Status",
    hint: "Quote sent, in production, shipped, etc.",
  },
  {
    field: "in_hands_date",
    label: "In-hands date",
    hint: "Due on, before, or after a date",
  },
];

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "approved", label: "Ready for scheduling" },
  { value: "in_production", label: "In production" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
];

export const IN_HANDS_DATE_MODES: { value: InHandsDateMode; label: string }[] =
  [
    { value: "on", label: "On" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
  ];

export function createFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function matchesFilter(order: Order, filter: OrderAdvancedFilter): boolean {
  switch (filter.field) {
    case "customer":
      return (
        filter.customerIds.length > 0 &&
        filter.customerIds.includes(order.customerId)
      );
    case "order_number": {
      const q = filter.query.trim().toLowerCase();
      if (!q) return true;
      return (
        order.number.toLowerCase().includes(q) ||
        order.number.replace(/-/g, "").toLowerCase().includes(q.replace(/-/g, "")) ||
        (order.customLabel?.trim().toLowerCase().includes(q) ?? false)
      );
    }
    case "status":
      return (
        filter.statuses.length > 0 && filter.statuses.includes(order.status)
      );
    case "in_hands_date": {
      if (!filter.date) return true;
      const orderDay = startOfDay(parseISO(order.inHandsDate));
      const filterDay = startOfDay(parseISO(filter.date));
      if (filter.mode === "on") return isSameDay(orderDay, filterDay);
      if (filter.mode === "before") return orderDay <= filterDay;
      return orderDay >= filterDay;
    }
    default:
      return true;
  }
}

export function applyAdvancedFilters(
  orders: Order[],
  filters: OrderAdvancedFilter[]
): Order[] {
  if (filters.length === 0) return orders;
  return orders.filter((order) => filters.every((f) => matchesFilter(order, f)));
}

export function getFilterChipParts(
  filter: OrderAdvancedFilter,
  customers: Customer[]
): { label: string; value: string } {
  switch (filter.field) {
    case "customer": {
      const names = filter.customerIds
        .map((id) => customers.find((c) => c.id === id)?.company)
        .filter(Boolean) as string[];
      return {
        label: "Customer is",
        value:
          names.length === 0
            ? "—"
            : names.length === 1
              ? names[0]
              : `${names.length} customers`,
      };
    }
    case "order_number":
      return { label: "Order # contains", value: filter.query.trim() || "—" };
    case "status": {
      const labels = filter.statuses.map(
        (s) =>
          ORDER_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
      );
      return {
        label: "Status is",
        value:
          labels.length === 0
            ? "—"
            : labels.length <= 2
              ? labels.join(", ")
              : `${labels.length} statuses`,
      };
    }
    case "in_hands_date": {
      const mode =
        IN_HANDS_DATE_MODES.find((m) => m.value === filter.mode)?.label ??
        filter.mode;
      const formatted = filter.date
        ? parseISO(filter.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—";
      return { label: `In-hands ${mode.toLowerCase()}`, value: formatted };
    }
  }
}
