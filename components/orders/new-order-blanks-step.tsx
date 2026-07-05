"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { AddBlankItemDialog } from "@/components/orders/add-blank-item-dialog";
import { Button } from "@/components/ui/button";
import {
  BLANK_SOURCE_OPTIONS,
  draftLineItemToLineItem,
  formatLineItemInputLabel,
  lineItemInputPieceCount,
  type NewOrderFormInput,
} from "@/lib/create-order";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { resolveLineItemCustomerUnitPrice } from "@/lib/blank-pricing";
import { formatCurrency } from "@/lib/format";
import type { BlankSource } from "@/types";
import { cn } from "@/lib/utils";

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
  const { settings } = useShopSettings();
  const shopDefaultMarkup = settings.pricingMatrix.blankMarkupPercent ?? 0;
  const showBlankPricing = form.blankSource !== "customer_supplies";
  const [addOpen, setAddOpen] = useState(false);

  const activeItems = useMemo(
    () => form.lineItems.filter((item) => lineItemInputPieceCount(item) > 0),
    [form.lineItems]
  );

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
                      {showBlankPricing
                        ? `${formatCurrency(
                            resolveLineItemCustomerUnitPrice(
                              draftLineItemToLineItem(item),
                              shopDefaultMarkup
                            )
                          )} / unit to customer`
                        : "Customer supplies garments — decoration only"}
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
            Add catalog or S&amp;S blanks now, or skip and add them from the
            order detail page later.
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
        onClick={() => setAddOpen(true)}
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

      <AddBlankItemDialog
        mode="draft"
        open={addOpen}
        onOpenChange={setAddOpen}
        blankSource={form.blankSource}
        draftLineItems={form.lineItems}
        onAdd={(item) => {
          onChange({ lineItems: [...form.lineItems, item] });
        }}
      />
    </div>
  );
}
