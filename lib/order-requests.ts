export type OrderRequestStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "converted"
  | "declined"
  | "cancelled";

export type OrderRequestLineItem = {
  id: string;
  source: "manual" | "supplier" | "vendor_po";
  brand: string;
  productName: string;
  styleNumber?: string;
  color: string;
  colorCode?: string;
  sizes: Record<string, number>;
  quantity: number;
  unitCost?: number;
  supplierProvider?: string;
  supplierSku?: string;
  previewUrl?: string;
  notes?: string;
};

export type OrderRequestEventMockup = {
  id: string;
  name: string;
  previewUrl: string;
};

export type OrderRequestInkColor = {
  id: string;
  name: string;
  pmsCode: string;
};

export type OrderRequestEvent = {
  id: string;
  name: string;
  decorationType: string;
  locationKey: string;
  locationLabel: string;
  notes: string;
  /** Print size as "W × H" inches — maps to imprint notes.dimensions */
  printSize?: string;
  /** Placement note — maps to imprint notes.placement */
  placement?: string;
  lineItemIds: string[];
  inkColors?: OrderRequestInkColor[];
  mockup?: OrderRequestEventMockup | null;
  /** Full design-studio document (same shape as order imprint.designMockup). */
  designMockup?: import("@/types").OrderDesignMockup | null;
  /**
   * Proof artwork for this location (same shape as order imprint.artwork).
   * Status is always treated as pending on requests.
   */
  artwork?: import("@/types").ArtworkFile | null;
  /** Extra production note fields beyond printSize / placement / notes. */
  productionNotes?: import("@/types").ImprintProductionNotes | null;
};

export type OrderRequestProductionRunMember = {
  requestId: string;
  requestNumber: string;
  customLabel?: string;
  quantity: number;
};

export type OrderRequestProductionRun = {
  id: string;
  combinedQuantity: number;
  memberCount: number;
  members: OrderRequestProductionRunMember[];
  updatedAt?: string | null;
};

export type OrderRequestEstimateRow = {
  id?: string;
  kind: "garment" | "decoration" | "fee";
  description: string;
  detail: string;
  qty: number;
  unitCost: number | null;
  lineTotal: number;
  includedInBundle?: boolean;
  feeCategory?: string;
};

export type OrderRequestEstimateTotals = {
  garmentSubtotal: number;
  decorationSubtotal: number;
  feesSubtotal: number;
  subtotal: number;
  tax: number;
  total: number;
  rows: OrderRequestEstimateRow[];
  rateSheetId?: string | null;
  rateSheetName?: string | null;
  usingShopPricing?: boolean;
  disclaimer?: string;
  currency?: string;
};

export type OrderRequestEstimateDocument = {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  reason: string;
  rateSheetName?: string | null;
  usingShopPricing?: boolean;
  totals: OrderRequestEstimateTotals;
  pdf?: { downloadUrl: string; filename: string } | null;
};

export type OrderRequestSummary = {
  id: string;
  number: string;
  status: OrderRequestStatus;
  customerId: string;
  customerName: string;
  company: string;
  customLabel: string;
  inHandsDate: string | null;
  rush: boolean;
  createdAt: string;
  updatedAt: string;
  blankCount: number;
  pieceCount: number;
  eventCount: number;
  mockupCount: number;
  subCustomerId?: string | null;
  subCustomerName?: string | null;
  convertedOrderId: string | null;
  convertedOrderNumber: string | null;
  notesPreview: string;
  productionRun?: OrderRequestProductionRun | null;
  estimateTotal?: number | null;
  currentEstimateVersion?: number | null;
  /** Sales rep for the customer account (assignment for “Assigned to me”). */
  salesRepId?: string | null;
  salesRepName?: string | null;
};

export type OrderRequestDetail = OrderRequestSummary & {
  notes: string;
  blankSource: "shop_orders" | "customer_supplies";
  lineItems: OrderRequestLineItem[];
  events: OrderRequestEvent[];
  vendorPurchaseOrder?: OrderRequestVendorPurchaseOrder | null;
  declinedAt?: string;
  declineReason?: string;
  convertedAt?: string;
  estimateDocuments?: OrderRequestEstimateDocument[];
  currentEstimate?: OrderRequestEstimateDocument | null;
  estimateAdjustments?: {
    id: string;
    label: string;
    detail?: string;
    qty: number;
    unitPrice: number;
    source?: string;
    category?: string;
    contractFeeId?: string;
  }[];
  excludedContractFeeIds?: string[];
  /** Rate sheet used for matrix pricing on this request */
  selectedRateSheetId?: string | null;
  /** Staff ↔ customer thread (copied onto the order on convert). */
  messages?: {
    id: string;
    author: string;
    role: "staff" | "customer";
    content: string;
    timestamp: string;
  }[];
  /** Staff-only notes (never shown to the customer). */
  internalNotes?: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }[];
  /** Paper trail for this request (carried onto the order on convert). */
  activity?: import("@/types").OrderActivityEvent[];
  draftState?: {
    step?: string;
    draft?: OrderRequestDraft;
    savedAt?: string;
  } | null;
  draftLinkedRequestIds?: string[];
};

export type OrderRequestVendorPurchaseOrder = {
  fileName: string;
  contentType: string;
  fileUrl: string;
  vendorName: string;
  poNumber: string;
  parseStatus: "parsed" | "failed" | "manual";
  notes?: string;
};

