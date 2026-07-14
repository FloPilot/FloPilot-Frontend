import type {
  Customer,
  CustomerContractFee,
  CustomerNegotiatedRateSheet,
  Order,
  OrderEstimateAdjustment,
  OrderEstimateFeeCategory,
} from "@/types";
import type { PricingMatrix } from "@/lib/shop-settings";
import { resolveRateSheetForOrder, SHOP_PRICING_SHEET_ID } from "@/lib/customer-pricing";
import {
  asShopPricingSource,
  isShopRateSheetId,
  resolveShopRateSheet,
  type ShopPricingSource,
} from "@/lib/shop-pricing";
import {
  autoFeeCategoryFromContract,
  defaultLabelForFeeCategory,
  normalizeFeeCategory,
} from "@/lib/estimate-fee-categories";

export { SHOP_PRICING_SHEET_ID };

export function createContractFeeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEstimateAdjustmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function countBillableImprints(order: Order): number {
  let count = 0;
  for (const job of order.jobs || []) {
    if (job.kind === "finishing") continue;
    for (const imprint of job.imprints || []) {
      if (imprint.decoration === "finishing") continue;
      count += 1;
    }
  }
  return count;
}

export function countOrderPieces(order: Order): number {
  let total = 0;
  for (const lineItem of order.lineItems || []) {
    for (const sizeRow of lineItem.sizes || []) {
      total += sizeRow.quantity || 0;
    }
  }
  return total;
}

export function resolveTierAmount(
  tiers: CustomerContractFee["quantityTiers"],
  pieceCount: number,
  fallback: number
): number {
  if (!tiers?.length) return fallback;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  for (const tier of sorted) {
    if (pieceCount >= tier.minQty) return tier.amount;
  }
  return fallback;
}

export function listEnabledContractFees(
  fees: CustomerContractFee[] | undefined | null
): CustomerContractFee[] {
  return (fees ?? []).filter((fee) => fee.enabled !== false);
}

export function resolveContractFeesForOrder(
  order: Order,
  customer?: Customer | null,
  shop?: PricingMatrix | ShopPricingSource | null
): CustomerContractFee[] {
  const source = asShopPricingSource(shop);
  const selectedId = order.selectedRateSheetId;

  if (selectedId && isShopRateSheetId(source, selectedId)) {
    const sheet = resolveShopRateSheet(source, order);
    return listEnabledContractFees(
      sheet?.contractFees ?? source.pricingMatrix?.contractFees
    );
  }

  const rateSheet = resolveRateSheetForOrder(customer, order, source);
  if (rateSheet) {
    return listEnabledContractFees(rateSheet.contractFees);
  }

  const defaultShop = resolveShopRateSheet(source, null);
  return listEnabledContractFees(
    defaultShop?.contractFees ?? source.pricingMatrix?.contractFees
  );
}

export function computeAutoContractFees(
  order: Order,
  fees: CustomerContractFee[] | null | undefined,
  options?: { includeExcluded?: boolean }
): OrderEstimateAdjustment[] {
  const enabledFees = listEnabledContractFees(fees);
  const excluded = new Set(order.excludedContractFeeIds ?? []);
  const pieceCount = countOrderPieces(order);
  const imprintCount = countBillableImprints(order);
  const rows: OrderEstimateAdjustment[] = [];
  const includeExcluded = options?.includeExcluded === true;

  for (const fee of enabledFees) {
    const isExcluded = excluded.has(fee.id);
    if (isExcluded && !includeExcluded) continue;

    if (fee.kind === "setup" && fee.chargeMode === "per_order") {
      rows.push({
        id: `auto-${fee.id}`,
        label: fee.label || "Setup fee",
        detail: fee.notes || "One-time setup",
        qty: 1,
        unitPrice: fee.amount || 0,
        source: "auto",
        category: "setup",
        contractFeeId: fee.id,
      });
      continue;
    }

    if (fee.kind === "additional_location") {
      const included = fee.includedLocations ?? 2;
      const extra = Math.max(0, imprintCount - included);
      if (extra <= 0) {
        if (!includeExcluded || !isExcluded) continue;
      }

      const unitPrice = resolveTierAmount(
        fee.quantityTiers,
        pieceCount,
        fee.amount || 0
      );
      rows.push({
        id: `auto-${fee.id}`,
        label: fee.label || "Additional imprint location",
        detail:
          extra > 0
            ? `${extra} location${extra !== 1 ? "s" : ""} beyond ${included} included`
            : `No extra locations beyond ${included} included`,
        qty: Math.max(extra, isExcluded ? 1 : 0) || 1,
        unitPrice,
        source: "auto",
        category: "decoration",
        contractFeeId: fee.id,
      });
      continue;
    }

    if (
      fee.kind === "custom" &&
      fee.chargeMode === "per_order" &&
      (fee.amount || 0) > 0
    ) {
      rows.push({
        id: `auto-${fee.id}`,
        label: fee.label || "Contract fee",
        detail: fee.notes,
        qty: 1,
        unitPrice: fee.amount || 0,
        source: "auto",
        category: autoFeeCategoryFromContract(fee.kind),
        contractFeeId: fee.id,
      });
    }
  }

  return rows;
}

