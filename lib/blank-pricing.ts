import type { BlankSource, LineItem, Order } from "@/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Effective source for a blank — line override, then order default. */
export function resolveLineItemBlankSource(
  item: Pick<LineItem, "blankSource"> | null | undefined,
  order?: Pick<Order, "materials"> | null
): BlankSource | undefined {
  return item?.blankSource ?? order?.materials?.blankSource;
}

/** Shop-purchased (or unset) blanks are billable; customer-supplied are not. */
export function lineItemIsShopPurchased(
  item: Pick<LineItem, "blankSource"> | null | undefined,
  order?: Pick<Order, "materials"> | null
): boolean {
  return resolveLineItemBlankSource(item, order) !== "customer_supplies";
}

export type OrderBlankSourceSummary =
  | { kind: "unset" }
  | { kind: "shop_orders"; count: number }
  | { kind: "customer_supplies"; count: number }
  | { kind: "mixed"; shopCount: number; customerCount: number };

export function summarizeOrderBlankSources(
  order: Pick<Order, "lineItems" | "materials">
): OrderBlankSourceSummary {
  const items = order.lineItems || [];
  if (items.length === 0) {
    const fallback = order.materials?.blankSource;
    if (fallback === "shop_orders") return { kind: "shop_orders", count: 0 };
    if (fallback === "customer_supplies") {
      return { kind: "customer_supplies", count: 0 };
    }
    return { kind: "unset" };
  }

  let shopCount = 0;
  let customerCount = 0;
  let unsetCount = 0;
  for (const item of items) {
    const source = resolveLineItemBlankSource(item, order);
    if (source === "customer_supplies") customerCount += 1;
    else if (source === "shop_orders") shopCount += 1;
    else unsetCount += 1;
  }

  if (customerCount === 0 && shopCount === 0) {
    return { kind: "unset" };
  }
  if (customerCount > 0 && shopCount === 0 && unsetCount === 0) {
    return { kind: "customer_supplies", count: customerCount };
  }
  if (shopCount > 0 && customerCount === 0 && unsetCount === 0) {
    return { kind: "shop_orders", count: shopCount };
  }
  // Mix of shop + customer, or customer + still-unset lines.
  return {
    kind: "mixed",
    shopCount: shopCount + unsetCount,
    customerCount,
  };
}

export function orderBlankSourcesResolved(
  order: Pick<Order, "lineItems" | "materials">
): boolean {
  if (order.materials?.blankSource) return true;
  const items = order.lineItems || [];
  if (items.length === 0) return true;
  return items.every((item) => Boolean(item.blankSource));
}

export function formatOrderBlankSourceSummary(
  order: Pick<Order, "lineItems" | "materials">
): string {
  const summary = summarizeOrderBlankSources(order);
  switch (summary.kind) {
    case "mixed":
      return `Mixed · ${summary.shopCount} shop · ${summary.customerCount} customer`;
    case "shop_orders":
      return "Shop orders";
    case "customer_supplies":
      return "Customer supplied";
    default:
      return "Not set";
  }
}

export function shouldShowBlankPricingForBlankSource(
  blankSource?: BlankSource
): boolean {
  return blankSource !== "customer_supplies";
}

export function shouldShowBlankPricing(order: Order): boolean {
  const items = order.lineItems || [];
  if (items.length === 0) {
    return shouldShowBlankPricingForBlankSource(order.materials?.blankSource);
  }
  return items.some((item) => lineItemIsShopPurchased(item, order));
}

export function normalizeMarkupPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(500, Math.max(0, round2(parsed)));
}

