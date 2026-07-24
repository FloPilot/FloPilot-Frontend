import { isSameDay, parseISO, startOfDay } from "date-fns";
import type { Customer, Order } from "@/types";

/** Sentinel for orders with no end business / sub-customer */
export const NO_END_BUSINESS = "__none__";

export type DocumentFilterScope = "estimates" | "invoices";

export type DocumentDateMode = "on" | "before" | "after";

export type DocumentFilterField =
  | "customer"
  | "end_business"
  | "order_number"
  | "in_hands_date"
  | "due_date"
  | "sent_date"
  | "created_date";

export type DocumentAdvancedFilter =
  | { id: string; field: "customer"; customerIds: string[] }
  | { id: string; field: "end_business"; endBusinessIds: string[] }
  | { id: string; field: "order_number"; query: string }
  | {
      id: string;
      field: "in_hands_date" | "due_date" | "sent_date" | "created_date";
      mode: DocumentDateMode;
      date: string;
    };

export type EndBusinessOption = {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
};

export const DOCUMENT_DATE_MODES: {
  value: DocumentDateMode;
  label: string;
}[] = [
  { value: "on", label: "On" },
  { value: "before", label: "On or before" },
  { value: "after", label: "On or after" },
];

const FIELD_META: Record<
  DocumentFilterField,
  { label: string; hint: string; scopes: DocumentFilterScope[] }
> = {
  customer: {
    label: "Customer",
    hint: "Filter by billing account",
    scopes: ["estimates", "invoices"],
  },
  end_business: {
    label: "End business",
    hint: "Sub-customer on the order",
    scopes: ["estimates", "invoices"],
  },
  order_number: {
    label: "Order number",
    hint: "SO #, quote #, or custom label",
    scopes: ["estimates", "invoices"],
  },
  in_hands_date: {
    label: "In-hands date",
    hint: "Order due on, before, or after",
    scopes: ["estimates", "invoices"],
  },
  due_date: {
    label: "Due date",
    hint: "Invoice due by a date — great for statements",
    scopes: ["invoices"],
  },
  sent_date: {
    label: "Sent date",
    hint: "When the invoice was emailed",
    scopes: ["invoices"],
  },
  created_date: {
    label: "Created date",
    hint: "When the estimate / order was created",
    scopes: ["estimates"],
  },
};

export function documentFilterFieldOptions(scope: DocumentFilterScope) {
  return (Object.keys(FIELD_META) as DocumentFilterField[])
    .filter((field) => FIELD_META[field].scopes.includes(scope))
    .map((field) => ({
      field,
      label: FIELD_META[field].label,
      hint: FIELD_META[field].hint,
    }));
}

