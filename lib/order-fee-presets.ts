import type { Customer, CustomerContractFee, Order, OrderEstimateFeeCategory } from "@/types";
import type { PricingMatrix } from "@/lib/shop-settings";
import {
  listCustomerRateSheets,
  resolveRateSheetForOrder,
} from "@/lib/customer-pricing";
import {
  asShopPricingSource,
  isShopRateSheetId,
  listShopRateSheets,
  type ShopPricingSource,
} from "@/lib/shop-pricing";
import {
  countOrderPieces,
  resolveTierAmount,
} from "@/lib/order-contract-fees";
import {
  autoFeeCategoryFromContract,
  defaultLabelForFeeCategory,
  feeCategoryLabel,
} from "@/lib/estimate-fee-categories";
import { formatCurrency } from "@/lib/format";

export const CUSTOM_FEE_PRESET_VALUE = "__custom_fee__";

export type OrderFeePreset = {
  value: string;
  sourceName: string;
  label: string;
  category: OrderEstimateFeeCategory;
  feeLabel: string;
  qty: number;
  unitPrice: number;
  detail?: string;
  contractFeeId?: string;
};

function contractFeeCategory(fee: CustomerContractFee): OrderEstimateFeeCategory {
  if (fee.kind === "setup") return "setup";
  if (fee.kind === "additional_location") return "decoration";
  if (fee.kind === "custom") {
    const label = (fee.label || "").toLowerCase();
    if (label.includes("finish") || label.includes("fold") || label.includes("bag")) {
      return "finishing";
    }
    return "other";
  }
  return autoFeeCategoryFromContract(fee.kind);
}

function resolveContractFeePricing(
  fee: CustomerContractFee,
  order: Order
): { qty: number; unitPrice: number; detail?: string } {
  const pieceCount = countOrderPieces(order);

  if (fee.kind === "additional_location") {
    const unitPrice = resolveTierAmount(
      fee.quantityTiers,
      pieceCount,
      fee.amount || 0
    );
    return {
      qty: 1,
      unitPrice,
      detail: `Per extra location · ${pieceCount} pcs on order`,
    };
  }

  if (fee.chargeMode === "per_piece") {
    return {
      qty: Math.max(1, pieceCount),
      unitPrice: fee.amount || 0,
      detail: fee.notes,
    };
  }

  return {
    qty: 1,
    unitPrice: fee.amount || 0,
    detail: fee.notes,
  };
}

function presetsFromContractFees(
  fees: CustomerContractFee[] | undefined,
  sourceName: string,
  sourceKey: string,
  order: Order
): OrderFeePreset[] {
  const rows: OrderFeePreset[] = [];

  for (const fee of fees ?? []) {
    if (fee.enabled === false) continue;
    if ((fee.amount || 0) <= 0 && fee.kind !== "additional_location") continue;

    const category = contractFeeCategory(fee);
    const pricing = resolveContractFeePricing(fee, order);
    const amountLabel =
      fee.kind === "additional_location"
        ? `${formatCurrency(pricing.unitPrice)}/loc`
        : pricing.qty > 1
          ? `${pricing.qty} × ${formatCurrency(pricing.unitPrice)}`
          : formatCurrency(pricing.unitPrice);

    rows.push({
      value: `${sourceKey}:${fee.id}`,
      sourceName,
      label: `${fee.label || defaultLabelForFeeCategory(category)} — ${amountLabel}`,
      category,
      feeLabel: fee.label || defaultLabelForFeeCategory(category),
      qty: pricing.qty,
      unitPrice: pricing.unitPrice,
      detail: pricing.detail,
      contractFeeId: fee.id,
    });
  }

  return rows;
}

export function buildOrderFeePresets({
  customer,
  shopMatrix,
  order,
  selectedRateSheetId,
  shopSettings,
}: {
  customer?: Customer | null;
  shopMatrix: PricingMatrix;
  order: Order;
  selectedRateSheetId?: string | null;
  shopSettings?: ShopPricingSource | null;
}): OrderFeePreset[] {
  const presets: OrderFeePreset[] = [];
  const seen = new Set<string>();
  const source = asShopPricingSource(shopSettings ?? shopMatrix);

  const pushUnique = (rows: OrderFeePreset[]) => {
    for (const row of rows) {
      const key = `${row.contractFeeId ?? row.value}:${row.unitPrice}:${row.qty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      presets.push(row);
    }
  };

  const rateSheets = listCustomerRateSheets(customer);
  const activeSheet = resolveRateSheetForOrder(customer, order, source);
  const prioritizedSheetIds = [
    selectedRateSheetId &&
    !isShopRateSheetId(source, selectedRateSheetId) &&
    selectedRateSheetId,
    activeSheet?.id,
    ...rateSheets.filter((sheet) => sheet.isDefault).map((sheet) => sheet.id),
  ].filter((id): id is string => Boolean(id));

  const orderedSheets = [
    ...prioritizedSheetIds
      .map((id) => rateSheets.find((sheet) => sheet.id === id))
      .filter(Boolean),
    ...rateSheets.filter(
      (sheet) => !prioritizedSheetIds.includes(sheet.id)
    ),
  ].filter(
    (sheet, index, array) =>
      sheet && array.findIndex((entry) => entry?.id === sheet.id) === index
  ) as typeof rateSheets;

  for (const sheet of orderedSheets) {
    pushUnique(
      presetsFromContractFees(
        sheet.contractFees,
        sheet.name,
        `customer:${sheet.id}`,
        order
      )
    );
  }

  for (const sheet of listShopRateSheets(source)) {
    pushUnique(
      presetsFromContractFees(
        sheet.contractFees,
        sheet.name,
        `shop:${sheet.id}`,
        order
      )
    );
  }

  for (const item of customer?.negotiatedPricing?.items ?? []) {
    if (!item.label || item.unitPrice == null) continue;
    const category: OrderEstimateFeeCategory = item.decoration
      ? "decoration"
      : "other";
    pushUnique([
      {
        value: `legacy:${item.id}`,
        sourceName: "Account rates",
        label: `${item.label} — ${formatCurrency(item.unitPrice)}`,
        category,
        feeLabel: item.label,
        qty: 1,
        unitPrice: item.unitPrice,
        detail: item.detail,
      },
    ]);
  }

  return presets;
}

export function findOrderFeePreset(
  presets: OrderFeePreset[],
  value: string
): OrderFeePreset | undefined {
  return presets.find((preset) => preset.value === value);
}

export function presetOptionsForSelect(presets: OrderFeePreset[]) {
  return presets.map((preset) => ({
    value: preset.value,
    label: `[${preset.sourceName}] ${preset.label} · ${feeCategoryLabel(preset.category)}`,
  }));
}
