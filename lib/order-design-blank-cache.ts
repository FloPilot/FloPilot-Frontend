import { fetchSupplierStyleDetail } from "@/lib/api";
import { formatBrandProductName } from "@/lib/format-product-name";
import {
  normalizeGarmentBlankView,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import {
  SANMAR_PRODUCT_KEY_PREFIX,
  SS_PRODUCT_KEY_PREFIX,
} from "@/lib/supplier-line-items";
import type { SupplierProviderId } from "@/lib/supplier-integrations";
import type {
  DesignMockupStageMode,
  DesignMockupTransform,
  LineItem,
  OrderDesignMockup,
} from "@/types";

export type VendorBlankPack = {
  colorHex?: string;
  views: {
    front?: string;
    back?: string;
    /** Vendor side shot — only used as a fallback source for back, not a UI option. */
    side?: string;
  };
};

export type BlankCacheEntry = {
  imageUrl: string;
  colorHex?: string;
  vendor: boolean;
  /** Color/model fingerprint when this blank was cached */
  garmentKey: string;
};

/** Survives editor remounts when switching front/back locations / views. */
const vendorBlankPackCache = new Map<string, VendorBlankPack>();
const blankViewCache = new Map<string, BlankCacheEntry>();
const composedPreviewCache = new Map<string, string>();
const vendorPackInflight = new Map<string, Promise<VendorBlankPack>>();

export function garmentFingerprint(item: LineItem | null | undefined): string {
  if (!item) return "";
  return [
    item.colorKey || item.color || "",
    item.supplierPartNumber || item.productKey || "",
    item.supplierStyleId ?? "",
    item.imageUrl?.trim() || "",
    item.colorHex?.trim() || "",
  ].join("::");
}

export function isDesignMockupGarmentStale(
  mockup: OrderDesignMockup | undefined,
  lineItem: LineItem | null | undefined
): boolean {
  if (!mockup || !lineItem) return false;
  if (mockup.lineItemId && mockup.lineItemId !== lineItem.id) return true;

  const currentKey = garmentFingerprint(lineItem);
  if (mockup.garmentKey) {
    return mockup.garmentKey !== currentKey;
  }

  // Legacy saves without garmentKey — detect obvious color/model drift.
  const view = normalizeGarmentBlankView(mockup.blankView);
  if (
    view === "front" &&
    lineItem.imageUrl?.trim() &&
    mockup.blankImageUrl?.trim() &&
    lineItem.imageUrl.trim() !== mockup.blankImageUrl.trim()
  ) {
    return true;
  }
  if (
    lineItem.colorHex?.trim() &&
    mockup.blankColorHex?.trim() &&
    lineItem.colorHex.trim().toLowerCase() !==
      mockup.blankColorHex.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

function vendorPackCacheKey(orderId: string, item: LineItem): string {
  return [
    orderId,
    item.id,
    item.colorKey || item.color,
    item.supplierPartNumber || item.productKey || "",
    item.supplierStyleId ?? "",
  ].join("::");
}

function blankViewCacheKey(
  orderId: string,
  lineItemId: string,
  view: GarmentBlankView
): string {
  return `${orderId}::${lineItemId}::${view}`;
}

export function composedPreviewCacheKey(parts: {
  orderId: string;
  lineItemId?: string;
  blankView: GarmentBlankView;
  stageMode: DesignMockupStageMode;
  blankImageUrl?: string;
  blankColorHex: string;
  artworkUrl?: string;
  transform: DesignMockupTransform;
  /** Optional fingerprint when composing multiple artwork layers. */
  artLayersKey?: string;
}): string {
  const t = parts.transform;
  return [
    parts.orderId,
    parts.lineItemId || "",
    parts.blankView,
    parts.stageMode,
    parts.blankImageUrl || "",
    parts.blankColorHex,
    parts.artLayersKey || parts.artworkUrl || "",
    t.x.toFixed(3),
    t.y.toFixed(3),
    t.scale.toFixed(3),
    String(t.rotation ?? 0),
  ].join("::");
}

function warmImageUrl(url?: string) {
  if (!url || typeof window === "undefined") return;
  const img = new window.Image();
  if (/^https?:\/\//i.test(url)) {
    img.crossOrigin = "anonymous";
    img.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  } else {
    img.src = url;
  }
}

export function readBlankCache(
  orderId: string,
  item: LineItem,
  view: GarmentBlankView
): BlankCacheEntry | undefined {
  const entry = blankViewCache.get(blankViewCacheKey(orderId, item.id, view));
  if (!entry) return undefined;
  const key = garmentFingerprint(item);
  if (entry.garmentKey !== key) {
    blankViewCache.delete(blankViewCacheKey(orderId, item.id, view));
    return undefined;
  }
  return entry;
}

export function writeBlankCache(
  orderId: string,
  item: LineItem,
  view: GarmentBlankView,
  entry: Omit<BlankCacheEntry, "garmentKey"> & { garmentKey?: string }
) {
  const next: BlankCacheEntry = {
    ...entry,
    garmentKey: entry.garmentKey || garmentFingerprint(item),
  };
  blankViewCache.set(blankViewCacheKey(orderId, item.id, view), next);
  warmImageUrl(next.imageUrl);
}

export function readComposedCache(key: string): string | undefined {
  return composedPreviewCache.get(key);
}

export function writeComposedCache(key: string, previewUrl: string) {
  composedPreviewCache.set(key, previewUrl);
}

/**
 * Drop cached blanks / composed previews for a line item so Design picks up
 * the new color or model after a blanks edit.
 */
export function invalidateOrderLineItemDesignCaches(
  orderId: string,
  lineItemId: string
) {
  const blankPrefix = `${orderId}::${lineItemId}::`;
  for (const key of blankViewCache.keys()) {
    if (key.startsWith(blankPrefix)) blankViewCache.delete(key);
  }

  const composedPrefix = `${orderId}::${lineItemId}::`;
  for (const key of composedPreviewCache.keys()) {
    if (key.startsWith(composedPrefix)) composedPreviewCache.delete(key);
  }

  for (const key of vendorBlankPackCache.keys()) {
    if (key.startsWith(`${orderId}::${lineItemId}::`)) {
      vendorBlankPackCache.delete(key);
    }
  }

  for (const key of vendorPackInflight.keys()) {
    if (key.startsWith(`${orderId}::${lineItemId}::`)) {
      vendorPackInflight.delete(key);
    }
  }
}

function supplierProviderForLineItem(
  item: LineItem
): SupplierProviderId | null {
  if (item.supplier === "sanMar" || item.supplier === "ssActivewear") {
    return item.supplier;
  }
  if (item.productKey?.startsWith(SANMAR_PRODUCT_KEY_PREFIX)) return "sanMar";
  if (item.productKey?.startsWith(SS_PRODUCT_KEY_PREFIX)) return "ssActivewear";
  return null;
}

function colorCodeFromLineItem(item: LineItem): string | undefined {
  const prefix =
    item.supplier === "sanMar" ||
    item.productKey?.startsWith(SANMAR_PRODUCT_KEY_PREFIX)
      ? SANMAR_PRODUCT_KEY_PREFIX
      : SS_PRODUCT_KEY_PREFIX;
  if (item.colorKey?.startsWith(prefix)) {
    return item.colorKey.slice(prefix.length);
  }
  return undefined;
}

export function looksLikeVendorImageUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("ssactivewear.com") || host.includes("sanmar.com")
    );
  } catch {
    return false;
  }
}

