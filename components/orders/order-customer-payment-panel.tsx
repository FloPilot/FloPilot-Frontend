"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { RevisionNotesPanel } from "@/components/orders/revision-notes-panel";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  computeEstimateTotals,
  type EstimateRow,
  type EstimateTotals,
} from "@/lib/order-estimate";
import { canEnterProduction, isQuoteApproved } from "@/lib/order-approval";
import {
  getOrderPaymentDisplay,
  orderPaymentHealthStatus,
} from "@/lib/order-payment";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

function paymentStatusClass(
  health: ReturnType<typeof orderPaymentHealthStatus>
): string {
  switch (health) {
    case "good":
      return "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]";
    case "warning":
      return "border-[#f0d9a8] bg-[#ffef9d] text-[#4a3800]";
    case "critical":
      return "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]";
    default:
      return "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]";
  }
}

function EstimateBreakdownTable({ totals }: { totals: EstimateTotals }) {
  const garmentRows = totals.rows.filter((row) => row.kind === "garment");
  const decorationRows = totals.rows.filter((row) => row.kind === "decoration");
  const taxLabel = `Tax (${(totals.taxRate * 100).toFixed(
    totals.taxRate * 100 === Math.round(totals.taxRate * 100) ? 0 : 2
  )}%)`;

  if (totals.rows.length === 0) {
    return (
      <p className={dashboardTaskDetailClass}>
        Add products and decoration events to build an estimate for this
        customer.
      </p>
    );
  }

  return (
    <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
              <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                Item
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                Qty
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                Unit
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {garmentRows.length > 0 ? (
              <>
                <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#616161]"
                  >
                    Garments
                  </td>
                  <td className="px-4 py-2 text-right text-[11px] font-semibold tabular-nums text-[#616161]">
                    {formatCurrency(totals.garmentSubtotal)}
                  </td>
                </tr>
                {garmentRows.map((row) => (
                  <EstimateRowLine key={row.id} row={row} />
                ))}
              </>
            ) : null}
            {decorationRows.length > 0 ? (
              <>
                <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#616161]"
                  >
                    Decoration
                  </td>
                  <td className="px-4 py-2 text-right text-[11px] font-semibold tabular-nums text-[#616161]">
                    {formatCurrency(totals.decorationSubtotal)}
                  </td>
                </tr>
                {decorationRows.map((row) => (
                  <EstimateRowLine key={row.id} row={row} highlight />
                ))}
              </>
            ) : null}
          </tbody>
          <tfoot className="bg-[#fafafa]">
            <TotalsLine label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <TotalsLine label={taxLabel} value={formatCurrency(totals.tax)} />
            <TotalsLine
              label="Order total"
              value={formatCurrency(totals.total)}
              strong
            />
            {totals.paid > 0 ? (
              <TotalsLine
                label="Paid"
                value={`−${formatCurrency(totals.paid)}`}
                valueClassName="text-[#0d5c2e]"
              />
            ) : null}
            {totals.balance > 0 ? (
              <TotalsLine
                label="Balance due"
                value={formatCurrency(totals.balance)}
                strong
                valueClassName="text-[#8a6116]"
              />
            ) : null}
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function EstimateRowLine({
  row,
  highlight = false,
}: {
  row: EstimateRow;
  highlight?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[#ebebeb] last:border-0",
        highlight && "bg-[#fafcff]"
      )}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-[#303030]">{row.description}</p>
        {row.detail ? (
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">{row.detail}</p>
        ) : null}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
        {row.qty}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
        {formatCurrency(row.unitCost)}
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
        {formatCurrency(row.lineTotal)}
      </td>
    </tr>
  );
}

function TotalsLine({
  label,
  value,
  strong = false,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <tr className="border-t border-[#ebebeb] first:border-t-0">
      <td
        colSpan={3}
        className={cn(
          "px-4 py-2 text-right",
          strong ? "text-[13px] font-semibold text-[#303030]" : "text-[12px] text-[#616161]"
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "px-4 py-2 text-right tabular-nums",
          strong ? "text-[13px] font-semibold text-[#303030]" : "text-[12px] text-[#303030]",
          valueClassName
        )}
      >
        {value}
      </td>
    </tr>
  );
}

export function OrderCustomerPaymentPanel({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const { getCustomerById, approveOrderEstimate } = useSchedule();
  const customer = getCustomerById(order.customerId);
  const quoteApproved = isQuoteApproved(order);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings.pricingMatrix, customer, order]
  );
  const totals = useMemo(
    () => computeEstimateTotals(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer]
  );

  const paymentDisplay = useMemo(() => {
    return getOrderPaymentDisplay({
      ...order,
      total: totals.total,
      paid: totals.paid,
      balance: totals.balance,
    });
  }, [order, totals]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#303030]">
            Payment status
          </h3>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Totals are calculated from garment costs, decoration pricing, and
            shop tax — the same breakdown your customer sees on the review
            link.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-semibold",
            paymentStatusClass(paymentDisplay.healthStatus)
          )}
        >
          {paymentDisplay.label}
        </span>
      </div>

      {paymentDisplay.detail ? (
        <p className="text-[13px] text-[#616161]">{paymentDisplay.detail}</p>
      ) : null}

      {quoteApproved ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3.5 py-2.5 text-[13px] font-medium text-[#0d5c2e]">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Estimate approved
          {order.quoteApprovedAt
            ? ` · ${formatDate(order.quoteApprovedAt)}`
            : ""}
          {canEnterProduction(order) ? " · Ready for production scheduling" : ""}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#616161]">
            Approve here once the customer signs off — same one-click flow as
            proofs. Production unlocks when proofs are approved too.
          </p>
          <ProofActionButton
            variant="success"
            successLabel="Approved"
            className="shrink-0"
            onClick={() => approveOrderEstimate(order.id)}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Approve estimate
            </span>
          </ProofActionButton>
        </div>
      )}

      <RevisionNotesPanel
        notes={order.estimateRevisionNotes}
        title="Estimate notes"
      />

      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-[#303030]">
          Estimate breakdown
        </h3>
        <EstimateBreakdownTable totals={totals} />
      </div>
    </div>
  );
}
