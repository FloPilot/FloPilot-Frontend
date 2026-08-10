"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AddSsBlankPanel } from "@/components/orders/add-ss-blank-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSupplierStyleDetail } from "@/lib/api";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { formatBrandProductName } from "@/lib/format-product-name";
import {
  buildLineItemFromSupplierSelection,
  existingSupplierSizesOnOrder,
  priceForSku,
} from "@/lib/supplier-line-items";
import type {
  SupplierColorVariant,
  SupplierProviderId,
  SupplierStyleDetail,
} from "@/lib/supplier-integrations";
import { supplierProviderLabel } from "@/lib/supplier-integrations";
import type { LineItem } from "@/types";
import { cn } from "@/lib/utils";

function stockTone(qty: number): string {
  if (qty <= 0) return "text-[#b42318]";
  if (qty < 100) return "text-[#8a6116]";
  return "text-[#0d5c2e]";
}

function partNumberFromItem(
  item: LineItem,
  provider: SupplierProviderId
): string {
  const prefix = provider === "sanMar" ? "sm:" : "ss:";
  return (
    item.supplierPartNumber?.trim() ||
    item.productKey?.replace(prefix, "").trim() ||
    ""
  );
}

function colorCodeFromItem(
  item: LineItem,
  provider: SupplierProviderId
): string | undefined {
  const prefix = provider === "sanMar" ? "sm:" : "ss:";
  if (item.colorKey?.startsWith(prefix)) {
    return item.colorKey.slice(prefix.length);
  }
  return undefined;
}

/**
 * Local-first editor for supplier blanks.
 * Quantities are always editable from the line item; catalog colors/stock
 * enrich the UI in the background and never block saving.
 */
