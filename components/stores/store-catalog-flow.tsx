"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientStoreColorVariant, ClientStoreSizeOption } from "@/lib/client-stores";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import type {
  SupplierColorVariant,
  SupplierStyleDetail,
} from "@/lib/supplier-integrations";
import { cn } from "@/lib/utils";

function colorKey(color: SupplierColorVariant): string {
  return `${color.colorCode || ""}::${color.colorName}`;
}

function seedMockups(color: SupplierColorVariant): string[] {
  const urls = [
    color.colorFrontImageLargeUrl || color.colorFrontImageUrl,
    color.colorBackImageUrl,
  ].filter(Boolean) as string[];
  return urls.slice(0, 2);
}

export function buildVariantsFromSelection(
  style: SupplierStyleDetail,
  selectedKeys: Set<string>
): ClientStoreColorVariant[] {
  return style.colors
    .filter((color) => selectedKeys.has(colorKey(color)))
    .map((color, index) => ({
      id: `cvar-${color.colorCode || index}-${color.colorName}`
        .replace(/\s+/g, "-")
        .slice(0, 64),
      name: color.colorName,
      colorCode: color.colorCode || undefined,
      colorHex: color.colorHex || undefined,
      swatchUrl: color.colorSwatchImageUrl || undefined,
      enabled: true,
      mockupUrls: seedMockups(color),
    }));
}

export function collectSizesFromColors(
  colors: SupplierColorVariant[],
  enabledNames?: Set<string>
): ClientStoreSizeOption[] {
  const seen = new Map<string, boolean>();
  for (const color of colors) {
    for (const sku of color.sizes || []) {
      const name = sku.sizeName || sku.sizeCode;
      if (!name || seen.has(name)) continue;
      seen.set(
        name,
        enabledNames ? enabledNames.has(name) : true
      );
    }
  }
  return Array.from(seen.entries()).map(([size, enabled]) => ({
    size,
    enabled,
  }));
}

export function blankCostFromColors(colors: SupplierColorVariant[]): number {
  for (const color of colors) {
    for (const sku of color.sizes || []) {
      const price =
        sku.standardUnitPrice ?? sku.piecePrice ?? sku.customerPrice;
      if (price != null && Number(price) > 0) {
        return Math.round(Number(price) * 100) / 100;
      }
    }
  }
  return 0;
}

