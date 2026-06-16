import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderListScope } from "@/lib/order-list-filters";
import {
  documentTypeLabel,
  orderStatusLabel,
  reportTimestamp,
} from "@/lib/reports/format";
import type { ReportResult } from "@/lib/reports/types";
import type { DocumentType, Order } from "@/types";

export function buildOrdersListExport(
  orders: Order[],
  {
    scope,
    documentType,
    hasAdvancedFilters,
  }: {
    scope: OrderListScope;
    documentType: DocumentType | "all";
    hasAdvancedFilters: boolean;
  }
): ReportResult {
  const filenameParts = [
    "orders",
    scope,
    documentType === "all" ? null : documentType,
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
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "inHandsDate", label: "In-hands date" },
      { key: "createdAt", label: "Created" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
      { key: "rush", label: "Rush" },
    ],
    rows: orders.map((order) => ({
      orderNumber: order.number,
      company: order.company,
      contact: order.customerName,
      type: documentTypeLabel(order.type),
      status: orderStatusLabel(order.status),
      inHandsDate: formatDate(order.inHandsDate),
      createdAt: formatDate(order.createdAt),
      total: formatCurrency(order.total),
      paid: formatCurrency(order.paid),
      balance: order.balance > 0 ? formatCurrency(order.balance) : "—",
      rush: order.rush ? "Yes" : "No",
    })),
    filename: `${filenameParts.join("-")}.csv`,
  };
}
