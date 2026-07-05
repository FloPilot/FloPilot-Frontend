import type { PricingMatrix } from "@/lib/shop-settings";
import type { Customer, CustomerNegotiatedRateSheet, Order } from "@/types";

export const SHOP_PRICING_SHEET_ID = "shop";

export function createRateSheetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sortRateSheets(
  sheets: CustomerNegotiatedRateSheet[]
): CustomerNegotiatedRateSheet[] {
  return [...sheets].sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return (a.name || "").localeCompare(b.name || "");
    }
    return a.isDefault ? -1 : 1;
  });
}

export function emptyRateSheet(name = "Negotiated rates"): CustomerNegotiatedRateSheet {
  const now = new Date().toISOString();
  return {
    id: createRateSheetId(),
    name,
    notes: "",
    isDefault: false,
    enabled: true,
    methods: [],
    contractFees: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function listCustomerRateSheets(
  customer?: Customer | null
): CustomerNegotiatedRateSheet[] {
  return sortRateSheets(
    (customer?.negotiatedPricing?.rateSheets ?? []).filter(
      (sheet) => sheet.enabled !== false
    )
  );
}

export function resolveRateSheetForOrder(
  customer?: Customer | null,
  order?: Order | null
): CustomerNegotiatedRateSheet | null {
  const sheets = listCustomerRateSheets(customer);
  if (sheets.length === 0) return null;
  if (order?.selectedRateSheetId === SHOP_PRICING_SHEET_ID) return null;

  if (order?.selectedRateSheetId) {
    const selected = sheets.find((sheet) => sheet.id === order.selectedRateSheetId);
    if (selected) return selected;
  }

  return sheets.find((sheet) => sheet.isDefault) ?? sheets[0] ?? null;
}

export function resolveCustomerPricingMatrix(
  customer?: Customer | null,
  order?: Order | null
): (PricingMatrix & { rateSheetId?: string; rateSheetName?: string }) | null {
  const sheets = sortRateSheets(
    (customer?.negotiatedPricing?.rateSheets ?? []).filter(
      (sheet) => sheet.enabled !== false && sheet.methods.length > 0
    )
  );
  if (sheets.length === 0) return null;

  const selected =
    resolveRateSheetForOrder(customer, order) ??
    sheets.find((sheet) => sheet.isDefault) ??
    sheets[0];

  if (!selected || selected.methods.length === 0) return null;

  return {
    enabled: true,
    methods: selected.methods,
    rateSheetId: selected.id,
    rateSheetName: selected.name,
  };
}

export function resolveEffectivePricingMatrix(
  shopMatrix: PricingMatrix,
  customer?: Customer | null,
  order?: Order | null
): PricingMatrix & {
  rateSheetId?: string;
  rateSheetName?: string;
  usingShopPricing?: boolean;
} {
  if (order?.selectedRateSheetId === SHOP_PRICING_SHEET_ID) {
    return { ...shopMatrix, usingShopPricing: true };
  }

  const customerMatrix = resolveCustomerPricingMatrix(customer, order);
  if (customerMatrix?.enabled && customerMatrix.methods.length > 0) {
    return customerMatrix;
  }
  return shopMatrix;
}

export function customerHasNegotiatedPricing(customer?: Customer | null): boolean {
  return Boolean(resolveCustomerPricingMatrix(customer));
}

export function countRateSheetMethods(sheet: CustomerNegotiatedRateSheet): number {
  return sheet.methods.filter((method) => method.rows.length > 0).length;
}

export function rateSheetSummary(sheet: CustomerNegotiatedRateSheet): string {
  const methodCount = countRateSheetMethods(sheet);
  const feeCount = (sheet.contractFees ?? []).filter((fee) => fee.enabled).length;
  if (methodCount === 0 && feeCount === 0) return "No pricing configured yet";

  const parts: string[] = [];
  if (methodCount > 0) {
    const names = sheet.methods
      .filter((method) => method.rows.length > 0)
      .map((method) => method.name || "Untitled")
      .slice(0, 2);
    const suffix =
      methodCount > names.length ? ` +${methodCount - names.length} more` : "";
    parts.push(
      `${methodCount} method${methodCount !== 1 ? "s" : ""} · ${names.join(", ")}${suffix}`
    );
  }
  if (feeCount > 0) {
    parts.push(`${feeCount} contract fee${feeCount !== 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

export function defaultSelectedRateSheetId(
  customer?: Customer | null
): string | null {
  const sheet = resolveRateSheetForOrder(customer, null);
  return sheet?.id ?? null;
}
