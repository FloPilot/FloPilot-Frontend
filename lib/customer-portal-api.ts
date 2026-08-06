import { getApiBaseUrl } from "@/lib/api";
import type {
  CustomerNegotiatedPricing,
  CustomerShippingLocation,
} from "@/types";
import type {
  CustomerReviewSession,
  ReviewAction,
} from "@/lib/customer-review-api";
import { supplierStyleRef } from "@/lib/supplier-integrations";
import type {
  SupplierBrand,
  SupplierProviderId,
  SupplierStyleDetail,
  SupplierStyleSummary,
} from "@/lib/supplier-integrations";

export type PortalAttentionItem = {
  type: "estimate" | "artwork" | "invoice";
  orderId: string;
  orderNumber: string;
  orderCustomLabel?: string;
  jobId?: string;
  imprintId?: string;
  title: string;
  detail: string;
  inHandsDate: string | null;
};

export type PortalOrderSummary = {
  id: string;
  number: string;
  customLabel?: string;
  status: string;
  issueDate: string | null;
  inHandsDate: string | null;
  quoteApproved: boolean;
  proofsSentAt: string | null;
  invoiceSentAt?: string | null;
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
  invoice?: PortalInvoiceSummary | { available: false };
};

export type PortalInvoiceSummary = {
  available: true;
  sentAt?: string | null;
  sentTo?: string | null;
  rows: import("@/lib/customer-review-api").ReviewEstimateRow[];
  garmentSubtotal: number;
  decorationSubtotal: number;
  feesSubtotal?: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  balance: number;
  producedPieces: number;
  orderedPieces: number;
  hasVariance: boolean;
  /** Existing Stripe Checkout URL when available */
  payUrl?: string | null;
  /** Shop has Stripe Connect ready and balance is due */
  canPayOnline?: boolean;
  stripePaidAt?: string | null;
  stripePaidAmount?: number | null;
};

export type CustomerPortalMember = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "reviewer";
  status: "pending" | "active";
  firebaseUid?: string | null;
  invitedAt?: string | null;
  invitedBy?: string | null;
  linkedAt?: string | null;
};

export type CustomerPortalProfile = {
  id: string;
  company: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  shippingLocations: CustomerShippingLocation[];
  endBusinesses?: {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }[];
  orderRequestExport?: import("@/lib/order-request-export").OrderRequestExportSettings;
};

export type CustomerPortalProfileResponse = {
  expired?: boolean;
  reactivateUrl?: string;
  shop?: CustomerPortalDashboard["shop"];
  profile?: CustomerPortalProfile;
  portalExpiresAt?: string | null;
  members?: CustomerPortalMember[];
  viewer?: {
    id: string;
    email: string;
    name: string;
    role: "owner" | "reviewer";
    status: "pending" | "active";
  } | null;
};

export type CustomerPortalPricingResponse = {
  expired?: boolean;
  reactivateUrl?: string;
  shop?: CustomerPortalDashboard["shop"];
  hasNegotiatedPricing?: boolean;
  pricing?: {
    summary?: string;
    updatedAt?: string | null;
    items?: CustomerNegotiatedPricing["items"];
    rateSheets?: CustomerNegotiatedPricing["rateSheets"];
  } | null;
};

export type CustomerPortalArtworkItem = {
  id: string;
  name: string;
  locationKey?: string;
  locationLabel: string;
  decoration: string;
  previewUrl: string;
  status: "pending" | "approved" | "revision_requested";
  lastUsedAt: string | null;
  sourceOrderNumber: string | null;
  imprintCustomLabel?: string;
  printSize?: string;
  placement?: string;
  instructions?: string;
  tags?: string[];
  subCustomerId?: string | null;
  subCustomerName?: string | null;
  source?: string;
  inkColors?: { id?: string; name: string; pmsCode: string }[];
  pmsCodes?: string[];
};

export type CustomerPortalArtworkResponse = {
  expired?: boolean;
  reactivateUrl?: string;
  shop?: CustomerPortalDashboard["shop"];
  designs?: CustomerPortalArtworkItem[];
};

