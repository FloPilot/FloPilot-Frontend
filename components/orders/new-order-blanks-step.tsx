"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  BLANK_SOURCE_OPTIONS,
  createLineItemDraftId,
  formatLineItemInputLabel,
  lineItemInputPieceCount,
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
  type NewOrderFormInput,
  type NewOrderLineItemInput,
} from "@/lib/create-order";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import type { BlankSource } from "@/types";
import { cn } from "@/lib/utils";

type SizeRecord = Record<(typeof NEW_ORDER_SIZES)[number], number>;

function emptySizes(): SizeRecord {
  return { S: 0, M: 0, L: 0, XL: 0 };
}

export function NewOrderBlanksStep({
  form,
  onChange,
  highlightBlankSource = false,
  showBlankSourcePrompt = false,
}: {
  form: NewOrderFormInput;
  onChange: (patch: Partial<NewOrderFormInput>) => void;
  highlightBlankSource?: boolean;
  showBlankSourcePrompt?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [productKey, setProductKey] =
    useState<(typeof NEW_ORDER_PRODUCTS)[number]["key"]>("g64000");
  const [colorKey, setColorKey] =
    useState<(typeof NEW_ORDER_COLORS)[number]["key"]>("heather");
  const [sizes, setSizes] = useState<SizeRecord>(emptySizes);
  const [unitCost, setUnitCost] = useState("3.85");
  const [draftError, setDraftError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => NEW_ORDER_PRODUCTS.find((product) => product.key === productKey),
    [productKey]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setUnitCost(selectedProduct.unitCost.toFixed(2));
  }, [selectedProduct]);

  const parsedUnitCost = Math.max(0, Number(unitCost) || 0);
  const draftPieceCount = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  const draftTotal = draftPieceCount * parsedUnitCost;
  const activeItems = form.lineItems.filter(
    (item) => lineItemInputPieceCount(item) > 0
  );

  const resetDraft = () => {
    setProductKey("g64000");
    setColorKey("heather");
    setSizes(emptySizes());
    setUnitCost("3.85");
    setDraftError(null);
  };

  const openAddModal = () => {
    resetDraft();
    setAddOpen(true);
  };

  const addLineItem = () => {
    if (draftPieceCount <= 0) {
      setDraftError("Enter a quantity for at least one size.");
      return;
    }

    const item: NewOrderLineItemInput = {
      id: createLineItemDraftId(),
      productKey,
      colorKey,
      sizes: { ...sizes },
      unitCost: parsedUnitCost,
    };

    onChange({ lineItems: [...form.lineItems, item] });
    resetDraft();
    setAddOpen(false);
  };

  const removeLineItem = (id: string) => {
    const nextItems = form.lineItems.filter((item) => item.id !== id);
    onChange({
      lineItems: nextItems,
      blankSource:
        nextItems.some((item) => lineItemInputPieceCount(item) > 0)
          ? form.blankSource
          : undefined,
      jobs: form.jobs.map((job) => ({
        ...job,
        lineItemIds: (job.lineItemIds ?? []).filter((lineId) => lineId !== id),
      })),
    });
  };

  return (
    <div className="space-y-5">
      {activeItems.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Blanks/garments on this order ({activeItems.length})
          </p>
          <div className="space-y-2">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#303030]">
                      {formatLineItemInputLabel(item)}
                    </p>
                    <p className="text-[12px] text-[#616161]">
                      {formatCurrency(item.unitCost)} / unit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLineItem(item.id)}
                  className="rounded-lg p-2 text-[#8a8a8a] transition-colors hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                  aria-label="Remove blank/garment"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
          <p className="text-[13px] font-medium text-[#303030]">
            No blanks/garments yet — optional
          </p>
          <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
            Add catalog blanks/garments now, or skip and add them from the order
            detail page later.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className={cn(
          dashboardControlClass,
          "h-10 w-full justify-center border-dashed sm:w-auto"
        )}
        onClick={openAddModal}
      >
        <Plus className="size-3.5" />
        Add blanks/garments
      </Button>

      {activeItems.length > 0 ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-4 transition-colors",
            showBlankSourcePrompt && !form.blankSource
              ? highlightBlankSource
                ? "border-[#f5b5b5] bg-[#fff1f1] ring-1 ring-[#f5b5b5]/60"
                : "border-[#f5c5c5] bg-[#fff8f8]"
              : "border-[#ebebeb] bg-[#fafafa]"
          )}
        >
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              Who is ordering the blank garments?
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Required when blanks/garments are on the order — drives receiving
              and materials checkpoints.
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {BLANK_SOURCE_OPTIONS.map((option) => {
              const selected = form.blankSource === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({ blankSource: option.value as BlankSource })
                  }
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-brand-primary/30 bg-white ring-1 ring-brand-primary/15"
                      : showBlankSourcePrompt && !form.blankSource
                        ? "border-[#f5b5b5] bg-white hover:border-[#e08a8a]"
                        : "border-[#e3e3e3] bg-white hover:border-[#c9c9c9]"
                  )}
                >
                  <p className="text-[13px] font-semibold text-[#303030]">
                    {option.label}
                  </p>
                </button>
              );
            })}
          </div>
          {highlightBlankSource ? (
            <p className="mt-3 text-[13px] font-medium text-[#8f1f1f]">
              Choose one before continuing.
            </p>
          ) : showBlankSourcePrompt && !form.blankSource ? (
            <p className="mt-3 text-[13px] text-[#8f1f1f]">
              Select who is ordering blanks/garments to continue.
            </p>
          ) : null}
        </div>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              Add blanks/garments
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Choose a catalog blank, set quantities by size, and confirm cost.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="rounded-lg border border-[#ebebeb]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                    <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                      Size
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                      Qty
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
                    const lineTotal = qty * parsedUnitCost;
                    return (
                      <tr
                        key={size}
                        className="border-b border-[#ebebeb] last:border-0"
                      >
                        <td className="px-4 py-3 font-semibold text-[#303030]">
                          {size}
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
                      colSpan={3}
                      className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
                    >
                      {draftPieceCount} piece{draftPieceCount !== 1 ? "s" : ""}{" "}
                      to add
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(draftTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
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

            {draftError ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {draftError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
              onClick={addLineItem}
            >
              <Plus className="size-3.5" />
              Add to order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
