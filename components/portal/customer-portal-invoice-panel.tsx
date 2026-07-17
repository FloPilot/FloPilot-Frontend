"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, FileText, Mail } from "lucide-react";
import { CustomerEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import type { PortalInvoiceSummary } from "@/lib/customer-portal-api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CustomerPortalInvoicePanel({
  invoice,
  accent,
  shopEmail,
  shopName,
  highlight = false,
}: {
  invoice: PortalInvoiceSummary;
  accent: string;
  shopEmail?: string;
  shopName?: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const amountDue = Math.max(0, invoice.balance);
  const paidInFull = invoice.balance <= 0 && invoice.total > 0;

  useEffect(() => {
    if (!highlight || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight]);

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
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-[#303030]">
                How to pay
              </p>
              <p className="text-[13px] leading-relaxed text-[#616161]">
                Reply to your invoice email or contact{" "}
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
                ) : null}{" "}
                to arrange payment. A PDF copy was also attached to your email.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
