"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  ClientStoreSection,
  StoreSectionSettings,
} from "@/lib/client-store-theme";
import type { PublicClientStoreProduct } from "@/lib/client-stores";
import {
  getMockupsForColor,
  getPrimaryMockupUrl,
  getProductColorNames,
} from "@/lib/client-stores";
import { sampleImageCornerColor } from "@/lib/sample-image-color";
import { StoreProductCommerceMeta } from "@/components/stores/store-product-commerce-meta";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductDetailControls = {
  size: string;
  color: string;
  qty: number;
  mockupIndex: number;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onQtyChange: (qty: number) => void;
  onMockupIndexChange: (index: number) => void;
  onAddToCart: () => void;
  storeOpen?: boolean;
  brandFallback?: string;
  error?: string | null;
};

function cardShadowClass(
  shadow?: StoreSectionSettings["cardShadow"]
): string {
  if (shadow === "none") return "";
  if (shadow === "medium") {
    return "shadow-[0_8px_24px_rgba(26,26,26,0.10)]";
  }
  if (shadow === "strong") {
    return "shadow-[0_14px_36px_rgba(26,26,26,0.14)]";
  }
  return "shadow-[0_4px_16px_rgba(26,26,26,0.06)]";
}

function useProductMediaBackground(
  imageUrl: string | undefined,
  settings: StoreSectionSettings
) {
  const mode = settings.cardBackgroundMode || "auto";
  const custom = settings.cardBackgroundColor || "#ffffff";
  const [autoBg, setAutoBg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "auto" || !imageUrl) {
      setAutoBg(null);
      return;
    }
    void sampleImageCornerColor(imageUrl).then((color) => {
      if (!cancelled) setAutoBg(color);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, imageUrl]);

  return mode === "custom" ? custom : autoBg || custom;
}

function ProductMediaFrame({
  imageUrl,
  settings,
  className,
  children,
}: {
  imageUrl?: string;
  settings: StoreSectionSettings;
  className?: string;
  children: React.ReactNode;
}) {
  const mediaBg = useProductMediaBackground(imageUrl, settings);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl",
        cardShadowClass(settings.cardShadow || "soft"),
        className
      )}
      style={{ background: mediaBg }}
    >
      {children}
    </div>
  );
}

/** Compact thumb that inherits product-page media background + shadow settings. */
export function StoreProductMediaThumb({
  imageUrl,
  settings,
  className,
}: {
  imageUrl?: string;
  settings?: StoreSectionSettings | null;
  className?: string;
}) {
  const resolved: StoreSectionSettings = {
    cardBackgroundMode: settings?.cardBackgroundMode || "auto",
    cardBackgroundColor: settings?.cardBackgroundColor || "#ffffff",
    cardShadow: settings?.cardShadow || "soft",
  };
  return (
    <ProductMediaFrame
      imageUrl={imageUrl}
      settings={resolved}
      className={cn("size-16 shrink-0 rounded-lg", className)}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="size-full object-contain p-1.5"
        />
      ) : null}
    </ProductMediaFrame>
  );
}

