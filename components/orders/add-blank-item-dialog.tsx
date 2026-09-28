"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { AddSsBlankPanel } from "@/components/orders/add-ss-blank-panel";
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
import { fetchSupplierIntegrations } from "@/lib/api";
import {
  isSanMarIntegrationUsable,
  isSsIntegrationUsable,
} from "@/lib/supplier-integrations";
import {
  createLineItemDraftId,
  draftLineItemsToLineItems,
  emptyManualSizeRecord,
  type ManualSizeQtyRecord,
  type NewOrderCatalogLineItemInput,
  type NewOrderLineItemInput,
} from "@/lib/create-order";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import {
  applyDefaultBlankMarkup,
  deriveCustomerUnitPriceFromMarkup,
  shouldShowBlankPricing,
  shouldShowBlankPricingForBlankSource,
} from "@/lib/blank-pricing";
import {
  createLineItemId,
  recordToSizes,
  serializeLineItemForApi,
  verifyLineItemWasApplied,
} from "@/lib/line-items";
import type { BlankSource, LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

type AddSource = "manual" | "ss" | "sanmar";

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase();
}

function existingSizesOnOrder(
  lineItems: LineItem[],
  productName: string,
  color: string
): ManualSizeQtyRecord {
  const productMatch = normalizeMatch(productName);
  const colorMatch = normalizeMatch(color);
  if (!productMatch || !colorMatch) return {};

  const existing: ManualSizeQtyRecord = {};

  for (const item of lineItems) {
    if (
      normalizeMatch(item.productName) === productMatch &&
      normalizeMatch(item.color) === colorMatch
    ) {
      for (const row of item.sizes) {
        const size = row.size?.trim();
        if (!size) continue;
        existing[size] = (existing[size] || 0) + row.quantity;
      }
    }
  }

  return existing;
}

