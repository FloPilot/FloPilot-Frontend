import { getApiBaseUrl } from "@/lib/api";
import type {
  CustomerReviewSession,
  ReviewAction,
} from "@/lib/customer-review-api";

export type PortalAttentionItem = {
  type: "estimate" | "artwork";
  orderId: string;
  orderNumber: string;
  jobId?: string;
  imprintId?: string;
  title: string;
  detail: string;
  inHandsDate: string | null;
};

export type PortalOrderSummary = {
  id: string;
  number: string;
  status: string;
  issueDate: string | null;
  inHandsDate: string | null;
  quoteApproved: boolean;
  proofsSentAt: string | null;
  pendingProofCount: number;
  needsApproval: boolean;
  total: number;
  paid: number;
  balance: number;
};

export type CustomerPortalDashboard = {
  expired?: boolean;
  reactivateUrl?: string;
  shop?: {
    name: string;
    email: string;
    phone: string;
    logoUrl: string;
    primaryColor: string;
  };
  customer?: {
    name: string;
    company: string;
  };
  stats?: {
    totalOrders: number;
    awaitingApproval: number;
    inProduction: number;
    balanceDue: number;
  };
  attention?: PortalAttentionItem[];
  orders?: PortalOrderSummary[];
  portalExpiresAt?: string | null;
};

export type CustomerPortalOrderSession = CustomerReviewSession & {
  portalHomeUrl?: string;
  portalExpiresAt?: string | null;
};

async function portalFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchCustomerPortal(token: string) {
  return portalFetch<CustomerPortalDashboard>(
    `getCustomerPortal?token=${encodeURIComponent(token)}`
  );
}

export async function fetchCustomerPortalOrder(
  token: string,
  orderId: string
) {
  return portalFetch<CustomerPortalOrderSession>(
    `getCustomerPortalOrder?token=${encodeURIComponent(token)}&orderId=${encodeURIComponent(orderId)}`
  );
}

export async function submitCustomerPortalAction(
  token: string,
  orderId: string,
  body: ReviewAction
) {
  return portalFetch<{ ok: boolean; order: CustomerPortalOrderSession }>(
    "submitCustomerPortalAction",
    {
      method: "POST",
      body: JSON.stringify({ token, orderId, ...body }),
    }
  );
}

export function reactivatePortalUrl(token: string) {
  return `${getApiBaseUrl()}/reactivateCustomerPortal?token=${encodeURIComponent(
    token
  )}`;
}

export function portalHomePath(token: string) {
  return `/portal/c/${encodeURIComponent(token)}`;
}

export function portalOrderPath(token: string, orderId: string) {
  return `/portal/c/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`;
}

export const PORTAL_STATUS_LABELS: Record<string, string> = {
  draft: "In setup",
  quote_sent: "Quote sent",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  in_production: "In production",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  completed: "Completed",
};

export function portalStatusLabel(status: string): string {
  return PORTAL_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export function portalStatusTone(
  status: string
): "neutral" | "warning" | "success" | "info" {
  if (status === "awaiting_approval" || status === "quote_sent") return "warning";
  if (status === "in_production" || status === "approved") return "info";
  if (status === "ready_to_ship" || status === "shipped" || status === "completed") {
    return "success";
  }
  return "neutral";
}
