import type { OrderStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quote_sent: "Quote sent",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  in_production: "In production",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  completed: "Completed",
};

/** Plain-language explanation shown on the order screen */
export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  draft:
    "Internal setup — attach artwork and production events, then send the estimate and proofs.",
  quote_sent:
    "Estimate shared — send proofs and wait for the customer to approve both.",
  awaiting_approval:
    "Customer is reviewing the estimate and proofs. When both are approved, the order moves to production.",
  approved:
    "Legacy status — estimate and proofs approved; receiving and scheduling happen in production.",
  in_production:
    "Approved and live — confirm receiving checklist, schedule events, and run the floor.",
  ready_to_ship: "Production is complete — pack and ship or schedule pickup.",
  shipped: "Order has left the shop.",
  completed: "Order is closed out.",
};

/** Staff-initiated transitions (forward workflow + limited rollback) */
export const STAFF_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["quote_sent", "awaiting_approval", "approved"],
  quote_sent: ["awaiting_approval", "approved", "draft"],
  awaiting_approval: ["approved", "draft"],
  approved: ["in_production", "ready_to_ship"],
  in_production: ["ready_to_ship", "approved"],
  ready_to_ship: ["shipped", "in_production"],
  shipped: ["completed"],
  completed: [],
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function getStaffStatusTransitions(
  status: OrderStatus
): OrderStatus[] {
  return STAFF_STATUS_TRANSITIONS[status] ?? [];
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return getStaffStatusTransitions(from).includes(to);
}

export function getStatusTransitionLabel(
  from: OrderStatus,
  to: OrderStatus
): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    quote_sent: "Mark quote sent",
    awaiting_approval: "Mark awaiting approval",
    approved: "Mark approved",
    in_production: "Start production",
    ready_to_ship: "Mark ready to ship",
    shipped: "Mark shipped",
    completed: "Mark completed",
    draft: "Move back to draft",
  };
  return labels[to] ?? `Set to ${orderStatusLabel(to)}`;
}