async function portalFetch<T>(
  path: string,
  options: RequestInit & { authToken?: string | null } = {}
): Promise<T> {
  const { authToken, ...init } = options;
  const res = await fetch(`${getApiBaseUrl()}/${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchCustomerPortal(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<CustomerPortalDashboard>("getCustomerPortal", {
      authToken: tokenOrAuth,
    });
  }
  return portalFetch<CustomerPortalDashboard>(
    `getCustomerPortal?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function fetchCustomerPortalOrder(
  tokenOrAuth: string,
  orderId: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<CustomerPortalOrderSession>(
      `getCustomerPortalOrder?orderId=${encodeURIComponent(orderId)}`,
      { authToken: tokenOrAuth }
    );
  }
  return portalFetch<CustomerPortalOrderSession>(
    `getCustomerPortalOrder?token=${encodeURIComponent(tokenOrAuth)}&orderId=${encodeURIComponent(orderId)}`
  );
}

export async function createPortalInvoiceCheckout(
  tokenOrAuth: string,
  orderId: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      payUrl: string;
      sessionId: string;
      balance: number;
    }>("createPortalInvoiceCheckout", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify({ orderId }),
    });
  }
  return portalFetch<{
    payUrl: string;
    sessionId: string;
    balance: number;
  }>("createPortalInvoiceCheckout", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, orderId }),
  });
}

export async function submitCustomerPortalAction(
  tokenOrAuth: string,
  orderId: string,
  body: ReviewAction,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{ ok: boolean; order: CustomerPortalOrderSession }>(
      "submitCustomerPortalAction",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify({ orderId, ...body }),
      }
    );
  }
  return portalFetch<{ ok: boolean; order: CustomerPortalOrderSession }>(
    "submitCustomerPortalAction",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, orderId, ...body }),
    }
  );
}

export function reactivatePortalUrl(token: string) {
  return `${getApiBaseUrl()}/reactivateCustomerPortal?token=${encodeURIComponent(
    token
  )}`;
}

/** Authenticated portal app paths (no magic token in URL). */
export const PORTAL_APP_BASE = "/portal/app";

export function portalAppHomePath() {
  return PORTAL_APP_BASE;
}

export function portalAppOrdersPath() {
  return `${PORTAL_APP_BASE}/orders`;
}

export function portalAppOrderPath(
  orderId: string,
  options?: { view?: string; focus?: string }
) {
  let path = `${PORTAL_APP_BASE}/orders/${encodeURIComponent(orderId)}`;
  const params = new URLSearchParams();
  if (options?.view) params.set("view", options.view);
  if (options?.focus) params.set("focus", options.focus);
  const qs = params.toString();
  if (qs) path += `?${qs}`;
  return path;
}

export function portalAppEstimatesPath() {
  return `${PORTAL_APP_BASE}/estimates`;
}

export function portalAppInvoicesPath() {
  return `${PORTAL_APP_BASE}/invoices`;
}

export function portalAppArtworkPath() {
  return `${PORTAL_APP_BASE}/artwork`;
}

export function portalAppBusinessPath() {
  return `${PORTAL_APP_BASE}/business`;
}

export function portalAppPricingPath() {
  return `${PORTAL_APP_BASE}/pricing`;
}

export function portalAppOrderRequestsPath() {
  return `${PORTAL_APP_BASE}/order-requests`;
}

export function portalAppOrderRequestPath(requestId: string) {
  return `${portalAppOrderRequestsPath()}/${encodeURIComponent(requestId)}`;
}

export function portalAppNewOrderRequestPath() {
  return `${portalAppOrderRequestsPath()}/new`;
}

/** Staff preview paths — magic token, no customer account required. */
export function portalPreviewHomePath(token: string) {
  return `/portal/preview/${encodeURIComponent(token)}`;
}

export function portalPreviewOrdersPath(token: string) {
  return `${portalPreviewHomePath(token)}/orders`;
}

export function portalPreviewOrderPath(
  token: string,
  orderId: string,
  options?: { view?: string; focus?: string }
) {
  let path = `${portalPreviewHomePath(token)}/orders/${encodeURIComponent(orderId)}`;
  const params = new URLSearchParams();
  if (options?.view) params.set("view", options.view);
  if (options?.focus) params.set("focus", options.focus);
  const qs = params.toString();
  if (qs) path += `?${qs}`;
  return path;
}

export function portalPreviewEstimatesPath(token: string) {
  return `${portalPreviewHomePath(token)}/estimates`;
}

export function portalPreviewInvoicesPath(token: string) {
  return `${portalPreviewHomePath(token)}/invoices`;
}

