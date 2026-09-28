import type { Job, LineItem, Order } from "@/types";
import { formatBrandProductName } from "@/lib/format-product-name";
import { lineItemPieceCount } from "@/lib/line-items";

export function lineItemDisplayLabel(item: LineItem): string {
  const product = formatBrandProductName(item.brand, item.productName);
  return item.color?.trim() ? `${product} · ${item.color}` : product;
}

/** Blanks linked to a decoration event. Empty assignment means all blanks. */
export function resolveJobLineItems(order: Order, job: Job): LineItem[] {
  const all = order.lineItems ?? [];
  if (!job.lineItemIds?.length) return all;
  const idSet = new Set(job.lineItemIds);
  return all.filter((item) => idSet.has(item.id));
}

export function jobAssignedPieceCount(order: Order, job: Job): number {
  return resolveJobLineItems(order, job).reduce(
    (sum, item) => sum + lineItemPieceCount(item),
    0
  );
}

export function jobUsesAllBlanks(order: Order, job: Job): boolean {
  const all = order.lineItems ?? [];
  if (all.length === 0) return true;
  if (!job.lineItemIds?.length) return true;
  if (job.lineItemIds.length < all.length) return false;
  const idSet = new Set(job.lineItemIds);
  return all.every((item) => idSet.has(item.id));
}

export function formatJobBlankAssignmentSummary(
  order: Order,
  job: Job
): string {
  const items = resolveJobLineItems(order, job);
  if (items.length === 0) return "No blanks on order";
  const pieces = items.reduce((sum, item) => sum + lineItemPieceCount(item), 0);
  if (jobUsesAllBlanks(order, job)) {
    return `All blanks · ${pieces} pcs`;
  }
  if (items.length === 1) {
    return `${lineItemDisplayLabel(items[0])} · ${pieces} pcs`;
  }
  return `${items.length} blanks · ${pieces} pcs`;
}

export function formatJobBlankLabels(order: Order, job: Job): string[] {
  return resolveJobLineItems(order, job).map(lineItemDisplayLabel);
}
