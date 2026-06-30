"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { documentTypeLabel } from "@/lib/reports/format";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { OrderListSummary } from "@/lib/order-list-summary";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

function InfoRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[13px] text-[#616161]">{label}</span>
      <span
        className={cn(
          "text-right text-[13px] text-[#303030]",
          emphasis && "font-semibold tabular-nums"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderInfoGrid({
  order,
  summary,
}: {
  order: Order;
  summary: OrderListSummary;
}) {
  const totalPieces = order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <h2 className={dashboardTaskTitleClass}>Customer</h2>
        <p className="mt-2 text-[14px] font-medium text-[#303030]">
          {order.customerName}
        </p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{order.company}</p>
        <Link
          href={`/app/customers/${order.customerId}`}
          className="mt-3 inline-block text-[13px] font-medium text-[#2c6ecb] hover:underline"
        >
          View customer profile
        </Link>
      </section>

      <section className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <h2 className={dashboardTaskTitleClass}>Order details</h2>
        <div className="mt-2 divide-y divide-[#f1f1f1]">
          <InfoRow label="Order number" value={order.number} />
          <InfoRow label="Created" value={formatDate(order.createdAt)} />
          <InfoRow label="Customer due" value={formatDate(order.inHandsDate)} />
          <InfoRow label="Document" value={documentTypeLabel(order.type)} />
          <InfoRow
            label="Total amount"
            value={formatCurrency(order.total)}
            emphasis
          />
        </div>
      </section>

      <section className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <h2 className={dashboardTaskTitleClass}>Products</h2>
        <div className="mt-2 divide-y divide-[#f1f1f1]">
          <InfoRow
            label="Line items"
            value={`${order.lineItems.length} product${order.lineItems.length !== 1 ? "s" : ""}`}
          />
          <InfoRow label="Total pieces" value={String(totalPieces)} />
          <InfoRow
            label="Decorations"
            value={
              summary.eventCount === 0
                ? "None yet"
                : `${summary.eventCount} step${summary.eventCount !== 1 ? "s" : ""}`
            }
          />
        </div>
      </section>

      <section className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <h2 className={dashboardTaskTitleClass}>Production</h2>
        <div className="mt-2 divide-y divide-[#f1f1f1]">
          <InfoRow
            label="Finished"
            value={
              summary.eventCount === 0
                ? "—"
                : `${summary.completedCount} of ${summary.eventCount}`
            }
          />
          <InfoRow
            label="On floor now"
            value={summary.runningCount > 0 ? String(summary.runningCount) : "—"}
          />
          <InfoRow
            label="Blocked"
            value={summary.blockedCount > 0 ? String(summary.blockedCount) : "—"}
          />
          <InfoRow
            label="Balance due"
            value={
              order.balance > 0
                ? formatCurrency(order.balance)
                : "Paid in full"
            }
            emphasis={order.balance > 0}
          />
        </div>
      </section>
    </div>
  );
}
