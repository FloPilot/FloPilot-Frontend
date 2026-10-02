"use client";

import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  PAYMENT_TERMS_PRESETS,
  normalizePaymentTerms,
  paymentTermsSummary,
} from "@/lib/payment-terms";
import { cn } from "@/lib/utils";

export function CustomerPaymentTermsSection({
  paymentTermsLabel,
  paymentTermsDays,
  onChange,
  className,
}: {
  paymentTermsLabel?: string | null;
  paymentTermsDays?: number | null;
  onChange: (next: {
    paymentTermsLabel: string | null;
    paymentTermsDays: number | null;
  }) => void;
  className?: string;
}) {
  const current = normalizePaymentTerms({
    label: paymentTermsLabel,
    days: paymentTermsDays,
  });
  const summary = paymentTermsSummary(current);

  const applyLabel = (raw: string) => {
    const next = normalizePaymentTerms({ label: raw });
    onChange({
      paymentTermsLabel: next.label || null,
      paymentTermsDays: next.days,
    });
  };

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
          <CalendarClock className="size-4 text-[#2c6ecb]" />
          Payment terms
        </h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          How soon invoices are due for this account — for example Net 30.
          New orders inherit these terms, and QuickBooks due dates follow them
          when you push an invoice.
        </p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className={cn(dashboardInsetSurfaceClass, "space-y-3 rounded-lg p-3.5")}>
          <div className="space-y-1.5">
            <Label
              htmlFor="customer-payment-terms"
              className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]"
            >
              Terms
            </Label>
            <Input
              id="customer-payment-terms"
              value={current.label}
              onChange={(event) => applyLabel(event.target.value)}
              placeholder="e.g. Net 30"
              className={cn(dashboardControlClass, "h-10 w-full max-w-md shadow-none")}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_TERMS_PRESETS.map((preset) => {
              const selected =
                current.days === preset.days &&
                current.label.toLowerCase() === preset.label.toLowerCase();
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      paymentTermsLabel: preset.label,
                      paymentTermsDays: preset.days,
                    })
                  }
                  className={cn(
                    dashboardControlClass,
                    "h-8 px-2.5 text-[12px]",
                    selected &&
                      "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            {current.label ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ paymentTermsLabel: null, paymentTermsDays: null })
                }
                className={cn(
                  dashboardControlClass,
                  "h-8 px-2.5 text-[12px] text-[#616161]"
                )}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <p className={dashboardTaskDetailClass}>
          {summary
            ? summary
            : "No terms set yet — invoice due dates will keep using the order’s in-hands date until you add terms."}
        </p>
      </div>
    </section>
  );
}
