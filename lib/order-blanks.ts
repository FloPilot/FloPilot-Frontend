import type { Order, OrderStatus } from "@/types";

const LOCKED_BLANK_EDIT_STATUSES: OrderStatus[] = [
  "ready_to_ship",
  "shipped",
  "ready_to_invoice",
  "invoice_sent",
  "completed",
];

export function canEditOrderBlanks(order: Order): boolean {
  if (order.archived) return false;
  return !LOCKED_BLANK_EDIT_STATUSES.includes(order.status);
}

export function orderBlanksEditHint(order: Order): string {
  if (order.archived) {
    return "Restore this order to adjust blanks.";
  }
  if (LOCKED_BLANK_EDIT_STATUSES.includes(order.status)) {
    return "Blanks are locked — this order is finished or ready to ship.";
  }
  return "Adjust styles, colors, and quantities before production runs.";
}
