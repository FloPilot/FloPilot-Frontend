export type ClientStoreStatus = "draft" | "published" | "closed";

export type ClientStoreSellPriceMode = "markup" | "fixed";

export type ClientStoreSizeOption = {
  size: string;
  enabled: boolean;
};

/** One offerable color on a store product, with optional front/back mockups. */
export type ClientStoreColorVariant = {
  id: string;
  name: string;
  colorCode?: string;
  colorHex?: string;
  swatchUrl?: string;
  enabled: boolean;
  /** [0] front, [1] back, then extra angles as needed. */
  mockupUrls: string[];
};

export type ClientStoreProduct = {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  /** Primary / first enabled color name (compat + submissions). */
  color?: string;
  /** Enabled color names (compat with older storefronts). */
  colors?: string[];
  /** Preferred structured color + mockup data. */
  colorVariants?: ClientStoreColorVariant[];
  sizes: ClientStoreSizeOption[];
  /** Fallback hero image = first mockup of first enabled color. */
  mockupUrl?: string;
  galleryUrls?: string[];
  /** Labels used by smart collections (e.g. "t-shirts", "hoodies"). */
  tags?: string[];
  productKey?: string;
  colorKey?: string;
  supplier?: "ssActivewear" | "sanMar";
  supplierPartNumber?: string;
  supplierStyleId?: string;
  blankCost: number;
  /** Per-unit decoration / imprint cost added on top of blank cost. */
  decorationCost?: number;
  markupPercent: number;
  sellPrice: number;
  sellPriceMode: ClientStoreSellPriceMode;
  sortOrder: number;
  enabled: boolean;
};

export type ClientStoreSettings = {
  collectEmail: boolean;
  collectPhone: boolean;
  collectShippingAddress: boolean;
  orderInstructions?: string;
};

export type ClientStore = {
  id: string;
  shareId: string;
  customerId: string;
  customerName?: string;
  company?: string;
  name: string;
  slug: string;
  status: ClientStoreStatus;
  headline?: string;
  description?: string;
  logoUrl?: string;
  accentColorKey?: string;
  heroImageUrl?: string;
  passwordProtected: boolean;
  hasPassword?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  products: ClientStoreProduct[];
  /** Page builder sections + product collections. */
  theme?: import("./client-store-theme").ClientStoreTheme;
  settings: ClientStoreSettings;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  createdBy?: string;
  shareToken?: string;
  shareUrl?: string;
};

export type ClientStoreSubmissionStatus =
  | "new"
  | "reviewed"
  | "converted"
  | "cancelled";

export type ClientStoreSubmissionItem = {
  productId: string;
  productName: string;
  size: string;
  color?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type ClientStoreSubmission = {
  id: string;
  storeId: string;
  shareId: string;
  customerId: string;
  storeName: string;
  status: ClientStoreSubmissionStatus;
  shopper: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    shippingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  };
  items: ClientStoreSubmissionItem[];
  subtotal: number;
  /** Set when converted into a FloPilot sales order */
  orderId?: string;
  orderNumber?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type PublicClientStoreProduct = {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  color?: string;
  colors?: string[];
  colorVariants?: ClientStoreColorVariant[];
  sizes: ClientStoreSizeOption[];
  mockupUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  sellPrice: number;
};

export type PublicClientStore = {
  shareId: string;
  name: string;
  slug: string;
  status: ClientStoreStatus;
  headline?: string;
  description?: string;
  logoUrl?: string;
  accentColorKey?: string;
  heroImageUrl?: string;
  company?: string;
  customerName?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  passwordProtected: boolean;
  unlocked: boolean;
  isOpen: boolean;
  closedReason?: "closed" | "outside_window" | null;
  settings: ClientStoreSettings;
  products: PublicClientStoreProduct[];
  theme?: import("./client-store-theme").ClientStoreTheme;
};

export const CLIENT_STORE_DEFAULT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
] as const;

export function computeClientStoreSellPrice(product: {
  blankCost: number;
  decorationCost?: number;
  markupPercent: number;
  sellPrice: number;
  sellPriceMode: ClientStoreSellPriceMode;
}): number {
  if (product.sellPriceMode === "fixed") {
    return Math.max(0, Math.round(Number(product.sellPrice || 0) * 100) / 100);
  }
  const blank = Math.max(0, Number(product.blankCost) || 0);
  const decoration = Math.max(0, Number(product.decorationCost) || 0);
  const cost = blank + decoration;
  const markup = Math.max(0, Number(product.markupPercent) || 0);
  return Math.round(cost * (1 + markup / 100) * 100) / 100;
}

