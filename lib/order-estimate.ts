import type { Customer, LineItem, Order, SizeBreakdown } from "@/types";
import type { PricingMatrix } from "@/lib/shop-settings";
import {
  resolveOrderPricingHighlights,
  formatPricingHighlightDetail,
} from "@/lib/pricing-matrix-lookup";
import { buildFeeEstimateRows } from "@/lib/order-contract-fees";
import { decorationLabel } from "@/lib/format";
import {
  resolveLineItemCustomerUnitPrice,
  shouldShowBlankPricing,
} from "@/lib/blank-pricing";
import {
  mergeOrderProducedGoods,
  orderWithProducedQuantities,
  producedGoodsAreRecorded,
} from "@/lib/order-produced-goods";

export type EstimateRowKind = "garment" | "decoration" | "fee";

export type EstimateRow = {
  id: string;
  kind: EstimateRowKind;
  description: string;
  /** Sizes for garments; tier / color info for decoration */
  detail: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  lineItem?: LineItem;
  /** Accent index for pricing-matrix decoration rows */
  pricingStepIndex?: number;
  /** Short decoration label for matrix-matched rows */
  decorationType?: string;
  /** Covered by another decoration line's bundled location charge */
  includedInBundle?: boolean;
  source?: "auto" | "manual";
  contractFeeId?: string;
  feeCategory?: import("@/types").OrderEstimateFeeCategory;
};

export type EstimateTotals = {
  rows: EstimateRow[];
  garmentSubtotal: number;
  decorationSubtotal: number;
  feesSubtotal: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineItemPieceCount(item: LineItem): number {
  return (item.sizes || []).reduce((sum, row) => sum + (row.quantity || 0), 0);
}

export function lineItemDescription(item: LineItem): string {
  return [item.brand, item.productName, item.color]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" · ");
}

export function lineItemSizesSummary(item: LineItem): string {
  const parts = (item.sizes || [])
    .filter((row) => (row.quantity || 0) > 0)
    .map((row) => `${row.size} ×${row.quantity}`);
  return parts.join(", ");
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "OS"];

function sortSizeBreakdowns(sizes: SizeBreakdown[]): SizeBreakdown[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.size);
    const bi = SIZE_ORDER.indexOf(b.size);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function buildGarmentRows(
  order: Order,
  pricingMatrix?: PricingMatrix
): EstimateRow[] {
  if (!shouldShowBlankPricing(order)) return [];

  const shopMarkup = pricingMatrix?.blankMarkupPercent ?? 0;
  const rows: EstimateRow[] = [];

  for (const lineItem of order.lineItems || []) {
    const description = lineItemDescription(lineItem) || "Custom item";
    const unitCost = resolveLineItemCustomerUnitPrice(lineItem, shopMarkup);
    const sizes = sortSizeBreakdowns(lineItem.sizes || []).filter(
      (row) => (row.quantity || 0) > 0
    );

    if (sizes.length === 0) {
      rows.push({
        id: lineItem.id,
        kind: "garment",
        description,
        detail: "—",
        qty: 0,
        unitCost,
        lineTotal: 0,
        lineItem,
      });
      continue;
    }

    for (const sizeRow of sizes) {
      const qty = sizeRow.quantity || 0;
      rows.push({
        id: `${lineItem.id}-${sizeRow.size}`,
        kind: "garment",
        description,
        detail: sizeRow.size,
        qty,
        unitCost,
        lineTotal: round2(unitCost * qty),
        lineItem,
      });
    }
  }

  return rows;
}

function buildDecorationRows(
  order: Order,
  pricingMatrix?: PricingMatrix
): EstimateRow[] {
  if (!pricingMatrix?.enabled) return [];

  const { highlights } = resolveOrderPricingHighlights(order, pricingMatrix);

  return highlights.map((entry) => ({
    id: `decoration-${entry.methodId}-${entry.imprintLabel}-${entry.stepIndex}`,
    kind: "decoration" as const,
    description: `${decorationLabel(entry.decoration)} · ${entry.imprintLabel}`,
    detail: formatPricingHighlightDetail(entry),
    qty: entry.pieceCount,
    unitCost: entry.unitPrice,
    lineTotal: round2(entry.unitPrice * entry.pieceCount),
    pricingStepIndex: entry.stepIndex,
    decorationType: entry.decoration,
    ...(entry.bundledIncluded ? { includedInBundle: true } : {}),
  }));
}

function buildFeeRows(
  order: Order,
  customer?: Customer | null,
  pricingMatrix?: PricingMatrix
): EstimateRow[] {
  return buildFeeEstimateRows(order, customer, pricingMatrix).map((entry) => ({
    id: entry.id,
    kind: "fee" as const,
    description: entry.label,
    detail: entry.detail || (entry.source === "auto" ? "Additional fee" : ""),
    qty: entry.qty,
    unitCost: entry.unitPrice,
    lineTotal: round2(entry.qty * entry.unitPrice),
    source: entry.source,
    contractFeeId: entry.contractFeeId,
    feeCategory: entry.category,
  }));
}

/**
 * Mirrors the backend estimate math: garment costs plus decoration pricing from
 * the shop matrix when enabled, plus contract and manual fees.
 */
export function computeEstimateTotals(
  order: Order,
  taxRate: number,
  pricingMatrix?: PricingMatrix,
  customer?: Customer | null
): EstimateTotals {
  const rate = typeof taxRate === "number" && taxRate >= 0 ? taxRate : 0.08;

  const garmentRows = buildGarmentRows(order, pricingMatrix);
  const decorationRows = buildDecorationRows(order, pricingMatrix);
  const feeRows = buildFeeRows(order, customer, pricingMatrix);
  const rows = [...garmentRows, ...decorationRows, ...feeRows];

  let garmentSubtotal = round2(
    garmentRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );
  let decorationSubtotal = round2(
    decorationRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );
  let feesSubtotal = round2(
    feeRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );

  let subtotal = round2(garmentSubtotal + decorationSubtotal + feesSubtotal);
  if (subtotal <= 0) {
    subtotal = round2(order.subtotal || 0);
    garmentSubtotal = subtotal;
    decorationSubtotal = 0;
    feesSubtotal = 0;
  }

  const tax = round2(subtotal * rate);
  const total = round2(subtotal + tax);
  const paid = round2(order.paid || 0);
  const balance = round2(total - paid);

  return {
    rows,
    garmentSubtotal,
    decorationSubtotal,
    feesSubtotal,
    subtotal,
    taxRate: rate,
    tax,
    total,
    paid,
    balance,
  };
}

/** Display/payment fields using live garment + decoration estimate math. */
export function resolveOrderFinancials(
  order: Order,
  taxRate: number,
  pricingMatrix?: PricingMatrix,
  customer?: Customer | null
) {
  const totals = computeEstimateTotals(order, taxRate, pricingMatrix, customer);
  return {
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paid: totals.paid,
    balance: totals.balance,
  };
}

/**
 * Invoice totals using produced goods quantities.
 * Garment and decoration lines scale with produced pcs; setup-style fees stay as estimate.
 */
export function computeInvoiceTotals(
  order: Order,
  taxRate: number,
  pricingMatrix?: PricingMatrix,
  customer?: Customer | null
): EstimateTotals {
  const billingOrder = orderWithProducedQuantities(order);
  return computeEstimateTotals(
    billingOrder,
    taxRate,
    pricingMatrix,
    customer
  );
}

export function invoiceReadyForBilling(order: Order): boolean {
  const produced = mergeOrderProducedGoods(order);
  return produced.lines.length > 0 && producedGoodsAreRecorded(produced);
}
