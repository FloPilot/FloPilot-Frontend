import type {
  PricingMatrix,
  ShopPricingRateSheet,
  ShopSettings,
} from "@/lib/shop-settings";
import {
  matrixFromShopPricingRateSheet,
  normalizeShopPricingRateSheetList,
} from "@/lib/shop-settings";
import type { Order } from "@/types";

export type { ShopPricingRateSheet };

/** Sentinel for "use the shop's default rate sheet" on an order. */
export const SHOP_PRICING_SHEET_ID = "shop";

function createShopSheetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `shop-rate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ShopPricingSource = Pick<
  ShopSettings,
  "pricingMatrix" | "pricingRateSheets"
>;

export function emptyShopRateSheet(
  name = "Shop standard"
): ShopPricingRateSheet {
  const now = new Date().toISOString();
  return {
    id: createShopSheetId(),
    name,
    notes: "",
    isDefault: false,
    enabled: true,
    methods: [],
    contractFees: [],
    blankMarkupPercent: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function sortShopRateSheets(
  sheets: ShopPricingRateSheet[]
): ShopPricingRateSheet[] {
  return [...sheets].sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return (a.name || "").localeCompare(b.name || "");
    }
    return a.isDefault ? -1 : 1;
  });
}

export function ensureSingleShopDefault(
  sheets: ShopPricingRateSheet[]
): ShopPricingRateSheet[] {
  if (sheets.length === 0) return sheets;
  const enabled = sheets.filter((sheet) => sheet.enabled !== false);
  const pool = enabled.length > 0 ? enabled : sheets;
  const defaultSheet = sheets.find((sheet) => sheet.isDefault) ?? pool[0];
  return sheets.map((sheet) => ({
    ...sheet,
    isDefault: sheet.id === defaultSheet.id,
  }));
}

export function matrixFromShopSheet(sheet: ShopPricingRateSheet): PricingMatrix {
  return matrixFromShopPricingRateSheet(sheet);
}

export function shopSheetFromMatrix(
  matrix: PricingMatrix,
  options?: { id?: string; name?: string; isDefault?: boolean }
): ShopPricingRateSheet {
  const now = new Date().toISOString();
  return {
    id: options?.id || createShopSheetId(),
    name: options?.name || "Shop standard",
    notes: "",
    isDefault: options?.isDefault !== false,
    enabled: true,
    methods: matrix.methods ?? [],
    contractFees: matrix.contractFees ?? [],
    blankMarkupPercent: matrix.blankMarkupPercent ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function asShopPricingSource(
  shop: PricingMatrix | ShopPricingSource | null | undefined
): ShopPricingSource {
  if (shop && typeof shop === "object" && "pricingMatrix" in shop) {
    return shop;
  }
  return {
    pricingMatrix: (shop as PricingMatrix | null | undefined) ?? {
      enabled: false,
      methods: [],
      blankMarkupPercent: 0,
    },
    pricingRateSheets: undefined,
  };
}

export function listShopRateSheets(
  settings?: ShopPricingSource | null
): ShopPricingRateSheet[] {
  if (!settings) return [];
  const sheets = normalizeShopPricingRateSheetList(
    settings.pricingMatrix,
    settings.pricingRateSheets
  );
  return sortShopRateSheets(
    sheets.filter((sheet) => sheet.enabled !== false)
  );
}

export function isShopRateSheetId(
  settings: ShopPricingSource | null | undefined,
  sheetId?: string | null
): boolean {
  if (!sheetId) return false;
  if (sheetId === SHOP_PRICING_SHEET_ID) return true;
  return listShopRateSheets(settings).some((sheet) => sheet.id === sheetId);
}

export function findShopRateSheetById(
  settings?: ShopPricingSource | null,
  sheetId?: string | null
): ShopPricingRateSheet | null {
  if (!sheetId) return null;
  const sheets = listShopRateSheets(settings);
  if (sheetId === SHOP_PRICING_SHEET_ID) {
    return sheets.find((sheet) => sheet.isDefault) ?? sheets[0] ?? null;
  }
  return sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

export function resolveShopRateSheet(
  settings?: ShopPricingSource | null,
  order?: Order | null
): ShopPricingRateSheet | null {
  const sheets = listShopRateSheets(settings);
  if (sheets.length === 0) return null;

  const selectedId = order?.selectedRateSheetId;
  if (selectedId && isShopRateSheetId(settings, selectedId)) {
    return findShopRateSheetById(settings, selectedId);
  }

  return sheets.find((sheet) => sheet.isDefault) ?? sheets[0] ?? null;
}

export function resolveShopPricingMatrix(
  settings?: ShopPricingSource | null,
  order?: Order | null
): PricingMatrix & {
  rateSheetId?: string;
  rateSheetName?: string;
  usingShopPricing?: boolean;
} {
  const sheet = resolveShopRateSheet(settings, order);
  if (!sheet) {
    const matrix = settings?.pricingMatrix ?? {
      enabled: false,
      methods: [],
      blankMarkupPercent: 0,
    };
    return { ...matrix, usingShopPricing: true };
  }
  return {
    ...matrixFromShopSheet(sheet),
    rateSheetId: sheet.id,
    rateSheetName: sheet.name,
    usingShopPricing: true,
  };
}

export function shopRateSheetSummary(sheet: ShopPricingRateSheet): string {
  const methodCount = sheet.methods.filter((method) => method.rows.length > 0)
    .length;
  const feeCount = (sheet.contractFees ?? []).filter(
    (fee) => fee.enabled !== false
  ).length;
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
    parts.push(`${feeCount} fee${feeCount !== 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

export function countShopRateSheetMethods(sheet: ShopPricingRateSheet): number {
  return sheet.methods.filter((method) => method.rows.length > 0).length;
}
