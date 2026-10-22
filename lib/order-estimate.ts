import type { Customer, LineItem, Order, SizeBreakdown } from "@/types";
import type { PricingMatrix } from "@/lib/shop-settings";
import {
  resolveOrderPricingHighlights,
  formatPricingHighlightDetail,
} from "@/lib/pricing-matrix-lookup";
import { buildFeeEstimateRows } from "@/lib/order-contract-fees";
import { formatBrandProductName } from "@/lib/format-product-name";
import {
  lineItemIsShopPurchased,
  resolveLineItemCustomerUnitPrice,
  shouldShowBlankPricing,
} from "@/lib/blank-pricing";
import {
  mergeOrderProducedGoods,
  orderWithProducedQuantities,
  producedGoodsAreRecorded,
} from "@/lib/order-produced-goods";
import {
  asShopPricingSource,
  type ShopPricingSource,
} from "@/lib/shop-pricing";
import {
  PAYMENT_SURCHARGE_ROW_ID,
  resolvePaymentSurcharge,
  resolvePaymentSurchargeAmount,
} from "@/lib/order-payment-surcharge";

/** Effective matrix and/or full shop settings (for finishing + rate sheets). */
export type EstimatePricingInput = PricingMatrix | ShopPricingSource;

export type EstimateRowKind = "garment" | "decoration" | "fee";

export type EstimateRow = {
  id: string;
  kind: EstimateRowKind;
  description: string;
  /** Sizes for garments; tier / color info for decoration */
  detail: string;
  /** Blank label for the estimate table, e.g. "#CSSP Pullover / Black" */
  garmentInfo?: string;
  /** Compact size break, e.g. "S 10 · M 28 · L 40" */
  sizeBreak?: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  lineItem?: LineItem;
  /** Decoration job that owns this matrix row */
  jobId?: string | null;
  /** Blanks linked to the decoration job */
  lineItemIds?: string[];
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

/** Shop default, unless the order or customer opts out of tax. */
export function resolveOrderTaxRate(
  order: Order,
  shopTaxRate: number,
  customer?: Customer | null
): number {
  if (customer?.taxExempt) return 0;
  if (order.taxEnabled === false) return 0;
  const candidate =
    typeof order.taxRate === "number" ? order.taxRate : shopTaxRate;
  return Number.isFinite(candidate) ? Math.min(1, Math.max(0, candidate)) : 0;
}

export function lineItemPieceCount(item: LineItem): number {
  return (item.sizes || []).reduce((sum, row) => sum + (row.quantity || 0), 0);
}

/** Order-facing garment title — custom description, else brand + product. */
export function resolveLineItemProductDescription(item: LineItem): string {
  const custom = String(item.description || "").trim();
  if (custom) return custom;
  return (
    formatBrandProductName(item.brand, item.productName).trim() || "Blank"
  );
}

export function lineItemDescription(item: LineItem): string {
  return [resolveLineItemProductDescription(item), item.color]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" · ");
}