export function createDocumentFilterId(): string {
  return `doc-filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Effective invoice due date: explicit due date, else in-hands date.
 * Used for statement-style "due by" filtering.
 */
export function getInvoiceDueDate(order: Order): string | null {
  const due = order.invoice?.dueDate?.trim();
  if (due) return due.slice(0, 10);
  if (order.inHandsDate) return order.inHandsDate.slice(0, 10);
  return null;
}

export function collectEndBusinessOptions(
  customers: Customer[],
  orders: Order[] = []
): EndBusinessOption[] {
  const byId = new Map<string, EndBusinessOption>();

  for (const customer of customers) {
    for (const sub of customer.subCustomers ?? []) {
      if (!sub?.id || !sub.name?.trim()) continue;
      byId.set(sub.id, {
        id: sub.id,
        name: sub.name.trim(),
        customerId: customer.id,
        customerName: customer.company,
      });
    }
  }

  for (const order of orders) {
    const id = order.subCustomerId?.trim();
    const name = order.subCustomerName?.trim();
    if (!id || !name || byId.has(id)) continue;
    byId.set(id, {
      id,
      name,
      customerId: order.customerId,
      customerName: order.company,
    });
  }

  return [...byId.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return (a.customerName ?? "").localeCompare(b.customerName ?? "");
  });
}

function matchesDate(
  value: string | null | undefined,
  mode: DocumentDateMode,
  date: string
): boolean {
  if (!date) return true;
  if (!value) return false;
  const orderDay = startOfDay(parseISO(value.slice(0, 10)));
  const filterDay = startOfDay(parseISO(date));
  if (Number.isNaN(orderDay.getTime()) || Number.isNaN(filterDay.getTime())) {
    return false;
  }
  if (mode === "on") return isSameDay(orderDay, filterDay);
  if (mode === "before") return orderDay <= filterDay;
  return orderDay >= filterDay;
}

function matchesFilter(
  order: Order,
  filter: DocumentAdvancedFilter
): boolean {
  switch (filter.field) {
    case "customer":
      return (
        filter.customerIds.length > 0 &&
        filter.customerIds.includes(order.customerId)
      );
    case "end_business": {
      if (filter.endBusinessIds.length === 0) return true;
      const id = order.subCustomerId?.trim() || "";
      const wantsNone = filter.endBusinessIds.includes(NO_END_BUSINESS);
      const wantsSpecific = filter.endBusinessIds.filter(
        (entry) => entry !== NO_END_BUSINESS
      );
      const matchesNone = wantsNone && !id;
      const matchesSpecific =
        wantsSpecific.length > 0 && !!id && wantsSpecific.includes(id);
      return matchesNone || matchesSpecific;
    }
    case "order_number": {
      const q = filter.query.trim().toLowerCase();
      if (!q) return true;
      const compact = q.replace(/-/g, "");
      return (
        order.number.toLowerCase().includes(q) ||
        order.number.replace(/-/g, "").toLowerCase().includes(compact) ||
        (order.customLabel?.trim().toLowerCase().includes(q) ?? false)
      );
    }
    case "in_hands_date":
      return matchesDate(order.inHandsDate, filter.mode, filter.date);
    case "due_date":
      return matchesDate(getInvoiceDueDate(order), filter.mode, filter.date);
    case "sent_date":
      return matchesDate(order.invoice?.sentAt, filter.mode, filter.date);
    case "created_date":
      return matchesDate(order.createdAt, filter.mode, filter.date);
    default:
      return true;
  }
}

export function applyDocumentAdvancedFilters(
  orders: Order[],
  filters: DocumentAdvancedFilter[]
): Order[] {
  if (filters.length === 0) return orders;
  return orders.filter((order) =>
    filters.every((filter) => matchesFilter(order, filter))
  );
}

function formatFilterDate(date: string): string {
  if (!date) return "—";
  try {
    return parseISO(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function dateChipParts(
  fieldLabel: string,
  mode: DocumentDateMode,
  date: string
): { label: string; value: string } {
  const modeLabel =
    DOCUMENT_DATE_MODES.find((entry) => entry.value === mode)?.label ?? mode;
  return {
    label: `${fieldLabel} ${modeLabel.toLowerCase()}`,
    value: formatFilterDate(date),
  };
}

export function getDocumentFilterChipParts(
  filter: DocumentAdvancedFilter,
  customers: Customer[],
  endBusinessOptions: EndBusinessOption[]
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
    case "end_business": {
      const names = filter.endBusinessIds.map((id) => {
        if (id === NO_END_BUSINESS) return "No end business";
        return (
          endBusinessOptions.find((entry) => entry.id === id)?.name ?? "—"
        );
      });
      return {
        label: "End business is",
        value:
          names.length === 0
            ? "—"
            : names.length === 1
              ? names[0]
              : `${names.length} end businesses`,
      };
    }
    case "order_number":
      return { label: "Order # contains", value: filter.query.trim() || "—" };
    case "in_hands_date":
      return dateChipParts("In-hands", filter.mode, filter.date);
    case "due_date":
      return dateChipParts("Due", filter.mode, filter.date);
    case "sent_date":
      return dateChipParts("Sent", filter.mode, filter.date);
    case "created_date":
      return dateChipParts("Created", filter.mode, filter.date);
  }
}

export function documentMatchesSearch(order: Order, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    order.number,
    order.customLabel,
    order.company,
    order.customerName,
    order.subCustomerName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}
