"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { AddSsBlankPanel } from "@/components/orders/add-ss-blank-panel";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSupplierIntegrations } from "@/lib/api";
import {
  createLineItemDraftId,
  draftLineItemsToLineItems,
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
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
  buildLineItemFromCatalog,
  createLineItemId,
  guessColorKey,
  guessProductKey,
  recordToSizes,
  serializeLineItemForApi,
  verifyLineItemWasApplied,
} from "@/lib/line-items";
import type { BlankSource, LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

type SizeRecord = Record<(typeof NEW_ORDER_SIZES)[number], number>;
type AddSource = "manual" | "ss";

function emptySizes(): SizeRecord {
  return { S: 0, M: 0, L: 0, XL: 0 };
}

function existingSizesOnOrder(
  lineItems: LineItem[],
  productKey: string,
  colorKey: string
): SizeRecord {
  const existing = emptySizes();

  for (const item of lineItems) {
    if (
      guessProductKey(item) === productKey &&
      guessColorKey(item) === colorKey
    ) {
      const record = Object.fromEntries(
        NEW_ORDER_SIZES.map((size) => [size, 0])
      ) as SizeRecord;
      for (const row of item.sizes) {
        if (row.size in record) {
          record[row.size as (typeof NEW_ORDER_SIZES)[number]] += row.quantity;
        }
      }
      for (const size of NEW_ORDER_SIZES) {
        existing[size] += record[size];
      }
    }
  }

  return existing;
}

function SourceTabs({
  source,
  ssConnected,
  onChange,
}: {
  source: AddSource;
  ssConnected: boolean;
  onChange: (source: AddSource) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-[#ebebeb] bg-[#f6f6f7] p-1">
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={cn(
          "flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
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
          "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
          source === "ss"
            ? "bg-white text-[#303030] shadow-sm"
            : "text-[#616161] hover:text-[#303030]"
        )}
      >
        S&amp;S Activewear
        {ssConnected ? (
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
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [productKey, setProductKey] =
    useState<(typeof NEW_ORDER_PRODUCTS)[number]["key"]>("g64000");
  const [colorKey, setColorKey] =
    useState<(typeof NEW_ORDER_COLORS)[number]["key"]>("heather");
  const [sizes, setSizes] = useState<SizeRecord>(emptySizes);
  const [unitCost, setUnitCost] = useState("3.85");
  const [markupPercent, setMarkupPercent] = useState(
    String(shopDefaultMarkup)
  );
  const [customerUnitPrice, setCustomerUnitPrice] = useState("");
  const [customerPriceTouched, setCustomerPriceTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => NEW_ORDER_PRODUCTS.find((product) => product.key === productKey),
    [productKey]
  );

  const existingSizes = useMemo(
    () => existingSizesOnOrder(contextLineItems, productKey, colorKey),
    [contextLineItems, productKey, colorKey]
  );

  const hasExistingOnOrder = Object.values(existingSizes).some((qty) => qty > 0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadIntegrations() {
      setLoadingIntegrations(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { integrations } = await fetchSupplierIntegrations(token);
        const connected = integrations.some(
          (entry) =>
            entry.provider === "ssActivewear" && entry.status === "connected"
        );
        if (!cancelled) {
          setSsConnected(connected);
          setSource(connected ? "ss" : "manual");
        }
      } catch {
        if (!cancelled) {
          setSsConnected(false);
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
    if (!open || !selectedProduct) return;
    setUnitCost(selectedProduct.unitCost.toFixed(2));
    setMarkupPercent(String(shopDefaultMarkup));
    setCustomerPriceTouched(false);
    setCustomerUnitPrice(
      deriveCustomerUnitPriceFromMarkup(
        selectedProduct.unitCost,
        shopDefaultMarkup
      ).toFixed(2)
    );
  }, [open, selectedProduct, shopDefaultMarkup]);

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
    setProductKey("g64000");
    setColorKey("heather");
    setSizes(emptySizes());
    setUnitCost("3.85");
    setMarkupPercent(String(shopDefaultMarkup));
    setCustomerPriceTouched(false);
    setCustomerUnitPrice(
      deriveCustomerUnitPriceFromMarkup(3.85, shopDefaultMarkup).toFixed(2)
    );
    setError(null);
    setSource(ssConnected ? "ss" : "manual");
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
    if (pieceCount <= 0) {
      setError("Enter a quantity for at least one size.");
      return null;
    }

    const item = buildLineItemFromCatalog(
      productKey,
      colorKey,
      sizes,
      createLineItemId()
    );

    return serializeLineItemForApi({
      ...item,
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
          productKey,
          colorKey,
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
          source === "ss" ? "sm:max-w-4xl" : "sm:max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>Add blanks</DialogTitle>
          <p className={dashboardTaskDetailClass}>
            {source === "ss"
              ? "Search the S&S catalog with your account pricing and live inventory."
              : "Choose a catalog blank, set quantities by size, and confirm cost."}
            {source === "manual" && hasExistingOnOrder
              ? " On order shows what is already on this order for the selected product and color."
              : null}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1",
            source === "ss" && ssConnected && !loadingIntegrations
              ? "flex flex-col gap-3 overflow-hidden px-5 py-4"
              : "overflow-y-auto px-5 py-4"
          )}
        >
          <div className="shrink-0">
            <SourceTabs
              source={source}
              ssConnected={ssConnected}
              onChange={setSource}
            />
          </div>

          {loadingIntegrations ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              Checking supplier connections…
            </div>
          ) : source === "ss" ? (
            ssConnected ? (
              <div className="min-h-0 flex-1">
                <AddSsBlankPanel
                  lineItems={contextLineItems}
                  saving={saving}
                  onAdd={submitSsItem}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#d4d4d4] px-6 py-10 text-center">
                <p className="text-[14px] font-semibold text-[#303030]">
                  Connect S&amp;S Activewear first
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#616161]">
                  Add your S&amp;S API credentials in Settings to search styles,
                  see live stock, and pull your customer pricing into orders.
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
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Product
                  </Label>
                  <Select
                    value={productKey}
                    onValueChange={(value) => {
                      if (value) {
                        setProductKey(
                          value as (typeof NEW_ORDER_PRODUCTS)[number]["key"]
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        dashboardControlClass,
                        "h-10 w-full justify-between"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_ORDER_PRODUCTS.map((product) => (
                        <SelectItem key={product.key} value={product.key}>
                          {product.brand} — {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Color
                  </Label>
                  <Select
                    value={colorKey}
                    onValueChange={(value) => {
                      if (value) {
                        setColorKey(
                          value as (typeof NEW_ORDER_COLORS)[number]["key"]
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        dashboardControlClass,
                        "h-10 w-full justify-between"
                      )}
                    >
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_ORDER_COLORS.map((color) => (
                        <SelectItem key={color.key} value={color.key}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
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

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-[13px]">
                    <thead>
                      <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                        <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                          Size
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                          On order
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                          Add
                        </th>
                        {showBlankPricing ? (
                          <>
                            <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                              Blank cost
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                              Customer cost
                            </th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {NEW_ORDER_SIZES.map((size) => {
                        const qty = sizes[size];
                        const onOrder = existingSizes[size];
                        const shopLineTotal = qty * parsedUnitCost;
                        const customerLineTotal = qty * effectiveCustomerUnitPrice;

                        return (
                          <tr
                            key={size}
                            className="border-b border-[#ebebeb] last:border-0"
                          >
                            <td className="px-4 py-3 font-semibold text-[#303030]">
                              {size}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                              {onOrder > 0 ? (
                                <span className="font-medium text-[#303030]">
                                  {onOrder}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min={0}
                                value={qty || ""}
                                placeholder="0"
                                onChange={(event) => {
                                  const next = Math.max(
                                    0,
                                    parseInt(event.target.value, 10) || 0
                                  );
                                  setSizes((current) => ({
                                    ...current,
                                    [size]: next,
                                  }));
                                }}
                                className="ml-auto h-8 w-20 rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
                              />
                            </td>
                            {showBlankPricing ? (
                              <>
                                <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                                  {qty > 0 ? formatCurrency(shopLineTotal) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
                                  {qty > 0
                                    ? formatCurrency(customerLineTotal)
                                    : "—"}
                                </td>
                              </>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                    {showBlankPricing ? (
                      <tfoot>
                        <tr className="bg-[#fafafa]">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
                          >
                            {pieceCount} piece{pieceCount !== 1 ? "s" : ""} to add
                          </td>
                          <td className="px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                            {formatCurrency(orderShopTotal)}
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                            {formatCurrency(orderCustomerTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    ) : (
                      <tfoot>
                        <tr className="bg-[#fafafa]">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
                          >
                            {pieceCount} piece{pieceCount !== 1 ? "s" : ""} to add
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                  {error}
                </p>
              ) : null}
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
