export type ClientStoreStatus = "draft" | "published" | "closed";

/** Order = buy flow. Review = vote / include-pass. Show = browse-only catalog. */
export type ClientStoreMode = "order" | "review" | "show";

export type ClientStoreSellPriceMode = "markup" | "fixed";

export type ClientStoreReviewDecision = "included" | "excluded";

export type ClientStoreReviewPhase = "voting" | "selection";

export type ClientStoreReviewVote = "up" | "down";

export type ClientStoreVoteSummaryRow = {
  key: string;
  productId: string;
  color?: string;
  up: number;
  down: number;
};

export type ClientStoreSizeOption = {
  size: string;
  enabled: boolean;
};

/** Placement of artwork on a mockup canvas (0–1 coordinates + scale). */
export type ClientStoreDesignTransform = {
  x: number;
  y: number;
  scale: number;
  rotation?: number;
};

/**
 * Re-editable design applied to a product's mockups. Kept at the product level
 * so one uploaded artwork can be stamped across every color (compact + the
 * common case), mirroring the order Design studio.
 */
export type ClientStoreDesignArtLayer = {
  id: string;
  url: string;
  cleanUrl?: string;
  backgroundRemoved?: boolean;
  transform: ClientStoreDesignTransform;
  label?: string;
};

export type ClientStoreProductDesign = {
  /** Preferred multi-layer artwork stack (bottom → top). */
  artLayers?: ClientStoreDesignArtLayer[];
  artworkUrl?: string;
  artworkCleanUrl?: string;
  backgroundRemoved?: boolean;
  /** garment = compose onto the vendor blank photo; color = solid color backdrop. */
  stageMode?: "garment" | "color";
  /** Which mockup slot the studio last edited (front = 0, back = 1). */
  blankView?: "front" | "back";
  transform: ClientStoreDesignTransform;
  placementPresetId?: string;
  updatedAt?: string;
};

/**
 * Decoration placement on a store product (from shop print locations).
 * Images here are shown in the storefront gallery alongside color mockups.
 */
export type ClientStoreDecorationLocation = {
  id: string;
  locationKey: string;
  locationLabel: string;
  /** Uploaded / composed mockup for this placement. */
  imageUrl?: string;
  sortOrder: number;
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
  /**
   * Pristine blank sources (usually vendor photo URLs) the Design studio
   * composes onto, so re-editing doesn't stack art on an already-decorated
   * mockup. Slot-aligned with mockupUrls.
   */
  blankMockupUrls?: string[];
};

export type ClientStoreProduct = {
  id: string;
  name: string;
  description?: string;
  /** Talking points / insights for review-store browsers. */
  insights?: string;
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
  /** Artwork + placement composed into the color mockups (admin-only). */
  design?: ClientStoreProductDesign;
  productKey?: string;
  colorKey?: string;
  supplier?: "ssActivewear" | "sanMar";
  supplierPartNumber?: string;
  supplierStyleId?: string;
  blankCost: number;
  /** Per-unit decoration / imprint cost added on top of blank cost. */
  decorationCost?: number;
  /** Free-text decoration method label (e.g. "DTF", "Left chest screen print"). */
  decorationType?: string;
  /**
   * Decoration placements (from shop settings) with optional mockup images.
   * Images are merged into the storefront product gallery.
   */
  decorationLocations?: ClientStoreDecorationLocation[];
  /**
   * Minimum pieces for this product on a storefront order.
   * 0 / omitted = no minimum.
   */
  minOrderQty?: number;
  /** One-time setup / art fee charged once per product in an order. */
  setupFee?: number;
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
  /** Prompt shown on review storefronts. */
  reviewPrompt?: string;
  /** Review stores hide prices unless this is true. */
  showPrices?: boolean;
  /** Public page canvas background (defaults to white). */
  pageBackgroundColor?: string;
  /**
   * Review stores only.
   * voting = thumbs up/down for broad internal feedback
   * selection = include/pass for final picks (vote totals stay visible)
   */
  reviewPhase?: ClientStoreReviewPhase;
  /** Employee gift / store-credit program. */
  creditsEnabled?: boolean;
  /** Lock catalog until a valid employee access code is entered. */
  requireEmployeeAccess?: boolean;
  /** Default $ balance when importing employees without a credit column. */
  defaultCreditAmount?: number;
  /** Allow paying cart remainder by card when over employee credit. */
  allowCreditOverage?: boolean;
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
  mode?: ClientStoreMode;
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
  /** Shop / tenant slug used in friendly public URLs. */
  tenantSlug?: string;
  shareToken?: string;
  shareUrl?: string;
  /** Path-only friendly link, e.g. `/store/{tenant}/{store}`. */
  sharePath?: string;
  /** Aggregated thumbs for review stores. */
  voteSummary?: ClientStoreVoteSummaryRow[];
};