export function portalPreviewArtworkPath(token: string) {
  return `${portalPreviewHomePath(token)}/artwork`;
}

export function portalPreviewBusinessPath(token: string) {
  return `${portalPreviewHomePath(token)}/business`;
}

export function portalPreviewPricingPath(token: string) {
  return `${portalPreviewHomePath(token)}/pricing`;
}

export function portalPreviewOrderRequestsPath(token: string) {
  return `${portalPreviewHomePath(token)}/order-requests`;
}

export function portalPreviewOrderRequestPath(token: string, requestId: string) {
  return `${portalPreviewOrderRequestsPath(token)}/${encodeURIComponent(requestId)}`;
}

export function portalPreviewNewOrderRequestPath(token: string) {
  return `${portalPreviewOrderRequestsPath(token)}/new`;
}

export function portalHomePath(token: string) {
  return `/portal/c/${encodeURIComponent(token)}`;
}

export function portalOrderPath(
  token: string,
  orderId: string,
  options?: { view?: string; focus?: string }
) {
  let path = `/portal/c/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`;
  const params = new URLSearchParams();
  if (options?.view) params.set("view", options.view);
  if (options?.focus) params.set("focus", options.focus);
  const qs = params.toString();
  if (qs) path += `?${qs}`;
  return path;
}

export function portalPricingPath(token: string) {
  return `/portal/c/${encodeURIComponent(token)}/pricing`;
}

export function portalBusinessPath(token: string) {
  return `/portal/c/${encodeURIComponent(token)}/business`;
}

export function portalArtworkPath(token: string) {
  return `/portal/c/${encodeURIComponent(token)}/artwork`;
}

