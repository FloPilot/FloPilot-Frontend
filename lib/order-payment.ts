import { formatCurrency } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

type PaymentHealthStatus = "good" | "warning" | "critical" | "neutral";

export type OrderPaymentStatus =
  | "not_invoiced"
  | "invoiced"
  | "partial"
  | "paid";

const INVOICED_ORDER_STATUSES: OrderStatus[] = [
  "quote_sent",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_to_ship",
  "shipped",
  "completed",
];

export function isOrderInvoiced(
  order: Pick<Order, "type" | "status">
): boolean {
  return (
    order.type === "invoice" ||
    INVOICED_ORDER_STATUSES.includes(order.status)
  );
}

export function getOrderPaymentStatus(
  order: Pick<Order, "type" | "status" | "total" | "paid" | "balance">
): OrderPaymentStatus {
  if (order.total <= 0) {
    return "not_invoiced";
  }

  if (order.balance <= 0 && order.paid >= order.total) {
    return "paid";
  }

  if (order.paid > 0 && order.balance > 0) {
    return "partial";
  }

  if (order.balance > 0 && isOrderInvoiced(order)) {
    return "invoiced";
  }

  return "not_invoiced";
}

export function orderPaymentStatusLabel(status: OrderPaymentStatus): string {
  switch (status) {
    case "not_invoiced":
      return "Not invoiced";
    case "invoiced":
      return "Invoiced";
    case "partial":
      return "Partially paid";
    case "paid":
      return "Paid in full";
  }
}

export function orderPaymentHealthStatus(
  status: OrderPaymentStatus
): PaymentHealthStatus {
  switch (status) {
    case "paid":
      return "good";
    case "partial":
      return "warning";
    case "invoiced":
      return "critical";
    case "not_invoiced":
      return "neutral";
  }
}

export function getOrderPaymentDisplay(
  order: Pick<
    Order,
    "type" | "status" | "total" | "paid" | "balance"
  >
): {
  status: OrderPaymentStatus;
  label: string;
  detail?: string;
  healthStatus: PaymentHealthStatus;
} {
  const status = getOrderPaymentStatus(order);
  const label = orderPaymentStatusLabel(status);
  const healthStatus = orderPaymentHealthStatus(status);

  switch (status) {
    case "not_invoiced":
      return {
        status,
        label,
        healthStatus,
        detail:
          order.total <= 0
            ? "Nothing to bill yet"
            : `${formatCurrency(order.total)} total · not billed yet`,
      };
    case "invoiced":
      return {
        status,
        label,
        healthStatus,
        detail: `${formatCurrency(order.balance)} due`,
      };
    case "partial":
      return {
        status,
        label,
        healthStatus,
        detail: `${formatCurrency(order.balance)} remaining`,
      };
    case "paid":
      return {
        status,
        label,
        healthStatus,
        detail:
          order.paid > 0 ? `${formatCurrency(order.paid)} received` : undefined,
      };
  }
}

export function formatOrderBalanceLabel(
  order: Pick<Order, "type" | "status" | "total" | "paid" | "balance">
): string {
  const { status, label } = getOrderPaymentDisplay(order);

  if (status === "invoiced" || status === "partial") {
    return formatCurrency(order.balance);
  }

  if (status === "paid") {
    return "Paid";
  }

  return label;
}
