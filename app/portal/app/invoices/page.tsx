"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePortalApp } from "@/components/portal/portal-app-provider";
import { usePortalPaths } from "@/components/portal/portal-paths";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";

export default function PortalAppInvoicesPage() {
  const { dashboard, loading, accent } = usePortalApp();
  const paths = usePortalPaths();
  const invoices = (dashboard?.orders || []).filter(
    (order) => Boolean(order.invoiceSentAt)
  );

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading invoices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#303030]">
          Invoices
        </h1>
        <p className="mt-1 text-[14px] text-[#616161]">
          Invoices sent by this shop, including any open balances.
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="px-5 py-12 text-center text-[14px] text-[#616161]">
            No invoices yet.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f1f1]">
            {invoices.map((order) => (
              <Link
                key={order.id}
                href={paths.order(order.id, { view: "invoice" })}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#fafafa] sm:px-5"
              >
                <div>
                  <p className="font-semibold text-[#303030]">
                    {formatOrderDisplayLine(order)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    Sent{" "}
                    {order.invoiceSentAt
                      ? formatDate(order.invoiceSentAt)
                      : "—"}
                    {order.balance > 0
                      ? ` · ${formatCurrency(order.balance)} due`
                      : " · Paid"}
                  </p>
                </div>
                <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(order.total)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
