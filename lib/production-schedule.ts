import type { Order, OrderStatus, SchedulableJobOption } from "@/types";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import {
  findScheduleBlockForStep,
  getOrderProductionSteps,
} from "@/lib/order-production";

/** Orders actively moving through production — always eligible if they have events */
const ACTIVE_PRODUCTION_STATUSES = new Set<OrderStatus>([
  "approved",
  "in_production",
  "ready_to_ship",
  "awaiting_approval",
]);

/** Early pipeline statuses — eligible once artwork is approved */
const PIPELINE_STATUSES = new Set<OrderStatus>([
  "draft",
  "quote_sent",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_to_ship",
]);

export function orderHasProductionEvents(order: Order): boolean {
  return order.jobs.some((job) => job.imprints.length > 0);
}

export function isOrderEligibleForSchedulingQueue(order: Order): boolean {
  if (order.type !== "sales_order") return false;
  if (order.status === "shipped" || order.status === "completed") return false;
  if (!orderHasProductionEvents(order)) return false;

  if (ACTIVE_PRODUCTION_STATUSES.has(order.status)) return true;

  if (!PIPELINE_STATUSES.has(order.status)) return false;

  const artwork = getArtworkApprovalSummary(order);
  return artwork.allApproved;
}

/** Dashboard queue — any open sales order with production events, regardless of artwork */
export function isOrderOnDashboardSchedulingQueue(order: Order): boolean {
  if (order.type !== "sales_order") return false;
  if (order.status === "shipped" || order.status === "completed") return false;
  return orderHasProductionEvents(order);
}

export function getSchedulingQueueBlockReason(order: Order): string | null {
  if (isOrderEligibleForSchedulingQueue(order)) return null;
  if (order.type !== "sales_order") return "Not a sales order";
  if (order.status === "shipped" || order.status === "completed") {
    return "Order is already shipped or completed";
  }
  if (!orderHasProductionEvents(order)) return "No production events on this order";

  const artwork = getArtworkApprovalSummary(order);
  if (artwork.total === 0) return "Add production events to this order first";
  if (!artwork.allApproved) {
    return `Artwork ${artwork.approved}/${artwork.total} approved — finish artwork approval first`;
  }

  return `Order status is "${order.status.replace(/_/g, " ")}"`;
}

export function getOrdersWithUnscheduledEvents(
  orders: Order[],
  scheduleBlocks: import("@/types").ScheduleBlock[]
): Order[] {
  return orders.filter((order) => {
    if (!orderHasProductionEvents(order)) return false;
    const steps = getOrderProductionSteps(order);
    return steps.some(
      (step) =>
        !findScheduleBlockForStep(
          scheduleBlocks,
          order.id,
          step.job.id,
          step.imprint.id
        )
    );
  });
}

export function getSchedulableJobs(
  sourceOrders: Order[] = [],
  options?: { includeOrderId?: string; ignoreArtworkApproval?: boolean }
): SchedulableJobOption[] {
  const optionsList: SchedulableJobOption[] = [];

  for (const order of sourceOrders) {
    if (order.type !== "sales_order") continue;

    const isFocusedOrder =
      options?.includeOrderId && order.id === options.includeOrderId;
    const statusAllowed = options?.ignoreArtworkApproval
      ? isOrderOnDashboardSchedulingQueue(order)
      : isOrderEligibleForSchedulingQueue(order) || Boolean(isFocusedOrder);

    if (!statusAllowed) continue;

    for (const job of order.jobs) {
      const pieceCount = order.lineItems.reduce(
        (sum, li) =>
          sum + li.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
        0
      );

      for (const imprint of job.imprints) {
        optionsList.push({
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.company,
          jobId: job.id,
          jobName: job.name,
          imprintId: imprint.id,
          imprintLabel: imprint.label,
          decoration: imprint.decoration,
          inHandsDate: order.inHandsDate,
          pieceCount: pieceCount || 0,
        });
      }
    }
  }

  return optionsList;
}

export function createMachineId(): string {
  return `mach-${Date.now()}`;
}

export function createScheduleId(): string {
  return `sched-${Date.now()}`;
}
