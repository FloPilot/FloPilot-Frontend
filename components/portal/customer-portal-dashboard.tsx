"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  DollarSign,
  Factory,
  Package,
} from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import {
  portalHomePath,
  portalOrderPath,
  portalStatusLabel,
  portalStatusTone,
  type PortalAttentionItem,
  type PortalOrderSummary,
} from "@/lib/customer-portal-api";
import {
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine, formatOrderRef } from "@/lib/order-display";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const tone = portalStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "warning" && "bg-[#fff1d6] text-[#8a6116]",
        tone === "info" && "bg-[#ebf4ff] text-[#2c6ecb]",
        tone === "success" && "bg-[#f1faf1] text-[#0d5c2e]",
        tone === "neutral" && "bg-[#f1f1f1] text-[#616161]"
      )}
    >
      {portalStatusLabel(status)}
    </span>
  );
}

function AttentionCard({
  item,
  token,
  accent,
}: {
  item: PortalAttentionItem;
  token: string;
  accent: string;
}) {
  const href =
    item.type === "artwork" && item.jobId && item.imprintId
      ? `${portalOrderPath(token, item.orderId)}?focus=${encodeURIComponent(`${item.jobId}:${item.imprintId}`)}`
      : item.type === "invoice"
        ? portalOrderPath(token, item.orderId, { view: "invoice" })
      : portalOrderPath(token, item.orderId);

  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-xl border border-[#f0d9a8] bg-[#fff8eb] p-3.5 transition-shadow hover:shadow-sm"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a6116]">
          {item.type === "estimate"
            ? "Estimate"
            : item.type === "invoice"
              ? "Invoice"
              : "Artwork approval"}
        </p>
        <p className="mt-1 truncate text-[14px] font-semibold text-[#303030]">
          {formatOrderRef(item)} · {item.title}
        </p>
        <p className="mt-0.5 text-[12px] text-[#616161]">{item.detail}</p>
        {item.inHandsDate ? (
          <p className="mt-1 text-[11px] text-[#8a8a8a]">
            In-hands {formatDate(item.inHandsDate)}
          </p>
        ) : null}
      </div>
      <span
        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5"
        style={{ backgroundColor: accent }}
      >
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

function OrderRow({
  order,
  token,
}: {
  order: PortalOrderSummary;
  token: string;
}) {
  return (
    <Link
      href={portalOrderPath(token, order.id, {
        view: order.invoiceSentAt ? "invoice" : undefined,
      })}
      className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] items-center gap-3 border-b border-[#f1f1f1] px-4 py-3.5 text-[13px] transition-colors last:border-b-0 hover:bg-[#fafafa]"
    >
      <div>
        <p className="font-semibold text-[#303030]">{formatOrderDisplayLine(order)}</p>
        {order.needsApproval ? (
          <p className="mt-0.5 text-[11px] font-medium text-[#8a6116]">
            Needs your review
          </p>
        ) : order.invoiceSentAt ? (
          <p className="mt-0.5 text-[11px] font-medium text-[#2c6ecb]">
            Invoice available
          </p>
        ) : null}
      </div>
      <p className="text-[#616161]">
        {order.issueDate ? formatDate(order.issueDate) : "—"}
      </p>
      <p className="text-[#616161]">
        {order.inHandsDate ? formatDate(order.inHandsDate) : "—"}
      </p>
      <StatusBadge status={order.status} />
      <p className="text-right font-semibold tabular-nums text-[#303030]">
        {formatCurrency(order.total)}
      </p>
    </Link>
  );
}

export function CustomerPortalDashboardView() {
  const { token, dashboard, accent } = useCustomerPortal();
  const stats = dashboard?.stats;
  const orders = dashboard?.orders || [];
  const attention = dashboard?.attention || [];

  const kpis = [
    {
      key: "total",
      label: "Total orders",
      hint: "All active orders with this shop",
      value: stats?.totalOrders ?? 0,
      icon: Package,
      surface: "bg-white",
      border: "border-[#e3e3e3]",
      iconWrap: "bg-[#f1f1f1]",
      iconColor: "text-[#303030]",
      valueColor: "text-[#303030]",
    },
    {
      key: "approval",
      label: "Awaiting approval",
      hint: "Estimates or proofs need your sign-off",
      value: stats?.awaitingApproval ?? 0,
      icon: ClipboardList,
      surface: stats?.awaitingApproval ? "bg-[#fff8eb]" : "bg-white",
      border: stats?.awaitingApproval ? "border-[#f0d9a8]" : "border-[#e3e3e3]",
      iconWrap: stats?.awaitingApproval ? "bg-[#fff1d6]" : "bg-[#f1f1f1]",
      iconColor: stats?.awaitingApproval ? "text-[#8a6116]" : "text-[#303030]",
      valueColor: stats?.awaitingApproval ? "text-[#8a6116]" : "text-[#303030]",
    },
    {
      key: "balance",
      label: "Balance due",
      hint: "Outstanding across all orders",
      value: stats?.balanceDue ?? 0,
      icon: DollarSign,
      format: "currency" as const,
      surface: stats?.balanceDue ? "bg-[#fff1f1]" : "bg-white",
      border: stats?.balanceDue ? "border-[#f5b5b5]" : "border-[#e3e3e3]",
      iconWrap: stats?.balanceDue ? "bg-[#fde2e2]" : "bg-[#f1f1f1]",
      iconColor: stats?.balanceDue ? "text-[#8f1f1f]" : "text-[#303030]",
      valueColor: stats?.balanceDue ? "text-[#8f1f1f]" : "text-[#303030]",
    },
    {
      key: "production",
      label: "In production",
      hint: "Orders currently being produced",
      value: stats?.inProduction ?? 0,
      icon: Factory,
      surface: "bg-white",
      border: "border-[#e3e3e3]",
      iconWrap: "bg-[#f1f1f1]",
      iconColor: "text-[#303030]",
      valueColor: "text-[#303030]",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#303030] sm:text-[26px]">
          Welcome back{dashboard?.customer?.name ? `, ${dashboard.customer.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#616161]">
          Track orders, review proofs, approve estimates, and view invoices — all
          in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const display =
            kpi.format === "currency"
              ? formatCurrency(kpi.value)
              : kpi.value.toLocaleString();
          return (
            <div
              key={kpi.key}
              className={cn(
                dashboardKpiCardClass,
                "min-h-[118px] border",
                kpi.surface,
                kpi.border
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    kpi.iconWrap
                  )}
                >
                  <Icon
                    className={cn("size-3.5", kpi.iconColor)}
                    strokeWidth={1.75}
                  />
                </div>
                <p className={dashboardKpiTitleClass}>{kpi.label}</p>
              </div>
              <p
                className={cn(
                  dashboardValueClass,
                  "mt-2 tabular-nums",
                  kpi.valueColor
                )}
              >
                {display}
              </p>
              <p className="mt-1 text-xs leading-snug text-[#616161]">
                {kpi.hint}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#303030]">
                Your orders
              </h2>
              <p className="text-[12px] text-[#8a8a8a]">
                Click an order to review proofs, approve estimates, view invoices,
                or message the shop.
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center text-[14px] text-[#616161]">
              No orders yet. When your shop sends proofs or estimates, they&apos;ll
              show up here.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] gap-3 border-b border-[#f1f1f1] bg-[#fafafa] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] md:grid">
                <span>Order</span>
                <span>Issue date</span>
                <span>In hands</span>
                <span>Status</span>
                <span className="text-right">Total</span>
              </div>
              <div>
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} token={token} />
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#f0d9a8] bg-[#fffdf8] shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0d9a8] px-4 py-3.5">
              <AlertCircle className="size-4 text-[#8a6116]" />
              <h2 className="text-[14px] font-semibold text-[#8a6116]">
                Requires your attention
              </h2>
            </div>
            <div className="space-y-2.5 p-3.5">
              {attention.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#e3e3e3] bg-white px-4 py-6 text-center text-[13px] text-[#616161]">
                  You&apos;re all caught up — nothing needs approval right now.
                </p>
              ) : (
                attention.map((item, index) => (
                  <AttentionCard
                    key={`${item.orderId}-${item.type}-${item.title}-${index}`}
                    item={item}
                    token={token}
                    accent={accent}
                  />
                ))
              )}
            </div>
          </section>

          {dashboard?.portalExpiresAt ? (
            <p className="text-center text-[11px] text-[#8a8a8a]">
              Portal access valid until{" "}
              {formatDate(dashboard.portalExpiresAt)}.{" "}
              <Link
                href={portalHomePath(token)}
                className="font-medium underline"
                style={{ color: accent }}
              >
                Refresh
              </Link>
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
