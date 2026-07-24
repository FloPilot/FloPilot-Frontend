"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  EstimateStatusBadge,
  OrderStatusBadge,
  RushBadge,
} from "@/components/status-badges";
import { resolveOrderEstimateStatus } from "@/lib/order-estimate-status";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  getOrderPaymentStatus,
  orderPaymentStatusLabel,
} from "@/lib/order-payment";
import { invoiceReadyForBilling } from "@/lib/order-estimate";
import type { OrderFinancials } from "@/lib/order-financial-context";
import { getInvoiceDueDate } from "@/lib/document-filters";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

function paymentTone(status: ReturnType<typeof getOrderPaymentStatus>) {
  switch (status) {
    case "paid":
      return "bg-[#e8f5ee] text-[#0d5c2e]";
    case "partial":
      return "bg-[#fff8eb] text-[#8a6116]";
    case "invoiced":
      return "bg-[#fff1f1] text-[#b42318]";
    default:
      return "bg-[#f6f6f7] text-[#616161]";
  }
}

function invoicePhaseLabel(order: Order): string {
  const payment = getOrderPaymentStatus(order);
  const sent =
    Boolean(order.invoice?.sentAt) || order.status === "invoice_sent";
  if (payment === "paid") return "Paid";
  if (payment === "partial") return "Partially paid";
  if (payment === "invoiced") return "Awaiting payment";
  if (sent) return "Sent";
  if (
    order.status === "ready_to_invoice" ||
    (invoiceReadyForBilling(order) && payment === "not_invoiced")
  ) {
    return "Ready to invoice";
  }
  return "Not invoiced";
}

export function DocumentsTable({
  mode,
  orders,
  financials,
}: {
  mode: "estimates" | "invoices";
  orders: Order[];
  financials: Map<string, OrderFinancials>;
}) {
  if (orders.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-[#ebebeb]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-[#ebebeb] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-3 py-2.5 font-medium">Customer</th>
              <th className="px-3 py-2.5 font-medium">
                {mode === "estimates" ? "Estimate" : "Invoice"}
              </th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              {mode === "invoices" ? (
                <th className="px-3 py-2.5 font-medium">Due</th>
              ) : null}
              <th className="px-3 py-2.5 text-right font-medium">Total</th>
              {mode === "invoices" ? (
                <th className="px-3 py-2.5 text-right font-medium">Balance</th>
              ) : (
                <th className="px-3 py-2.5 font-medium">Updated</th>
              )}
              <th className="w-8 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ebebeb] bg-white">
            {orders.map((order) => {
              const money = financials.get(order.id);
              const total = money?.total ?? order.total;
              const balance = money?.balance ?? order.balance;
              const tab = mode === "estimates" ? "estimate" : "invoice";
              const href = `/app/orders/${order.id}?tab=${tab}`;
              const estimateStatus = resolveOrderEstimateStatus(order);
              const payment = getOrderPaymentStatus(order);
              const dueDate = getInvoiceDueDate(order);

              return (
                <tr
                  key={order.id}
                  className="group transition-colors hover:bg-[#fafafa]"
                >
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={href}
                      className="font-semibold text-[#303030] group-hover:text-[#2c6ecb]"
                    >
                      {formatOrderDisplayLine(order)}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {order.rush ? <RushBadge /> : null}
                      <span className="text-[11px] text-[#8a8a8a]">
                        In hands {formatDate(order.inHandsDate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className="font-medium text-[#303030]">{order.company}</p>
                    {order.subCustomerName ? (
                      <p className="mt-0.5 text-[12px] text-[#616161]">
                        {order.subCustomerName}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[12px] text-[#616161]">
                        {order.customerName}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    {mode === "estimates" ? (
                      <EstimateStatusBadge status={estimateStatus} />
                    ) : (
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          paymentTone(payment)
                        )}
                      >
                        {invoicePhaseLabel(order)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  {mode === "invoices" ? (
                    <td className="px-3 py-3 align-middle text-[12px] text-[#616161]">
                      {dueDate ? formatDate(dueDate) : "—"}
                      {order.invoice?.sentAt ? (
                        <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                          Sent {formatDate(order.invoice.sentAt)}
                        </p>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 align-middle text-right tabular-nums font-medium text-[#303030]">
                    {formatCurrency(total)}
                  </td>
                  {mode === "invoices" ? (
                    <td className="px-3 py-3 align-middle text-right tabular-nums text-[#616161]">
                      {formatCurrency(balance)}
                      {payment !== "not_invoiced" ? (
                        <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                          {orderPaymentStatusLabel(payment)}
                        </p>
                      ) : null}
                    </td>
                  ) : (
                    <td className="px-3 py-3 align-middle text-[12px] text-[#616161]">
                      {order.quoteApprovedAt
                        ? `Approved ${formatDate(order.quoteApprovedAt)}`
                        : order.proofsSentAt
                          ? `Sent ${formatDate(order.proofsSentAt)}`
                          : `Created ${formatDate(order.createdAt)}`}
                    </td>
                  )}
                  <td className="px-3 py-3 align-middle">
                    <Link
                      href={href}
                      className="inline-flex size-7 items-center justify-center rounded-md text-[#8a8a8a] transition-colors hover:bg-[#f1f1f1] hover:text-[#303030]"
                      aria-label={`Open ${formatOrderDisplayLine(order)}`}
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
