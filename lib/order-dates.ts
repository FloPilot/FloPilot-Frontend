import { addDays, addMonths, format, isValid, parseISO, startOfDay } from "date-fns";

/** Store / API date-only string (yyyy-MM-dd). */
export type OrderDateOnly = string;

export function toOrderDateOnly(value: Date | string | null | undefined): OrderDateOnly | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (!isValid(value)) return null;
    return format(value, "yyyy-MM-dd");
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Already date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return null;
  return format(parsed, "yyyy-MM-dd");
}

export function parseOrderDateOnly(
  value: string | null | undefined
): Date | null {
  const normalized = toOrderDateOnly(value);
  if (!normalized) return null;
  const parsed = parseISO(`${normalized}T12:00:00`);
  return isValid(parsed) ? parsed : null;
}

export function formatOrderDateLabel(
  value: string | null | undefined,
  empty = "Select date"
): string {
  const date = parseOrderDateOnly(value);
  if (!date) return empty;
  return format(date, "MMM d, yyyy");
}

/** Resolve display/PDF order date: explicit orderDate, else createdAt day. */
export function resolveOrderDate(
  order: { orderDate?: string | null; createdAt?: string | null }
): OrderDateOnly | null {
  return (
    toOrderDateOnly(order.orderDate) || toOrderDateOnly(order.createdAt)
  );
}

export function defaultNewOrderDates(now = new Date()) {
  const today = startOfDay(now);
  return {
    orderDate: format(today, "yyyy-MM-dd"),
    shipDate: format(addDays(today, 14), "yyyy-MM-dd"),
    inHandsDate: format(addDays(today, 21), "yyyy-MM-dd"),
  };
}

export type OrderDatePreset = {
  id: string;
  label: string;
  date: OrderDateOnly;
};

export function orderDatePresets(now = new Date()): OrderDatePreset[] {
  const today = startOfDay(now);
  return [
    {
      id: "today",
      label: "Today",
      date: format(today, "yyyy-MM-dd"),
    },
    {
      id: "two-weeks",
      label: "2 weeks",
      date: format(addDays(today, 14), "yyyy-MM-dd"),
    },
    {
      id: "one-month",
      label: "1 month",
      date: format(addMonths(today, 1), "yyyy-MM-dd"),
    },
  ];
}

/** Short presets for receiving / return dates (near past). */
export function receivingDatePresets(now = new Date()): OrderDatePreset[] {
  const today = startOfDay(now);
  return [
    {
      id: "today",
      label: "Today",
      date: format(today, "yyyy-MM-dd"),
    },
    {
      id: "yesterday",
      label: "Yesterday",
      date: format(addDays(today, -1), "yyyy-MM-dd"),
    },
  ];
}
