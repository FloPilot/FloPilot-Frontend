"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePortalApp } from "@/components/portal/portal-app-provider";
import { usePortalPaths } from "@/components/portal/portal-paths";
import {
  portalStatusLabel,
  portalStatusTone,
} from "@/lib/customer-portal-api";
import {
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { cn } from "@/lib/utils";

export default function PortalAppOrdersPage() {
  const { dashboard, loading, accent } = usePortalApp();
  const paths = usePortalPaths();
  const orders = dashboard?.orders || [];

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className={dashboardSectionTitleClass}>Orders</h1>
        <p className={cn(dashboardTaskDetailClass, "mt-1 max-w-2xl")}>
          Review proofs, approve estimates, and open invoices for every order
          with this shop.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-[#616161]">
            No orders yet.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f1f1]">
            {orders.map((order) => {
              const tone = portalStatusTone(order.status);
              return (
                <Link
                  key={order.id}
                  href={paths.order(order.id, {
                    view: order.invoiceSentAt ? "invoice" : undefined,
                  })}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafafa] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-snug text-[#303030]">
                      {formatOrderDisplayLine(order)}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">
                      {order.issueDate ? formatDate(order.issueDate) : "—"}
                      {order.inHandsDate
                        ? ` · In-hands ${formatDate(order.inHandsDate)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        tone === "warning" && "bg-[#fff1d6] text-[#8a6116]",
                        tone === "info" && "bg-[#ebf4ff] text-[#2c6ecb]",
                        tone === "success" && "bg-[#f1faf1] text-[#0d5c2e]",
                        tone === "neutral" && "bg-[#f1f1f1] text-[#616161]"
                      )}
                    >
                      {portalStatusLabel(order.status)}
                    </span>
                    <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
