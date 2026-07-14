export type SupplierProviderId = "ssActivewear";

export type SupplierIntegrationStatus =
  | "connected"
  | "disconnected"
  | "error";

export type SupplierCredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
  required?: boolean;
};

export type SupplierIntegration = {
  provider: SupplierProviderId | string;
  name: string;
  description?: string;
  status: SupplierIntegrationStatus;
  accountNumber?: string;
  connectedAt?: string | null;
  lastVerifiedAt?: string | null;
  connectedBy?: string | null;
  lastError?: string | null;
  hasCredentials?: boolean;
  credentialFields?: SupplierCredentialField[];
  docsUrl?: string;
};

export type SupplierStyleSummary = {
  provider: SupplierProviderId;
  styleId: number | null;
  partNumber: string;
  brandName: string;
  styleName: string;
  title: string;
  baseCategory: string;
  description?: string;
  categories?: string[];
  catalogPageNumber?: string;
  newStyle?: boolean;
  sustainableStyle?: boolean;
  styleImageUrl: string;
  styleImageLargeUrl?: string;
  brandImageUrl: string;
};

export type SupplierBrand = {
  provider: SupplierProviderId;
  brandId: number | null;
  name: string;
  imageUrl: string;
  noeRetailing?: boolean;
};

export type SupplierWarehouseStock = {
  warehouseAbbr: string;
  skuId: number | null;
  qty: number;
  closeout?: boolean;
  dropship?: boolean;
  returnable?: boolean;
};

export type SupplierSizeSku = {
  sku: string;
  gtin: string;
  sizeName: string;
  sizeCode: string;
  sizeOrder: string;
  sizePriceCodeName?: string;
  qty: number;
  customerPrice: number;
  piecePrice: number;
  dozenPrice: number;
  casePrice: number;
  salePrice: number | null;
  saleExpiration?: string | null;
  mapPrice: number | null;
  retailPrice: number | null;
  /**
   * Stable blank cost for quotes/orders — standard piece price, not sale.
   * Prefer this over customerPrice / salePrice when setting line item unitCost.
   */
  standardUnitPrice?: number;
  caseQty: number;
  unitWeight?: number | null;
  countryOfOrigin?: string;
  closeout?: boolean;
  warehouses: SupplierWarehouseStock[];
};

export type SupplierColorVariant = {
  colorName: string;
  colorCode: string;
  colorPriceCodeName?: string;
  colorGroup?: string;
  colorGroupName?: string;
  colorFamilyId?: number | null;
  colorFamily?: string;
  colorSwatchImageUrl: string;
  colorFrontImageUrl: string;
  colorFrontImageLargeUrl?: string;
  colorSideImageUrl?: string;
  colorBackImageUrl?: string;
  colorHex?: string;
  sizes: SupplierSizeSku[];
  totalQty: number;
};

export type SupplierStylePricing = {
  customerPriceMin: number | null;
  customerPriceMax: number | null;
  piecePriceMin: number | null;
  piecePriceMax: number | null;
  standardUnitPriceMin?: number | null;
  standardUnitPriceMax?: number | null;
};

export type SupplierStyleDetail = SupplierStyleSummary & {
  colors: SupplierColorVariant[];
  skuCount: number;
  totalQty: number;
  pricing: SupplierStylePricing;
};

export function isSsIntegrationUsable(
  integration?: SupplierIntegration | null
): boolean {
  return (
    integration?.provider === "ssActivewear" &&
    integration.hasCredentials === true &&
    integration.status !== "disconnected"
  );
}

/** Preferred S&S style lookup ref — styleId and brand+name are reliable; partNumber is not. */
export function supplierStyleRef(style: SupplierStyleSummary): string {
  if (style.styleId != null) return String(style.styleId);
  const brand = style.brandName?.trim();
  const name = style.styleName?.trim();
  if (brand && name) return `${brand} ${name}`;
  return style.partNumber?.trim() || name || "";
}
