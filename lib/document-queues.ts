import { excludeArchivedOrders } from "@/lib/order-archive";
import { invoiceReadyForBilling } from "@/lib/order-estimate";
import {
  resolveOrderEstimateStatus,
  type OrderEstimateStatus,
} from "@/lib/order-estimate-status";
import {
  getOrderPaymentStatus,
  type OrderPaymentStatus,
} from "@/lib/order-payment";
import type { Order } from "@/types";

export type DocumentEstimateFilter =
  | "all"
  | "pending"
  | "sent"
  | "revision"
  | "approved";

export type DocumentInvoiceFilter =
  | "all"
  | "ready"
  | "sent"
  | "unpaid"
  | "partial"
  | "paid";

export type DocumentsOverviewStats = {
  estimatesPending: number;
  estimatesSent: number;
  estimatesRevision: number;
  estimatesApproved: number;
  invoicesReady: number;
  invoicesSent: number;
  invoicesUnpaid: number;
  invoicesPartial: number;
  invoicesPaid: number;
  openEstimateValue: number;
  unpaidInvoiceBalance: number;
  totalEstimates: number;
  totalInvoices: number;
};

function isSalesDocumentOrder(order: Order): boolean {
  return order.type === "sales_order" || order.type === "quote" || order.type === "invoice";
}

function hasInvoiceActivity(order: Order): boolean {
  if (order.invoice?.sentAt) return true;
  if (order.status === "ready_to_invoice" || order.status === "invoice_sent") {
    return true;
  }
  if (invoiceReadyForBilling(order)) return true;
  const payment = getOrderPaymentStatus(order);
  // Only treat paid/partial as invoice activity once billing has started.
  if (
    (payment === "partial" || payment === "paid") &&
    (order.invoice?.sentAt || order.status === "completed")
  ) {
    return true;
  }
  return false;
}

/** Orders that should appear in the Estimates document list */
export function collectEstimateDocuments(orders: Order[]): Order[] {
  return excludeArchivedOrders(orders).filter((order) => {
    if (!isSalesDocumentOrder(order)) return false;
    // Keep production orders that still have estimate history visible,
    // but focus the estimate queue on pre-invoice work.
    const status = resolveOrderEstimateStatus(order);
    if (status === "pending" || status === "sent" || status === "revision") {
      return true;
    }
    // Approved estimates stay on the list until invoiced / completed.
    if (status === "approved") {
      return (
        order.status !== "invoice_sent" &&
        order.status !== "completed" &&
        !order.invoice?.sentAt
      );
    }
    return false;
  });
}

/** Orders that should appear in the Invoices document list */
export function collectInvoiceDocuments(orders: Order[]): Order[] {
  return excludeArchivedOrders(orders).filter((order) => {
    if (!isSalesDocumentOrder(order)) return false;
    return hasInvoiceActivity(order);
  });
}

export function filterEstimateDocuments(
  orders: Order[],
  filter: DocumentEstimateFilter
): Order[] {
  const list = collectEstimateDocuments(orders);
  if (filter === "all") return list;
  return list.filter(
    (order) => resolveOrderEstimateStatus(order) === filter
  );
}

export function filterInvoiceDocuments(
  orders: Order[],
  filter: DocumentInvoiceFilter
): Order[] {
  const list = collectInvoiceDocuments(orders);
  if (filter === "all") return list;

  return list.filter((order) => {
    const payment = getOrderPaymentStatus(order);
    const sent = Boolean(order.invoice?.sentAt) || order.status === "invoice_sent";
    const ready =
      order.status === "ready_to_invoice" ||
      (invoiceReadyForBilling(order) && !sent && payment === "not_invoiced");

    switch (filter) {
      case "ready":
        return ready;
      case "sent":
        return sent && payment !== "paid";
      case "unpaid":
        return payment === "invoiced";
      case "partial":
        return payment === "partial";
      case "paid":
        return payment === "paid";
      default:
        return true;
    }
  });
}

