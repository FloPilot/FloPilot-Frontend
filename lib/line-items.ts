import {
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
} from "@/lib/create-order";
import type { LineItem, SizeBreakdown } from "@/types";

export function createLineItemId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function lineItemPieceCount(item: LineItem): number {
  return item.sizes.reduce((sum, row) => sum + row.quantity, 0);
}

export function orderPieceCount(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineItemPieceCount(item), 0);
}

export function guessProductKey(item: LineItem): string {
  if (item.productKey) return item.productKey;
  const match = NEW_ORDER_PRODUCTS.find(
    (product) => product.name === item.productName
  );
  return match?.key ?? NEW_ORDER_PRODUCTS[0].key;
}

export function guessColorKey(item: LineItem): string {
  if (item.colorKey) return item.colorKey;
  const match = NEW_ORDER_COLORS.find((color) => color.label === item.color);
  return match?.key ?? NEW_ORDER_COLORS[0].key;
}

export function sizesToRecord(
  sizes: SizeBreakdown[]
): Record<(typeof NEW_ORDER_SIZES)[number], number> {
  const record = Object.fromEntries(
    NEW_ORDER_SIZES.map((size) => [size, 0])
  ) as Record<(typeof NEW_ORDER_SIZES)[number], number>;

  for (const row of sizes) {
    if (row.size in record) {
      record[row.size as (typeof NEW_ORDER_SIZES)[number]] = row.quantity;
    }
  }

  return record;
}

export function recordToSizes(
  record: Record<(typeof NEW_ORDER_SIZES)[number], number>
): SizeBreakdown[] {
  return NEW_ORDER_SIZES.map((size) => ({
    size,
    quantity: record[size] || 0,
  })).filter((row) => row.quantity > 0);
}

export function buildLineItemFromCatalog(
  productKey: (typeof NEW_ORDER_PRODUCTS)[number]["key"],
  colorKey: (typeof NEW_ORDER_COLORS)[number]["key"],
  sizes: Record<(typeof NEW_ORDER_SIZES)[number], number>,
  id = createLineItemId()
): LineItem {
  const product =
    NEW_ORDER_PRODUCTS.find((item) => item.key === productKey) ??
    NEW_ORDER_PRODUCTS[0];
  const color =
    NEW_ORDER_COLORS.find((item) => item.key === colorKey) ??
    NEW_ORDER_COLORS[0];

  return {
    id,
    productName: product.name,
    brand: product.brand,
    color: color.label,
    unitCost: product.unitCost,
    productKey: product.key,
    colorKey: color.key,
    sizes: recordToSizes(sizes),
  };
}

export function lineItemsMatch(a: LineItem, b: LineItem): boolean {
  if (a.productKey && b.productKey && a.colorKey && b.colorKey) {
    return a.productKey === b.productKey && a.colorKey === b.colorKey;
  }

  return a.productName === b.productName && a.color === b.color;
}

export function serializeLineItemForApi(lineItem: LineItem): LineItem {
  return {
    id: lineItem.id,
    productName: lineItem.productName,
    brand: lineItem.brand,
    color: lineItem.color,
    productKey: lineItem.productKey,
    colorKey: lineItem.colorKey,
    unitCost: lineItem.unitCost,
    sizes: lineItem.sizes.filter((row) => row.quantity > 0),
  };
}

export function verifyLineItemWasApplied(
  previous: LineItem[],
  next: LineItem[],
  payload: LineItem
): boolean {
  const match = next.find((item) => lineItemsMatch(item, payload));
  if (!match || match.sizes.length === 0) return false;

  const previousMatch = previous.find((item) => lineItemsMatch(item, payload));
  const previousRecord = sizesToRecord(previousMatch?.sizes ?? []);
  const nextRecord = sizesToRecord(match.sizes);

  return payload.sizes.every((row) => {
    const size = row.size as (typeof NEW_ORDER_SIZES)[number];
    const expected = (previousRecord[size] || 0) + row.quantity;
    return nextRecord[size] === expected;
  });
}

export function createDefaultLineItem(): LineItem {
  return buildLineItemFromCatalog("g64000", "heather", {
    S: 0,
    M: 12,
    L: 0,
    XL: 0,
  });
}
