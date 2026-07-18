"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { RevisionNotesPanel } from "@/components/orders/revision-notes-panel";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  computeEstimateTotals,
  computeInvoiceTotals,
  type EstimateRow,
  type EstimateTotals,
} from "@/lib/order-estimate";
import { canEnterProduction, isQuoteApproved } from "@/lib/order-approval";
import {
  getOrderPaymentDisplay,
  orderPaymentHealthStatus,
} from "@/lib/order-payment";
import { canTransitionOrderStatus } from "@/lib/order-status";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
              label="Total"
              value={formatCurrency(totals.total)}
              strong
            />
            <TotalsLine label="Paid" value={formatCurrency(totals.paid)} />
            <TotalsLine
              label="Balance due"
              value={formatCurrency(totals.balance)}
              strong
              valueClassName={
                totals.balance > 0 ? "text-[#8f1f1f]" : "text-[#0d5c2e]"
              }
            />
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function EstimateRowLine({
  row,
  highlight,
}: {
  row: EstimateRow;
  highlight?: boolean;
}) {
  return (
    <tr className="border-b border-[#ebebeb]">
      <td className="px-4 py-2.5">
        <p
          className={cn(
            "font-medium text-[#303030]",
            highlight && "text-[#2c6ecb]"
          )}
        >
          {row.description}
        </p>
        {row.detail ? (
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">{row.detail}</p>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#303030]">
        {row.qty}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
        {row.includedInBundle ? "—" : formatCurrency(row.unitCost)}
      </td>
      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-[#303030]">
        {row.includedInBundle ? (
          <span className="font-normal text-[#8a8a8a]">Included</span>
        ) : (
          formatCurrency(row.lineTotal)
        )}
      </td>
    </tr>
  );
}

function TotalsLine({
  label,
  value,
  strong,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <tr className="border-t border-[#ebebeb]">
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function OrderCustomerPaymentPanel({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const {
    getCustomerById,
    approveOrderEstimate,
    updateOrderStatus,
    updateOrderPayment,
  } = useSchedule();
  const customer = getCustomerById(order.customerId);
  const quoteApproved = isQuoteApproved(order);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings.pricingMatrix, customer, order]
  );
  const useInvoiceTotals =
    order.status === "ready_to_invoice" ||
    order.status === "invoice_sent" ||
    order.status === "completed" ||
    Boolean(order.invoice?.sentAt);

  const totals = useMemo(
    () =>
      useInvoiceTotals
        ? computeInvoiceTotals(order, settings.taxRate, pricingMatrix, customer)
        : computeEstimateTotals(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer, useInvoiceTotals]
  );

  const paymentDisplay = useMemo(() => {
    return getOrderPaymentDisplay({
      ...order,
      total: totals.total,
      paid: totals.paid,
      balance: totals.balance,
    });
  }, [order, totals]);

  const [amountDraft, setAmountDraft] = useState(
    totals.balance > 0 ? totals.balance.toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canComplete = canTransitionOrderStatus(order.status, "completed");
  const isPaid = totals.balance <= 0 && totals.total > 0;
  const showPaymentActions =
    order.status === "ready_to_invoice" ||
    order.status === "invoice_sent" ||
    order.status === "shipped" ||
    order.status === "completed" ||
    Boolean(order.invoice?.sentAt) ||
    totals.paid > 0 ||
    totals.balance > 0;

  const applyPayment = async (paidTotal: number, markCompleted: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const paid = round2(Math.max(0, paidTotal));
      const balance = round2(Math.max(0, totals.total - paid));
      await updateOrderPayment(order.id, { paid, balance });
      if (markCompleted && balance <= 0 && canComplete) {
        await updateOrderStatus(order.id, "completed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record payment"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRecordAmount = async () => {
    const parsed = Number(amountDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    const nextPaid = round2((order.paid || 0) + parsed);
    await applyPayment(Math.min(nextPaid, totals.total), false);
  };

  const handlePaidInFull = async (markCompleted: boolean) => {
    await applyPayment(totals.total, markCompleted);
  };

  const handleMarkCompleted = async () => {
    if (!canComplete) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrderStatus(order.id, "completed");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete the order"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#303030]">
            Payment status
          </h3>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {useInvoiceTotals
              ? "Invoice totals use produced quantities. Record payments here, then mark the order completed when paid."
              : "Totals are calculated from garment costs, decoration pricing, and shop tax — the same breakdown your customer sees on the review link."}
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

      {showPaymentActions ? (
        <div className={cn(dashboardInsetSurfaceClass, "space-y-3 p-4")}>
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              Record payment
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Mark money received against this order. When the balance is
              cleared, complete the order to close it out.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <label className="text-[12px] font-medium text-[#616161]">
                Amount
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a8a]">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountDraft}
                  disabled={saving || isPaid}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  className="h-9 rounded-lg border-[#e3e3e3] pl-7 text-[13px]"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={saving || isPaid}
              onClick={() => void handleRecordAmount()}
              className={cn(
                dashboardControlClass,
                "h-9 px-3 text-[13px] disabled:opacity-60"
              )}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Apply payment
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || isPaid || totals.total <= 0}
              onClick={() => void handlePaidInFull(false)}
              className={cn(
                dashboardControlClass,
                "h-9 px-3 text-[13px] disabled:opacity-60"
              )}
            >
              Mark paid in full
            </button>
            <button
              type="button"
              disabled={saving || totals.total <= 0 || !canComplete}
              onClick={() =>
                void (isPaid ? handleMarkCompleted() : handlePaidInFull(true))
              }
              className={cn(
                dashboardPrimaryButtonClass,
                "h-9 px-3 text-[13px] disabled:opacity-60"
              )}
            >
              {isPaid ? "Mark order completed" : "Mark paid & complete"}
            </button>
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-[#b42318]">{error}</p>
          ) : null}
        </div>
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
          {useInvoiceTotals ? "Invoice breakdown" : "Estimate breakdown"}
        </h3>
        <EstimateBreakdownTable totals={totals} />
      </div>
    </div>
  );
}
