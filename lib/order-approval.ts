import type { Order } from "@/types";
import { getOrderProductionSteps } from "@/lib/order-production";

function decorationSteps(order: Order) {
  return getOrderProductionSteps(order).filter(
    ({ job, imprint }) =>
      job.kind !== "finishing" && imprint.decoration !== "finishing"
  );
}

export function allArtworkApproved(order: Order): boolean {
  const steps = decorationSteps(order);
  if (steps.length === 0) return false;
  return steps.every(({ imprint }) => imprint.artwork.status === "approved");
}

export function isQuoteApproved(order: Order): boolean {
  if (order.quoteApproved) return true;
  return [
    "approved",
    "in_production",
    "ready_to_ship",
    "shipped",
    "ready_to_invoice",
    "invoice_sent",
    "completed",
  ].includes(order.status);
}

export function canEnterProduction(order: Order): boolean {
  return isQuoteApproved(order) && allArtworkApproved(order);
}

export function isInProductionPhase(order: Order): boolean {
  return [
    "in_production",
    "ready_to_ship",
    "shipped",
    "ready_to_invoice",
    "invoice_sent",
    "completed",
  ].includes(order.status);
}

export function approvalSummary(order: Order): {
  quoteApproved: boolean;
  artworkApproved: boolean;
  artworkTotal: number;
  artworkApprovedCount: number;
  readyForProduction: boolean;
} {
  const steps = decorationSteps(order);
  const artworkApprovedCount = steps.filter(
    ({ imprint }) => imprint.artwork.status === "approved"
  ).length;

  return {
    quoteApproved: isQuoteApproved(order),
    artworkApproved: allArtworkApproved(order),
    artworkTotal: steps.length,
    artworkApprovedCount,
    readyForProduction: canEnterProduction(order),
  };
}
