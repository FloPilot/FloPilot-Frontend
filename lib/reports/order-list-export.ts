import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderDecorationSummary } from "@/lib/order-decoration-summary";
import type { OrderJobTypeFilter, OrderListScope } from "@/lib/order-list-filters";
import {
  orderStatusLabel,
  reportTimestamp,
} from "@/lib/reports/format";
import type { ReportResult } from "@/lib/reports/types";
import type { Order } from "@/types";
import type { resolveOrderFinancials } from "@/lib/order-estimate";

export function buildOrdersListExport(
  orders: Order[],
  {
    scope,
    jobType,
    hasAdvancedFilters,
    orderFinancials,
  }: {
    scope: OrderListScope;
    jobType: OrderJobTypeFilter;
    hasAdvancedFilters: boolean;
    orderFinancials?: Map<string, ReturnType<typeof resolveOrderFinancials>>;
  }
): ReportResult {
  const filenameParts = [
    "orders",
    scope,
    jobType === "all" ? null : jobType,
    hasAdvancedFilters ? "filtered" : null,
    reportTimestamp(),
  ].filter(Boolean);

  return {
    id: "orders-list-export",
    title: "Orders export",
    description: "Orders matching your current list filters.",
    columns: [
      { key: "orderNumber", label: "Order #" },
      { key: "company", label: "Company" },
      { key: "contact", label: "Contact" },
      { key: "jobTypes", label: "Job types" },
      { key: "status", label: "Status" },
      { key: "inHandsDate", label: "In-hands date" },
      { key: "createdAt", label: "Created" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
      { key: "rush", label: "Rush" },
    ],
    rows: orders.map((order) => {
      const financials = orderFinancials?.get(order.id);
      return {
      orderNumber: order.number,
      company: order.company,
      contact: order.customerName,
      jobTypes: getOrderDecorationSummary(order).label,
      status: orderStatusLabel(order.status),
      inHandsDate: formatDate(order.inHandsDate),
      createdAt: formatDate(order.createdAt),
      total: formatCurrency(financials?.total ?? order.total),
      paid: formatCurrency(order.paid),
      balance:
        (financials?.balance ?? order.balance) > 0
          ? formatCurrency(financials?.balance ?? order.balance)
          : "—",
      rush: order.rush ? "Yes" : "No",
    };
    }),
    filename: `${filenameParts.join("-")}.csv`,
  };
}