export function supplierProviderForDesignBlank(
  item: LineItem
): SupplierProviderId | null {
  return supplierProviderForLineItem(item);
}

function pickViewFromPack(
  pack: VendorBlankPack,
  view: GarmentBlankView
): string | undefined {
  if (view === "back") {
    return pack.views.back || pack.views.side || pack.views.front;
  }
  return pack.views.front || pack.views.side || pack.views.back;
}

async function fetchVendorBlankPack(
  token: string,
  item: LineItem
): Promise<VendorBlankPack> {
  const provider = supplierProviderForLineItem(item);
  if (!provider) {
    return {
      colorHex: item.colorHex,
      views: item.imageUrl?.trim() ? { front: item.imageUrl.trim() } : {},
    };
  }

  const partNumber =
    item.supplierPartNumber?.trim() ||
    item.productKey
      ?.replace(SS_PRODUCT_KEY_PREFIX, "")
      .replace(SANMAR_PRODUCT_KEY_PREFIX, "")
      .trim() ||
    "";

  const styleSummary = {
    provider,
    brandName: item.brand,
    styleName: item.productName,
    partNumber,
    styleId: item.supplierStyleId ?? null,
    title: formatBrandProductName(item.brand, item.productName),
    styleImageUrl: item.imageUrl || "",
    styleImageLargeUrl: item.imageUrl || "",
    brandImageUrl: "",
    baseCategory: "",
  };

  const { style } = await fetchSupplierStyleDetail(
    token,
    styleSummary,
    provider
  );

  const colorCode = colorCodeFromLineItem(item)?.toLowerCase();
  const colorName = item.color.trim().toLowerCase();
  const match =
    style.colors.find(
      (color) =>
        (colorCode && color.colorCode.toLowerCase() === colorCode) ||
        color.colorName.toLowerCase() === colorName
    ) ??
    style.colors.find((color) =>
      color.colorName.toLowerCase().includes(colorName)
    );

  if (!match) {
    return {
      colorHex: item.colorHex,
      views: item.imageUrl?.trim() ? { front: item.imageUrl.trim() } : {},
    };
  }

  return {
    colorHex: match.colorHex?.trim() || item.colorHex,
    views: {
      front:
        match.colorFrontImageLargeUrl?.trim() ||
        match.colorFrontImageUrl?.trim() ||
        undefined,
      back: match.colorBackImageUrl?.trim() || undefined,
      side: match.colorSideImageUrl?.trim() || undefined,
    },
  };
}