function StepRail({
  step,
}: {
  step: "configure" | "mockups";
}) {
  const items = [
    { id: "configure", label: "Colors & sizes" },
    { id: "mockups", label: "Mockups" },
    { id: "edit", label: "Pricing" },
  ] as const;
  const activeIndex = step === "configure" ? 0 : 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div key={item.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="hidden h-px w-4 bg-[#e3e3e3] sm:block" />
            ) : null}
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-medium",
                active
                  ? "border-brand-primary/30 bg-brand-primary/8 text-[#121a2e]"
                  : done
                    ? "border-[#d7e3d2] bg-[#f3f8f1] text-[#2f5d2c]"
                    : "border-[#ebebeb] bg-white text-[#8a8a8a]"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  active
                    ? "bg-brand-primary text-white"
                    : done
                      ? "bg-[#2f5d2c] text-white"
                      : "bg-[#f4f4f5] text-[#8a8a8a]"
                )}
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StoreCatalogConfigureStep({
  styleDetail,
  selectedKeys,
  onSelectedKeysChange,
  sizes,
  onSizesChange,
  onBack,
}: {
  styleDetail: SupplierStyleDetail;
  selectedKeys: Set<string>;
  onSelectedKeysChange: (next: Set<string>) => void;
  sizes: ClientStoreSizeOption[];
  onSizesChange: (next: ClientStoreSizeOption[]) => void;
  onBack: () => void;
}) {
  const [focusKey, setFocusKey] = useState<string>(() => {
    const first = styleDetail.colors[0];
    return first ? colorKey(first) : "";
  });

  const focusColor =
    styleDetail.colors.find((color) => colorKey(color) === focusKey) ||
    styleDetail.colors.find((color) => selectedKeys.has(colorKey(color))) ||
    styleDetail.colors[0] ||
    null;

  const previewUrl =
    focusColor?.colorFrontImageLargeUrl ||
    focusColor?.colorFrontImageUrl ||
    styleDetail.styleImageLargeUrl ||
    styleDetail.styleImageUrl ||
    "";

  const selectedCount = selectedKeys.size;
  const enabledSizeCount = sizes.filter((row) => row.enabled).length;

  const toggleColor = (color: SupplierColorVariant) => {
    const key = colorKey(color);
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      if (next.size <= 1) return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectedKeysChange(next);
    setFocusKey(key);
  };

  const selectAllColors = () => {
    onSelectedKeysChange(
      new Set(styleDetail.colors.map((color) => colorKey(color)))
    );
  };

  const selectSizeRange = (from: string, to: string) => {
    const names = sizes.map((row) => row.size);
    const start = names.indexOf(from);
    const end = names.indexOf(to);
    if (start < 0 || end < 0) return;
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    onSizesChange(
      sizes.map((row, index) => ({
        ...row,
        enabled: index >= lo && index <= hi,
      }))
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
        >
          <ArrowLeft className="size-3.5 text-[#616161]" />
          Back to catalog
        </button>
        <StepRail step="configure" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ebebeb] bg-[#fafafa]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                <Package className="size-7 text-[#8a8a8a]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold tracking-tight text-[#121a2e]">
                {styleDetail.brandName} {styleDetail.styleName}
              </h3>
              <p className="mt-0.5 text-[13px] text-[#5a6478]">
                {styleDetail.title}
              </p>
              <p className="mt-1 text-[12px] text-[#8a8a8a]">
                {styleDetail.baseCategory}
                {styleDetail.partNumber ? ` · Part ${styleDetail.partNumber}` : ""}
                {` · ${styleDetail.colors.length} colors`}
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-[#e3e3e3] bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-[14px] font-semibold text-[#121a2e]">
                  Colors to offer
                </h4>
                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                  Select every color shoppers can choose on this product.
                </p>
              </div>
              <button
                type="button"
                onClick={selectAllColors}
                className="text-[12px] font-medium text-brand-primary hover:underline"
              >
                Select all
              </button>
            </div>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {styleDetail.colors.map((color) => {
                const key = colorKey(color);
                const selected = selectedKeys.has(key);
                const focused = focusKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleColor(color)}
                    onMouseEnter={() => setFocusKey(key)}
                    className={cn(
                      "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-[12px] transition-colors",
                      selected
                        ? "border-brand-primary bg-[#eef1ff] text-[#121a2e]"
                        : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9d7ef]",
                      focused && selected && "ring-2 ring-brand-primary/20"
                    )}
                  >
                    <span
                      className="size-4 shrink-0 rounded-full border border-[#d4d4d4] bg-cover bg-center"
                      style={{
                        backgroundColor: color.colorHex || "#f3f3f3",
                        backgroundImage: color.colorSwatchImageUrl
                          ? `url(${color.colorSwatchImageUrl})`
                          : undefined,
                      }}
                    />
                    <span className="truncate font-medium">{color.colorName}</span>
                    {selected ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-[#8a8a8a]">
              {selectedCount} color{selectedCount === 1 ? "" : "s"} selected
              {focusColor ? ` · Previewing ${focusColor.colorName}` : ""}
            </p>
          </section>

          <section className="rounded-xl border border-[#e3e3e3] bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h4 className="text-[14px] font-semibold text-[#121a2e]">
                  Sizes to offer
                </h4>
                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                  Toggle the size run for this product — for example L through 3XL.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSizesChange(sizes.map((row) => ({ ...row, enabled: true })))
                  }
                  className="text-[12px] font-medium text-brand-primary hover:underline"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => selectSizeRange("L", "3XL")}
                  className="text-[12px] font-medium text-brand-primary hover:underline"
                >
                  L–3XL
                </button>
                <button
                  type="button"
                  onClick={() => selectSizeRange("S", "XL")}
                  className="text-[12px] font-medium text-brand-primary hover:underline"
                >
                  S–XL
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((row) => (
                <button
                  key={row.size}
                  type="button"
                  onClick={() =>
                    onSizesChange(
                      sizes.map((size) =>
                        size.size === row.size
                          ? { ...size, enabled: !size.enabled }
                          : size
                      )
                    )
                  }
                  className={cn(
                    "min-w-11 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                    row.enabled
                      ? "border-brand-primary/30 bg-brand-primary/8 text-[#121a2e]"
                      : "border-[#e3e3e3] bg-white text-[#8a8a8a] hover:border-[#c9cccf]"
                  )}
                >
                  {row.size}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-[#8a8a8a]">
              {enabledSizeCount} size{enabledSizeCount === 1 ? "" : "s"} available
            </p>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-0 overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f4f4f5]">
            <div className="aspect-square">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="size-full object-contain p-3"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Package className="size-8 text-[#c0c0c4]" />
                </div>
              )}
            </div>
            <div className="border-t border-[#ebebeb] bg-white px-3 py-3">
              <p className="text-[13px] font-medium text-[#121a2e]">
                {focusColor?.colorName || "Blank preview"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                Supplier blank image — replace with decorated mockups next.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const SLOT_LABELS = ["Front", "Back", "Extra"];

export function StoreCatalogMockupsStep({
  variants,
  onVariantsChange,
  onBack,
  onError,
  backLabel = "Back to colors & sizes",
}: {
  variants: ClientStoreColorVariant[];
  onVariantsChange: (next: ClientStoreColorVariant[]) => void;
  onBack: () => void;
  onError: (message: string | null) => void;
  backLabel?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{
    variantId: string;
    slot: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState(
    variants[0]?.id || ""
  );

  const activeVariant =
    variants.find((variant) => variant.id === activeVariantId) || variants[0];

  const slotCount = useMemo(() => {
    const max = Math.max(
      2,
      ...variants.map((variant) => variant.mockupUrls.length)
    );
    return Math.min(6, Math.max(2, max));
  }, [variants]);

  const updateVariantUrls = (
    variantId: string,
    updater: (urls: string[]) => string[]
  ) => {
    onVariantsChange(
      variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              mockupUrls: updater([...(variant.mockupUrls || [])]),
            }
          : variant
      )
    );
  };

  const handleFile = async (file: File | null) => {
    if (!file || !uploadTarget) return;
    setUploading(true);
    onError(null);
    try {
      const { previewUrl, error } = await readStoreMockupDataUrl(file);
      if (error || !previewUrl) {
        onError(
          error ||
            "Could not read that image. Try a PNG, JPG, or WebP under ~10MB."
        );
        return;
      }
      updateVariantUrls(uploadTarget.variantId, (urls) => {
        const next = [...urls];
        while (next.length <= uploadTarget.slot) next.push("");
        next[uploadTarget.slot] = previewUrl;
        return next;
      });
    } catch {
      onError("Could not process that image. Please try another file.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
        >
          <ArrowLeft className="size-3.5 text-[#616161]" />
          {backLabel}
        </button>
        <StepRail step="mockups" />
      </div>

      <div>
        <h3 className="text-[16px] font-semibold text-[#121a2e]">
          Assign mockups by color
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-[#5a6478]">
          Upload a front (and optional back) mockup for each color. Supplier blank
          images are prefilled so you can replace them with decorated art.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => setActiveVariantId(variant.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeVariant?.id === variant.id
                ? "border-brand-primary bg-[#eef1ff] text-[#121a2e]"
                : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9d7ef]"
            )}
          >
            <span
              className="size-3.5 rounded-full border border-[#d4d4d4]"
              style={{ backgroundColor: variant.colorHex || "#e5e5e5" }}
            />
            {variant.name}
            <span className="tabular-nums text-[#8a8a8a]">
              {(variant.mockupUrls || []).filter(Boolean).length}
            </span>
          </button>
        ))}
      </div>

      {activeVariant ? (
        <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-[14px] font-semibold text-[#121a2e]">
                {activeVariant.name}
              </h4>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                Front and back recommended. Add more angles if needed.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg border-[#e3e3e3] text-[12px]"
              onClick={() =>
                updateVariantUrls(activeVariant.id, (urls) =>
                  urls.length >= 6 ? urls : [...urls, ""]
                )
              }
            >
              <Plus className="size-3.5" />
              Add angle
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.max(slotCount, activeVariant.mockupUrls.length || 2) }).map(
              (_, slot) => {
                const url = activeVariant.mockupUrls[slot] || "";
                const label = SLOT_LABELS[slot] || `Angle ${slot + 1}`;
                const isUploading =
                  uploading &&
                  uploadTarget?.variantId === activeVariant.id &&
                  uploadTarget.slot === slot;

                return (
                  <div
                    key={`${activeVariant.id}-${slot}`}
                    className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f4f4f5]"
                  >
                    <div className="flex aspect-square items-center justify-center">
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="size-5 animate-spin text-[#8a8a8a]" />
                          <p className="text-[12px] text-[#8a8a8a]">
                            Preparing…
                          </p>
                        </div>
                      ) : url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          className="size-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-3 text-center">
                          <ImagePlus className="size-5 text-[#c0c0c4]" />
                          <p className="text-[12px] text-[#8a8a8a]">{label}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 border-t border-[#ebebeb] bg-white px-2.5 py-2">
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#303030]">
                        {label}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        className="h-8 rounded-lg border-[#e3e3e3] px-2.5 text-[11px]"
                        onClick={() => {
                          setUploadTarget({
                            variantId: activeVariant.id,
                            slot,
                          });
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload className="size-3" />
                        {url ? "Replace" : "Upload"}
                      </Button>
                      {url ? (
                        <button
                          type="button"
                          disabled={uploading}
                          className="rounded-lg p-1.5 text-[#8a8a8a] hover:bg-[#f4f4f5] hover:text-red-700"
                          onClick={() =>
                            updateVariantUrls(activeVariant.id, (urls) => {
                              const next = [...urls];
                              next[slot] = "";
                              return next;
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export { colorKey };
