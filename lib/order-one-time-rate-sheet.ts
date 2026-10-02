import type { PricingMethod, PricingMatrix } from "@/lib/shop-settings";
import {
  listCustomerRateSheets,
} from "@/lib/customer-pricing";
import {
  asShopPricingSource,
  findShopRateSheetById,
  isShopRateSheetId,
  listShopRateSheets,
  mergeShopDecorationMethods,
  type ShopPricingSource,
} from "@/lib/shop-pricing";
import type {
  Customer,
  CustomerContractFee,
  Order,
  OrderOneTimeRateSheet,
} from "@/types";

/** Sentinel rate sheet id for an order-scoped one-time pricing override. */
export const ONE_TIME_RATE_SHEET_ID = "one-time";

export function isOneTimeRateSheetId(sheetId?: string | null): boolean {
  return sheetId === ONE_TIME_RATE_SHEET_ID;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function roundMoney(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function scalePricingMethods(
  methods: PricingMethod[],
  adjustPercent: number
): PricingMethod[] {
  const parsed = Number(adjustPercent);
  if (!Number.isFinite(parsed) || parsed === 0) {
    return cloneJson(methods);
  }
  const factor = 1 + parsed / 100;
  return methods.map((method) => ({
    ...method,
    rows: (method.rows ?? []).map((row) => ({
      ...row,
      prices: (row.prices ?? []).map((price) =>
        roundMoney(Number(price || 0) * factor)
      ),
    })),
  }));
}

export function normalizeDecorationRateAdjustPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(500, Math.max(-90, Math.round(parsed * 100) / 100));
}

export function normalizeBlankMarkupPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(500, Math.max(0, Math.round(parsed * 100) / 100));
}

export type OneTimeBaseSnapshot = {
  id: string | null;
  name: string;
  blankMarkupPercent: number;
  methods: PricingMethod[];
  contractFees: CustomerContractFee[];
};

export function resolveOneTimeBaseSnapshot(
  settings: ShopPricingSource | PricingMatrix | null | undefined,
  customer: Customer | null | undefined,
  baseSheetId: string | null | undefined
): OneTimeBaseSnapshot {
  const source = asShopPricingSource(settings);
  const shopSheets = listShopRateSheets(source);
  const customerSheets = listCustomerRateSheets(customer);
  const shopDefault =
    shopSheets.find((sheet) => sheet.isDefault) ?? shopSheets[0] ?? null;
  const fallbackBlank = shopDefault?.blankMarkupPercent ?? 0;

  if (baseSheetId && isShopRateSheetId(source, baseSheetId)) {
    const sheet = findShopRateSheetById(source, baseSheetId);
    if (sheet) {
      const methods = mergeShopDecorationMethods(sheet, shopSheets);
      return {
        id: sheet.id,
        name: sheet.name,
        blankMarkupPercent: sheet.blankMarkupPercent ?? 0,
        methods: cloneJson(methods),
        contractFees: cloneJson(sheet.contractFees ?? []),
      };
    }
  }

  if (baseSheetId) {
    const sheet = customerSheets.find((entry) => entry.id === baseSheetId);
    if (sheet) {
      return {
        id: sheet.id,
        name: sheet.name,
        blankMarkupPercent: fallbackBlank,
        methods: cloneJson(sheet.methods ?? []),
        contractFees: cloneJson(sheet.contractFees ?? []),
      };
    }
  }

  if (shopDefault) {
    const methods = mergeShopDecorationMethods(shopDefault, shopSheets);
    return {
      id: shopDefault.id,
      name: shopDefault.name,
      blankMarkupPercent: shopDefault.blankMarkupPercent ?? 0,
      methods: cloneJson(methods),
      contractFees: cloneJson(shopDefault.contractFees ?? []),
    };
  }

  const matrix = source.pricingMatrix;
  return {
    id: null,
    name: "Shop standard",
    blankMarkupPercent: matrix?.blankMarkupPercent ?? 0,
    methods: cloneJson(matrix?.methods ?? []),
    contractFees: cloneJson(matrix?.contractFees ?? []),
  };
}