export function clientStoreStatusLabel(status: ClientStoreStatus): string {
  if (status === "published") return "Live";
  if (status === "closed") return "Closed";
  return "Draft";
}

/**
 * Prefer the current app origin for share links so local testing uses
 * localhost:3000 instead of the production APP_URL baked into API responses.
 */
export function resolveClientStoreShareUrl(store: {
  shareUrl?: string;
  shareToken?: string;
}): string {
  const token =
    store.shareToken ||
    extractShareTokenFromUrl(store.shareUrl) ||
    "";
  if (!token) return store.shareUrl || "";

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/store/${encodeURIComponent(token)}`;
  }

  return store.shareUrl || `/store/${encodeURIComponent(token)}`;
}

function extractShareTokenFromUrl(shareUrl?: string): string | undefined {
  if (!shareUrl) return undefined;
  try {
    const url = new URL(shareUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const storeIndex = parts.indexOf("store");
    if (storeIndex >= 0 && parts[storeIndex + 1]) {
      return decodeURIComponent(parts[storeIndex + 1]);
    }
  } catch {
    const match = shareUrl.match(/\/store\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return undefined;
}

export function getEnabledColorVariants(
  product: Pick<ClientStoreProduct, "colorVariants" | "colors" | "color">
): ClientStoreColorVariant[] {
  const variants = (product.colorVariants || []).filter(
    (variant) => variant.enabled !== false && variant.name
  );
  if (variants.length > 0) return variants;

  const names =
    product.colors?.filter(Boolean) ||
    (product.color ? [product.color] : []);
  return names.map((name, index) => ({
    id: `legacy-${index}-${name}`,
    name,
    enabled: true,
    mockupUrls: [],
  }));
}

export function getProductColorNames(
  product: Pick<ClientStoreProduct, "colorVariants" | "colors" | "color">
): string[] {
  const fromVariants = getEnabledColorVariants(product).map((v) => v.name);
  if (fromVariants.length > 0) return fromVariants;
  if (product.colors?.length) return product.colors.filter(Boolean);
  return product.color ? [product.color] : [];
}

export function getMockupsForColor(
  product: Pick<
    ClientStoreProduct,
    "colorVariants" | "mockupUrl" | "galleryUrls"
  >,
  colorName?: string
): string[] {
  const variants = product.colorVariants || [];
  if (variants.length > 0) {
    const match = colorName
      ? variants.find(
          (variant) =>
            variant.enabled !== false &&
            variant.name.toLowerCase() === colorName.toLowerCase()
        )
      : variants.find((variant) => variant.enabled !== false);
    const urls = (match?.mockupUrls || []).filter(Boolean);
    if (urls.length > 0) return urls;
  }
  if (product.mockupUrl) return [product.mockupUrl];
  return (product.galleryUrls || []).filter(Boolean);
}

export function getPrimaryMockupUrl(
  product: Pick<
    ClientStoreProduct,
    "colorVariants" | "mockupUrl" | "galleryUrls"
  >,
  colorName?: string
): string | undefined {
  return getMockupsForColor(product, colorName)[0] || undefined;
}

/** Keep flat color/mockup fields in sync with colorVariants for APIs + older UI. */
export function syncProductDerivedFields(
  product: ClientStoreProduct
): ClientStoreProduct {
  const enabled = (product.colorVariants || []).filter(
    (variant) => variant.enabled !== false && variant.name.trim()
  );
  if (enabled.length === 0) {
    return {
      ...product,
      colors: product.color
        ? [product.color, ...(product.colors || []).filter(Boolean)].filter(
            (name, index, arr) => arr.indexOf(name) === index
          )
        : product.colors || [],
    };
  }

  const colors = enabled.map((variant) => variant.name.trim());
  const allMockups = enabled.flatMap((variant) =>
    (variant.mockupUrls || []).filter(Boolean)
  );

  return {
    ...product,
    colorVariants: enabled.map((variant) => ({
      ...variant,
      name: variant.name.trim(),
      mockupUrls: (variant.mockupUrls || []).filter(Boolean).slice(0, 6),
    })),
    colors,
    color: colors[0],
    mockupUrl: allMockups[0] || product.mockupUrl || "",
    // Don't duplicate every mockup into galleryUrls (Firestore 1MB limit).
    galleryUrls: undefined,
  };
}
