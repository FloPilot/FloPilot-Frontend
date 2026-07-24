"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  ClientStoreCollection,
  ClientStoreSection,
  StoreSectionSettings,
} from "@/lib/client-store-theme";
import { resolveCollectionProducts } from "@/lib/client-store-theme";
import type { PublicClientStoreProduct } from "@/lib/client-stores";
import { getPrimaryMockupUrl } from "@/lib/client-stores";
import { StoreProductDetailPreview } from "@/components/stores/store-product-detail";
import { sampleImageCornerColor } from "@/lib/sample-image-color";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function productsForSection(
  section: ClientStoreSection,
  products: PublicClientStoreProduct[],
  collections: ClientStoreCollection[]
): PublicClientStoreProduct[] {
  const source = section.settings.productSource || "all";
  if (source === "collection" && section.settings.collectionId) {
    const collection = collections.find(
      (entry) => entry.id === section.settings.collectionId && entry.enabled
    );
    if (!collection) return [];
    return resolveCollectionProducts(collection, products);
  }
  return products;
}

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
  // soft (default) or undefined
  return "shadow-[0_4px_16px_rgba(26,26,26,0.06)]";
}

function ProductCard({
  product,
  onSelect,
  cardBackgroundMode = "auto",
  cardBackgroundColor = "#ffffff",
  cardShadow = "soft",
}: {
  product: PublicClientStoreProduct;
  onSelect?: (product: PublicClientStoreProduct) => void;
  cardBackgroundMode?: StoreSectionSettings["cardBackgroundMode"];
  cardBackgroundColor?: string;
  cardShadow?: StoreSectionSettings["cardShadow"];
}) {
  const imageUrl = getPrimaryMockupUrl(product);
  const [autoBg, setAutoBg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (cardBackgroundMode !== "auto" || !imageUrl) {
      setAutoBg(null);
      return;
    }
    void sampleImageCornerColor(imageUrl).then((color) => {
      if (!cancelled) setAutoBg(color);
    });
    return () => {
      cancelled = true;
    };
  }, [cardBackgroundMode, imageUrl]);

  const mediaBg =
    cardBackgroundMode === "custom"
      ? cardBackgroundColor || "#ffffff"
      : autoBg || cardBackgroundColor || "#ffffff";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(product)}
      className="group w-full text-left"
    >
      <div
        className={cn(
          "aspect-square overflow-hidden rounded-xl transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5",
          cardShadowClass(cardShadow)
        )}
        style={{ background: mediaBg }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="size-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[12px] text-[#8a8a8a]">
            No image
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] font-medium leading-snug text-[#303030]">
        {product.name}
      </p>
      <p className="mt-1 text-[12px] text-[#8a8a8a]">
        {[product.brand, product.color].filter(Boolean).join(" · ") || "Apparel"}
      </p>
      <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#303030]">
        {formatCurrency(product.sellPrice)}
      </p>
    </button>
  );
}