export function mergeEstimateAdjustments(
  order: Order,
  autoRows: OrderEstimateAdjustment[]
): OrderEstimateAdjustment[] {
  const manual = (order.estimateAdjustments ?? [])
    .filter((row) => row.source === "manual")
    .map((row) =>
      normalizeEstimateAdjustment({
        ...row,
        source: "manual",
        category: row.category ?? "other",
      })
    );
  return [...autoRows, ...manual];
}

export function buildFeeEstimateRows(
  order: Order,
  customer?: Customer | null,
  shop?: PricingMatrix | ShopPricingSource | null
): OrderEstimateAdjustment[] {
  const fees = resolveContractFeesForOrder(order, customer, shop);
  const autoRows = computeAutoContractFees(order, fees);
  return mergeEstimateAdjustments(order, autoRows);
}

/** All enabled auto fees for UI, including ones currently skipped on the order. */
export function listAutoContractFeeCandidates(
  order: Order,
  customer?: Customer | null,
  shop?: PricingMatrix | ShopPricingSource | null
): OrderEstimateAdjustment[] {
  const fees = resolveContractFeesForOrder(order, customer, shop);
  return computeAutoContractFees(order, fees, { includeExcluded: true });
}

export function emptyManualAdjustment(
  category: OrderEstimateFeeCategory = "setup"
): OrderEstimateAdjustment {
  return {
    id: createEstimateAdjustmentId(),
    label: defaultLabelForFeeCategory(category),
    detail: "",
    qty: 1,
    unitPrice: 0,
    source: "manual",
    category,
  };
}

export function normalizeEstimateAdjustment(
  raw: Partial<OrderEstimateAdjustment>
): OrderEstimateAdjustment {
  const category = normalizeFeeCategory(raw.category, "other");
  return {
    id: raw.id || createEstimateAdjustmentId(),
    label: (raw.label || defaultLabelForFeeCategory(category)).trim(),
    detail: raw.detail?.trim() || undefined,
    qty: Math.max(1, Math.floor(Number(raw.qty) || 1)),
    unitPrice: Math.max(0, Number(raw.unitPrice) || 0),
    source: raw.source === "auto" ? "auto" : "manual",
    category,
    contractFeeId: raw.contractFeeId,
  };
}

export function defaultSetupFee(): CustomerContractFee {
  return {
    id: createContractFeeId(),
    kind: "setup",
    label: "Design setup",
    amount: 85,
    chargeMode: "per_order",
    enabled: false,
    notes: "One-time screen or art setup per order",
  };
}

export function defaultAdditionalLocationFee(): CustomerContractFee {
  return {
    id: createContractFeeId(),
    kind: "additional_location",
    label: "Additional imprint location",
    amount: 0.75,
    chargeMode: "per_location",
    includedLocations: 2,
    quantityTiers: [
      { minQty: 500, amount: 0.75 },
      { minQty: 288, amount: 0.85 },
      { minQty: 72, amount: 1.06 },
    ],
    enabled: false,
    notes: "Charged per location beyond included count",
  };
}

export function getSetupFee(
  sheet: CustomerNegotiatedRateSheet
): CustomerContractFee | undefined {
  return sheet.contractFees?.find((fee) => fee.kind === "setup");
}

export function getAdditionalLocationFee(
  sheet: CustomerNegotiatedRateSheet
): CustomerContractFee | undefined {
  return sheet.contractFees?.find((fee) => fee.kind === "additional_location");
}

export function getCustomContractFees(
  sheet: CustomerNegotiatedRateSheet
): CustomerContractFee[] {
  return (sheet.contractFees ?? []).filter((fee) => fee.kind === "custom");
}

export function upsertContractFee(
  sheet: CustomerNegotiatedRateSheet,
  fee: CustomerContractFee
): CustomerNegotiatedRateSheet {
  const existing = sheet.contractFees ?? [];
  const withoutKindDupes =
    fee.kind === "setup" || fee.kind === "additional_location"
      ? existing.filter((row) => row.kind !== fee.kind)
      : existing.filter((row) => row.id !== fee.id);

  return {
    ...sheet,
    contractFees: [...withoutKindDupes, fee],
  };
}
