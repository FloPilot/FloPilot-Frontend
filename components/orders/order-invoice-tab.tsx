"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/orders/pdf-preview-dialog";
import { OrderProducedGoodsCallout } from "@/components/orders/order-produced-goods-panel";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  customerHasNegotiatedPricing,
  resolveEffectivePricingMatrix,
} from "@/lib/customer-pricing";
import {
  computeEstimateTotals,
  computeInvoiceTotals,
  invoiceReadyForBilling,
} from "@/lib/order-estimate";
import {
  hasProducedGoodsVariance,
  mergeOrderProducedGoods,
} from "@/lib/order-produced-goods";
import { StaffEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "loading";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

export function OrderInvoiceTab({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const {
    previewOrderDocument,
    sendInvoice,
    getCustomerById,
  } = useSchedule();

  const customer = getCustomerById(order.customerId);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings.pricingMatrix, customer, order]
  );

  const produced = useMemo(() => mergeOrderProducedGoods(order), [order]);
  const ready = invoiceReadyForBilling(order);
  const hasVariance = hasProducedGoodsVariance(produced);

  const estimateTotals = useMemo(
    () => computeEstimateTotals(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer]
  );

  const invoiceTotals = useMemo(
    () => computeInvoiceTotals(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer]
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    if (type !== "loading") {
      setTimeout(() => setToast(null), 5000);
    }
  }, []);

  const loadInvoicePdf = useCallback(
    () => previewOrderDocument(order.id, "invoice"),
    [previewOrderDocument, order.id]
  );

  const handleSend = useCallback(async () => {
    setSending(true);
    showToast("Sending invoice…", "loading");
    try {
      const email = await sendInvoice(order.id);
      showToast(`Invoice emailed to ${email.to}.`, "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not send the invoice. Please try again.",
        "error"
      );
    } finally {
      setSending(false);
    }
  }, [sendInvoice, order.id, showToast]);

  const delta =
    Math.round((invoiceTotals.total - estimateTotals.total) * 100) / 100;

  return (
    <div className="space-y-4">
      <OrderProducedGoodsCallout order={order} />

      {!ready ? (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-[#fffbeb] px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-800" />
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              Confirm produced goods first
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Open the Produced goods tab (or finish that step in Finishing),
              enter actual counts, and confirm — then you can preview and send
              the invoice based on what was actually made.
            </p>
          </div>
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className={dashboardTaskTitleClass}>Invoice</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Same layout as the estimate, billed on produced quantities
              (garments + decoration scale with pcs made). Preview the PDF or
              email it to the customer. QuickBooks push stays optional under
              integrations.
              {pricingMatrix.rateSheetName && !pricingMatrix.usingShopPricing ? (
                <span className="mt-1 block text-[#2c6ecb]">
                  Using negotiated rates: {pricingMatrix.rateSheetName}
                </span>
              ) : pricingMatrix.usingShopPricing &&
                customerHasNegotiatedPricing(customer) ? (
                <span className="mt-1 block text-[#616161]">
                  Using shop standard pricing for this order
                </span>
              ) : null}
            </p>
            {order.invoice?.sentAt ? (
              <p className="mt-1.5 text-[12px] text-[#0d5c2e]">
                Last sent {formatDateTime(order.invoice.sentAt)}
                {order.invoice.sentTo ? ` · ${order.invoice.sentTo}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!ready}
              className={cn(
                dashboardControlClass,
                "inline-flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <FileText className="size-3.5" />
              Preview PDF
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !ready}
              className={cn(
                dashboardPrimaryButtonClass,
                "inline-flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send invoice
            </button>
          </div>
        </div>

        {toast ? (
          <div
            className={cn(
              "flex items-center gap-2 border-b px-4 py-2.5 text-[12px] sm:px-5",
              toast.type === "success" &&
                "border-[#cdeccd] bg-[#f1faf1] text-[#0f7a3d]",
              toast.type === "error" &&
                "border-[#f5c2c2] bg-[#fff1f1] text-[#b42318]",
              toast.type === "loading" &&
                "border-[#d7e3fb] bg-[#f4f7fd] text-[#2c6ecb]"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="size-3.5 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="size-3.5 shrink-0" />
            ) : (
              <Loader2 className="size-3.5 animate-spin shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ) : null}

        <div className="grid gap-3 border-b border-[#ebebeb] px-4 py-4 sm:grid-cols-3 sm:px-5">
          <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Estimate total
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#303030]">
              {formatCurrency(estimateTotals.total)}
            </p>
          </div>
          <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Invoice total
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#303030]">
              {formatCurrency(invoiceTotals.total)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border px-3 py-3",
              delta === 0
                ? "border-[#ebebeb] bg-[#fafafa]"
                : delta > 0
                  ? "border-amber-300 bg-[#fffbeb]"
                  : "border-[#f5b5b5] bg-[#fff1f1]"
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Difference
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#303030]">
              {delta > 0 ? "+" : ""}
              {formatCurrency(delta)}
            </p>
            {hasVariance ? (
              <p className="mt-1 text-[11px] text-[#616161]">
                Driven by produced qty vs ordered
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <StaffEstimateBreakdownTable totals={invoiceTotals} />
        </div>
      </section>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`Invoice · Order ${formatOrderDisplayLine(order)}`}
        subtitle="Customer-facing invoice PDF based on produced goods."
        load={loadInvoicePdf}
      />
    </div>
  );
}