/** True when the line should inherit shop default markup (unset or legacy 0% lock-in). */
export function lineItemUsesShopDefaultMarkup(
  item: LineItem,
  shopDefaultMarkupPercent = 0
): boolean {
  const hasMarkup =
    item.markupPercent != null && Number.isFinite(item.markupPercent);
  const hasPrice =
    item.customerUnitPrice != null && Number.isFinite(item.customerUnitPrice);
  const unitCost = item.unitCost || 0;

  if (!hasMarkup && !hasPrice) return true;

  if (shopDefaultMarkupPercent <= 0) return false;

  if (
    hasMarkup &&
    normalizeMarkupPercent(item.markupPercent) === 0 &&
    (!hasPrice ||
      (unitCost > 0 &&
        Math.abs((item.customerUnitPrice ?? 0) - unitCost) < 0.01))
  ) {
    return true;
  }

  return false;
}

export function deriveMarkupPercentFromPrices(
  unitCost: number,
  customerUnitPrice: number
): number {
  const cost = Math.max(0, unitCost);
  const price = Math.max(0, customerUnitPrice);
  if (cost <= 0) return 0;
  return normalizeMarkupPercent(((price / cost) - 1) * 100);
}

export function resolveLineItemMarkupPercent(
  item: LineItem,
  shopDefaultMarkupPercent = 0
): number {
  if (lineItemUsesShopDefaultMarkup(item, shopDefaultMarkupPercent)) {
    return normalizeMarkupPercent(shopDefaultMarkupPercent);
  }

  if (item.markupPercent != null && Number.isFinite(item.markupPercent)) {
    return normalizeMarkupPercent(item.markupPercent);
  }

  if (
    item.customerUnitPrice != null &&
    item.customerUnitPrice >= 0 &&
    item.unitCost > 0
  ) {
    return deriveMarkupPercentFromPrices(item.unitCost, item.customerUnitPrice);
  }

  return normalizeMarkupPercent(shopDefaultMarkupPercent);
}

export function resolveLineItemCustomerUnitPrice(
  item: LineItem,
  shopDefaultMarkupPercent = 0
): number {
  if (lineItemUsesShopDefaultMarkup(item, shopDefaultMarkupPercent)) {
    return deriveCustomerUnitPriceFromMarkup(
      item.unitCost || 0,
      shopDefaultMarkupPercent
    );
  }

  if (item.markupPercent != null && Number.isFinite(item.markupPercent)) {
    return deriveCustomerUnitPriceFromMarkup(item.unitCost || 0, item.markupPercent);
  }

  if (item.customerUnitPrice != null && item.customerUnitPrice >= 0) {
    return round2(item.customerUnitPrice);
  }

  return deriveCustomerUnitPriceFromMarkup(
    item.unitCost || 0,
    shopDefaultMarkupPercent
  );
}

export function deriveCustomerUnitPriceFromMarkup(
  unitCost: number,
  markupPercent: number
): number {
  const cost = Math.max(0, unitCost);
  const markup = normalizeMarkupPercent(markupPercent);
  return round2(cost * (1 + markup / 100));
}

export function applyDefaultBlankMarkup(
  item: LineItem,
  shopDefaultMarkupPercent = 0
): LineItem {
  const next = {
    ...item,
    markupPercent: normalizeMarkupPercent(shopDefaultMarkupPercent),
  };
  delete next.customerUnitPrice;
  return next;
}

export function lineItemCustomerLineTotal(
  item: LineItem,
  shopDefaultMarkupPercent = 0
): number {
  const customerUnitPrice = resolveLineItemCustomerUnitPrice(
    item,
    shopDefaultMarkupPercent
  );
  const pieces = (item.sizes || []).reduce(
    (sum, row) => sum + (row.quantity || 0),
    0
  );
  return round2(customerUnitPrice * pieces);
}

export function orderCustomerGarmentSubtotal(
  order: Order,
  shopDefaultMarkupPercent = 0
): number {
  if (!shouldShowBlankPricing(order)) return 0;
  return round2(
    (order.lineItems || []).reduce((sum, item) => {
      if (!lineItemIsShopPurchased(item, order)) return sum;
      return sum + lineItemCustomerLineTotal(item, shopDefaultMarkupPercent);
    }, 0)
  );
}