export type ClientStoreSubmissionStatus =
  | "new"
  | "awaiting_payment"
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

export type ClientStoreReviewDecisionRow = {
  productId: string;
  productName: string;
  brand?: string;
  /** Color option reviewed (when the product offers multiple colors). */
  color?: string;
  colorHex?: string;
  mockupUrl?: string;
  decision: ClientStoreReviewDecision;
  note?: string;
};

export type ClientStoreSubmission = {
  id: string;
  storeId: string;
  shareId: string;
  customerId: string;
  storeName: string;
  kind?: "order" | "review";
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
  decisions?: ClientStoreReviewDecisionRow[];
  includedCount?: number;
  excludedCount?: number;
  subtotal: number;
  payment?: {
    status?: "pending" | "paid" | "failed";
    provider?: string;
    amount?: number;
    paidAt?: string | null;
    checkoutSessionId?: string | null;
    applicationFeeCents?: number | null;
    platformFeePercent?: number | null;
  };
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
  insights?: string;
  brand?: string;
  color?: string;
  colors?: string[];
  colorVariants?: ClientStoreColorVariant[];
  sizes: ClientStoreSizeOption[];
  mockupUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  sellPrice?: number;
  decorationType?: string;
  decorationLocations?: ClientStoreDecorationLocation[];
  minOrderQty?: number;
  setupFee?: number;
};