export async function getVendorBlankPack(
  token: string,
  orderId: string,
  item: LineItem
): Promise<VendorBlankPack> {
  const key = vendorPackCacheKey(orderId, item);
  const cached = vendorBlankPackCache.get(key);
  if (cached) return cached;

  const inflight = vendorPackInflight.get(key);
  if (inflight) return inflight;

  const promise = fetchVendorBlankPack(token, item)
    .then((pack) => {
      vendorBlankPackCache.set(key, pack);
      for (const view of ["front", "back"] as GarmentBlankView[]) {
        const imageUrl = pickViewFromPack(pack, view);
        if (imageUrl) {
          writeBlankCache(orderId, item, view, {
            imageUrl,
            colorHex: pack.colorHex,
            vendor: true,
          });
        }
      }
      return pack;
    })
    .finally(() => {
      vendorPackInflight.delete(key);
    });

  vendorPackInflight.set(key, promise);
  return promise;
}

export async function resolveVendorBlankImage(
  token: string,
  orderId: string,
  item: LineItem,
  view: GarmentBlankView = "front"
): Promise<BlankCacheEntry | null> {
  const cached = readBlankCache(orderId, item, view);
  if (cached) return cached;

  // Front-only shortcut from the line item before any network call.
  if (view === "front" && item.imageUrl?.trim()) {
    const entry: BlankCacheEntry = {
      imageUrl: item.imageUrl.trim(),
      colorHex: item.colorHex,
      vendor: looksLikeVendorImageUrl(item.imageUrl),
      garmentKey: garmentFingerprint(item),
    };
    writeBlankCache(orderId, item, "front", entry);
    return entry;
  }

  const provider = supplierProviderForLineItem(item);
  if (!provider) {
    if (item.imageUrl?.trim()) {
      const entry: BlankCacheEntry = {
        imageUrl: item.imageUrl.trim(),
        colorHex: item.colorHex,
        vendor: looksLikeVendorImageUrl(item.imageUrl),
        garmentKey: garmentFingerprint(item),
      };
      writeBlankCache(orderId, item, view, entry);
      return entry;
    }
    return null;
  }

  const pack = await getVendorBlankPack(token, orderId, item);
  const imageUrl = pickViewFromPack(pack, view);
  if (!imageUrl) return null;

  const entry: BlankCacheEntry = {
    imageUrl,
    colorHex: pack.colorHex,
    vendor: true,
    garmentKey: garmentFingerprint(item),
  };
  writeBlankCache(orderId, item, view, entry);
  return entry;
}

/**
 * Prefetch front/back blanks for a line item after a garment edit so the
 * Design tab opens on the new color/model without a blank flash.
 */
export async function refreshOrderLineItemDesignBlanks(
  token: string,
  orderId: string,
  item: LineItem
): Promise<void> {
  invalidateOrderLineItemDesignCaches(orderId, item.id);

  if (item.imageUrl?.trim()) {
    writeBlankCache(orderId, item, "front", {
      imageUrl: item.imageUrl.trim(),
      colorHex: item.colorHex,
      vendor: looksLikeVendorImageUrl(item.imageUrl),
    });
  }

  if (!supplierProviderForLineItem(item)) return;

  try {
    await getVendorBlankPack(token, orderId, item);
  } catch {
    // Non-blocking — Design tab will resolve on demand if warm fails.
  }
}