function SourceTabs({
  source,
  ssConnected,
  sanMarConnected,
  onChange,
}: {
  source: AddSource;
  ssConnected: boolean;
  sanMarConnected: boolean;
  onChange: (source: AddSource) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-[#ebebeb] bg-[#f6f6f7] p-1">
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={cn(
          "min-w-[7rem] flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
          source === "manual"
            ? "bg-white text-[#303030] shadow-sm"
            : "text-[#616161] hover:text-[#303030]"
        )}
      >
        Manual catalog
      </button>
      <button
        type="button"
        onClick={() => onChange("ss")}
        className={cn(
          "flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
          source === "ss"
            ? "bg-white text-[#303030] shadow-sm"
            : "text-[#616161] hover:text-[#303030]"
        )}
      >
        S&amp;S
        {ssConnected ? (
          <span className="rounded bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
            Live
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onChange("sanmar")}
        className={cn(
          "flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
          source === "sanmar"
            ? "bg-white text-[#303030] shadow-sm"
            : "text-[#616161] hover:text-[#303030]"
        )}
      >
        SanMar
        {sanMarConnected ? (
          <span className="rounded bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
            Live
          </span>
        ) : null}
      </button>
    </div>
  );
}

type AddBlankItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & (
  | {
      mode?: "order";
      orderId: string;
      order: Order;
    }
  | {
      mode: "draft";
      blankSource?: BlankSource;
      draftLineItems: NewOrderLineItemInput[];
      onAdd: (item: NewOrderLineItemInput) => void;
    }
);

export function AddBlankItemDialog(props: AddBlankItemDialogProps) {
  const { open, onOpenChange } = props;
  const isDraft = props.mode === "draft";
  const order = isDraft ? null : props.order;
  const orderId = isDraft ? "" : props.orderId;
  const contextLineItems = isDraft
    ? draftLineItemsToLineItems(props.draftLineItems)
    : order!.lineItems;
  const showBlankPricing = isDraft
    ? shouldShowBlankPricingForBlankSource(props.blankSource)
    : shouldShowBlankPricing(order!);
  const onAddDraft = isDraft ? props.onAdd : undefined;
  const { getIdToken } = useAuth();
  const { settings } = useShopSettings();
  const shopDefaultMarkup = settings.pricingMatrix.blankMarkupPercent ?? 0;
  const { addOrderLineItem } = useSchedule();
  const [source, setSource] = useState<AddSource>("manual");
  const [ssConnected, setSsConnected] = useState(false);
  const [sanMarConnected, setSanMarConnected] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [productName, setProductName] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState<ManualSizeQtyRecord>(emptyManualSizeRecord);
  const [unitCost, setUnitCost] = useState("0");
  const [markupPercent, setMarkupPercent] = useState(
    String(shopDefaultMarkup)
  );
  const [customerUnitPrice, setCustomerUnitPrice] = useState("");
  const [customerPriceTouched, setCustomerPriceTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const existingSizes = useMemo(
    () => existingSizesOnOrder(contextLineItems, productName, color),
    [contextLineItems, productName, color]
  );

  const hasExistingOnOrder = Object.values(existingSizes).some((qty) => qty > 0);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadIntegrations() {
      setLoadingIntegrations(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { integrations } = await fetchSupplierIntegrations(token);
        const ssEntry = integrations.find(
          (entry) => entry.provider === "ssActivewear"
        );
        const sanMarEntry = integrations.find(
          (entry) => entry.provider === "sanMar"
        );
        const ssOk = isSsIntegrationUsable(ssEntry);
        const sanMarOk = isSanMarIntegrationUsable(sanMarEntry);
        if (!cancelled) {
          setSsConnected(ssOk);
          setSanMarConnected(sanMarOk);
          setSource("manual");
        }
      } catch {
        if (!cancelled) {
          setSsConnected(false);
          setSanMarConnected(false);
          setSource("manual");
        }
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    }

    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, [open, getIdToken]);

  useEffect(() => {
    if (!open) return;
    setMarkupPercent(String(shopDefaultMarkup));
    setCustomerPriceTouched(false);
    setCustomerUnitPrice(
      deriveCustomerUnitPriceFromMarkup(0, shopDefaultMarkup).toFixed(2)
    );
  }, [open, shopDefaultMarkup]);

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

  const resetForm = () => {
    setProductName("");
    setColor("");
    setSizes(emptyManualSizeRecord());
    setUnitCost("0");
    setMarkupPercent(String(shopDefaultMarkup));
    setCustomerPriceTouched(false);
    setCustomerUnitPrice(
      deriveCustomerUnitPriceFromMarkup(0, shopDefaultMarkup).toFixed(2)
    );
    setError(null);
    setSource("manual");
  };

  const blankPricingFields = () => {
    if (!showBlankPricing) return {};
    if (customerPriceTouched) {
      return { customerUnitPrice: effectiveCustomerUnitPrice };
    }
    return { markupPercent: parsedMarkup };
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  };

  const buildItem = (): LineItem | null => {
    const trimmedProduct = productName.trim();
    const trimmedColor = color.trim();

    if (!trimmedProduct) {
      setError("Enter a product name.");
      return null;
    }
    if (!trimmedColor) {
      setError("Enter a color.");
      return null;
    }
    if (pieceCount <= 0) {
      setError("Enter a quantity for at least one size.");
      return null;
    }

    return serializeLineItemForApi({
      id: createLineItemId(),
      productName: trimmedProduct,
      brand: "",
      color: trimmedColor,
      unitCost: parsedUnitCost,
      ...blankPricingFields(),
      sizes: recordToSizes(sizes),
    });
  };

  const submitManual = async () => {
    const item = buildItem();
    if (!item) return;

    setSaving(true);
    setError(null);
    try {
      if (isDraft && onAddDraft) {
        const draftItem: NewOrderCatalogLineItemInput = {
          id: createLineItemDraftId(),
          productName: item.productName,
          brand: item.brand,
          color: item.color,
          sizes: { ...sizes },
          unitCost: parsedUnitCost,
          ...blankPricingFields(),
        };
        onAddDraft(draftItem);
        handleOpenChange(false);
        return;
      }

      const updated = await addOrderLineItem(orderId, item);
      if (
        !verifyLineItemWasApplied(
          order!.lineItems,
          updated.lineItems,
          item
        )
      ) {
        throw new Error(
          "The server did not save the blank quantities you entered. Refresh and try again."
        );
      }
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setSaving(false);
    }
  };

  const submitSsItem = async (item: LineItem) => {
    setSaving(true);
    setError(null);
    try {
      const payload = serializeLineItemForApi(
        showBlankPricing
          ? applyDefaultBlankMarkup(item, shopDefaultMarkup)
          : item
      );

      if (isDraft && onAddDraft) {
        onAddDraft({
          id: payload.id,
          source: "supplier",
          item: payload,
          ...(customerPriceTouched
            ? { customerUnitPrice: payload.customerUnitPrice }
            : { markupPercent: payload.markupPercent }),
        });
        handleOpenChange(false);
        return;
      }

      const updated = await addOrderLineItem(orderId, payload);
      if (
        !verifyLineItemWasApplied(
          order!.lineItems,
          updated.lineItems,
          payload
        )
      ) {
        throw new Error(
          "The server did not save the blank quantities you entered. Refresh and try again."
        );
      }
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(90vh,820px)] max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0",
          source === "ss" || source === "sanmar" ? "sm:max-w-4xl" : "sm:max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>Add blanks</DialogTitle>
          <p className={dashboardTaskDetailClass}>
            {source === "ss"
              ? "Search the S&S catalog with your account pricing and live inventory."
              : source === "sanmar"
                ? "Search SanMar by style number or brand with your net pricing and inventory."
              : "Enter a product and color, set quantities by size, and confirm cost."}
            {source === "manual" && hasExistingOnOrder
              ? " On order shows what is already on this order for the same product and color."
              : null}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1",
            ((source === "ss" && ssConnected) ||
              (source === "sanmar" && sanMarConnected)) &&
              !loadingIntegrations
              ? "flex flex-col gap-3 overflow-hidden px-5 py-4"
              : "overflow-y-auto px-5 py-4"
          )}
        >
          <div className="shrink-0">
            <SourceTabs
              source={source}
              ssConnected={ssConnected}
              sanMarConnected={sanMarConnected}
              onChange={setSource}
            />
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              className="sticky top-0 z-10 mt-3 shrink-0 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2.5 text-[13px] font-medium text-[#8f1f1f] shadow-sm"
            >
              {error}
            </div>
          ) : null}

          {loadingIntegrations ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              Checking supplier connections…
            </div>
          ) : source === "ss" || source === "sanmar" ? (
            (source === "ss" ? ssConnected : sanMarConnected) ? (
              <div className="min-h-0 flex-1">
                <AddSsBlankPanel
                  provider={source === "sanmar" ? "sanMar" : "ssActivewear"}
                  lineItems={contextLineItems}
                  saving={saving}
                  onAdd={submitSsItem}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#d4d4d4] px-6 py-10 text-center">
                <p className="text-[14px] font-semibold text-[#303030]">
                  {source === "sanmar"
                    ? "Connect SanMar first"
                    : "Connect S&S Activewear first"}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#616161]">
                  {source === "sanmar"
                    ? "Add your SanMar customer number and SanMar.com login in Settings after web services access is enabled."
                    : "Add your S&S API credentials in Settings to search styles, see live stock, and pull your customer pricing into orders."}
                </p>
                <Link
                  href="/app/settings/integrations"
                  className={cn(
                    dashboardPrimaryButtonClass,
                    "mt-4 inline-flex h-9 items-center gap-1.5 px-4 text-[13px]"
                  )}
                  onClick={() => handleOpenChange(false)}
                >
                  Open integrations
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            )
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
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

              <div
                className={cn(
                  dashboardInsetSurfaceClass,
                  "mt-5 overflow-hidden"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Quantity{showBlankPricing ? " & pricing" : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#616161]">
                      {showBlankPricing
                        ? "Set shop blank cost, markup, and customer price for this item."
                        : "Customer supplies garments — track quantities only."}
                    </p>
                  </div>
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
                      <div className="relative">
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
                          className="h-8 rounded-lg border-[#e3e3e3] pr-7 text-right text-[13px] tabular-nums"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-[#616161]">
                        Customer price
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

                <ManualSizeQtyEditor
                  sizes={sizes}
                  onChange={setSizes}
                  existingBySize={existingSizes}
                  showPricingColumns={showBlankPricing}
                  unitCost={parsedUnitCost}
                  customerUnitPrice={effectiveCustomerUnitPrice}
                  formatCurrency={formatCurrency}
                  disabled={saving}
                />
              </div>
            </>
          )}
        </div>

        {source === "manual" && !loadingIntegrations ? (
          <div className="flex shrink-0 justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              disabled={saving}
              className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
              onClick={() => void submitManual()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