export async function fetchCustomerPortalProfile(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<CustomerPortalProfileResponse>(
      "getCustomerPortalProfile",
      { authToken: tokenOrAuth }
    );
  }
  return portalFetch<CustomerPortalProfileResponse>(
    `getCustomerPortalProfile?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function updateCustomerPortalProfile(
  tokenOrAuth: string,
  body: Partial<CustomerPortalProfile> & {
    shippingLocations?: CustomerShippingLocation[];
    endBusinesses?: CustomerPortalProfile["endBusinesses"];
    orderRequestExport?: CustomerPortalProfile["orderRequestExport"] & {
      referencePdfDataUrl?: string;
      referencePdfFileName?: string;
      referencePdfContentType?: string;
      clearReferencePdf?: boolean;
    };
  },
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{ ok: boolean; profile: CustomerPortalProfile }>(
      "updateCustomerPortalProfile",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify(body),
      }
    );
  }
  return portalFetch<{ ok: boolean; profile: CustomerPortalProfile }>(
    "updateCustomerPortalProfile",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, ...body }),
    }
  );
}

export async function inviteCustomerPortalReviewer(
  authToken: string,
  body: { email: string; name?: string }
) {
  return portalFetch<{
    ok: boolean;
    member: CustomerPortalMember;
    members: CustomerPortalMember[];
    inviteUrl?: string;
    email?: { sent?: boolean; error?: string; message?: string; inviteUrl?: string };
  }>("inviteCustomerPortalReviewer", {
    method: "POST",
    authToken,
    body: JSON.stringify(body),
  });
}

export async function removeCustomerPortalReviewer(
  authToken: string,
  memberId: string
) {
  return portalFetch<{
    ok: boolean;
    members: CustomerPortalMember[];
  }>("removeCustomerPortalReviewer", {
    method: "POST",
    authToken,
    body: JSON.stringify({ memberId }),
  });
}

export async function analyzePortalOrderRequestExportTemplate(
  tokenOrAuth: string,
  body: {
    fileName: string;
    contentType: string;
    base64: string;
  },
  options?: { mode?: "invite" | "auth" }
) {
  type AnalyzeResponse = {
    ok?: boolean;
    suggested?: import("@/lib/order-request-export").OrderRequestExportSettings;
    mapNotes?: string;
    fileName?: string;
    contentType?: string;
    expired?: boolean;
  };
  if (options?.mode === "auth") {
    return portalFetch<AnalyzeResponse>(
      "analyzeCustomerPortalOrderRequestExportTemplate",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify(body),
      }
    );
  }
  return portalFetch<AnalyzeResponse>(
    "analyzeCustomerPortalOrderRequestExportTemplate",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, ...body }),
    }
  );
}

export async function downloadPortalOrderRequestRecord(
  tokenOrAuth: string,
  requestId: string,
  options?: { mode?: "invite" | "auth" }
) {
  type RecordResponse = {
    downloadUrl?: string;
    pdfBase64?: string;
    filename: string;
    expired?: boolean;
  };
  if (options?.mode === "auth") {
    return portalFetch<RecordResponse>(
      "downloadCustomerPortalOrderRequestRecord",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify({ requestId }),
      }
    );
  }
  return portalFetch<RecordResponse>(
    "downloadCustomerPortalOrderRequestRecord",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, requestId }),
    }
  );
}

export async function fetchCustomerPortalPricing(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<CustomerPortalPricingResponse>(
      "getCustomerPortalPricing",
      { authToken: tokenOrAuth }
    );
  }
  return portalFetch<CustomerPortalPricingResponse>(
    `getCustomerPortalPricing?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function fetchCustomerPortalArtwork(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<CustomerPortalArtworkResponse>(
      "getCustomerPortalArtwork",
      { authToken: tokenOrAuth }
    );
  }
  return portalFetch<CustomerPortalArtworkResponse>(
    `getCustomerPortalArtwork?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function createCustomerPortalDesign(
  tokenOrAuth: string,
  body: {
    name: string;
    previewUrl: string;
    fileName?: string;
    decoration?: string;
    locationKey?: string;
    locationLabel?: string;
    printSize?: string;
    placement?: string;
    instructions?: string;
    tags?: string[] | string;
    inkColors?: { pmsCode: string }[];
    subCustomerId?: string;
  },
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{ ok: boolean; design: CustomerPortalArtworkItem }>(
      "createCustomerPortalDesign",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify(body),
      }
    );
  }
  return portalFetch<{ ok: boolean; design: CustomerPortalArtworkItem }>(
    "createCustomerPortalDesign",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, ...body }),
    }
  );
}

export async function updateCustomerPortalDesign(
  tokenOrAuth: string,
  designId: string,
  body: Record<string, unknown>,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{ ok: boolean; design: CustomerPortalArtworkItem }>(
      "updateCustomerPortalDesign",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify({ designId, ...body }),
      }
    );
  }
  return portalFetch<{ ok: boolean; design: CustomerPortalArtworkItem }>(
    "updateCustomerPortalDesign",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, designId, ...body }),
    }
  );
}

export async function listPortalOrderRequests(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      requests: import("@/lib/order-requests").OrderRequestSummary[];
    }>("listCustomerPortalOrderRequests", { authToken: tokenOrAuth });
  }
  return portalFetch<{
    requests: import("@/lib/order-requests").OrderRequestSummary[];
  }>(
    `listCustomerPortalOrderRequests?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function getPortalOrderRequest(
  tokenOrAuth: string,
  requestId: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      request: import("@/lib/order-requests").OrderRequestDetail;
    }>(`getCustomerPortalOrderRequest?requestId=${encodeURIComponent(requestId)}`, {
      authToken: tokenOrAuth,
    });
  }
  return portalFetch<{
    request: import("@/lib/order-requests").OrderRequestDetail;
  }>(
    `getCustomerPortalOrderRequest?token=${encodeURIComponent(tokenOrAuth)}&requestId=${encodeURIComponent(requestId)}`
  );
}

export async function createPortalOrderRequest(
  tokenOrAuth: string,
  body: Record<string, unknown>,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      request: import("@/lib/order-requests").OrderRequestSummary;
      detail: import("@/lib/order-requests").OrderRequestDetail;
    }>("createCustomerPortalOrderRequest", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify(body),
    });
  }
  return portalFetch<{
    request: import("@/lib/order-requests").OrderRequestSummary;
    detail: import("@/lib/order-requests").OrderRequestDetail;
  }>("createCustomerPortalOrderRequest", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, ...body }),
  });
}

export async function savePortalOrderRequestDraft(
  tokenOrAuth: string,
  body: Record<string, unknown>,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      request: import("@/lib/order-requests").OrderRequestSummary;
      detail: import("@/lib/order-requests").OrderRequestDetail;
    }>("saveCustomerPortalOrderRequestDraft", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify(body),
    });
  }
  return portalFetch<{
    request: import("@/lib/order-requests").OrderRequestSummary;
    detail: import("@/lib/order-requests").OrderRequestDetail;
  }>("saveCustomerPortalOrderRequestDraft", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, ...body }),
  });
}