export function computeDocumentsOverviewStats(
  orders: Order[],
  totalsByOrderId?: Map<string, { total: number; balance: number }>
): DocumentsOverviewStats {
  const estimates = collectEstimateDocuments(orders);
  const invoices = collectInvoiceDocuments(orders);

  const estimateCounts: Record<OrderEstimateStatus, number> = {
    pending: 0,
    sent: 0,
    revision: 0,
    approved: 0,
  };

  let openEstimateValue = 0;
  for (const order of estimates) {
    const status = resolveOrderEstimateStatus(order);
    estimateCounts[status] += 1;
    if (status !== "approved") {
      openEstimateValue +=
        totalsByOrderId?.get(order.id)?.total ?? order.total ?? 0;
    }
  }

  let invoicesReady = 0;
  let invoicesSent = 0;
  let invoicesUnpaid = 0;
  let invoicesPartial = 0;
  let invoicesPaid = 0;
  let unpaidInvoiceBalance = 0;

  for (const order of invoices) {
    const payment = getOrderPaymentStatus(order);
    const sent =
      Boolean(order.invoice?.sentAt) || order.status === "invoice_sent";
    const ready =
      order.status === "ready_to_invoice" ||
      (invoiceReadyForBilling(order) && !sent && payment === "not_invoiced");

    if (ready) invoicesReady += 1;
    if (sent) invoicesSent += 1;

    if (payment === "invoiced") {
      invoicesUnpaid += 1;
      unpaidInvoiceBalance +=
        totalsByOrderId?.get(order.id)?.balance ?? order.balance ?? 0;
    } else if (payment === "partial") {
      invoicesPartial += 1;
      unpaidInvoiceBalance +=
        totalsByOrderId?.get(order.id)?.balance ?? order.balance ?? 0;
    } else if (payment === "paid") {
      invoicesPaid += 1;
    }
  }

  return {
    estimatesPending: estimateCounts.pending,
    estimatesSent: estimateCounts.sent,
    estimatesRevision: estimateCounts.revision,
    estimatesApproved: estimateCounts.approved,
    invoicesReady,
    invoicesSent,
    invoicesUnpaid,
    invoicesPartial,
    invoicesPaid,
    openEstimateValue,
    unpaidInvoiceBalance,
    totalEstimates: estimates.length,
    totalInvoices: invoices.length,
  };
}

export function documentQueueCounts(orders: Order[]) {
  const stats = computeDocumentsOverviewStats(orders);
  return {
    overview:
      stats.estimatesPending +
      stats.estimatesSent +
      stats.estimatesRevision +
      stats.invoicesReady +
      stats.invoicesUnpaid +
      stats.invoicesPartial,
    estimates:
      stats.estimatesPending +
      stats.estimatesSent +
      stats.estimatesRevision,
    invoices: stats.invoicesReady + stats.invoicesUnpaid + stats.invoicesPartial,
  };
}

export function estimateDocumentSortKey(order: Order): number {
  const status = resolveOrderEstimateStatus(order);
  const priority: Record<OrderEstimateStatus, number> = {
    revision: 0,
    sent: 1,
    pending: 2,
    approved: 3,
  };
  return priority[status];
}

export function invoiceDocumentSortKey(order: Order): number {
  const payment = getOrderPaymentStatus(order);
  const priority: Record<OrderPaymentStatus, number> = {
    invoiced: 0,
    partial: 1,
    not_invoiced: 2,
    paid: 3,
  };
  return priority[payment];
}

export function sortEstimateDocuments(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    if (a.rush !== b.rush) return a.rush ? -1 : 1;
    const byStatus = estimateDocumentSortKey(a) - estimateDocumentSortKey(b);
    if (byStatus !== 0) return byStatus;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function sortInvoiceDocuments(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    if (a.rush !== b.rush) return a.rush ? -1 : 1;
    const byStatus = invoiceDocumentSortKey(a) - invoiceDocumentSortKey(b);
    if (byStatus !== 0) return byStatus;
    const aBalance = a.balance || 0;
    const bBalance = b.balance || 0;
    if (aBalance !== bBalance) return bBalance - aBalance;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
