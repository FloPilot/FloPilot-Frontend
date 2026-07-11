import { createLineItemId } from "@/lib/line-items";
import type {
  SupplierColorVariant,
  SupplierSizeSku,
  SupplierStyleDetail,
} from "@/lib/supplier-integrations";
import type { LineItem, SizeBreakdown } from "@/types";

export const SS_PRODUCT_KEY_PREFIX = "ss:";

export function isSupplierLineItem(item: LineItem): boolean {
  return (
    item.supplier === "ssActivewear" ||
    Boolean(item.productKey?.startsWith(SS_PRODUCT_KEY_PREFIX))
  );
}

export function ssProductKey(partNumber: string): string {
  return `${SS_PRODUCT_KEY_PREFIX}${partNumber}`;
}

export function ssColorKey(colorCode: string): string {
  return `${SS_PRODUCT_KEY_PREFIX}${colorCode}`;
}

/**
 * Blank unit cost for quotes/orders from an S&S SKU.
 * Uses standard piece pricing (not sale / promo) so estimates stay stable
 * while waiting for customer approval.
 */
export function priceForSku(sku: SupplierSizeSku): number {
  if (sku.standardUnitPrice != null && sku.standardUnitPrice > 0) {
    return Math.round(sku.standardUnitPrice * 100) / 100;
  }
  if (sku.piecePrice > 0) {
    return Math.round(sku.piecePrice * 100) / 100;
  }
  if (sku.customerPrice > 0) {
    return Math.round(sku.customerPrice * 100) / 100;
  }
  return 0;
}

export function buildLineItemFromSsSelection(
  style: SupplierStyleDetail,
  color: SupplierColorVariant,
  quantities: Record<string, number>
): LineItem | null {
  const sizes: SizeBreakdown[] = [];
  let totalCost = 0;
  let totalQty = 0;

  for (const sku of color.sizes) {
    const qty = Math.max(0, Math.floor(quantities[sku.sizeName] || 0));
    if (qty <= 0) continue;
    const unit = priceForSku(sku);
    sizes.push({ size: sku.sizeName, quantity: qty });
    totalCost += unit * qty;
    totalQty += qty;
  }

  if (sizes.length === 0) return null;

  const unitCost =
    totalQty > 0 ? Math.round((totalCost / totalQty) * 100) / 100 : 0;

  return {
    id: createLineItemId(),
    brand: style.brandName,
    productName: `${style.styleName}`.trim(),
    color: color.colorName,
    sizes,
    unitCost,
    productKey: ssProductKey(style.partNumber),
    colorKey: ssColorKey(color.colorCode),
    supplier: "ssActivewear",
    supplierPartNumber: style.partNumber,
    supplierStyleId: style.styleId,
  };
}

export function rebuildSupplierLineItemQuantity(
  item: LineItem,
  size: string,
  quantity: number
): LineItem {
  const nextQty = Math.max(0, Math.floor(quantity));
  const hasSize = item.sizes.some((row) => row.size === size);

  const sizes = hasSize
    ? item.sizes
        .map((row) =>
          row.size === size ? { ...row, quantity: nextQty } : row
        )
        .filter((row) => row.quantity > 0)
    : nextQty > 0
      ? [...item.sizes, { size, quantity: nextQty }]
      : item.sizes;

  return {
    ...item,
    sizes,
  };
}

export function existingSsSizesOnOrder(
  lineItems: LineItem[],
  partNumber: string,
  colorCode: string
): Record<string, number> {
  const productKey = ssProductKey(partNumber);
  const colorKey = ssColorKey(colorCode);
  const totals: Record<string, number> = {};

  for (const item of lineItems) {
    if (item.productKey !== productKey || item.colorKey !== colorKey) continue;
    for (const row of item.sizes) {
      totals[row.size] = (totals[row.size] || 0) + row.quantity;
    }
  }

  return totals;
}
