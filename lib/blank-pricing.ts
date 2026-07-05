import type { BlankSource, LineItem, Order } from "@/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function shouldShowBlankPricingForBlankSource(
  blankSource?: BlankSource
): boolean {
  return blankSource !== "customer_supplies";
}

export function shouldShowBlankPricing(order: Order): boolean {
  return shouldShowBlankPricingForBlankSource(order.materials?.blankSource);
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
    (order.lineItems || []).reduce(
      (sum, item) =>
        sum + lineItemCustomerLineTotal(item, shopDefaultMarkupPercent),
      0
    )
  );
}
