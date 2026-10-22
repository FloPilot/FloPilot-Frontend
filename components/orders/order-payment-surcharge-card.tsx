"use client";

import { useMemo } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import {
  calculatePaymentSurchargeFromPercent,
  DEFAULT_PAYMENT_SURCHARGE_LABEL,
  DEFAULT_PAYMENT_SURCHARGE_PERCENT,
  emptyPaymentSurcharge,
  formatSurchargePercent,
  isPaymentSurchargeLocked,
  paymentSurchargeNeedsRecalc,
  resolvePaymentSurchargeAmount,
  unlockAndRecalculateSurcharge,
} from "@/lib/order-payment-surcharge";
import type { OrderPaymentSurcharge } from "@/types";
import { cn } from "@/lib/utils";

export function OrderPaymentSurchargeCard({
  value,
  baseSubtotal,
  onChange,
  disabled,
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  value: OrderPaymentSurcharge | null | undefined;
  /** Pre-surcharge estimate subtotal (garments + decoration + fees). */
  baseSubtotal: number;
  onChange: (next: OrderPaymentSurcharge | null) => void;
  disabled?: boolean;
  dirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}) {
  const surcharge = value ?? emptyPaymentSurcharge();
  const enabled = surcharge.enabled === true;
  const locked = isPaymentSurchargeLocked(surcharge);
  const liveAmount = calculatePaymentSurchargeFromPercent(
    baseSubtotal,
    surcharge.percent
  );
  const effectiveAmount = resolvePaymentSurchargeAmount(
    surcharge,
    baseSubtotal
  );
  const needsRecalc = paymentSurchargeNeedsRecalc(surcharge, baseSubtotal);

  const percentDisplay = useMemo(
    () => formatSurchargePercent(surcharge.percent),
    [surcharge.percent]
  );

  const patch = (partial: Partial<OrderPaymentSurcharge>) => {
    onChange({
      ...surcharge,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <section
      className={cn(
        dashboardInsetSurfaceClass,
        "rounded-xl border border-[#e3e3e3] p-4 sm:p-5"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              enabled ? "bg-[#f4f7fd] text-[#2c6ecb]" : "bg-[#f6f6f7] text-[#8a8a8a]"
            )}
          >
            <CreditCard className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#303030]">
              Payment surcharge
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Add a processing fee (typically 3%) on the estimate subtotal.
              Recalculates when blanks or fees change — unless you lock a custom
              amount.
            </p>
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] font-medium text-[#303030]">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.checked) {
                onChange(
                  emptyPaymentSurcharge({
                    enabled: true,
                    percent:
                      surcharge.percent || DEFAULT_PAYMENT_SURCHARGE_PERCENT,
                    label:
                      surcharge.label || DEFAULT_PAYMENT_SURCHARGE_LABEL,
                    amountOverride: null,
                  })
                );
              } else {
                onChange({
                  ...surcharge,
                  enabled: false,
                  amountOverride: null,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
            className="size-4 rounded border-[#c9c9c9]"
          />
          Include on estimate
        </label>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem_8.5rem]">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Line label
              </Label>
              <Input
                value={surcharge.label}
                disabled={disabled}
                placeholder={DEFAULT_PAYMENT_SURCHARGE_LABEL}
                className={cn(dashboardControlClass, "h-10")}
                onChange={(event) => patch({ label: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Percent
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  value={percentDisplay}
                  disabled={disabled}
                  className={cn(
                    dashboardControlClass,
                    "h-10 pr-8 text-right tabular-nums"
                  )}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    patch({
                      percent: Number.isFinite(next)
                        ? Math.min(100, Math.max(0, next))
                        : DEFAULT_PAYMENT_SURCHARGE_PERCENT,
                      // Changing percent unlocks so the new rate applies.
                      amountOverride: null,
                    });
                  }}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Amount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={
                    locked
                      ? String(surcharge.amountOverride ?? "")
                      : String(liveAmount || "")
                  }
                  disabled={disabled}
                  className={cn(
                    dashboardControlClass,
                    "h-10 pl-7 text-right tabular-nums",
                    locked && "border-[#c9d7ef] bg-[#f4f7fd]"
                  )}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (raw === "") {
                      patch({ amountOverride: null });
                      return;
                    }
                    const next = Number(raw);
                    if (!Number.isFinite(next) || next < 0) return;
                    patch({ amountOverride: Math.round(next * 100) / 100 });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[12px] text-[#616161]">
                Base subtotal{" "}
                <span className="font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(baseSubtotal)}
                </span>
                {" · "}
                {locked ? (
                  <span className="text-[#2c6ecb]">
                    Locked at {formatCurrency(effectiveAmount)}
                  </span>
                ) : (
                  <span>
                    {percentDisplay}% ={" "}
                    <span className="font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(liveAmount)}
                    </span>
                  </span>
                )}
              </p>
              {needsRecalc ? (
                <p className="mt-0.5 text-[12px] font-medium text-[#8a6116]">
                  Order total changed — locked amount no longer matches{" "}
                  {percentDisplay}%.
                </p>
              ) : null}
            </div>
            {locked ? (
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
                disabled={disabled || saving}
                onClick={() =>
                  onChange(unlockAndRecalculateSurcharge(surcharge))
                }
              >
                <RefreshCw className="size-3.5" />
                Recalculate
              </Button>
            ) : (
              <span
                className={cn(
                  dashboardPrimaryButtonClass,
                  "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[12px]"
                )}
              >
                {formatCurrency(effectiveAmount)} on estimate
              </span>
            )}
          </div>
        </div>
      ) : null}

      {dirty && onSave ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] pt-3.5">
          <p className="text-[12px] text-[#616161]">
            Unsaved surcharge changes — totals preview above already reflects
            them.
          </p>
          <div className="flex items-center gap-2">
            {onDiscard ? (
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-8 text-[12px]")}
                disabled={saving}
                onClick={onDiscard}
              >
                Discard
              </Button>
            ) : null}
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save surcharge"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
