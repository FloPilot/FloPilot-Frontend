"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Mail,
} from "lucide-react";
import { CustomerEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import {
  createPortalInvoiceCheckout,
  type PortalInvoiceSummary,
} from "@/lib/customer-portal-api";
import type { OrderProductionRun } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CustomerPortalInvoicePanel({
  invoice,
  accent,
  shopEmail,
  shopName,
  highlight = false,
  productionRun,
  orderId,
  accessToken,
  portalMode = "invite",
  onPaidReturn,
}: {
  invoice: PortalInvoiceSummary;
  accent: string;
  shopEmail?: string;
  shopName?: string;
  highlight?: boolean;
  productionRun?: Pick<
    OrderProductionRun,
    "id" | "members" | "combinedQuantity"
  >;
  orderId: string;
  accessToken: string;
  portalMode?: "invite" | "auth";
  onPaidReturn?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const amountDue = Math.max(0, invoice.balance);
  const paidInFull = invoice.balance <= 0 && invoice.total > 0;
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showPaidBanner, setShowPaidBanner] = useState(
    () => searchParams.get("paid") === "1"
  );

  useEffect(() => {
    if (!highlight || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight]);

  useEffect(() => {
    if (searchParams.get("paid") !== "1") return;
    setShowPaidBanner(true);
    onPaidReturn?.();
  }, [searchParams, onPaidReturn]);

  const handlePayNow = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const result = await createPortalInvoiceCheckout(accessToken, orderId, {
        mode: portalMode,
      });
      if (!result.payUrl) {
        throw new Error("Checkout link was not created.");
      }
      window.location.href = result.payUrl;
    } catch (err) {
      setPayError(
        err instanceof Error
          ? err.message
          : "Could not start card payment. Try again or contact the shop."
      );
      setPaying(false);
    }
  };

  return (
    <section
      ref={ref}
      id="portal-invoice"
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm scroll-mt-6",
        highlight && "outline outline-2 outline-offset-2"
      )}
      style={{
        borderColor: `${accent}40`,
        ...(highlight ? { outlineColor: accent } : null),
      }}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-white"
        style={{ backgroundColor: accent }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
            Invoice
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-white">
            {paidInFull ? "Paid in full" : "Amount due"}
          </h2>
          <p className="mt-1 text-[13px] text-white/85">
            Final billing based on goods produced for this order.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[28px] font-semibold tabular-nums leading-none">
            {formatCurrency(amountDue)}
          </p>
          {invoice.paid > 0 && !paidInFull ? (
            <p className="mt-1.5 text-[12px] text-white/80">
              {formatCurrency(invoice.total)} total · {formatCurrency(invoice.paid)}{" "}
              paid
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {showPaidBanner && (paidInFull || searchParams.get("paid") === "1") ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#cdeccd] bg-[#f1faf1] px-3.5 py-3 text-[13px] text-[#0d5c2e]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Payment received</p>
              <p className="mt-0.5 text-[#1f6b3a]/90">
                Thanks — your card payment is being confirmed. This page will
                update once the shop’s books reflect the payment.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {invoice.sentAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1faf1] px-2.5 py-1 text-[12px] font-medium text-[#0d5c2e]">
              <CheckCircle2 className="size-3.5" />
              Sent {formatDateTime(invoice.sentAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f7fd] px-2.5 py-1 text-[12px] font-medium text-[#2c6ecb]">
              <FileText className="size-3.5" />
              Invoice ready
            </span>
          )}
          {invoice.stripePaidAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1faf1] px-2.5 py-1 text-[12px] font-medium text-[#0d5c2e]">
              <CreditCard className="size-3.5" />
              Paid by card
              {invoice.stripePaidAmount
                ? ` · ${formatCurrency(invoice.stripePaidAmount)}`
                : ""}
            </span>
          ) : null}
          {invoice.hasVariance ? (
            <span className="inline-flex rounded-lg bg-[#fff8eb] px-2.5 py-1 text-[12px] font-medium text-[#8a6116]">
              {invoice.producedPieces} pcs produced
              {invoice.orderedPieces !== invoice.producedPieces
                ? ` · ${invoice.orderedPieces} ordered`
                : ""}
            </span>
          ) : (
            <span className="inline-flex rounded-lg bg-[#fafafa] px-2.5 py-1 text-[12px] font-medium text-[#616161]">
              {invoice.producedPieces} pcs produced
            </span>
          )}
        </div>

        <CustomerEstimateBreakdownTable
          rows={invoice.rows}
          garmentSubtotal={invoice.garmentSubtotal}
          decorationSubtotal={invoice.decorationSubtotal}
          subtotal={invoice.subtotal}
          tax={invoice.tax}
          taxRate={invoice.taxRate}
          total={invoice.total}
          paid={invoice.paid}
          balance={invoice.balance}
          accentColor={accent}
          productionRun={productionRun}
        />

        <div
          className={cn(
            "rounded-xl border px-4 py-3.5",
            paidInFull
              ? "border-[#cdeccd] bg-[#f1faf1]"
              : "border-[#ebebeb] bg-[#fafafa]"
          )}
        >
          {paidInFull ? (
            <p className="text-[13px] font-medium text-[#0d5c2e]">
              Thank you — this invoice is paid in full.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[13px] font-semibold text-[#303030]">
                  How to pay
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
                  {invoice.canPayOnline
                    ? "Pay securely by card, or contact the shop if you prefer another method."
                    : "Contact the shop to arrange payment. A PDF copy was also attached to your invoice email."}
                </p>
              </div>

              {invoice.canPayOnline ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={paying || !accessToken}
                    onClick={() => void handlePayNow()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                    style={{ backgroundColor: accent }}
                  >
                    {paying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    {paying
                      ? "Opening secure checkout…"
                      : `Pay ${formatCurrency(amountDue)} now`}
                  </button>
                  <p className="text-[11px] text-[#8a8a8a]">
                    You’ll complete payment on Stripe’s secure checkout page.
                  </p>
                  {payError ? (
                    <p className="text-[12px] font-medium text-[#b42318]">
                      {payError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="text-[13px] leading-relaxed text-[#616161]">
                Prefer another method? Reply to your invoice email or contact{" "}
                {shopName || "the shop"}
                {shopEmail ? (
                  <>
                    {" "}
                    at{" "}
                    <a
                      href={`mailto:${shopEmail}`}
                      className="inline-flex items-center gap-1 font-medium underline"
                      style={{ color: accent }}
                    >
                      <Mail className="size-3.5" />
                      {shopEmail}
                    </a>
                  </>
                ) : null}
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