export function EditSupplierBlankPanel({
  item,
  lineItems,
  provider,
  saving,
  onSave,
}: {
  item: LineItem;
  lineItems: LineItem[];
  provider: SupplierProviderId;
  saving: boolean;
  onSave: (next: LineItem) => Promise<void>;
}) {
  const { getIdToken } = useAuth();
  const providerLabel = supplierProviderLabel(provider);

  const [mode, setMode] = useState<"edit" | "change-style">("edit");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(item.sizes.map((row) => [row.size, row.quantity]))
  );
  const [styleDetail, setStyleDetail] = useState<SupplierStyleDetail | null>(
    null
  );
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogNonce, setCatalogNonce] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Always re-run when item / retry changes. No sticky "already started" ref —
  // that breaks under React Strict Mode (first fetch cancelled, second skipped).
  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogStatus("loading");
      setCatalogError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error("Sign in again to load catalog colors.");
        }
        if (cancelled) return;

        const partNumber = partNumberFromItem(item, provider);
        if (!partNumber && item.supplierStyleId == null) {
          throw new Error(
            "This blank is missing a catalog style ID. Use Change style to pick it again."
          );
        }

        const { style: detail } = await fetchSupplierStyleDetail(
          token,
          {
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
          },
          provider
        );
        if (cancelled) return;

        if (!detail.colors?.length) {
          throw new Error(
            `No colors available for this style on your ${providerLabel} account.`
          );
        }

        const code = colorCodeFromItem(item, provider)?.toLowerCase();
        const name = item.color?.trim().toLowerCase();
        let colorIndex = 0;
        if (code || name) {
          const matchIndex = detail.colors.findIndex(
            (color) =>
              (code && color.colorCode.toLowerCase() === code) ||
              (name && color.colorName.toLowerCase() === name)
          );
          if (matchIndex >= 0) colorIndex = matchIndex;
        }

        const matched = detail.colors[colorIndex];
        setStyleDetail(detail);
        setSelectedColorIndex(colorIndex);
        setQuantities((current) => {
          const next: Record<string, number> = {};
          for (const sku of matched.sizes) {
            next[sku.sizeName] = current[sku.sizeName] ?? 0;
          }
          // Keep any sizes the user already typed that aren't on this color yet.
          for (const [size, qty] of Object.entries(current)) {
            if (next[size] == null && qty > 0) next[size] = qty;
          }
          return next;
        });
        setCatalogStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setCatalogStatus("error");
        setCatalogError(
          err instanceof Error ? err.message : "Could not load catalog colors"
        );
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [catalogNonce, getIdToken, item, provider, providerLabel]);

  const selectedColor: SupplierColorVariant | null =
    styleDetail?.colors[selectedColorIndex] ?? null;

  const existingOnOrder = useMemo(() => {
    if (!styleDetail || !selectedColor) return {};
    return existingSupplierSizesOnOrder(
      lineItems.filter((row) => row.id !== item.id),
      provider,
      styleDetail.partNumber,
      selectedColor.colorCode
    );
  }, [item.id, lineItems, provider, selectedColor, styleDetail]);

  const sizeRows = useMemo(() => {
    if (selectedColor) {
      return selectedColor.sizes.map((sku) => ({
        size: sku.sizeName,
        stock: sku.qty,
        price: priceForSku(sku),
        sku,
      }));
    }
    // Local fallback from the line item — always available immediately.
    return item.sizes.map((row) => ({
      size: row.size,
      stock: null as number | null,
      price: item.unitCost,
      sku: null,
    }));
  }, [item.sizes, item.unitCost, selectedColor]);

  const pieceCount = sizeRows.reduce(
    (sum, row) => sum + (quantities[row.size] || 0),
    0
  );

  const orderTotal = sizeRows.reduce((sum, row) => {
    const qty = quantities[row.size] || 0;
    return sum + qty * row.price;
  }, 0);

  const handleColorSelect = (index: number) => {
    if (!styleDetail) return;
    const color = styleDetail.colors[index];
    if (!color) return;
    setSelectedColorIndex(index);
    setQuantities((current) => {
      const next: Record<string, number> = {};
      for (const sku of color.sizes) {
        next[sku.sizeName] = current[sku.sizeName] || 0;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitError(null);

    if (styleDetail && selectedColor) {
      const built = buildLineItemFromSupplierSelection(
        provider,
        styleDetail,
        selectedColor,
        quantities
      );
      if (!built) {
        setSubmitError("Enter a quantity for at least one size.");
        return;
      }
      try {
        await onSave({
          ...built,
          id: item.id,
          markupPercent: item.markupPercent,
          customerUnitPrice: item.customerUnitPrice,
        });
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Could not update blank"
        );
      }
      return;
    }

    // Catalog not ready — save quantity changes on the existing item.
    const sizes = Object.entries(quantities)
      .map(([size, quantity]) => ({
        size,
        quantity: Math.max(0, Math.floor(quantity || 0)),
      }))
      .filter((row) => row.quantity > 0);

    if (sizes.length === 0) {
      setSubmitError("Enter a quantity for at least one size.");
      return;
    }

    try {
      await onSave({ ...item, sizes });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not update blank"
      );
    }
  };

  if (mode === "change-style") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={cn(
            dashboardControlClass,
            "inline-flex h-8 w-fit items-center gap-1.5 px-2.5 text-[12px] font-medium"
          )}
        >
          Back to editing this blank
        </button>
        <div className="min-h-0 flex-1">
          <AddSsBlankPanel
            provider={provider}
            lineItems={lineItems}
            saving={saving}
            onAdd={async (next) => {
              await onSave({
                ...next,
                id: item.id,
                markupPercent: item.markupPercent,
                customerUnitPrice: item.customerUnitPrice,
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[#ebebeb] pb-3">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa]">
            {(selectedColor?.colorFrontImageUrl || item.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  selectedColor?.colorFrontImageLargeUrl ||
                  selectedColor?.colorFrontImageUrl ||
                  item.imageUrl ||
                  ""
                }
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <Package className="size-6 text-[#8a8a8a]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={dashboardTaskTitleClass}>
              {styleDetail
                ? formatBrandProductName(
                    styleDetail.brandName,
                    styleDetail.styleName
                  )
                : formatBrandProductName(item.brand, item.productName)}
            </h3>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {selectedColor?.colorName || item.color}
              {styleDetail?.partNumber
                ? ` · Part ${styleDetail.partNumber}`
                : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-[12px]"
                onClick={() => setMode("change-style")}
              >
                Change style
              </Button>
              {catalogStatus === "loading" ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#616161]">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading colors…
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="scrollbar-none max-h-[min(48vh,480px)] space-y-4 overflow-y-auto overscroll-contain py-3">
        {catalogStatus === "error" ? (
          <div className="rounded-lg border border-[#f5d0a9] bg-[#fff8f0] px-3 py-2.5 text-[13px] text-[#8a4b08]">
            <p className="font-medium">Couldn’t load catalog colors</p>
            <p className="mt-0.5 text-[12px]">{catalogError}</p>
            <p className="mt-1 text-[12px]">
              You can still change quantities below, or retry / change style.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-8 px-2 text-[12px]"
              onClick={() => setCatalogNonce((n) => n + 1)}
            >
              <RefreshCw className="size-3.5" />
              Retry catalog
            </Button>
          </div>
        ) : null}

        {styleDetail ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Color
            </p>
            <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {styleDetail.colors.map((color, index) => (
                <button
                  key={`${color.colorCode}-${color.colorName}`}
                  type="button"
                  onClick={() => handleColorSelect(index)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-[12px] transition-colors",
                    index === selectedColorIndex
                      ? "border-brand-primary bg-[#eef1ff] text-[#303030]"
                      : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9d7ef]"
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
                  <span className="tabular-nums text-[#8a8a8a]">
                    {color.totalQty.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : catalogStatus === "loading" ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-8 w-24 animate-pulse rounded-full bg-[#f0f0f0]"
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#616161]">
            Current color:{" "}
            <span className="font-medium text-[#303030]">{item.color}</span>
          </p>
        )}

        <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
          <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#303030]">
              {selectedColor?.colorName || item.color}
            </p>
            <p className="mt-0.5 text-[12px] text-[#616161]">
              {selectedColor
                ? `${providerLabel} piece pricing · ${selectedColor.totalQty.toLocaleString()} in stock`
                : "Adjust sizes now — stock & pricing appear when the catalog loads."}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                    Size
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    On order
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Stock
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                    Line
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row) => {
                  const qty = quantities[row.size] || 0;
                  const onOrder = existingOnOrder[row.size] || 0;
                  return (
                    <tr
                      key={row.size}
                      className="border-b border-[#ebebeb] last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold text-[#303030]">
                        {row.size}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                        {onOrder > 0 ? onOrder : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums font-medium",
                          row.stock == null
                            ? "text-[#8a8a8a]"
                            : stockTone(row.stock)
                        )}
                      >
                        {row.stock == null ? "…" : row.stock.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min={0}
                          value={qty || ""}
                          placeholder="0"
                          disabled={saving}
                          onChange={(event) => {
                            const next = Math.max(
                              0,
                              parseInt(event.target.value, 10) || 0
                            );
                            setQuantities((current) => ({
                              ...current,
                              [row.size]: next,
                            }));
                          }}
                          className="ml-auto h-8 w-20 rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
                        {qty > 0 ? formatCurrency(qty * row.price) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#fafafa]">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
                  >
                    {pieceCount} piece{pieceCount !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                    {formatCurrency(orderTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {submitError ? (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end border-t border-[#ebebeb] pt-3">
        <Button
          type="button"
          disabled={saving || pieceCount <= 0}
          className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