export async function cancelPortalOrderRequest(
  tokenOrAuth: string,
  requestId: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<{
      request: import("@/lib/order-requests").OrderRequestDetail;
    }>("cancelCustomerPortalOrderRequest", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify({ requestId }),
    });
  }
  return portalFetch<{
    request: import("@/lib/order-requests").OrderRequestDetail;
  }>("cancelCustomerPortalOrderRequest", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, requestId }),
  });
}

export async function updatePortalOrderRequestProductionRun(
  tokenOrAuth: string,
  requestId: string,
  linkedRequestIds: string[],
  options?: { mode?: "invite" | "auth" }
) {
  const body = { requestId, linkedRequestIds };
  if (options?.mode === "auth") {
    return portalFetch<{
      request: import("@/lib/order-requests").OrderRequestDetail;
      requests: import("@/lib/order-requests").OrderRequestDetail[];
    }>("updateCustomerPortalOrderRequestProductionRun", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify(body),
    });
  }
  return portalFetch<{
    request: import("@/lib/order-requests").OrderRequestDetail;
    requests: import("@/lib/order-requests").OrderRequestDetail[];
  }>("updateCustomerPortalOrderRequestProductionRun", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, ...body }),
  });
}

export async function previewPortalOrderRequestEstimate(
  tokenOrAuth: string,
  body: Record<string, unknown>,
  options?: { mode?: "invite" | "auth" }
) {
  type PreviewResponse = {
    estimate: import("@/lib/order-requests").OrderRequestEstimateTotals | null;
    autoFees?: {
      id: string;
      label: string;
      detail?: string;
      qty: number;
      unitPrice: number;
      category?: string;
      contractFeeId?: string | null;
      skipped?: boolean;
    }[];
    availableFees?: {
      id: string;
      kind: string;
      label: string;
      amount: number;
      notes?: string;
      chargeMode?: string;
    }[];
    pricingReady?: boolean;
    incomplete?: boolean;
    message?: string | null;
  };
  if (options?.mode === "auth") {
    return portalFetch<PreviewResponse>(
      "previewCustomerPortalOrderRequestEstimate",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify(body),
      }
    );
  }
  return portalFetch<PreviewResponse>(
    "previewCustomerPortalOrderRequestEstimate",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, ...body }),
    }
  );
}

export async function downloadPortalOrderRequestEstimate(
  tokenOrAuth: string,
  requestId: string,
  options?: { mode?: "invite" | "auth"; version?: number }
) {
  const body: Record<string, unknown> = { requestId };
  if (options?.version != null) body.version = options.version;
  if (options?.mode === "auth") {
    return portalFetch<{
      downloadUrl?: string;
      pdfBase64?: string;
      filename: string;
      version?: number;
      estimate?: import("@/lib/order-requests").OrderRequestEstimateDocument;
    }>("downloadCustomerPortalOrderRequestEstimate", {
      method: "POST",
      authToken: tokenOrAuth,
      body: JSON.stringify(body),
    });
  }
  return portalFetch<{
    downloadUrl?: string;
    pdfBase64?: string;
    filename: string;
    version?: number;
    estimate?: import("@/lib/order-requests").OrderRequestEstimateDocument;
  }>("downloadCustomerPortalOrderRequestEstimate", {
    method: "POST",
    body: JSON.stringify({ token: tokenOrAuth, ...body }),
  });
}

export type PortalOrderRequestMeta = {
  providers: { id: string; label: string; connected: boolean }[];
  printLocations: {
    value: string;
    label: string;
    decorationType?: string;
  }[];
  decorationTypes?: { value: string; label: string }[];
  designPlacementPresets?: {
    id: string;
    locationKey: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    maxPrintWidthIn?: number;
    maxPrintHeightIn?: number;
    enabled?: boolean;
  }[];
  endBusinesses?: {
    id: string;
    name: string;
    contactName?: string;
  }[];
};

export async function fetchPortalOrderRequestMeta(
  tokenOrAuth: string,
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<PortalOrderRequestMeta>(
      "getCustomerPortalOrderRequestMeta",
      { authToken: tokenOrAuth }
    );
  }
  return portalFetch<PortalOrderRequestMeta>(
    `getCustomerPortalOrderRequestMeta?token=${encodeURIComponent(tokenOrAuth)}`
  );
}