export const ORDER_REQUEST_STATUS_LABELS: Record<OrderRequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  converted: "Converted",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function orderRequestStatusTone(
  status: OrderRequestStatus
): "neutral" | "warning" | "success" | "info" | "danger" {
  if (status === "draft") return "neutral";
  if (status === "submitted") return "warning";
  if (status === "in_review") return "info";
  if (status === "converted") return "success";
  if (status === "declined" || status === "cancelled") return "danger";
  return "neutral";
}

export const ORDER_REQUEST_SIZE_KEYS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
] as const;

export const ORDER_REQUEST_DECORATION_OPTIONS = [
  { value: "screen_print", label: "Screen print" },
  { value: "embroidery", label: "Embroidery" },
  { value: "dtf", label: "DTF" },
  { value: "dtg", label: "DTG" },
  { value: "other", label: "Other" },
] as const;

export const ORDER_REQUEST_LOCATION_OPTIONS = [
  { value: "front_left_chest", label: "Front left chest" },
  { value: "front_chest", label: "Front chest" },
  { value: "full_front", label: "Full front" },
  { value: "full_back", label: "Full back" },
  { value: "left_sleeve", label: "Left sleeve" },
  { value: "right_sleeve", label: "Right sleeve" },
  { value: "nape", label: "Nape / yoke" },
  { value: "other", label: "Other" },
] as const;

export function createDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptySizes(): Record<string, number> {
  return Object.fromEntries(
    ORDER_REQUEST_SIZE_KEYS.map((size) => [size, 0])
  );
}

export function pieceCountFromSizes(sizes: Record<string, number>) {
  return Object.values(sizes).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export type OrderRequestDraftLineItem = {
  id: string;
  source: "manual" | "supplier" | "vendor_po";
  brand: string;
  productName: string;
  styleNumber: string;
  color: string;
  colorCode: string;
  sizes: Record<string, number>;
  unitCost?: number;
  supplierProvider?: string;
  supplierSku?: string;
  previewUrl?: string;
  notes: string;
};

export type OrderRequestDraftVendorPo = {
  fileName: string;
  contentType: string;
  /** data URL or remote URL for the uploaded PO */
  fileUrl: string;
  vendorName: string;
  poNumber: string;
  parseStatus: "idle" | "parsing" | "parsed" | "failed" | "manual";
  parseConfidence?: "high" | "medium" | "low";
  parseNotes?: string;
  confirmed: boolean;
};

export type OrderRequestDraftEvent = {
  id: string;
  name: string;
  decorationType: string;
  locationKey: string;
  notes: string;
  printSize: string;
  placement: string;
  lineItemIds: string[];
  inkColors: OrderRequestInkColor[];
  /** One-time / custom event not from the shop location list */
  isCustom?: boolean;
  mockupFile?: {
    id: string;
    name: string;
    previewUrl: string;
  } | null;
};

export type OrderRequestDraft = {
  blankSource: "shop_orders" | "customer_supplies";
  /** End business under a broker / contractor account */
  subCustomerId: string;
  /** When creating a new end business during the request */
  newEndBusinessName: string;
  lineItems: OrderRequestDraftLineItem[];
  events: OrderRequestDraftEvent[];
  vendorPurchaseOrder: OrderRequestDraftVendorPo | null;
  inHandsDate: string;
  rush: boolean;
  customLabel: string;
  notes: string;
  /** Customer-added one-time fees for initial pricing */
  estimateAdjustments: {
    id: string;
    label: string;
    detail?: string;
    qty: number;
    unitPrice: number;
    category: "setup" | "decoration" | "finishing" | "other";
    source: "manual";
    contractFeeId?: string;
  }[];
  /** Contract fees from the rate sheet the customer chose to skip */
  excludedContractFeeIds: string[];
  /** Existing open requests to run with this one for combined-quantity pricing */
  linkedRequestIds: string[];
};

export function createEmptyDraftLineItem(): OrderRequestDraftLineItem {
  return {
    id: createDraftId("blank"),
    source: "manual",
    brand: "",
    productName: "",
    styleNumber: "",
    color: "",
    colorCode: "",
    sizes: emptySizes(),
    notes: "",
  };
}

export function createEmptyDraftEvent(
  lineItemIds: string[] = []
): OrderRequestDraftEvent {
  return {
    id: createDraftId("event"),
    name: "",
    decorationType: "screen_print",
    locationKey: "other",
    notes: "",
    printSize: "",
    placement: "",
    lineItemIds,
    inkColors: [],
    isCustom: true,
    mockupFile: null,
  };
}

export function createEmptyDraftInkColor(): OrderRequestInkColor {
  return {
    id: createDraftId("ink"),
    name: "",
    pmsCode: "",
  };
}

export function createEmptyOrderRequestDraft(
  inHandsDate: string
): OrderRequestDraft {
  return {
    blankSource: "shop_orders",
    subCustomerId: "",
    newEndBusinessName: "",
    lineItems: [],
    events: [],
    vendorPurchaseOrder: null,
    inHandsDate,
    rush: false,
    customLabel: "",
    notes: "",
    estimateAdjustments: [],
    excludedContractFeeIds: [],
    linkedRequestIds: [],
  };
}

export function createDraftEventFromLocation(
  location: {
    value: string;
    label: string;
    decorationType?: string;
  },
  lineItemIds: string[] = []
): OrderRequestDraftEvent {
  return {
    id: createDraftId("event"),
    name: location.label.trim() || location.value,
    decorationType: location.decorationType?.trim() || "screen_print",
    locationKey: location.value,
    notes: "",
    printSize: "",
    placement: "",
    lineItemIds,
    inkColors: [],
    isCustom: false,
    mockupFile: null,
  };
}
