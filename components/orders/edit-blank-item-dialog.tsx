"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { EditSupplierBlankPanel } from "@/components/orders/edit-supplier-blank-panel";
import { ManualSizeQtyEditor } from "@/components/orders/manual-size-qty-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyManualSizeRecord,
  type ManualSizeQtyRecord,
} from "@/lib/create-order";
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
  deriveCustomerUnitPriceFromMarkup,
  resolveLineItemCustomerUnitPrice,
  resolveLineItemMarkupPercent,
  shouldShowBlankPricing,
} from "@/lib/blank-pricing";
import {
  recordToSizes,
  serializeLineItemForApi,
  sizesToRecord,
} from "@/lib/line-items";
import { isSupplierLineItem } from "@/lib/supplier-line-items";
import type { LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

export function EditBlankItemDialog({
  open,
  onOpenChange,
  orderId,
  order,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  order: Order;
  item: LineItem | null;
}) {
  const { settings } = useShopSettings();
  const shopDefaultMarkup = settings.pricingMatrix.blankMarkupPercent ?? 0;
  const showBlankPricing = shouldShowBlankPricing(order);
  const { updateOrderLineItem } = useSchedule();

  const isSupplier = item ? isSupplierLineItem(item) : false;
  const supplierProvider =
    item?.supplier === "sanMar" || item?.productKey?.startsWith("sm:")
      ? ("sanMar" as const)
      : ("ssActivewear" as const);

  const [productName, setProductName] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState<ManualSizeQtyRecord>(emptyManualSizeRecord);
  const [unitCost, setUnitCost] = useState("0");
  const [markupPercent, setMarkupPercent] = useState(String(shopDefaultMarkup));
  const [customerUnitPrice, setCustomerUnitPrice] = useState("");
  const [customerPriceTouched, setCustomerPriceTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item || isSupplier) return;

    const nextSizes = sizesToRecord(item.sizes);
    const nextMarkup = resolveLineItemMarkupPercent(item, shopDefaultMarkup);
    const nextCustomer = resolveLineItemCustomerUnitPrice(
      item,
      shopDefaultMarkup
    );

    setProductName(
      formatBrandProductName(item.brand, item.productName) ||
        item.productName ||
        ""
    );
    setColor(item.color || "");
    setSizes(
      Object.keys(nextSizes).length > 0 ? nextSizes : emptyManualSizeRecord()
    );
    setUnitCost(String(item.unitCost ?? 0));
    setMarkupPercent(String(nextMarkup));
    setCustomerUnitPrice(nextCustomer.toFixed(2));
    setCustomerPriceTouched(item.customerUnitPrice != null);
    setError(null);
  }, [open, item, isSupplier, shopDefaultMarkup]);

  const parsedUnitCost = Math.max(0, Number(unitCost) || 0);
  const parsedMarkup = Math.max(0, Number(markupPercent) || 0);
  const parsedCustomerUnitPrice = Math.max(0, Number(customerUnitPrice) || 0);
  const effectiveCustomerUnitPrice =
    parsedCustomerUnitPrice > 0
      ? parsedCustomerUnitPrice
      : deriveCustomerUnitPriceFromMarkup(parsedUnitCost, parsedMarkup);
  const pieceCount = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  const orderShopTotal = pieceCount * parsedUnitCost;
  const orderCustomerTotal = pieceCount * effectiveCustomerUnitPrice;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setSaving(false);
    }
    onOpenChange(next);
  };

  const saveSupplierItem = async (next: LineItem) => {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrderLineItem(
        orderId,
        item.id,
        serializeLineItemForApi(next)
      );
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update blank");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveManualItem = async () => {
    if (!item) return;

    const trimmedProduct = productName.trim();
    const trimmedColor = color.trim();

    if (!trimmedProduct) {
      setError("Enter a product name.");
      return;
    }
    if (!trimmedColor) {
      setError("Enter a color.");
      return;
    }
    if (pieceCount <= 0) {
      setError("Enter a quantity for at least one size.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const pricing: Partial<LineItem> = showBlankPricing
        ? customerPriceTouched
          ? { customerUnitPrice: effectiveCustomerUnitPrice }
          : { markupPercent: parsedMarkup }
        : {};

      await updateOrderLineItem(
        orderId,
        item.id,
        serializeLineItemForApi({
          id: item.id,
          productName: trimmedProduct,
          brand: "",
          color: trimmedColor,
          unitCost: parsedUnitCost,
          ...pricing,
          sizes: recordToSizes(sizes),
          // Drop supplier fields if this was somehow mixed.
          supplier: undefined,
          supplierPartNumber: undefined,
          supplierStyleId: undefined,
          productKey: undefined,
          colorKey: undefined,
        })
      );
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update blank");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(90vh,820px)] max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0",
          isSupplier ? "sm:max-w-4xl" : "sm:max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Edit blank
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            {isSupplier
              ? `Update color, sizes, and quantities for this ${
                  supplierProvider === "sanMar" ? "SanMar" : "S&S"
                } blank — or change the style if needed.`
              : "Change the product, color, and size quantities for this blank."}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1",
            isSupplier
              ? "flex flex-col gap-3 overflow-hidden px-5 py-4"
              : "overflow-y-auto px-5 py-4"
          )}
        >
          {isSupplier ? (
            <div className="min-h-0 flex-1">
              <EditSupplierBlankPanel
                provider={supplierProvider}
                item={item}
                lineItems={order.lineItems}
                saving={saving}
                onSave={saveSupplierItem}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2.5 text-[13px] font-medium text-[#8f1f1f] shadow-sm"
                >
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Product
                  </Label>
                  <Input
                    value={productName}
                    onChange={(event) => {
                      setProductName(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Gildan 64000 Softstyle"
                    className={cn(
                      dashboardControlClass,
                      "h-10",
                      error === "Enter a product name." &&
                        "border-[#e07a7a] focus-visible:ring-[#e07a7a]/30"
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Color
                  </Label>
                  <Input
                    value={color}
                    onChange={(event) => {
                      setColor(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Athletic Heather"
                    className={cn(
                      dashboardControlClass,
                      "h-10",
                      error === "Enter a color." &&
                        "border-[#e07a7a] focus-visible:ring-[#e07a7a]/30"
                    )}
                  />
                </div>
              </div>

              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#303030]">
                    Quantity{showBlankPricing ? " & pricing" : ""}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#616161]">
                    {productName.trim() || color.trim()
                      ? [productName.trim(), color.trim()]
                          .filter(Boolean)
                          .join(" · ")
                      : "Adjust sizes for this blank."}
                  </p>
                </div>

                {showBlankPricing ? (
                  <div className="grid gap-3 border-b border-[#ebebeb] px-4 py-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-[#616161]">
                        Shop blank cost
                      </Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={unitCost}
                          onChange={(event) => {
                            const nextCost = Math.max(
                              0,
                              Number(event.target.value) || 0
                            );
                            setUnitCost(event.target.value);
                            if (!customerPriceTouched) {
                              setCustomerUnitPrice(
                                deriveCustomerUnitPriceFromMarkup(
                                  nextCost,
                                  parsedMarkup
                                ).toFixed(2)
                              );
                            }
                          }}
                          className="h-8 rounded-lg border-[#e3e3e3] pl-6 text-right text-[13px] tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-[#616161]">
                        Markup %
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={markupPercent}
                        onChange={(event) => {
                          const nextMarkup = Math.max(
                            0,
                            Number(event.target.value) || 0
                          );
                          setMarkupPercent(event.target.value);
                          setCustomerPriceTouched(false);
                          setCustomerUnitPrice(
                            deriveCustomerUnitPriceFromMarkup(
                              parsedUnitCost,
                              nextMarkup
                            ).toFixed(2)
                          );
                        }}
                        className="h-8 rounded-lg border-[#e3e3e3] text-right text-[13px] tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-[#616161]">
                        Customer /ea
                      </Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={customerUnitPrice}
                          onChange={(event) => {
                            setCustomerPriceTouched(true);
                            setCustomerUnitPrice(event.target.value);
                          }}
                          className="h-8 rounded-lg border-[#e3e3e3] pl-6 text-right text-[13px] tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="px-4 py-4">
                  <ManualSizeQtyEditor
                    sizes={sizes}
                    onChange={setSizes}
                    showPricingColumns={showBlankPricing}
                    unitCost={parsedUnitCost}
                    customerUnitPrice={effectiveCustomerUnitPrice}
                    formatCurrency={formatCurrency}
                    disabled={saving}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-[12px] text-[#616161]">
                  <span>
                    {pieceCount} piece{pieceCount !== 1 ? "s" : ""}
                  </span>
                  {showBlankPricing ? (
                    <span className="tabular-nums">
                      Shop {formatCurrency(orderShopTotal)} · Customer{" "}
                      {formatCurrency(orderCustomerTotal)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ebebeb] pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 text-[13px]"
                  disabled={saving}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saving || pieceCount <= 0}
                  className={cn(
                    dashboardPrimaryButtonClass,
                    "h-9 px-4 text-[13px]"
                  )}
                  onClick={() => void saveManualItem()}
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
          )}

          {isSupplier && error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
