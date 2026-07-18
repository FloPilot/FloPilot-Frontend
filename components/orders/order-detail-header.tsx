"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrderCustomLabelEditor } from "@/components/orders/order-custom-label-field";
import { OrderEndBusinessEditor } from "@/components/orders/order-end-business-editor";
import { OrderSalesRepEditor } from "@/components/orders/order-sales-rep-editor";
import { OrderProductionRunEditor } from "@/components/orders/order-production-run-editor";
import { RushBadge } from "@/components/status-badges";
import {
  dashboardControlClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { isArchivedOrder } from "@/lib/order-archive";
import {
  buildOrderDetailTabs,
  type OrderDetailTab,
} from "@/lib/order-detail-tabs";
import type { OrderListSummary } from "@/lib/order-list-summary";
import type { Order, SubCustomer } from "@/types";
import { cn } from "@/lib/utils";

export type { OrderDetailTab } from "@/lib/order-detail-tabs";
export type OrderQuickLink = OrderDetailTab | "messages" | "payments";

export { parseOrderDetailTab, resolveOrderDetailTab } from "@/lib/order-detail-tabs";

export function OrderDetailHeader({
  order,
  summary,
  activeTab,
  onTabChange,
  onCustomLabelSave,
  subCustomers,
  onEndBusinessSave,
  onSalesRepSave,
  orders,
  onProductionRunSave,
}: {
  order: Order;
  summary: OrderListSummary;
  activeTab: OrderDetailTab;
  onTabChange: (tab: OrderDetailTab) => void;
  onCustomLabelSave?: (customLabel: string) => Promise<void | Order>;
  subCustomers?: SubCustomer[];
  onEndBusinessSave?: (subCustomerId: string | null) => Promise<void | Order>;
  onSalesRepSave?: (salesRepId: string | null) => Promise<void | Order>;
  orders?: Order[];
  onProductionRunSave?: (linkedOrderIds: string[]) => Promise<void | Order>;
}) {
  const tabs = buildOrderDetailTabs(order);
  const showEndBusiness =
    Boolean(onEndBusinessSave) &&
    Boolean(subCustomers?.length || order.subCustomerId);

  const dueLabel =
    summary.dueDays === null
      ? formatDate(order.inHandsDate)
      : summary.dueDays < 0
        ? `${formatDate(order.inHandsDate)} · ${Math.abs(summary.dueDays)}d overdue`
        : summary.dueDays === 0
          ? `${formatDate(order.inHandsDate)} · Due today`
          : summary.dueDays === 1
            ? `${formatDate(order.inHandsDate)} · Due tomorrow`
            : formatDate(order.inHandsDate);

  return (
    <header className="space-y-4">
      <div className="min-w-0 space-y-2">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[13px]"
        >
          <Link
            href="/app/orders"
            className="rounded-md px-1 py-0.5 text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
          >
            Orders
          </Link>
          <span className="text-[#c9c9c9]" aria-hidden>
            /
          </span>
          <span className="px-1 font-medium text-[#303030]">
            Order {order.number}
            {order.customLabel?.trim() ? ` — ${order.customLabel.trim()}` : ""}
          </span>
        </nav>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
          <h1 className={cn(dashboardSectionTitleClass, "shrink-0")}>
            Order {order.number}
          </h1>
          {onCustomLabelSave ? (
            <OrderCustomLabelEditor
              order={order}
              onSave={onCustomLabelSave}
            />
          ) : order.customLabel?.trim() ? (
            <span className="rounded-md border border-[#ebebeb] px-2.5 py-1 text-[13px] font-medium text-[#616161]">
              {order.customLabel.trim()}
            </span>
          ) : null}
          {order.rush ? <RushBadge /> : null}
          {isArchivedOrder(order) ? (
            <span className="inline-flex rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Archived
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
          <p className={dashboardTaskDetailClass}>
            {order.company} · {order.customerName} · In-hands {dueLabel}
          </p>
          {showEndBusiness ? (
            <OrderEndBusinessEditor
              order={order}
              subCustomers={subCustomers ?? []}
              customerId={order.customerId}
              onSave={onEndBusinessSave!}
            />
          ) : null}
          {onSalesRepSave ? (
            <OrderSalesRepEditor order={order} onSave={onSalesRepSave} />
          ) : null}
          {orders && onProductionRunSave ? (
            <OrderProductionRunEditor
              order={order}
              orders={orders}
              onSave={onProductionRunSave}
            />
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border px-4 py-3",
          summary.attention === "critical"
            ? "border-[#f5b5b5] bg-[#fff1f1]"
            : summary.attention === "warning"
              ? "border-[#f0d9a8] bg-[#fff8eb]"
              : "border-[#e3e3e3] bg-white"
        )}
      >
        <p className="flex items-start gap-2 text-[14px] font-medium text-[#303030]">
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
          <span>{summary.nextStep}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[#ebebeb] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              dashboardControlClass,
              "h-9 px-3 text-[13px]",
              activeTab === tab.id &&
                "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