export function buildOneTimeRateSheet(options: {
  baseSheetId?: string | null;
  name?: string;
  blankMarkupPercent?: number;
  decorationRateAdjustPercent?: number;
  settings?: ShopPricingSource | PricingMatrix | null;
  customer?: Customer | null;
  existing?: OrderOneTimeRateSheet | null;
}): OrderOneTimeRateSheet {
  const now = new Date().toISOString();
  const base = resolveOneTimeBaseSnapshot(
    options.settings,
    options.customer,
    options.baseSheetId ?? options.existing?.baseSheetId ?? null
  );
  const name =
    (typeof options.name === "string" && options.name.trim()
      ? options.name.trim()
      : options.existing?.name?.trim()) || "One-time override";

  return {
    id: ONE_TIME_RATE_SHEET_ID,
    name: name.slice(0, 120),
    baseSheetId: base.id,
    baseSheetName: base.name,
    blankMarkupPercent: normalizeBlankMarkupPercent(
      options.blankMarkupPercent ??
        options.existing?.blankMarkupPercent ??
        base.blankMarkupPercent
    ),
    decorationRateAdjustPercent: normalizeDecorationRateAdjustPercent(
      options.decorationRateAdjustPercent ??
        options.existing?.decorationRateAdjustPercent ??
        0
    ),
    methods: base.methods,
    contractFees: base.contractFees,
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function applyOneTimeRateSheetEdits(
  sheet: OrderOneTimeRateSheet,
  edits: {
    name?: string;
    blankMarkupPercent?: number;
    decorationRateAdjustPercent?: number;
    methods?: PricingMethod[];
    contractFees?: CustomerContractFee[];
    baseSheetId?: string | null;
    baseSheetName?: string | null;
  }
): OrderOneTimeRateSheet {
  return {
    ...sheet,
    name:
      typeof edits.name === "string" && edits.name.trim()
        ? edits.name.trim().slice(0, 120)
        : sheet.name,
    blankMarkupPercent:
      edits.blankMarkupPercent !== undefined
        ? normalizeBlankMarkupPercent(edits.blankMarkupPercent)
        : sheet.blankMarkupPercent,
    decorationRateAdjustPercent:
      edits.decorationRateAdjustPercent !== undefined
        ? normalizeDecorationRateAdjustPercent(edits.decorationRateAdjustPercent)
        : sheet.decorationRateAdjustPercent ?? 0,
    methods:
      edits.methods !== undefined ? cloneJson(edits.methods) : sheet.methods,
    contractFees:
      edits.contractFees !== undefined
        ? cloneJson(edits.contractFees)
        : sheet.contractFees,
    baseSheetId:
      edits.baseSheetId !== undefined ? edits.baseSheetId : sheet.baseSheetId,
    baseSheetName:
      edits.baseSheetName !== undefined
        ? edits.baseSheetName
        : sheet.baseSheetName,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveOneTimePricingMatrix(
  order?: Order | null
):
  | (PricingMatrix & {
      rateSheetId: string;
      rateSheetName: string;
      usingShopPricing: false;
    })
  | null {
  if (!isOneTimeRateSheetId(order?.selectedRateSheetId)) return null;
  const sheet = order?.estimateOneTimeRateSheet;
  if (!sheet) return null;

  // Prefer stored unit costs as the source of truth. Legacy overrides may still
  // carry a decorationRateAdjustPercent baked against an older base snapshot.
  const methods = scalePricingMethods(
    sheet.methods ?? [],
    sheet.decorationRateAdjustPercent ?? 0
  );

  return {
    enabled: methods.length > 0 || (sheet.contractFees?.length ?? 0) > 0,
    methods,
    blankMarkupPercent: normalizeBlankMarkupPercent(sheet.blankMarkupPercent),
    contractFees: sheet.contractFees ?? [],
    rateSheetId: ONE_TIME_RATE_SHEET_ID,
    rateSheetName: sheet.name || "One-time override",
    usingShopPricing: false,
  };
}

/** Editable matrix view — bake any legacy % adjust into unit prices once. */
export function oneTimeSheetAsEditableMatrix(
  sheet: OrderOneTimeRateSheet
): PricingMatrix {
  return {
    enabled: true,
    methods: scalePricingMethods(
      sheet.methods ?? [],
      sheet.decorationRateAdjustPercent ?? 0
    ),
    blankMarkupPercent: normalizeBlankMarkupPercent(sheet.blankMarkupPercent),
    contractFees: sheet.contractFees ?? [],
  };
}

export function oneTimeRateSheetSummary(sheet: OrderOneTimeRateSheet): string {
  const methodCount = (sheet.methods ?? []).filter(
    (method) => (method.rows?.length ?? 0) > 0
  ).length;
  const feeCount = (sheet.contractFees ?? []).filter(
    (fee) => fee.enabled !== false
  ).length;
  const parts: string[] = [];
  if (sheet.baseSheetName) {
    parts.push(`From ${sheet.baseSheetName}`);
  }
  if (methodCount > 0) {
    parts.push(
      `${methodCount} method${methodCount !== 1 ? "s" : ""}`
    );
  }
  if (feeCount > 0) {
    parts.push(`${feeCount} fee${feeCount !== 1 ? "s" : ""}`);
  }
  const adjust = sheet.decorationRateAdjustPercent ?? 0;
  if (adjust !== 0) {
    parts.push(
      `Decoration ${adjust > 0 ? "+" : ""}${adjust}%`
    );
  }
  return parts.join(" · ") || "Custom pricing for this order";
}
