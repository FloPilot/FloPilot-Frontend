import { createLineItemId } from "@/lib/line-items";
import type {
  SupplierColorVariant,
  SupplierProviderId,
  SupplierSizeSku,
  SupplierStyleDetail,
} from "@/lib/supplier-integrations";
import type { LineItem, SizeBreakdown } from "@/types";

export const SS_PRODUCT_KEY_PREFIX = "ss:";
export const SANMAR_PRODUCT_KEY_PREFIX = "sm:";

export function productKeyPrefixForProvider(
  provider: SupplierProviderId
): string {
  return provider === "sanMar" ? SANMAR_PRODUCT_KEY_PREFIX : SS_PRODUCT_KEY_PREFIX;
}

export function isSupplierLineItem(item: LineItem): boolean {
  return (
    item.supplier === "ssActivewear" ||
    item.supplier === "sanMar" ||
    Boolean(item.productKey?.startsWith(SS_PRODUCT_KEY_PREFIX)) ||
    Boolean(item.productKey?.startsWith(SANMAR_PRODUCT_KEY_PREFIX))
  );
}

export function ssProductKey(partNumber: string): string {
  return `${SS_PRODUCT_KEY_PREFIX}${partNumber}`;
}

export function ssColorKey(colorCode: string): string {
  return `${SS_PRODUCT_KEY_PREFIX}${colorCode}`;
}

export function supplierProductKey(
  provider: SupplierProviderId,
  partNumber: string
): string {
  return `${productKeyPrefixForProvider(provider)}${partNumber}`;
}

export function supplierColorKey(
  provider: SupplierProviderId,
  colorCode: string
): string {
  return `${productKeyPrefixForProvider(provider)}${colorCode}`;
}

/**
 * Blank unit cost for quotes/orders from a supplier SKU.
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

export function buildLineItemFromSupplierSelection(
  provider: SupplierProviderId,
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
    productKey: supplierProductKey(provider, style.partNumber),
    colorKey: supplierColorKey(provider, color.colorCode),
    supplier: provider,
    supplierPartNumber: style.partNumber,
    supplierStyleId: style.styleId,
  };
}

export function buildLineItemFromSsSelection(
  style: SupplierStyleDetail,
  color: SupplierColorVariant,
  quantities: Record<string, number>
): LineItem | null {
  return buildLineItemFromSupplierSelection(
    "ssActivewear",
    style,
    color,
    quantities
  );
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

export function existingSupplierSizesOnOrder(
  lineItems: LineItem[],
  provider: SupplierProviderId,
  partNumber: string,
  colorCode: string
): Record<string, number> {
  const productKey = supplierProductKey(provider, partNumber);
  const colorKey = supplierColorKey(provider, colorCode);
  const totals: Record<string, number> = {};

  for (const item of lineItems) {
    if (item.productKey !== productKey || item.colorKey !== colorKey) continue;
    for (const row of item.sizes) {
      totals[row.size] = (totals[row.size] || 0) + row.quantity;
    }
  }

  return totals;
}

export function existingSsSizesOnOrder(
  lineItems: LineItem[],
  partNumber: string,
  colorCode: string
): Record<string, number> {
  return existingSupplierSizesOnOrder(
    lineItems,
    "ssActivewear",
    partNumber,
    colorCode
  );
}
