export type OrderStatus =
  | "draft"
  | "quote_sent"
  | "awaiting_approval"
  | "approved"
  | "in_production"
  | "ready_to_ship"
  | "shipped"
  | "completed";

export type TaskStatus = "pending" | "in_progress" | "blocked" | "done";

export type DecorationType =
  | "screen_print"
  | "embroidery"
  | "dtf"
  | "vinyl"
  | "finishing";

export type DocumentType = "quote" | "sales_order" | "invoice";

export interface Customer {
  id: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  totalOrders: number;
  lifetimeValue: number;
  /** Staff-only notes about this account */
  notes?: string;
  /** Contact first name */
  firstName?: string;
  /** Contact last name */
  lastName?: string;
  /** Full contact name (first + last, or legacy single field) */
  name: string;
  /** @deprecated Legacy account manager field — use firstName/lastName for contacts */
  accountOwner?: string;
  /** When this customer was first added */
  customerSince?: string;
  /** Customer/brand logo — https URL or inline data URL (under 400 KB) */
  logoUrl?: string;
  /** Production accent color key (blue, violet, emerald, etc.) — auto-assigned when unset */
  accentColorKey?: string;
  /** Soft-archived from active lists — admins can restore */
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  /** Saved ship-to addresses for split shipments */
  shippingLocations?: CustomerShippingLocation[];
  /** Account-specific pricing shared with the customer in their portal */
  negotiatedPricing?: CustomerNegotiatedPricing;
  /** Staff-visible audit trail for profile, pricing, and location changes */
  activity?: CustomerActivityEvent[];
}

export type CustomerActivityType =
  | "created"
  | "updated"
  | "archived"
  | "restored"
  | "note"
  | "branding_updated"
  | "portal_updated"
  | "shipping_location_added"
  | "shipping_location_updated"
  | "shipping_location_removed"
  | "pricing_note_updated"
  | "pricing_sheet_added"
  | "pricing_sheet_updated"
  | "pricing_sheet_removed";

export interface CustomerActivityEvent {
  id: string;
  type: CustomerActivityType;
  title: string;
  detail?: string;
  timestamp: string;
  author?: string;
}

export type CustomerNegotiatedPricingItem = {
  id: string;
  label: string;
  decoration?: string;
  detail?: string;
  unitPrice?: number;
  minQty?: number;
};

export type CustomerContractFeeKind =
  | "setup"
  | "additional_location"
  | "custom";

export type CustomerContractFeeChargeMode =
  | "per_order"
  | "per_location"
  | "per_piece";

export type CustomerContractFeeTier = {
  minQty: number;
  amount: number;
};

/** Contract fee on a customer rate sheet — setup, extra locations, etc. */
export type CustomerContractFee = {
  id: string;
  kind: CustomerContractFeeKind;
  label: string;
  amount: number;
  chargeMode: CustomerContractFeeChargeMode;
  /** Locations bundled in decoration base rate (additional_location only) */
  includedLocations?: number;
  /** Tiered unit price by order piece count (additional_location only) */
  quantityTiers?: CustomerContractFeeTier[];
  enabled: boolean;
  notes?: string;
};

/** One negotiated pricing matrix for a customer account */
export type CustomerNegotiatedRateSheet = {
  id: string;
  name: string;
  notes?: string;
  isDefault?: boolean;
  enabled: boolean;
  methods: import("@/lib/shop-settings").PricingMethod[];
  /** Setup, additional location, and other contract fees for this sheet */
  contractFees?: CustomerContractFee[];
  createdAt?: string;
  updatedAt?: string;
};

/** Categorized fee line on an order estimate */
export type OrderEstimateFeeCategory =
  | "setup"
  | "decoration"
  | "finishing"
  | "other";

/** Manual or auto-applied fee line on an order estimate */
export type OrderEstimateAdjustment = {
  id: string;
  label: string;
  detail?: string;
  qty: number;
  unitPrice: number;
  source: "auto" | "manual";
  category: OrderEstimateFeeCategory;
  contractFeeId?: string;
};

export type CustomerNegotiatedPricing = {
  summary?: string;
  updatedAt?: string;
  /** Full pricing matrices negotiated for this account */
  rateSheets?: CustomerNegotiatedRateSheet[];
  /** Legacy flat-rate items (portal fallback) */
  items?: CustomerNegotiatedPricingItem[];
};

