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
}

export interface SizeBreakdown {
  size: string;
  quantity: number;
}

export interface LineItem {
  id: string;
  productName: string;
  brand: string;
  color: string;
  sizes: SizeBreakdown[];
  unitCost: number;
  /** Catalog keys for editing blank garments on the order */
  productKey?: string;
  colorKey?: string;
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

export interface OrderFile {
  id: string;
  name: string;
  kind: OrderFileKind;
  uploadedAt: string;
  uploadedBy: string;
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
  | "scheduled"
  | "message"
  | "payment"
  | "note"
  | "status"
  | "file_uploaded"
  | "proof_sent";

export interface OrderActivityEvent {
  id: string;
  type: OrderActivityType;
  title: string;
  detail?: string;
  timestamp: string;
  author?: string;
}

export type InkSqueegeeType = "soft" | "medium" | "hard";

/** One ink stroke / flash on press for screen print imprints */
export interface ImprintInkColor {
  id: string;
  /** Ink name on press, e.g. "Dyno Base", "White", "Flash" */
  name: string;
  /** Pantone or PMS code, e.g. "289 C" */
  pmsCode?: string;
  mesh?: number;
  squeegee?: InkSqueegeeType;
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
  colorCount?: number;
  flashCount?: number;
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
  customerName: string;
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

export interface Shipment {
  id: string;
  method: string;
  trackingNumber?: string;
  status: "pending" | "labeled" | "in_transit" | "delivered";
  destination: string;
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
  lineItems: LineItem[];
  jobs: Job[];
  shipments: Shipment[];
  messages: Message[];
  /** Order-level files not tied to a specific imprint */
  files?: OrderFile[];
  /** Staff-only notes — never shown in customer portal */
  internalNotes?: InternalNote[];
  /** Chronological order history for the activity feed */
  activity?: OrderActivityEvent[];
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