/** Customer-facing blank label, e.g. "#CSSP Pullover Hoodie / Black". */
export function formatEstimateGarmentInfo(item: LineItem): string {
  const part = String(item.supplierPartNumber || item.productKey || "").trim();
  const name = resolveLineItemProductDescription(item);
  const color = String(item.color || "").trim();
  const head = part ? `#${part} ${name}` : name;
  return color ? `${head} / ${color}` : head;
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

/** Compact size break, e.g. "S 10 · M 28 · L 40". */
export function formatEstimateSizeBreak(item: LineItem): string {
  return sortSizeBreakdowns(item.sizes || [])
    .filter((row) => (row.quantity || 0) > 0)
    .map((row) => `${row.size} ${row.quantity}`)
    .join(" · ");
}

function lineItemsForDecorationRow(
  order: Order,
  entry: { jobId?: string | null; lineItemIds?: string[] }
): LineItem[] {
  const all = order.lineItems || [];
  if (!all.length) return [];
  const ids = Array.isArray(entry.lineItemIds) ? entry.lineItemIds : [];
  if (ids.length) {
    const idSet = new Set(ids.map(String));
    const matched = all.filter((item) => idSet.has(String(item.id)));
    if (matched.length) return matched;
  }
  if (entry.jobId) {
    const job = (order.jobs || []).find((j) => j.id === entry.jobId);
    if (job?.lineItemIds?.length) {
      const idSet = new Set(job.lineItemIds.map(String));
      const matched = all.filter((item) => idSet.has(String(item.id)));
      if (matched.length) return matched;
    }
  }
  return all;
}

function buildGarmentRows(
  order: Order,
  pricingMatrix?: PricingMatrix
): EstimateRow[] {
  if (!shouldShowBlankPricing(order)) return [];

  const shopMarkup = pricingMatrix?.blankMarkupPercent ?? 0;
  const rows: EstimateRow[] = [];

  for (const lineItem of order.lineItems || []) {
    if (!lineItemIsShopPurchased(lineItem, order)) continue;

    const unitCost = resolveLineItemCustomerUnitPrice(lineItem, shopMarkup);
    const qty = lineItemPieceCount(lineItem);
    const garmentInfo = formatEstimateGarmentInfo(lineItem);
    const sizeBreak = formatEstimateSizeBreak(lineItem) || "—";

    rows.push({
      id: lineItem.id,
      kind: "garment",
      description: "Blank",
      detail: sizeBreak,
      garmentInfo,
      sizeBreak,
      qty,
      unitCost,
      lineTotal: round2(unitCost * qty),
      lineItem,
    });
  }

  return rows;
}

function buildDecorationRows(
  order: Order,
  pricingMatrix?: PricingMatrix
): EstimateRow[] {
  if (!pricingMatrix?.enabled) return [];

  const { highlights } = resolveOrderPricingHighlights(order, pricingMatrix);

  const rows: EstimateRow[] = [];

  for (const entry of highlights) {
    const blanks = lineItemsForDecorationRow(order, entry);
    const baseId = `decoration-${entry.methodId}-${entry.imprintLabel}-${entry.stepIndex}`;
    const description = `${entry.decoration} · ${entry.imprintLabel}`;
    const detail = formatPricingHighlightDetail(entry);
    const included = Boolean(entry.bundledIncluded);

    // One estimate line per blank so garment + size break stay readable.
    const targets = blanks.length > 0 ? blanks : [null];
    for (const blank of targets) {
      const qty = blank ? lineItemPieceCount(blank) : entry.pieceCount;
      const unitCost = entry.unitPrice;
      rows.push({
        id: blank ? `${baseId}-${blank.id}` : baseId,
        kind: "decoration",
        description,
        detail,
        garmentInfo: blank ? formatEstimateGarmentInfo(blank) : "—",
        sizeBreak: blank ? formatEstimateSizeBreak(blank) || "—" : "—",
        qty,
        unitCost,
        lineTotal: included ? 0 : round2(unitCost * qty),
        jobId: entry.jobId ?? null,
        lineItemIds: blank ? [blank.id] : entry.lineItemIds ?? [],
        pricingStepIndex: entry.stepIndex,
        decorationType: entry.decorationKey,
        ...(blank ? { lineItem: blank } : {}),
        ...(included ? { includedInBundle: true } : {}),
      });
    }
  }

  return rows;
}

function buildFeeRows(
  order: Order,
  customer?: Customer | null,
  shop?: EstimatePricingInput | null
): EstimateRow[] {
  return buildFeeEstimateRows(order, customer, shop).map((entry) => ({
    id: entry.id,
    kind: "fee" as const,
    description: entry.label,
    detail: entry.detail || (entry.source === "auto" ? "Additional fee" : ""),
    garmentInfo: entry.detail || "—",
    sizeBreak: "—",
    qty: entry.qty,
    unitCost: entry.unitPrice,
    lineTotal: round2(entry.qty * entry.unitPrice),
    source: entry.source,
    contractFeeId: entry.contractFeeId,
    feeCategory: entry.category,
  }));
}

function pricingMatrixFromInput(
  input?: EstimatePricingInput | null
): PricingMatrix {
  return asShopPricingSource(input).pricingMatrix;
}

/**
 * Mirrors the backend estimate math: garment costs plus decoration pricing from
 * the shop matrix when enabled, plus contract and manual fees (including
 * finishing services when productionDefaults are passed).
 */
export function computeEstimateTotals(
  order: Order,
  taxRate: number,
  pricingMatrixOrShop?: EstimatePricingInput | null,
  customer?: Customer | null
): EstimateTotals {
  const rate = resolveOrderTaxRate(order, taxRate, customer);
  const shop = asShopPricingSource(pricingMatrixOrShop);
  const pricingMatrix = pricingMatrixFromInput(pricingMatrixOrShop);

  const garmentRows = buildGarmentRows(order, pricingMatrix);
  const decorationRows = buildDecorationRows(order, pricingMatrix);
  const feeRows = buildFeeRows(order, customer, shop);

  let garmentSubtotal = round2(
    garmentRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );
  let decorationSubtotal = round2(
    decorationRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );
  let feesSubtotal = round2(
    feeRows.reduce((sum, row) => sum + row.lineTotal, 0)
  );

  const baseBeforeSurcharge = round2(
    garmentSubtotal + decorationSubtotal + feesSubtotal
  );
  const surcharge = resolvePaymentSurcharge(order);
  const surchargeAmount = resolvePaymentSurchargeAmount(
    surcharge,
    baseBeforeSurcharge
  );
  const surchargeRows: EstimateRow[] =
    surcharge?.enabled && surchargeAmount > 0
      ? [
          {
            id: PAYMENT_SURCHARGE_ROW_ID,
            kind: "fee",
            description: surcharge.label || "Payment processing surcharge",
            detail: `${surcharge.percent}% of estimate subtotal`,
            garmentInfo: `${surcharge.percent}% of estimate subtotal`,
            sizeBreak: "—",
            qty: 1,
            unitCost: surchargeAmount,
            lineTotal: surchargeAmount,
            source: "manual",
            feeCategory: "other",
          },
        ]
      : [];

  if (surchargeAmount > 0) {
    feesSubtotal = round2(feesSubtotal + surchargeAmount);
  }

  const rows = [
    ...garmentRows,
    ...decorationRows,
    ...feeRows,
    ...surchargeRows,
  ];

  let subtotal = round2(garmentSubtotal + decorationSubtotal + feesSubtotal);
  // Do not fall back to stored order.subtotal — that leaves a stale total on
  // empty orders after blanks/events/fees are cleared.
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

export type EstimatePerPieceCosts = {
  pieceCount: number;
  garmentsPerPiece: number;
  decorationPerPiece: number;
  feesPerPiece: number;
  /** Pre-tax all-in per piece (what shops usually quote). */
  subtotalPerPiece: number;
  /** Tax-inclusive all-in per piece. */
  totalPerPiece: number;
};

/** Spread estimate totals across garment pieces for an all-in per-piece view. */
export function computeEstimatePerPieceCosts(
  totals: EstimateTotals,
  pieceCount: number
): EstimatePerPieceCosts | null {
  const pieces = Math.max(0, Math.floor(pieceCount));
  if (pieces <= 0 || totals.subtotal <= 0) return null;

  const per = (amount: number) => round2(amount / pieces);

  return {
    pieceCount: pieces,
    garmentsPerPiece: per(totals.garmentSubtotal),
    decorationPerPiece: per(totals.decorationSubtotal),
    feesPerPiece: per(totals.feesSubtotal),
    subtotalPerPiece: per(totals.subtotal),
    totalPerPiece: per(totals.total),
  };
}

/** Display/payment fields using live garment + decoration estimate math. */
export function resolveOrderFinancials(
  order: Order,
  taxRate: number,
  pricingMatrixOrShop?: EstimatePricingInput | null,
  customer?: Customer | null
) {
  const totals = computeEstimateTotals(
    order,
    taxRate,
    pricingMatrixOrShop,
    customer
  );
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
  pricingMatrixOrShop?: EstimatePricingInput | null,
  customer?: Customer | null
): EstimateTotals {
  const billingOrder = orderWithProducedQuantities(order);
  return computeEstimateTotals(
    billingOrder,
    taxRate,
    pricingMatrixOrShop,
    customer
  );
}

export function invoiceReadyForBilling(order: Order): boolean {
  const produced = mergeOrderProducedGoods(order);
  return produced.lines.length > 0 && producedGoodsAreRecorded(produced);
}