export interface ShippingAddress {
  label?: string;
  attention?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CustomerShippingLocation extends ShippingAddress {
  id: string;
  isDefault?: boolean;
}

export interface SizeBreakdown {
  size: string;
  quantity: number;
}

export type LineItemSupplier = "ssActivewear";

export interface LineItem {
  id: string;
  productName: string;
  brand: string;
  color: string;
  sizes: SizeBreakdown[];
  unitCost: number;
  /** Markup % over shop blank cost — defaults from shop settings when unset */
  markupPercent?: number;
  /** Customer-facing unit price; overrides markup-derived price when set */
  customerUnitPrice?: number;
  /** Catalog keys for editing blank garments on the order */
  productKey?: string;
  colorKey?: string;
  /** Supplier catalog when blank was added from an integration */
  supplier?: LineItemSupplier;
  supplierPartNumber?: string;
  supplierStyleId?: number | null;
}

export type ImprintLocationKey =
  | "front_left_chest"
  | "front_chest"
  | "full_front"
  | "full_back"
  | "back"
  | "left_sleeve"
  | "right_sleeve"
  | "nape"
  | "other";

export interface ArtworkFile {
  id: string;
  name: string;
  version: number;
  status: "pending" | "approved" | "revision_requested";
  uploadedAt: string;
  uploadedBy?: string;
  /** Short label for mockup preview, e.g. dimensions and colors */
  mockupLabel?: string;
  kind?: OrderFileKind;
  /** Inline image preview for PNG/JPG uploads (metadata-only storage today) */
  previewUrl?: string;
  /** Previous versions of this imprint artwork */
  history?: ArtworkVersion[];
}

export interface ArtworkVersion {
  id: string;
  name: string;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  mockupLabel?: string;
  previewUrl?: string;
}

export type OrderFileKind =
  | "mockup"
  | "production_art"
  | "separation"
  | "embroidery_file"
  | "purchase_order"
  | "invoice"
  | "quote"
  | "packing_list"
  | "customer_supplied"
  | "internal"
  | "other";

export type GarmentReceiveStatus = "waiting" | "partial" | "received";

export type MaterialReceiveStatus = GarmentReceiveStatus;

export type OrderMaterialKind =
  | "garments"
  | "dtf_transfers"
  | "screen_setup"
  | "ink_prep"
  | "screen_supplies"
  | "supplies";

export interface OrderMaterialLine {
  id: string;
  kind: OrderMaterialKind;
  label: string;
  expectedQty: number;
  receivedQty: number;
  status: MaterialReceiveStatus;
  vendor?: string;
  poNumber?: string;
  eta?: string;
  notes?: string;
  /** Ink prep — imprint ink row ids marked mixed and staged */
  preppedInkColorIds?: string[];
  /** Production jobs that depend on this material line */
  linkedJobIds?: string[];
  /** Garment receiving — ties back to order line item + size */
  lineItemId?: string;
  size?: string;
  productName?: string;
  brand?: string;
  color?: string;
  /** DTF receiving — ties back to production event */
  jobId?: string;
  imprintId?: string;
  updatedAt?: string;
  /** Staff member who last received qty for this line */
  receivedBy?: string;
  /** When qty was last received or updated on the floor */
  receivedAt?: string;
}

export type BlankSource = "shop_orders" | "customer_supplies";

export interface OrderMaterials {
  lines: OrderMaterialLine[];
  /** Who orders blank garments — shop PO or customer ships their own */
  blankSource?: BlankSource;
  updatedAt?: string;
}

/** @deprecated Prefer order.materials — kept for backward compatibility */
export interface OrderGarments {
  status: GarmentReceiveStatus;
  expectedCount: number;
  receivedCount: number;
  updatedAt?: string;
}

export interface OrderFile {
  id: string;
  name: string;
  kind: OrderFileKind;
  uploadedAt: string;
  uploadedBy: string;
  /** Web-friendly preview image URL (e.g. PNG rendered from a TIFF). */
  previewUrl?: string;
  /** Cloud Storage download URL for the full file (large files live here). */
  downloadUrl?: string;
  /** Object path within the storage bucket, for future deletion/management. */
  storagePath?: string;
  /** Object path of the generated preview image, for cleanup on delete. */
  previewPath?: string;
  storageBucket?: string;
  jobId?: string;
  imprintId?: string;
  notes?: string;
}

export interface InternalNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export type OrderActivityType =
  | "artwork_uploaded"
  | "artwork_approved"
  | "artwork_revision"
  | "estimate_approved"
  | "scheduled"
  | "message"
  | "payment"
  | "note"
  | "status"
  | "file_uploaded"
  | "file_deleted"
  | "proof_sent"
  | "ink_updated"
  | "review_sent";

export interface OrderActivityEvent {
  id: string;
  type: OrderActivityType;
  title: string;
  detail?: string;
  timestamp: string;
  author?: string;
}

/** Squeegee durometer / type on press — presets plus shop-specific custom values */
export type InkSqueegeeType = string;

/** One ink stroke / flash on press for screen print imprints */
export interface ImprintInkColor {
  id: string;
  /** Ink name on press, e.g. "Dyno Base", "White", "Flash" */
  name: string;
  /** Pantone or PMS code, e.g. "289 C" */
  pmsCode?: string;
  mesh?: number;
  squeegee?: InkSqueegeeType;
  /** DTF transfer peel type — cold peel, hot peel, etc. */
  transferType?: string;
  /** Flash cure stroke — not a printed color */
  isFlash?: boolean;
}

export interface ImprintProductionNotes {
  colors?: string;
  dimensions?: string;
  instructions?: string;
  /** Placement relative to garment, e.g. "3\" below collar" */
  placement?: string;
  /** Primary ink system for this location */
  inkType?: string;
  /** Screen frame size preset id from shop settings */
  screenSizeId?: string;
  /** DTF imprint area preset id from shop settings */
  dtfImprintAreaId?: string;
  colorCount?: number;
  flashCount?: number;
}

export type PrepCheckpointStatus =
  | "not_needed"
  | "pending"
  | "in_progress"
  | "done";

/** Staff-set workflow status for a production event (imprint) */
export type ProductionEventWorkflowStatus =
  | "needs_attention"
  | "in_progress"
  | "blocked"
  | "completed";

export interface ProductionEventCheckpoints {
  artwork?: PrepCheckpointStatus;
  materials?: PrepCheckpointStatus;
  /** Screens, digitizing, machine setup, etc. */
  prep?: PrepCheckpointStatus;
}

export interface ProductionEventWorkflow {
  /** Manual override — floor run state still wins when active */
  status?: ProductionEventWorkflowStatus;
  assignee?: string;
  blockedReason?: string;
  onHold?: boolean;
  checkpoints?: ProductionEventCheckpoints;
}

/** One decoration spot on the garment — each has its own mockup and specs */
export interface JobImprint {
  id: string;
  locationKey: ImprintLocationKey;
  /** Display label, e.g. "Front left chest" */
  label: string;
  decoration: DecorationType;
  artwork: ArtworkFile;
  notes?: ImprintProductionNotes;
  /** Screen print ink strokes with Pantone codes for the floor */
  inkColors?: ImprintInkColor[];
  /** Link to a saved design in the library for reorder */
  libraryDesignId?: string;
  /** Per-event workflow — prep, assignment, and status overrides */
  workflow?: ProductionEventWorkflow;
}

export interface Task {
  id: string;
  title: string;
  department: string;
  assignee: string;
  status: TaskStatus;
  dueDate: string;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  /** Current workflow phase when this row mirrors a production event */
  phase?: string;
  /** Links board cards to imprint workflow (Tasks screen, event sheet) */
  productionEvent?: {
    jobId: string;
    imprintId: string;
  };
}

/** Decoration work package — one production event on the order (may include multiple imprint locations) */
export interface Job {
  id: string;
  name: string;
  lineItemIds?: string[];
  imprints: JobImprint[];
  tasks: Task[];
  /** Finishing steps like bagging don't need garment decoration specs */
  kind?: "decoration" | "finishing";
}

export interface ShipmentAllocation {
  lineItemId: string;
  sizes: SizeBreakdown[];
}

export interface Shipment {
  id: string;
  label?: string;
  method: string;
  methodKey?: string;
  trackingNumber?: string;
  status:
    | "pending"
    | "labeled"
    | "in_transit"
    | "delivered"
    | "picked_up";
  /** Display label — kept for legacy rows and quick lists */
  destination: string;
  address?: ShippingAddress;
  /** Customer profile location used for this shipment */
  customerLocationId?: string;
  handlingNotes?: string;
  handlingCost?: number;
  /** Which blanks/garments ship in this package */
  allocations?: ShipmentAllocation[];
}

export interface OrderShippingSettings {
  instructions?: string;
  defaultMethodKey?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  author: string;
  role: "staff" | "customer";
  content: string;
  timestamp: string;
}

export interface Order {
  id: string;
  number: string;
  type: DocumentType;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  company: string;
  createdAt: string;
  inHandsDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  rush: boolean;
  /** Customer approved the estimate / quote */
  quoteApproved?: boolean;
  quoteApprovedAt?: string;
  proofsSentAt?: string;
  customerReview?: {
    issuedAt: string;
    expiresAt: string;
    iteration: number;
  };
  /** Blank garments for the whole order — one status for every event */
  garments?: OrderGarments;
  /** Garments, DTF transfers, and other inbound materials */
  materials?: OrderMaterials;
  lineItems: LineItem[];
  jobs: Job[];
  shipments: Shipment[];
  /** Order-level shipping notes and defaults */
  shipping?: OrderShippingSettings;
  messages: Message[];
  /** Order-level files not tied to a specific imprint */
  files?: OrderFile[];
  /** Staff-only notes — never shown in customer portal */
  internalNotes?: InternalNote[];
  /** Chronological order history for the activity feed */
  activity?: OrderActivityEvent[];
  /** Soft-deleted from active lists — admins can restore */
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  /** Rate sheet for this order — `"shop"` uses shop matrix; omit = customer default */
  selectedRateSheetId?: string | null;
  /** One-off or auto contract fee lines on the estimate */
  estimateAdjustments?: OrderEstimateAdjustment[];
  /** Contract fee ids excluded from auto-apply on this order */
  excludedContractFeeIds?: string[];
  /** Optional shop label shown after order number, e.g. "LEGENDS SPIRIT OF DRIVING" */
  customLabel?: string;
}

/** Reusable decoration spec saved from an order imprint */
export interface SavedDesign {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  company?: string;
  decoration: DecorationType;
  locationKey: ImprintLocationKey;
  locationLabel: string;
  artwork: ArtworkFile;
  inkColors?: ImprintInkColor[];
  notes?: ImprintProductionNotes;
  pmsCodes?: string[];
  tags?: string[];
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  sourceJobId?: string;
  sourceImprintId?: string;
  createdAt: string;
  updatedAt?: string;
  lastUsedAt?: string;
  activity?: DesignActivityEvent[];
  versions?: DesignVersionSnapshot[];
}

export type DesignActivityType =
  | "ink_updated"
  | "specs_updated"
  | "artwork_uploaded"
  | "version_restored"
  | "note";

export interface DesignActivityEvent {
  id: string;
  type: DesignActivityType;
  title: string;
  detail?: string;
  timestamp: string;
  author?: string;
  source?: "library" | "order" | "system";
  versionId?: string;
}

export interface DesignVersionSnapshot {
  id: string;
  version: number;
  createdAt: string;
  createdBy?: string;
  label?: string;
  snapshot: {
    name?: string;
    tags?: string[];
    artwork?: ArtworkFile;
    inkColors?: ImprintInkColor[];
    notes?: ImprintProductionNotes;
    pmsCodes?: string[];
  };
}

export interface DashboardStats {
  openQuotes: number;
  activeOrders: number;
  dueThisWeek: number;
  awaitingApproval: number;
  productionTasks: number;
  lowStockItems: number;
}

export type ResourceType = "machine" | "workstation" | "dryer" | "other";

export type MachineCalendarColor =
  | "amber"
  | "blue"
  | "emerald"
  | "violet"
  | "rose"
  | "cyan"
  | "orange"
  | "slate";

export type MachineIssueType =
  | "mechanical"
  | "ink_supply"
  | "screens"
  | "electrical"
  | "other";

export interface MachineOperatingHours {
  /** 24h "HH:mm" when booking is allowed to start */
  openTime: string;
  /** 24h "HH:mm" when booking must end */
  closeTime: string;
  /** Days machine accepts jobs: 0=Sun … 6=Sat */
  daysOpen: number[];
}

export interface Machine {
  id: string;
  name: string;
  type: ResourceType;
  color: MachineCalendarColor;
  capacityPerHour: number;
  active: boolean;
  operatingHours?: MachineOperatingHours;
  notes?: string;
  /** Latest floor status message (e.g. current issue) */
  statusMessage?: string;
  statusUpdatedAt?: string;
}

export interface MachineIssueReport {
  id: string;
  machineId: string;
  issueType: MachineIssueType;
  message: string;
  reportedAt: string;
  takeOffline: boolean;
}

export interface ScheduleBlock {
  id: string;
  machineId: string;
  orderId: string;
  jobId: string;
  jobName: string;
  /** Which imprint location is scheduled on this run */
  imprintId: string;
  imprintLabel: string;
  orderNumber: string;
  customerName: string;
  startAt: string;
  endAt: string;
  pieceCount?: number;
  notes?: string;
  /** Optional shop label shown after order number on the calendar, e.g. "LEGENDS SPIRIT OF DRIVING FLC" */
  customLabel?: string;
}

/** Floor execution state for a scheduled slot on one machine */
export type StationJobRunStatus =
  | "upcoming"
  | "running"
  | "paused"
  | "finished"
  | "cancelled";

export interface StationJobRunNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface StationJobRun {
  id: string;
  scheduleBlockId: string;
  machineId: string;
  status: StationJobRunStatus;
  startedAt?: string;
  pausedAt?: string;
  finishedAt?: string;
  notes: StationJobRunNote[];
}

export interface SchedulableJobOption {
  orderId: string;
  orderNumber: string;
  customerName: string;
  jobId: string;
  jobName: string;
  imprintId: string;
  imprintLabel: string;
  decoration: DecorationType;
  inHandsDate: string;
  pieceCount: number;
}

export type StaffNotificationType =
  | "order_message"
  | "order_status"
  | "artwork"
  | "payment"
  | "machine_issue"
  | "support_ticket"
  | "task_assigned"
  | "general";

export interface StaffNotification {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: StaffNotificationType;
  title: string;
  body: string;
  href: string;
  entityType: string;
  entityId: string;
  actorName: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, string>;
}
