"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import { usePortalPaths } from "@/components/portal/portal-paths";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";

export default function PortalPreviewEstimatesPage() {
  const { dashboard, loading, accent } = useCustomerPortal();
  const paths = usePortalPaths();
  const estimates = (dashboard?.orders || []).filter(
    (order) => order.proofsSentAt && !order.quoteApproved
  );

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading estimates…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#303030]">
          Estimates
        </h1>
        <p className="mt-1 text-[14px] text-[#616161]">
          Estimates waiting for approval.
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        {estimates.length === 0 ? (
          <div className="px-5 py-12 text-center text-[14px] text-[#616161]">
            No open estimates right now.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f1f1]">
            {estimates.map((order) => (
              <Link
                key={order.id}
                href={paths.order(order.id)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#fafafa] sm:px-5"
              >
                <div>
                  <p className="font-semibold text-[#303030]">
                    {formatOrderDisplayLine(order)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    {order.inHandsDate
                      ? `In-hands ${formatDate(order.inHandsDate)}`
                      : "Awaiting approval"}
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