export async function searchPortalCatalog(
  tokenOrAuth: string,
  query: string,
  options?: {
    mode?: "invite" | "auth";
    provider?: string;
    brand?: string;
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options?.provider) params.set("provider", options.provider);
  if (options?.brand) params.set("brand", options.brand);
  if (options?.limit != null) params.set("limit", String(options.limit));

  if (options?.mode === "auth") {
    return portalFetch<{
      results: import("@/lib/supplier-integrations").SupplierStyleSummary[];
      provider: string;
    }>(`searchCustomerPortalCatalog?${params.toString()}`, {
      authToken: tokenOrAuth,
    });
  }
  params.set("token", tokenOrAuth);
  return portalFetch<{
    results: import("@/lib/supplier-integrations").SupplierStyleSummary[];
    provider: string;
  }>(`searchCustomerPortalCatalog?${params.toString()}`);
}

export async function listPortalBrands(
  tokenOrAuth: string,
  provider: SupplierProviderId,
  options?: { mode?: "invite" | "auth" }
) {
  const params = new URLSearchParams();
  params.set("provider", provider);

  if (options?.mode === "auth") {
    return portalFetch<{
      provider: string;
      brands: SupplierBrand[];
    }>(`listCustomerPortalBrands?${params.toString()}`, {
      authToken: tokenOrAuth,
    });
  }
  params.set("token", tokenOrAuth);
  return portalFetch<{
    provider: string;
    brands: SupplierBrand[];
  }>(`listCustomerPortalBrands?${params.toString()}`);
}

export async function fetchPortalStyleDetail(
  tokenOrAuth: string,
  style: SupplierStyleSummary,
  provider: SupplierProviderId,
  options?: { mode?: "invite" | "auth" }
) {
  const params = new URLSearchParams();
  params.set("provider", provider);
  params.set("styleRef", supplierStyleRef(style));
  if (style.styleId != null) params.set("styleId", String(style.styleId));
  if (style.brandName) params.set("brandName", style.brandName);
  if (style.styleName) params.set("styleName", style.styleName);
  if (style.partNumber) params.set("partNumber", style.partNumber);

  if (options?.mode === "auth") {
    return portalFetch<{
      provider: string;
      style: SupplierStyleDetail;
    }>(`getCustomerPortalStyleDetail?${params.toString()}`, {
      authToken: tokenOrAuth,
    });
  }
  params.set("token", tokenOrAuth);
  return portalFetch<{
    provider: string;
    style: SupplierStyleDetail;
  }>(`getCustomerPortalStyleDetail?${params.toString()}`);
}

export type PortalVendorPoParseResult = {
  readable: boolean;
  confidence: "high" | "medium" | "low";
  vendorName: string;
  poNumber: string;
  notes: string;
  lineItems: {
    brand: string;
    productName: string;
    styleNumber: string;
    color: string;
    sizes: Record<string, number>;
    quantity: number;
  }[];
  model?: string;
};

export async function parsePortalVendorPurchaseOrder(
  tokenOrAuth: string,
  body: {
    fileName: string;
    contentType: string;
    base64: string;
  },
  options?: { mode?: "invite" | "auth" }
) {
  if (options?.mode === "auth") {
    return portalFetch<PortalVendorPoParseResult>(
      "parseCustomerPortalVendorPurchaseOrder",
      {
        method: "POST",
        authToken: tokenOrAuth,
        body: JSON.stringify(body),
      }
    );
  }
  return portalFetch<PortalVendorPoParseResult>(
    "parseCustomerPortalVendorPurchaseOrder",
    {
      method: "POST",
      body: JSON.stringify({ token: tokenOrAuth, ...body }),
    }
  );
}

export const PORTAL_STATUS_LABELS: Record<string, string> = {
  draft: "In setup",
  quote_sent: "Quote sent",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  in_production: "In production",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  ready_to_invoice: "Invoice ready",
  invoice_sent: "Invoice sent",
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
  if (
    status === "ready_to_ship" ||
    status === "shipped" ||
    status === "invoice_sent" ||
    status === "completed"
  ) {
    return "success";
  }
  if (status === "ready_to_invoice") return "warning";
  return "neutral";
}
