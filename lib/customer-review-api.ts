import { getApiBaseUrl } from "@/lib/api";

export type ReviewMessage = {
  id: string;
  author: string;
  role: "staff" | "customer";
  content: string;
  timestamp: string;
  jobId?: string;
  imprintId?: string;
};

export type ReviewProof = {
  jobId: string;
  imprintId: string;
  jobName: string;
  label: string;
  decoration: string;
  artwork: {
    id: string;
    name: string;
    version: number;
    status: "pending" | "approved" | "revision_requested";
    previewUrl?: string;
    mockupLabel?: string;
    proofSlides?: import("@/types").ProofSlide[];
    uploadedAt?: string;
    revisionNotes?: import("@/types").RevisionNote[];
  };
  notes?: {
    dimensions?: string;
    placement?: string;
    inkType?: string;
    flashCount?: number;
    instructions?: string;
  };
  inkColors: {
    name?: string;
    pmsCode?: string;
    mesh?: number;
    squeegee?: string;
    transferType?: string;
    isFlash?: boolean;
  }[];
};

export type ReviewEstimateRow = {
  kind: "garment" | "decoration" | "fee";
  description: string;
  detail: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  includedInBundle?: boolean;
  feeCategory?: "setup" | "decoration" | "finishing" | "other";
};

export type CustomerReviewSession = {
  expired?: boolean;
  reactivateUrl?: string;
  orderNumber?: string | null;
  shop?: {
    name: string;
    email: string;
    phone: string;
    logoUrl: string;
    primaryColor: string;
  };
  order?: {
    id: string;
    number: string;
    customLabel?: string;
    inHandsDate: string;
    status: string;
    quoteApproved: boolean;
    quoteApprovedAt?: string;
    proofsSentAt?: string;
    invoiceSentAt?: string | null;
    productionRun?: {
      id: string;
      combinedQuantity: number;
      members: import("@/types").OrderProductionRunMember[];
    };
    iteration: number;
    reviewExpiresAt?: string;
  };
  customer?: {
    name: string;
    company: string;
  };
  estimate?: {
    rows: ReviewEstimateRow[];
    garmentSubtotal: number;
    decorationSubtotal: number;
    feesSubtotal?: number;
    subtotal: number;
    tax: number;
    taxRate: number;
    total: number;
    paid: number;
    balance: number;
    rateSheetName?: string | null;
    usingShopPricing?: boolean;
    hasNegotiatedPricing?: boolean;
    revisionNotes?: import("@/types").RevisionNote[];
  };
  proofs?: ReviewProof[];
  messages?: ReviewMessage[];
  portalHomeUrl?: string;
  portalOrderUrl?: string;
};

async function reviewFetch<T>(
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

export async function fetchCustomerReview(token: string) {
  const url = `getCustomerReview?token=${encodeURIComponent(token)}`;
  return reviewFetch<CustomerReviewSession>(url);
}

export type ReviewAction =
  | { action: "approve_estimate"; message?: string }
  | {
      action: "approve_artwork";
      jobId: string;
      imprintId: string;
      message?: string;
    }
  | {
      action: "request_revision";
      scope: "estimate" | "artwork";
      jobId?: string;
      imprintId?: string;
      message: string;
    }
  | { action: "send_message"; message: string }
  | {
      action: "add_proof_comment";
      jobId: string;
      imprintId: string;
      message: string;
    }
  | { action: "add_estimate_comment"; message: string };

export async function submitCustomerReviewAction(
  token: string,
  body: ReviewAction
) {
  return reviewFetch<{ ok: boolean; order: CustomerReviewSession }>(
    "submitCustomerReviewAction",
    {
      method: "POST",
      body: JSON.stringify({ token, ...body }),
    }
  );
}

export async function fetchCustomerReviewPreview(
  staffToken: string,
  orderId: string
) {
  return reviewFetch<CustomerReviewSession & { preview?: boolean }>(
    "previewCustomerReview",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ orderId }),
    }
  );
}

export function reactivateReviewUrl(token: string) {
  return `${getApiBaseUrl()}/reactivateCustomerReview?token=${encodeURIComponent(
    token
  )}`;
}