export type ClientStoreEmployee = {
  id: string;
  storeId: string;
  name?: string;
  email: string;
  code: string;
  creditBalance: number;
  initialCredit: number;
  redeemedTotal: number;
  status: "active" | "revoked";
  invitedAt?: string | null;
  lastEmailAt?: string | null;
  emailCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientStoreEmployeeSummary = {
  total: number;
  active: number;
  revoked: number;
  creditRemaining: number;
  creditIssued: number;
  creditRedeemed: number;
};

export type PublicClientStoreEmployee = {
  id: string;
  name?: string;
  email: string;
  code: string;
  creditBalance: number;
  initialCredit: number;
  status: "active" | "revoked";
};

export type PublicClientStore = {
  shareId: string;
  name: string;
  slug: string;
  status: ClientStoreStatus;
  mode?: ClientStoreMode;
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
  employeeAccessRequired?: boolean;
  unlocked: boolean;
  isOpen: boolean;
  closedReason?: "closed" | "outside_window" | null;
  /** True when the shop’s Stripe Connect account can take card payments */
  paymentsEnabled?: boolean;
  /** FloPilot take-rate on paid checkouts (informational; not charged to shopper) */
  platformFeePercent?: number | null;
  settings: ClientStoreSettings;
  products: PublicClientStoreProduct[];
  theme?: import("./client-store-theme").ClientStoreTheme;
  /** Aggregated thumbs for review stores. */
  voteSummary?: ClientStoreVoteSummaryRow[];
  /** Present when unlocked with a valid employee code. */
  employee?: PublicClientStoreEmployee | null;
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

/** Shop-facing unit economics for a store product (staff view). */
export type ClientStoreProductEconomics = {
  blankCost: number;
  decorationCost: number;
  unitCost: number;
  sellPrice: number;
  profit: number;
  /** Profit ÷ sell price (0–100). */
  marginPercent: number;
  /** Markup on unit cost (0–100+). */
  markupPercent: number;
};

export function computeClientStoreEconomics(product: {
  blankCost: number;
  decorationCost?: number;
  markupPercent: number;
  sellPrice: number;
  sellPriceMode: ClientStoreSellPriceMode;
}): ClientStoreProductEconomics {
  const blankCost = Math.max(0, Number(product.blankCost) || 0);
  const decorationCost = Math.max(0, Number(product.decorationCost) || 0);
  const unitCost = Math.round((blankCost + decorationCost) * 100) / 100;
  const sellPrice = computeClientStoreSellPrice(product);
  const profit = Math.round((sellPrice - unitCost) * 100) / 100;
  const marginPercent =
    sellPrice > 0
      ? Math.round((profit / sellPrice) * 1000) / 10
      : 0;
  const markupPercent =
    product.sellPriceMode === "fixed" && unitCost > 0
      ? Math.round(((sellPrice - unitCost) / unitCost) * 1000) / 10
      : Math.max(0, Number(product.markupPercent) || 0);

  return {
    blankCost,
    decorationCost,
    unitCost,
    sellPrice,
    profit,
    marginPercent,
    markupPercent,
  };
}

export function clientStoreStatusLabel(status: ClientStoreStatus): string {
  if (status === "published") return "Live";
  if (status === "closed") return "Closed";
  return "Draft";
}

export function clientStoreModeLabel(mode?: ClientStoreMode): string {
  if (mode === "review") return "Review";
  if (mode === "show") return "Show";
  return "Order";
}

export function isClientStoreReviewMode(store?: {
  mode?: ClientStoreMode;
} | null): boolean {
  return store?.mode === "review";
}

export function isClientStoreShowMode(store?: {
  mode?: ClientStoreMode;
} | null): boolean {
  return store?.mode === "show";
}

export function clientStoreReviewPhase(
  store?: { settings?: { reviewPhase?: ClientStoreReviewPhase } } | null
): ClientStoreReviewPhase {
  return store?.settings?.reviewPhase === "voting" ? "voting" : "selection";
}

export function clientStoreReviewPhaseLabel(
  phase?: ClientStoreReviewPhase
): string {
  return phase === "voting" ? "Voting" : "Selection";
}

/**
 * Prefer the current app origin for share links so local testing uses
 * localhost:3000 instead of the production APP_URL baked into API responses.
 * When tenant + store slugs are available, use friendly URLs instead of JWTs.
 */
export function resolveClientStoreShareUrl(store: {
  shareUrl?: string;
  shareToken?: string;
  sharePath?: string;
  tenantSlug?: string;
  slug?: string;
}): string {
  const tenantSlug = String(store.tenantSlug || "")
    .trim()
    .toLowerCase();
  const storeSlug = String(store.slug || "")
    .trim()
    .toLowerCase();
  const friendlyPath =
    store.sharePath ||
    (tenantSlug && storeSlug
      ? `/store/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(storeSlug)}`
      : null);

  if (friendlyPath) {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const host = window.location.hostname.toLowerCase();
      if (
        (host === "flopilot.io" || host === "www.flopilot.io") &&
        tenantSlug &&
        storeSlug
      ) {
        return `https://${encodeURIComponent(tenantSlug)}.flopilot.io/store/${encodeURIComponent(storeSlug)}`;
      }
      if (window.location.origin) {
        return `${window.location.origin}${friendlyPath}`;
      }
    }
    return store.shareUrl || friendlyPath;
  }

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

/** Normalize a store URL slug for editing / save. */
export function normalizeClientStoreSlug(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Example customer-facing URL for the Overview preview (always production-style
 * when a shop slug is known).
 */
export function previewClientStoreCustomerUrl(input: {
  tenantSlug?: string | null;
  storeSlug?: string | null;
}): string {
  const tenantSlug = normalizeClientStoreSlug(String(input.tenantSlug || ""));
  const storeSlug = normalizeClientStoreSlug(String(input.storeSlug || ""));
  if (!tenantSlug || !storeSlug) return "";
  return `https://${tenantSlug}.flopilot.io/store/${storeSlug}`;
}

function extractShareTokenFromUrl(shareUrl?: string): string | undefined {
  if (!shareUrl) return undefined;
  try {
    const url = new URL(shareUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const storeIndex = parts.indexOf("store");
    if (storeIndex >= 0 && parts[storeIndex + 1]) {
      // Prefer JWT-style single segment; ignore friendly two-segment paths here.
      if (!parts[storeIndex + 2]) {
        return decodeURIComponent(parts[storeIndex + 1]);
      }
    }
  } catch {
    const match = shareUrl.match(/\/store\/([^/?#]+)$/);
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

export function getDecorationLocationImages(
  product: Pick<ClientStoreProduct, "decorationLocations"> | null | undefined
): string[] {
  return (product?.decorationLocations || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((location) => String(location.imageUrl || "").trim())
    .filter(Boolean);
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function getMockupsForColor(
  product: Pick<
    ClientStoreProduct,
    "colorVariants" | "mockupUrl" | "galleryUrls" | "decorationLocations"
  >,
  colorName?: string
): string[] {
  const locationUrls = getDecorationLocationImages(product);
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
    if (urls.length > 0) return uniqueUrls([...urls, ...locationUrls]);
  }
  if (product.mockupUrl) {
    return uniqueUrls([product.mockupUrl, ...locationUrls]);
  }
  const legacy = (product.galleryUrls || []).filter(Boolean);
  if (legacy.length > 0) return uniqueUrls([...legacy, ...locationUrls]);
  return locationUrls;
}

export function getPrimaryMockupUrl(
  product: Pick<
    ClientStoreProduct,
    "colorVariants" | "mockupUrl" | "galleryUrls" | "decorationLocations"
  >,
  colorName?: string
): string | undefined {
  return getMockupsForColor(product, colorName)[0] || undefined;
}

/**
 * Front/back pair for product-grid hover (Shopify-style).
 * Prefer garment front/back slots when present; otherwise use the same
 * ordered gallery the PDP uses (including decoration-location images) so
 * cards show a front image and hover can crossfade to the next distinct one.
 */
export function getProductCardImages(
  product: Pick<
    ClientStoreProduct,
    | "colorVariants"
    | "mockupUrl"
    | "galleryUrls"
    | "decorationLocations"
    | "color"
    | "colors"
  >,
  colorName?: string
): { front?: string; back?: string } {
  let front: string | undefined;
  let back: string | undefined;

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
    if (urls.length > 0) {
      front = urls[0];
      back = urls[1] && urls[1] !== urls[0] ? urls[1] : undefined;
    }
  }

  if (!front && product.mockupUrl) {
    front = product.mockupUrl;
    const legacy = (product.galleryUrls || []).filter(Boolean);
    back =
      back || legacy.find((url) => url !== product.mockupUrl) || undefined;
  }

  if (!front) {
    const legacy = (product.galleryUrls || []).filter(Boolean);
    if (legacy.length > 0) {
      front = legacy[0];
      if (!back) {
        back =
          legacy[1] && legacy[1] !== legacy[0] ? legacy[1] : undefined;
      }
    }
  }

  // Same ordered gallery as the product detail page (decoration locations, etc.)
  const gallery = getMockupsForColor(product, colorName);
  if (!front) front = gallery[0];
  if (!back && front) {
    back = gallery.find((url) => url && url !== front);
  }

  return { front, back };
}

export function createClientStoreDecorationLocationId(): string {
  return `csloc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createClientStoreProductId(): string {
  return `cprod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Deep-ish clone for “Duplicate product” — new ids, same economics/mockups/tags. */
export function duplicateClientStoreProduct(
  product: ClientStoreProduct,
  options?: { nameSuffix?: string }
): ClientStoreProduct {
  const suffix = options?.nameSuffix ?? " (copy)";
  const baseName = product.name.trim() || "Product";
  const stamp = Date.now().toString(36);

  return {
    ...product,
    id: createClientStoreProductId(),
    name: `${baseName}${suffix}`.slice(0, 120),
    colors: [...(product.colors || [])],
    tags: [...(product.tags || [])],
    galleryUrls: product.galleryUrls ? [...product.galleryUrls] : undefined,
    sizes: (product.sizes || []).map((row) => ({ ...row })),
    colorVariants: (product.colorVariants || []).map((variant, index) => ({
      ...variant,
      id: `color-${stamp}-${index}-${Math.random().toString(36).slice(2, 6)}`.slice(
        0,
        64
      ),
      mockupUrls: [...(variant.mockupUrls || [])],
      blankMockupUrls: variant.blankMockupUrls
        ? [...variant.blankMockupUrls]
        : undefined,
    })),
    decorationLocations: (product.decorationLocations || []).map(
      (location, index) => ({
        ...location,
        id: createClientStoreDecorationLocationId(),
        sortOrder: index,
      })
    ),
    design: product.design
      ? {
          ...product.design,
          artLayers: product.design.artLayers?.map((layer) => ({
            ...layer,
            id: `layer-${stamp}-${Math.random().toString(36).slice(2, 7)}`,
            transform: { ...layer.transform },
          })),
          transform: { ...product.design.transform },
        }
      : undefined,
  };
}

/**
 * Insert a duplicated product immediately after its source and re-index sortOrder.
 */
export function insertDuplicatedClientStoreProduct(
  products: ClientStoreProduct[],
  sourceId: string
): { products: ClientStoreProduct[]; duplicate: ClientStoreProduct } | null {
  const index = products.findIndex((row) => row.id === sourceId);
  if (index < 0) return null;
  const duplicate = duplicateClientStoreProduct(products[index]);
  const next = [
    ...products.slice(0, index + 1),
    duplicate,
    ...products.slice(index + 1),
  ].map((row, sortOrder) => ({ ...row, sortOrder }));
  return { products: next, duplicate };
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
      blankMockupUrls: variant.blankMockupUrls
        ? variant.blankMockupUrls.slice(0, 6)
        : undefined,
    })),
    colors,
    color: colors[0],
    mockupUrl: allMockups[0] || product.mockupUrl || "",
    // Don't duplicate every mockup into galleryUrls (Firestore 1MB limit).
    galleryUrls: undefined,
  };
}