export function StoreProductDetailPreview({
  section,
  product,
  accentHex,
  compact = false,
}: {
  section: ClientStoreSection;
  product?: PublicClientStoreProduct | null;
  accentHex: string;
  compact?: boolean;
}) {
  const settings = section.settings || {};
  const bg = settings.backgroundColor || "#ffffff";
  const textColor = settings.textColor || "#303030";
  const colorNames = product ? getProductColorNames(product) : [];
  const activeColor = colorNames[0] || "";
  const mockups = product
    ? getMockupsForColor(product, activeColor || undefined)
    : [];
  const image =
    mockups[0] || (product ? getPrimaryMockupUrl(product) : undefined);
  const enabledSizes = (product?.sizes || []).filter((row) => row.enabled);
  const activeSize = enabledSizes[0]?.size || "";
  const thumbBg = settings.cardBackgroundColor || "#ffffff";

  return (
    <section
      className={cn(compact ? "px-4 py-6" : "px-4 py-8 sm:px-6 sm:py-10")}
      style={{ background: bg, color: textColor }}
    >
      <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <ProductMediaFrame
            imageUrl={image}
            settings={settings}
            className="aspect-square"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="size-full object-contain p-4"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[13px] text-[#8a8a8a]">
                Product preview
              </div>
            )}
          </ProductMediaFrame>
          {mockups.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {mockups.slice(0, 4).map((url, index) => (
                <div
                  key={`${url.slice(0, 24)}-${index}`}
                  className={cn(
                    "size-14 overflow-hidden rounded-md border",
                    index === 0 ? "border-[#303030]" : "border-transparent"
                  )}
                  style={{ background: thumbBg }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:pt-2">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#8a8a8a]">
            {settings.title || product?.brand || "Product"}
          </p>
          <h2
            className={cn(
              "mt-2 font-semibold tracking-tight",
              compact ? "text-[1.35rem]" : "text-[1.75rem] sm:text-[2rem]"
            )}
          >
            {product?.name || "Sample product"}
          </h2>
          <p className="mt-3 text-[1.15rem] font-semibold tabular-nums">
            {formatCurrency(product?.sellPrice || 0)}
          </p>
          <StoreProductCommerceMeta product={product} density="detail" />
          {product?.description ? (
            <p className="mt-3 text-[13px] leading-relaxed opacity-80">
              {product.description}
            </p>
          ) : null}
          {settings.body ? (
            <p className="mt-3 text-[13px] leading-relaxed opacity-70">
              {settings.body}
            </p>
          ) : null}

          {colorNames.length > 0 ? (
            <div className={cn(compact ? "mt-5" : "mt-8")}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-medium">Color</p>
                {activeColor ? (
                  <span className="text-[12px] opacity-70">{activeColor}</span>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {colorNames.map((option) => {
                  const variant = product?.colorVariants?.find(
                    (entry) => entry.name === option
                  );
                  const active = activeColor === option;
                  return (
                    <div
                      key={option}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]",
                        active
                          ? "border-[#303030] bg-[#303030] text-white"
                          : "border-[#e3e3e3] text-[#616161]"
                      )}
                    >
                      {variant?.colorHex ? (
                        <span
                          className="size-3.5 rounded-full border border-black/10"
                          style={{ background: variant.colorHex }}
                        />
                      ) : null}
                      {option}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              colorNames.length > 0 ? "mt-5" : compact ? "mt-5" : "mt-8"
            )}
          >
            <p className="text-[13px] font-medium">Size</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {enabledSizes.length > 0 ? (
                enabledSizes.map((row) => {
                  const active = activeSize === row.size;
                  return (
                    <div
                      key={row.size}
                      className={cn(
                        "min-w-11 rounded-md border px-3 py-2 text-center text-[13px] font-medium",
                        active
                          ? "border-[#303030] bg-[#303030] text-white"
                          : "border-[#e3e3e3] text-[#616161]"
                      )}
                    >
                      {row.size}
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-[#8a8a8a]">
                  Add enabled sizes on the product to preview them here.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-medium">Quantity</p>
            <div className="mt-2.5 inline-flex items-center rounded-lg border border-[#e3e3e3]">
              <span className="inline-flex size-10 items-center justify-center text-[#c0c0c4]">
                <Minus className="size-3.5" />
              </span>
              <span className="min-w-10 text-center text-[14px] font-semibold tabular-nums">
                1
              </span>
              <span className="inline-flex size-10 items-center justify-center text-[#c0c0c4]">
                <Plus className="size-3.5" />
              </span>
            </div>
          </div>

          <div
            className="mt-6 inline-flex rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white"
            style={{ background: accentHex }}
          >
            {settings.buttonLabel || "Add to cart"}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreProductDetailInteractive({
  section,
  product,
  accentHex,
  controls,
  browseOnly = false,
}: {
  section: ClientStoreSection;
  product: PublicClientStoreProduct;
  accentHex: string;
  controls: ProductDetailControls;
  /** Catalog / show stores — view colors & sizes, no cart actions. */
  browseOnly?: boolean;
}) {
  const settings = section.settings || {};
  const bg = settings.backgroundColor || "#ffffff";
  const textColor = settings.textColor || "#303030";
  const mockups = getMockupsForColor(product, controls.color || undefined);
  const activeMockup =
    mockups[controls.mockupIndex] ||
    mockups[0] ||
    product.mockupUrl ||
    getPrimaryMockupUrl(product);
  const colorNames = getProductColorNames(product);
  const enabledSizes = product.sizes.filter((row) => row.enabled);
  const thumbBg = settings.cardBackgroundColor || "#ffffff";

  return (
    <section
      className="px-4 py-6 sm:px-6 sm:py-10"
      style={{ background: bg, color: textColor }}
    >
      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <ProductMediaFrame
            imageUrl={activeMockup}
            settings={settings}
            className="aspect-square"
          >
            {activeMockup ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMockup}
                alt=""
                className="size-full object-contain p-4"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[13px] text-[#8a8a8a]">
                Product preview
              </div>
            )}
          </ProductMediaFrame>
          {mockups.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {mockups.map((url, index) => (
                <button
                  key={`${url.slice(0, 24)}-${index}`}
                  type="button"
                  onClick={() => controls.onMockupIndexChange(index)}
                  className={cn(
                    "size-16 overflow-hidden rounded-md border",
                    controls.mockupIndex === index
                      ? "border-[#303030]"
                      : "border-transparent hover:border-[#c9cccf]"
                  )}
                  style={{ background: thumbBg }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:pt-2">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#8a8a8a]">
            {settings.title ||
              product.brand ||
              controls.brandFallback ||
              "Product"}
          </p>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
            {product.name}
          </h1>
          <p className="mt-3 text-[1.25rem] font-semibold tabular-nums">
            {product.sellPrice != null
              ? formatCurrency(product.sellPrice)
              : null}
          </p>
          <StoreProductCommerceMeta product={product} density="detail" />
          {product.description ? (
            <p className="mt-4 text-[14px] leading-relaxed opacity-80">
              {product.description}
            </p>
          ) : null}
          {product.insights ? (
            <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3 text-[13px] leading-relaxed text-[#5a4a2a]">
              {product.insights}
            </p>
          ) : null}
          {settings.body ? (
            <p className="mt-3 text-[13px] leading-relaxed opacity-70">
              {settings.body}
            </p>
          ) : null}

          {colorNames.length > 0 ? (
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <Label className="text-[13px] font-medium">Color</Label>
                {controls.color ? (
                  <span className="text-[12px] opacity-70">{controls.color}</span>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {colorNames.map((option) => {
                  const variant = product.colorVariants?.find(
                    (entry) => entry.name === option
                  );
                  const active = controls.color === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => controls.onColorChange(option)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] transition-colors",
                        active
                          ? "border-[#303030] bg-[#303030] text-white"
                          : "border-[#e3e3e3] text-[#616161] hover:border-[#c9cccf]"
                      )}
                    >
                      {variant?.colorHex ? (
                        <span
                          className="size-3.5 rounded-full border border-black/10"
                          style={{ background: variant.colorHex }}
                        />
                      ) : null}
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <Label className="text-[13px] font-medium">Size</Label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {enabledSizes.map((row) => {
                const active = controls.size === row.size;
                return (
                  <button
                    key={row.size}
                    type="button"
                    onClick={() => controls.onSizeChange(row.size)}
                    className={cn(
                      "min-w-11 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "border-[#303030] bg-[#303030] text-white"
                        : "border-[#e3e3e3] text-[#616161] hover:border-[#c9cccf]"
                    )}
                  >
                    {row.size}
                  </button>
                );
              })}
            </div>
          </div>

          {!browseOnly ? (
            <div className="mt-6">
              <Label className="text-[13px] font-medium">Quantity</Label>
              <div className="mt-2.5 inline-flex items-center rounded-lg border border-[#e3e3e3]">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center text-[#616161] hover:bg-[#f6f6f7]"
                  onClick={() => {
                    const floor = Math.max(
                      1,
                      Math.floor(Number(product.minOrderQty) || 0) || 1
                    );
                    controls.onQtyChange(Math.max(floor, controls.qty - 1));
                  }}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-10 text-center text-[14px] font-semibold tabular-nums">
                  {controls.qty}
                </span>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center text-[#616161] hover:bg-[#f6f6f7]"
                  onClick={() => controls.onQtyChange(controls.qty + 1)}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              {Number(product.minOrderQty) > 0 ? (
                <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                  Minimum {product.minOrderQty} pieces for this product
                </p>
              ) : null}
            </div>
          ) : null}

          {!browseOnly ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={!controls.size || controls.storeOpen === false}
                className="h-11 flex-1 rounded-lg text-[13px] font-semibold text-white hover:opacity-95 disabled:opacity-50"
                style={{ background: accentHex }}
                onClick={controls.onAddToCart}
              >
                {settings.buttonLabel || "Add to cart"}
              </Button>
            </div>
          ) : null}
          {controls.error ? (
            <p className="mt-3 text-[13px] text-red-700">{controls.error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