export function StoreSectionRenderer({
  section,
  products,
  collections,
  accentHex,
  compact = false,
  previewProduct,
  productDetailSlot,
  onSelectProduct,
  onSelectCollection,
}: {
  section: ClientStoreSection;
  products: PublicClientStoreProduct[];
  collections: ClientStoreCollection[];
  accentHex: string;
  compact?: boolean;
  previewProduct?: PublicClientStoreProduct | null;
  productDetailSlot?: ReactNode;
  onSelectProduct?: (product: PublicClientStoreProduct) => void;
  onSelectCollection?: (collection: ClientStoreCollection) => void;
}) {
  if (!section.enabled) return null;

  if (section.type === "product_detail") {
    if (productDetailSlot) return <>{productDetailSlot}</>;
    return (
      <StoreProductDetailPreview
        section={section}
        product={previewProduct || products[0] || null}
        accentHex={accentHex}
        compact={compact}
      />
    );
  }

  const settings = section.settings || {};
  const bg = settings.backgroundColor || "#ffffff";
  const color = settings.textColor || "#303030";
  const align =
    settings.textAlign === "center"
      ? "text-center items-center"
      : settings.textAlign === "right"
        ? "text-right items-end"
        : "text-left items-start";
  const columns = settings.columns || 4;
  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  if (section.type === "hero") {
    const hasImage = Boolean(settings.imageUrl);
    return (
      <section
        className={cn("relative overflow-hidden", compact ? "min-h-[160px]" : "")}
        style={{ background: bg, color }}
      >
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.imageUrl}
              alt=""
              className={cn(
                "absolute inset-0 size-full object-cover",
                compact ? "opacity-90" : ""
              )}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `rgba(20,24,32,${(settings.overlayOpacity ?? 40) / 100})`,
              }}
            />
          </>
        ) : null}
        <div
          className={cn(
            "relative mx-auto flex max-w-[1200px] flex-col px-4 sm:px-6",
            compact ? "py-8" : "py-12 sm:py-16",
            align
          )}
        >
          {settings.subtitle && hasImage ? (
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/75">
              Collection
            </p>
          ) : null}
          <h2
            className={cn(
              "max-w-2xl font-semibold tracking-tight",
              compact ? "text-[1.4rem]" : "text-[2rem] sm:text-[2.5rem]",
              hasImage ? "text-white" : ""
            )}
          >
            {settings.title || "Shop the collection"}
          </h2>
          {settings.subtitle ? (
            <p
              className={cn(
                "mt-3 max-w-xl leading-relaxed",
                compact ? "text-[13px]" : "text-[15px]",
                hasImage ? "text-white/85" : "opacity-80"
              )}
            >
              {settings.subtitle}
            </p>
          ) : null}
          {settings.buttonLabel ? (
            <span
              className={cn(
                "mt-5 inline-flex rounded-lg px-4 py-2.5 text-[13px] font-semibold",
                hasImage ? "bg-white text-[#303030]" : "text-white"
              )}
              style={hasImage ? undefined : { background: accentHex }}
            >
              {settings.buttonLabel}
            </span>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.type === "rich_text") {
    return (
      <section style={{ background: bg, color }}>
        <div
          className={cn(
            "mx-auto flex max-w-[720px] flex-col px-4 sm:px-6",
            compact ? "py-8" : "py-12 sm:py-16",
            align
          )}
        >
          {settings.title ? (
            <h2
              className={cn(
                "font-semibold tracking-tight",
                compact ? "text-[1.25rem]" : "text-[1.75rem]"
              )}
            >
              {settings.title}
            </h2>
          ) : null}
          {settings.body ? (
            <p
              className={cn(
                "mt-3 leading-relaxed opacity-80",
                compact ? "text-[13px]" : "text-[15px]"
              )}
            >
              {settings.body}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.type === "image_banner") {
    return (
      <section className="relative overflow-hidden" style={{ background: bg }}>
        {settings.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.imageUrl}
            alt=""
            className={cn(
              "w-full object-cover",
              compact ? "max-h-[140px]" : "max-h-[360px] aspect-[21/9]"
            )}
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-[#f6f6f7] text-[12px] text-[#8a8a8a]",
              compact ? "h-[120px]" : "h-[240px]"
            )}
          >
            Add a banner image
          </div>
        )}
        {(settings.title || settings.subtitle) && settings.imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-4">
            <div className="text-center text-white">
              {settings.title ? (
                <p className="text-[1.5rem] font-semibold tracking-tight">
                  {settings.title}
                </p>
              ) : null}
              {settings.subtitle ? (
                <p className="mt-1 text-[14px] text-white/85">{settings.subtitle}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  if (section.type === "collection_list") {
    const visible = collections.filter((entry) => entry.enabled);
    return (
      <section style={{ background: bg, color }}>
        <div
          className={cn(
            "mx-auto max-w-[1200px] px-4 sm:px-6",
            compact ? "py-8" : "py-10 sm:py-12"
          )}
        >
          {settings.title ? (
            <h2 className="mb-6 text-[1.25rem] font-semibold tracking-tight">
              {settings.title}
            </h2>
          ) : null}
          {visible.length === 0 ? (
            <p className="text-[13px] opacity-60">No collections yet.</p>
          ) : (
            <div className={cn("grid gap-4", gridClass)}>
              {visible.map((collection) => {
                const count = resolveCollectionProducts(
                  collection,
                  products
                ).length;
                return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => onSelectCollection?.(collection)}
                  className="overflow-hidden rounded-lg border border-[#e3e3e3] bg-white text-left transition-colors hover:border-[#c9cccf]"
                >
                  <div className="aspect-[4/3] bg-[#f6f6f7]">
                    {collection.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collection.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[13px] font-semibold text-[#303030]">
                      {collection.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      {count} product{count === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  // featured_collection | product_grid
  const list = productsForSection(section, products, collections);
  return (
    <section style={{ background: bg, color }}>
      <div
        className={cn(
          "mx-auto max-w-[1200px] px-4 sm:px-6",
          compact ? "py-8" : "py-10 sm:py-12"
        )}
      >
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h2 className="text-[1.25rem] font-semibold tracking-tight">
            {settings.title || "Products"}
          </h2>
          <p className="text-[13px] opacity-50">
            {list.length} item{list.length === 1 ? "" : "s"}
          </p>
        </div>
        {list.length === 0 ? (
          <p className="py-10 text-center text-[13px] opacity-60">
            No products in this section yet.
          </p>
        ) : (
          <div className={cn("grid gap-x-4 gap-y-8 sm:gap-x-6", gridClass)}>
            {list.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
                cardBackgroundMode={settings.cardBackgroundMode || "auto"}
                cardBackgroundColor={settings.cardBackgroundColor || "#ffffff"}
                cardShadow={settings.cardShadow || "soft"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
