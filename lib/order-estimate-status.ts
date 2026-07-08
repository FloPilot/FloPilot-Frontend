import { isQuoteApproved } from "@/lib/order-approval";
import type { Order } from "@/types";

export type OrderEstimateStatus = "pending" | "sent" | "revision" | "approved";

const ESTIMATE_SENT_ACTIVITY_TITLES = new Set([
  "Proofs & estimate emailed to customer",
  "Updated proof emailed to customer",
  "Proof emailed to customer",
]);

export function resolveOrderEstimateStatus(order: Order): OrderEstimateStatus {
  if (isQuoteApproved(order)) return "approved";

  if (hasEstimateRevisionPending(order)) return "revision";

  if (
    order.proofsSentAt ||
    order.status === "quote_sent" ||
    order.status === "awaiting_approval"
  ) {
    return "sent";
  }

  return "pending";
}

function hasEstimateRevisionPending(order: Order): boolean {
  const activities = order.activity || [];

  for (const entry of activities) {
    if (
      entry.type === "proof_sent" &&
      ESTIMATE_SENT_ACTIVITY_TITLES.has(entry.title)
    ) {
      return false;
    }

    if (
      entry.type === "status" &&
      entry.title === "Estimate revision requested"
    ) {
      return true;
    }
  }

  return false;
}

export const ORDER_ESTIMATE_STATUS_LABELS: Record<OrderEstimateStatus, string> =
  {
    pending: "Pending",
    sent: "Sent to client",
    revision: "Revision",
    approved: "Approved",
  };

export function orderEstimateStatusLabel(status: OrderEstimateStatus): string {
  return ORDER_ESTIMATE_STATUS_LABELS[status];
}
