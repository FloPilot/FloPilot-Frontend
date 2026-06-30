"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export type { OrderDetailTab } from "@/lib/order-detail-tabs";
export type OrderQuickLink = OrderDetailTab | "messages" | "payments";

export { parseOrderDetailTab, resolveOrderDetailTab } from "@/lib/order-detail-tabs";

export function OrderDetailHeader({
  order,
  summary,
  activeTab,
  onTabChange,
}: {
  order: Order;
  summary: OrderListSummary;
  activeTab: OrderDetailTab;
  onTabChange: (tab: OrderDetailTab) => void;
}) {
  const tabs = buildOrderDetailTabs(order);

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
        <Link
          href="/app/orders"
          className={cn(
            dashboardControlClass,
            "inline-flex h-8 gap-1.5 px-2.5 text-[12px] text-[#616161] hover:text-[#303030]"
          )}
        >
          <ArrowLeft className="size-3.5" />
          Orders
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className={dashboardSectionTitleClass}>Order {order.number}</h1>
          {order.rush ? <RushBadge /> : null}
          {isArchivedOrder(order) ? (
            <span className="inline-flex rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Archived
            </span>
          ) : null}
        </div>

        <p className={dashboardTaskDetailClass}>
          {order.company} · {order.customerName} · In-hands {dueLabel}
        </p>
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
