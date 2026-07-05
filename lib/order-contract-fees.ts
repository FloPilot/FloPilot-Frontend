import type {
  Customer,
  CustomerContractFee,
  CustomerNegotiatedRateSheet,
  Order,
  OrderEstimateAdjustment,
  OrderEstimateFeeCategory,
} from "@/types";
import { resolveRateSheetForOrder, SHOP_PRICING_SHEET_ID } from "@/lib/customer-pricing";
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

export function computeAutoContractFees(
  order: Order,
  rateSheet: CustomerNegotiatedRateSheet | null | undefined
): OrderEstimateAdjustment[] {
  if (!rateSheet) return [];

  const fees = (rateSheet.contractFees ?? []).filter((fee) => fee.enabled !== false);
  const excluded = new Set(order.excludedContractFeeIds ?? []);
  const pieceCount = countOrderPieces(order);
  const imprintCount = countBillableImprints(order);
  const rows: OrderEstimateAdjustment[] = [];

  for (const fee of fees) {
    if (excluded.has(fee.id)) continue;

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
      if (extra <= 0) continue;

      const unitPrice = resolveTierAmount(
        fee.quantityTiers,
        pieceCount,
        fee.amount || 0
      );
      rows.push({
        id: `auto-${fee.id}`,
        label: fee.label || "Additional imprint location",
        detail: `${extra} location${extra !== 1 ? "s" : ""} beyond ${included} included`,
        qty: extra,
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
  customer?: Customer | null
): OrderEstimateAdjustment[] {
  const rateSheet = resolveRateSheetForOrder(customer, order);
  const autoRows = computeAutoContractFees(order, rateSheet);
  return mergeEstimateAdjustments(order, autoRows);
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
