"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
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
import {
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
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
  buildLineItemFromCatalog,
  createLineItemId,
  guessColorKey,
  guessProductKey,
  recordToSizes,
  serializeLineItemForApi,
  sizesToRecord,
  verifyLineItemWasApplied,
} from "@/lib/line-items";
import type { LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

type SizeRecord = Record<(typeof NEW_ORDER_SIZES)[number], number>;

function emptySizes(): SizeRecord {
  return { S: 0, M: 0, L: 0, XL: 0 };
}

function existingSizesOnOrder(
  order: Order,
  productKey: string,
  colorKey: string
): SizeRecord {
  const existing = emptySizes();

  for (const item of order.lineItems) {
    if (
      guessProductKey(item) === productKey &&
      guessColorKey(item) === colorKey
    ) {
      const record = sizesToRecord(item.sizes);
      for (const size of NEW_ORDER_SIZES) {
        existing[size] += record[size];
      }
    }
  }

  return existing;
}

export function AddBlankItemDialog({
  open,
  onOpenChange,
  orderId,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  order: Order;
}) {
  const { addOrderLineItem } = useSchedule();
  const [productKey, setProductKey] =
    useState<(typeof NEW_ORDER_PRODUCTS)[number]["key"]>("g64000");
  const [colorKey, setColorKey] =
    useState<(typeof NEW_ORDER_COLORS)[number]["key"]>("heather");
  const [sizes, setSizes] = useState<SizeRecord>(emptySizes);
  const [unitCost, setUnitCost] = useState("3.85");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => NEW_ORDER_PRODUCTS.find((product) => product.key === productKey),
    [productKey]
  );

  const existingSizes = useMemo(
    () => existingSizesOnOrder(order, productKey, colorKey),
    [order, productKey, colorKey]
  );

  const hasExistingOnOrder = Object.values(existingSizes).some((qty) => qty > 0);

  useEffect(() => {
    if (!open || !selectedProduct) return;
    setUnitCost(selectedProduct.unitCost.toFixed(2));
  }, [open, selectedProduct]);

  const parsedUnitCost = Math.max(0, Number(unitCost) || 0);
  const pieceCount = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  const orderTotal = pieceCount * parsedUnitCost;

  const resetForm = () => {
    setProductKey("g64000");
    setColorKey("heather");
    setSizes(emptySizes());
    setUnitCost("3.85");
    setError(null);
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
      sizes: recordToSizes(sizes),
    });
  };

  const submit = async () => {
    const item = buildItem();
    if (!item) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await addOrderLineItem(orderId, item);
      if (!verifyLineItemWasApplied(order.lineItems, updated.lineItems, item)) {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>Add Items</DialogTitle>
          <p className={dashboardTaskDetailClass}>
            Choose a catalog blank, set quantities by size, and confirm cost.
            {hasExistingOnOrder
              ? " On order shows what is already on this order for the selected product and color."
              : null}
          </p>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
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
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
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
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
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
                  Quantity &amp; cost
                </p>
                <p className="mt-0.5 text-[12px] text-[#616161]">
                  Cost is used for markup and order totals after the item is
                  added.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-medium text-[#616161]">
                  Unit cost
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
                    onChange={(event) => setUnitCost(event.target.value)}
                    className="h-8 w-24 rounded-lg border-[#e3e3e3] pl-6 text-right text-[13px] tabular-nums"
                  />
                </div>
              </div>
            </div>

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
                    <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                      Unit cost
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NEW_ORDER_SIZES.map((size) => {
                    const qty = sizes[size];
                    const onOrder = existingSizes[size];
                    const lineTotal = qty * parsedUnitCost;

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
                        <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                          {formatCurrency(parsedUnitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
                          {qty > 0 ? formatCurrency(lineTotal) : "—"}
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
                      {pieceCount} piece{pieceCount !== 1 ? "s" : ""} to add
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(orderTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            disabled={saving}
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
            onClick={() => submit()}
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
      </DialogContent>
    </Dialog>
  );
}
