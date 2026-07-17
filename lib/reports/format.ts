import type { DocumentType, OrderStatus } from "@/types";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quote_sent: "Quote Sent",
  awaiting_approval: "Awaiting Approval",
  approved: "Ready to Schedule",
  in_production: "In Production",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  ready_to_invoice: "Ready to Invoice",
  invoice_sent: "Invoice Sent",
  completed: "Completed",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote: "Quote",
  sales_order: "Sales Order",
  invoice: "Invoice",
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type;
}

export function slugifyFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function reportTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
