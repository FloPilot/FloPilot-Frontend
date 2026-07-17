import type { OrderStatus } from "@/types";

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "draft",
  "quote_sent",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_to_ship",
  "shipped",
  "ready_to_invoice",
  "invoice_sent",
  "completed",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quote_sent: "Quote sent",
  awaiting_approval: "Awaiting approval",
  approved: "Ready for scheduling",
  in_production: "In production",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  ready_to_invoice: "Ready to invoice",
  invoice_sent: "Invoice sent",
  completed: "Completed",
};

/** Will-call orders use pickup language for fulfillment statuses */
export const WILL_CALL_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  ready_to_ship: "Waiting for customer pickup",
  shipped: "Picked up",
  ready_to_invoice: "Picked up",
  invoice_sent: "Invoice sent",
};

/** Plain-language explanation shown on the order screen */
export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  draft:
    "Internal setup — attach artwork and production events, then send the estimate and proofs.",
  quote_sent:
    "Estimate shared — send proofs and wait for the customer to approve both.",
  awaiting_approval:
    "Customer is reviewing the estimate and proofs. When both are approved, the order is ready for scheduling.",
  approved:
    "Estimate and proofs approved — schedule production events on the calendar.",
  in_production:
    "On the floor — finish receiving, run scheduled events, and complete production.",
  ready_to_ship: "Production is complete — pack and ship or schedule pickup.",
  shipped:
    "Order has left the shop — mark delivered when the customer receives it.",
  ready_to_invoice:
    "Goods are picked up or delivered — confirm produced counts, send the invoice, then record payment.",
  invoice_sent:
    "Invoice sent to the customer — record payment when it is received.",
  completed: "Order is paid and closed out.",
};

export const WILL_CALL_STATUS_DESCRIPTIONS: Partial<
  Record<OrderStatus, string>
> = {
  ready_to_ship:
    "Production is complete — waiting for the customer to pick up at the shop.",
  shipped: "Customer has picked up this order from the shop.",
  ready_to_invoice:
    "Customer has picked up — confirm produced counts, send the invoice, then record payment.",
  invoice_sent:
    "Customer has picked up and the invoice was sent — record payment when it is received.",
};

export type OrderStatusLabelOptions = {
  willCall?: boolean;
};

export function orderStatusLabel(
  status: OrderStatus,
  options?: OrderStatusLabelOptions
): string {
  if (options?.willCall && WILL_CALL_STATUS_LABELS[status]) {
    return WILL_CALL_STATUS_LABELS[status]!;
  }
  return ORDER_STATUS_LABELS[status];
}

export function orderStatusDescription(
  status: OrderStatus,
  options?: OrderStatusLabelOptions
): string {
  if (options?.willCall && WILL_CALL_STATUS_DESCRIPTIONS[status]) {
    return WILL_CALL_STATUS_DESCRIPTIONS[status]!;
  }
  return ORDER_STATUS_DESCRIPTIONS[status];
}

/**
 * Staff can set any status from the order status control.
 */
export const STAFF_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> =
  Object.fromEntries(
    ORDER_STATUS_ORDER.map((from) => [
      from,
      ORDER_STATUS_ORDER.filter((to) => to !== from),
    ])
  ) as Record<OrderStatus, OrderStatus[]>;

export function orderStatusesForFulfillment(
  willCall?: boolean
): OrderStatus[] {
  if (!willCall) return ORDER_STATUS_ORDER;
  // Will-call skips carrier "shipped" — pickup completes into ready_to_invoice
  return ORDER_STATUS_ORDER.filter((status) => status !== "shipped");
}


export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_ORDER.includes(to);
}

export function getStatusTransitionLabel(
  from: OrderStatus,
  to: OrderStatus,
  options?: OrderStatusLabelOptions
): string {
  if (options?.willCall) {
    const willCallActions: Partial<Record<OrderStatus, string>> = {
      ready_to_ship: "Mark waiting for customer pickup",
      shipped: "Mark picked up",
      ready_to_invoice: "Mark picked up",
      invoice_sent: "Mark invoice sent",
      completed: "Mark completed",
      in_production: "Start production",
      draft: "Move back to draft",
    };
    if (willCallActions[to]) return willCallActions[to]!;
  }

  const labels: Partial<Record<OrderStatus, string>> = {
    quote_sent: "Mark quote sent",
    awaiting_approval: "Mark awaiting approval",
    approved: "Mark ready for scheduling",
    in_production: "Start production",
    ready_to_ship: "Mark ready to ship",
    shipped: "Mark shipped",
    ready_to_invoice: "Mark ready to invoice",
    invoice_sent: "Mark invoice sent",
    completed: "Mark completed",
    draft: "Move back to draft",
  };
  return labels[to] ?? `Set to ${orderStatusLabel(to, options)}`;
}
