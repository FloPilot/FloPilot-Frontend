import type { OrderListSummary } from "@/lib/order-list-summary";
import { isInProductionPhase } from "@/lib/order-approval";
import { allMaterialsReceived } from "@/lib/order-materials";
import { orderStatusDescription } from "@/lib/order-status";
import { isWillCallOrder } from "@/lib/order-shipping";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import type { Order, OrderStatus } from "@/types";

type ArtworkApprovalSummary = ReturnType<typeof getArtworkApprovalSummary>;

export type OrderActionId =
  | "send_estimate"
  | "send_proofs"
  | "mark_ready_to_ship"
  | "schedule"
  | "add_production"
  | "message_customer"
  | "view_tasks"
  | "finish_receiving";

export type OrderSuggestedAction = {
  id: OrderActionId;
  label: string;
  description: string;
  emphasis: "primary" | "secondary";
  disabled?: boolean;
};

export function buildOrderSuggestedActions({
  order,
  summary,
  artworkSummary,
  canSchedule,
}: {
  order: Order;
  summary: OrderListSummary;
  artworkSummary: ArtworkApprovalSummary | null;
  canSchedule: boolean;
}): OrderSuggestedAction[] {
  const actions: OrderSuggestedAction[] = [];
  const pendingProofs =
    artworkSummary &&
    artworkSummary.total > 0 &&
    !artworkSummary.allApproved;
  const preProduction = !isInProductionPhase(order);

  if (order.status === "draft" && summary.eventCount > 0) {
    actions.push({
      id: "send_estimate",
      label: "Send estimate to customer",
      description: "Share pricing — then send proofs for approval",
      emphasis: "primary",
    });
  }

  if (pendingProofs) {
    actions.push({
      id: "send_proofs",
      label: "Send proofs to customer",
      description: "Email portal link so they can approve mockups",
      emphasis: preProduction ? "primary" : "secondary",
    });
  }

  if (summary.eventCount === 0 && (order.status === "draft" || isInProductionPhase(order))) {
    actions.push({
      id: "add_production",
      label: "Add production steps",
      description: "Break this order into decorations to run on the floor",
      emphasis: "primary",
    });
  }

  const readyToSchedule =
    order.status === "approved" || isInProductionPhase(order);

  if (
    readyToSchedule &&
    summary.needsSchedule &&
    canSchedule
  ) {
    actions.push({
      id: "schedule",
      label: "Schedule on calendar",
      description: "Put decorations on the production calendar",
      emphasis: "primary",
    });
  }

  if (
    readyToSchedule &&
    !allMaterialsReceived(order) &&
    summary.eventCount > 0
  ) {
    actions.push({
      id: "finish_receiving",
      label: "Finish receiving checklist",
      description: "Confirm blanks, DTF sheets, screens, and ink on their tabs",
      emphasis: summary.needsSchedule ? "secondary" : "primary",
    });
  }

  if (
    order.status === "in_production" &&
    summary.completedCount === summary.eventCount &&
    summary.eventCount > 0
  ) {
    const willCall = isWillCallOrder(order.shipping, order.shipments ?? []);
    actions.push({
      id: "mark_ready_to_ship",
      label: willCall
        ? "Mark waiting for customer pickup"
        : "Mark ready to ship",
      description: willCall
        ? "All decorations completed — ready for customer pickup"
        : "All decorations completed — pack it up",
      emphasis: "primary",
    });
  }

  if (summary.isBlocked) {
    actions.unshift({
      id: "view_tasks",
      label: "Review blocked steps",
      description: "Something is stopped — open tasks to fix it",
      emphasis: "primary",
    });
  }

  actions.push({
    id: "message_customer",
    label: "Message customer",
    description: "Ask a question or send an update",
    emphasis: "secondary",
  });

  if (summary.eventCount > 0 && !summary.isBlocked) {
    actions.push({
      id: "view_tasks",
      label: "View on tasks board",
      description: "See this order on the shop floor task list",
      emphasis: "secondary",
    });
  }

  const seen = new Set<OrderActionId>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

export function getPrimaryStatusAction(
  actions: OrderSuggestedAction[]
): OrderSuggestedAction | undefined {
  return actions.find((action) => action.emphasis === "primary" && !action.disabled);
}

export function orderStatusHint(
  status: OrderStatus,
  options?: { willCall?: boolean }
): string {
  return orderStatusDescription(status, options);
}
