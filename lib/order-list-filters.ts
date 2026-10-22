import { parseISO } from "date-fns";
import type { DecorationType, Order, OrderStatus, ScheduleBlock } from "@/types";
import { approvalSummary } from "@/lib/order-approval";
import { matchesDesignCodeSearch } from "@/lib/design-code";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { isArchivedOrder } from "@/lib/order-archive";
import { orderHasDecorationType } from "@/lib/order-decoration-summary";
import { countOrderScheduleProgress } from "@/lib/event-basket";
import {
  materialsSummary,
  orderHasPendingGarmentReceiving,
  pendingMaterialLines,
} from "@/lib/order-materials";
import { orderStatusLabel } from "@/lib/order-status";
import { isOrderFulfillmentReady } from "@/lib/order-shipping";

export type OrderListSearchOptions = {
  scheduleBlocks?: ScheduleBlock[];
};

export type OrderListScope = "active" | "historical" | "archived" | "all";

export type OrderJobTypeFilter = DecorationType | "all";

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "quote_sent",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_to_ship",
  "ready_to_invoice",
  "invoice_sent",
];

export const HISTORICAL_ORDER_STATUSES: OrderStatus[] = [
  "shipped",
  "completed",
];

/** @deprecated Use isHistoricalOrder */
export const PREVIOUS_ORDER_STATUSES = HISTORICAL_ORDER_STATUSES;

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_ORDER_STATUSES.includes(order.status);
}

export function isHistoricalOrder(order: Order): boolean {
  return HISTORICAL_ORDER_STATUSES.includes(order.status);
}

/** @deprecated Use isHistoricalOrder */
export const isPreviousOrder = isHistoricalOrder;

export function filterOrdersList(
  orders: Order[],
  {
    scope,
    jobType = "all",
  }: {
    scope: OrderListScope;
    jobType?: OrderJobTypeFilter;
  }
): Order[] {
  return orders.filter((order) => {
    if (scope === "archived") {
      if (!isArchivedOrder(order)) return false;
    } else if (scope !== "all" && isArchivedOrder(order)) {
      return false;
    }

    if (scope === "active" && !isActiveOrder(order)) return false;
    if (scope === "historical" && !isHistoricalOrder(order)) return false;
    if (jobType !== "all" && !orderHasDecorationType(order, jobType)) {
      return false;
    }
    return true;
  });
}

export function sortOrdersList(orders: Order[], scope: OrderListScope): Order[] {
  const list = [...orders];
  if (scope === "archived") {
    return list.sort((a, b) => {
      const aTime = a.archivedAt ? parseISO(a.archivedAt).getTime() : 0;
      const bTime = b.archivedAt ? parseISO(b.archivedAt).getTime() : 0;
      return bTime - aTime;
    });
  }
  if (scope === "active") {
    return list.sort(
      (a, b) =>
        parseISO(a.inHandsDate).getTime() - parseISO(b.inHandsDate).getTime()
    );
  }
  return list.sort(
    (a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
  );
}

export const JOB_TYPE_FILTER_TABS: {
  value: OrderJobTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All job types" },
  { value: "screen_print", label: "Screen print" },
  { value: "dtf", label: "DTF" },
  { value: "embroidery", label: "Embroidery" },
  { value: "vinyl", label: "Vinyl" },
];

export const SCOPE_TABS: { value: OrderListScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "historical", label: "Historical" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

/** Status synonyms staff commonly type into the orders search box. */
const ORDER_SEARCH_STATUS_ALIASES: Record<string, OrderStatus[]> = {
  open: ACTIVE_ORDER_STATUSES,
  active: ACTIVE_ORDER_STATUSES,
  wip: ["in_production"],
  "work in progress": ["in_production"],
  "in production": ["in_production"],
  production: ["in_production"],
  draft: ["draft"],
  quote: ["quote_sent"],
  approval: ["awaiting_approval"],
  approved: ["approved"],
  schedule: ["approved"],
  scheduling: ["approved"],
  shipping: ["ready_to_ship"],
  ship: ["ready_to_ship", "shipped"],
  shipped: ["shipped"],
  invoice: ["ready_to_invoice", "invoice_sent"],
  invoiced: ["invoice_sent"],
  paid: ["completed"],
  completed: ["completed", "ready_to_invoice", "invoice_sent"],
  done: ["completed"],
  historical: HISTORICAL_ORDER_STATUSES,
  closed: HISTORICAL_ORDER_STATUSES,
  archived: [],
};

type OrderSearchPredicate = (order: Order, options?: OrderListSearchOptions) => boolean;

function orderHasOutsideVendor(order: Order): boolean {
  for (const job of order.jobs ?? []) {
    if (job.kind === "subcontract") return true;
    for (const imprint of job.imprints ?? []) {
      if (imprint.subcontract?.vendorName?.trim()) return true;
      if (imprint.subcontract) return true;
    }
  }
  const materials = order.materials?.lines ?? [];
  return materials.some(
    (line) =>
      Boolean(line.vendor?.trim()) || line.kind === "subcontract_return"
  );
}

function orderNeedsArt(order: Order): boolean {
  const approval = approvalSummary(order);
  return approval.artworkTotal > 0 && !approval.artworkApproved;
}

function orderIsBlocked(order: Order): boolean {
  return (order.jobs ?? []).some((job) =>
    (job.imprints ?? []).some(
      (imprint) =>
        imprint.workflow?.status === "blocked" ||
        imprint.workflow?.onHold === true
    )
  );
}

function orderNeedsSchedule(
  order: Order,
  options?: OrderListSearchOptions
): boolean {
  if (orderNeedsArt(order) || orderIsBlocked(order)) return false;
  const progress = countOrderScheduleProgress(
    order,
    options?.scheduleBlocks ?? []
  );
  if (progress.total > 0) {
    return progress.scheduled < progress.total;
  }
  return order.status === "approved";
}

function orderHasPendingReceiving(order: Order): boolean {
  return (
    orderHasPendingGarmentReceiving(order) ||
    pendingMaterialLines(order).length > 0
  );
}

/** Condition / workflow shortcuts (receiving, art, vendor, etc.). */
const ORDER_SEARCH_CONDITION_ALIASES: Record<string, OrderSearchPredicate> = {
  archived: (order) => isArchivedOrder(order),
  // Receiving
  receiving: (order) => orderHasPendingReceiving(order),
  "not received": (order) => orderHasPendingReceiving(order),
  unreceived: (order) => orderHasPendingReceiving(order),
  "awaiting blanks": (order) => orderHasPendingGarmentReceiving(order),
  "waiting blanks": (order) => orderHasPendingGarmentReceiving(order),
  "blanks pending": (order) => orderHasPendingGarmentReceiving(order),
  "needs receiving": (order) => orderHasPendingReceiving(order),
  "not received blanks": (order) => orderHasPendingGarmentReceiving(order),
  received: (order) =>
    !orderHasPendingReceiving(order) &&
    (order.materials?.lines?.length ?? 0) > 0,
  // Art / proofs
  "needs art": (order) => orderNeedsArt(order),
  artwork: (order) => orderNeedsArt(order),
  proofs: (order) => orderNeedsArt(order),
  // Scheduling / floor
  "needs schedule": (order, options) => orderNeedsSchedule(order, options),
  unscheduled: (order, options) => orderNeedsSchedule(order, options),
  "ready for scheduling": (order, options) =>
    orderNeedsSchedule(order, options),
  "on floor": (order) => order.status === "in_production",
  blocked: (order) => orderIsBlocked(order),
  rush: (order) => order.rush === true,
  // Vendor / subcontract
  vendor: (order) => orderHasOutsideVendor(order),
  vendors: (order) => orderHasOutsideVendor(order),
  subcontract: (order) => orderHasOutsideVendor(order),
  subcontracting: (order) => orderHasOutsideVendor(order),
  // Fulfillment
  "ready to ship": (order) =>
    order.status === "ready_to_ship" || isOrderFulfillmentReady(order),
  pickup: (order) =>
    order.shipping?.defaultMethodKey === "will_call" ||
    (order.shipments ?? []).some(
      (shipment) => shipment.methodKey === "will_call"
    ),
  "will call": (order) =>
    order.shipping?.defaultMethodKey === "will_call" ||
    (order.shipments ?? []).some(
      (shipment) => shipment.methodKey === "will_call"
    ),
};

function supplierSearchLabel(supplier?: string | null): string {
  if (supplier === "ssActivewear") return "ss activewear s&s sns ssactivewear";
  if (supplier === "sanMar") return "sanmar san mar";
  return supplier ?? "";
}

function orderDecorationHaystack(order: Order): string {
  const parts: string[] = [];

  for (const item of order.lineItems ?? []) {
    parts.push(
      item.productName,
      item.brand ?? "",
      item.color ?? "",
      item.description ?? "",
      item.colorKey ?? "",
      item.productKey ?? "",
      item.supplierPartNumber ?? "",
      String(item.supplierStyleId ?? ""),
      supplierSearchLabel(item.supplier),
      item.blankSource === "customer_supplies"
        ? "customer supplies customer blanks"
        : item.blankSource === "shop_orders"
          ? "shop blanks shop ordered"
          : "",
      item.notes ?? ""
    );
  }

  for (const job of order.jobs ?? []) {
    parts.push(job.name, job.kind ?? "", job.subcontractServiceId ?? "");
    for (const imprint of job.imprints ?? []) {
      parts.push(
        imprint.label,
        imprint.customLabel ?? "",
        imprint.locationKey ?? "",
        imprint.designCode ?? "",
        imprint.artwork?.name ?? "",
        imprint.artwork?.mockupLabel ?? "",
        imprint.notes?.colors ?? "",
        imprint.notes?.dimensions ?? "",
        imprint.notes?.instructions ?? "",
        imprint.notes?.placement ?? "",
        imprint.notes?.inkType ?? "",
        imprint.subcontract?.vendorName ?? "",
        imprint.subcontract?.workDescription ?? "",
        imprint.subcontract?.poNumber ?? "",
        imprint.subcontract?.status ?? "",
        imprint.subcontract?.notes ?? "",
        imprint.workflow?.status ?? "",
        imprint.workflow?.assignee ?? "",
        imprint.workflow?.blockedReason ?? ""
      );
      for (const ink of imprint.inkColors ?? []) {
        parts.push(ink.name, ink.pmsCode ?? "", ink.transferType ?? "");
      }
    }
  }

  for (const line of order.materials?.lines ?? []) {
    parts.push(
      line.label,
      line.kind,
      line.status,
      line.vendor ?? "",
      line.poNumber ?? "",
      line.notes ?? "",
      line.productName ?? "",
      line.brand ?? "",
      line.color ?? "",
      line.size ?? ""
    );
  }

  if (order.materials?.receivingCallout) {
    parts.push(order.materials.receivingCallout);
  }
  if (order.materials?.blankSource === "customer_supplies") {
    parts.push("customer supplies customer blanks");
  } else if (order.materials?.blankSource === "shop_orders") {
    parts.push("shop blanks shop ordered");
  }

  parts.push(materialsSummary(order));

  for (const file of order.files ?? []) {
    parts.push(file.name, file.kind, ...(file.kinds ?? []), file.notes ?? "");
  }

  for (const note of order.internalNotes ?? []) {
    parts.push(
      note.content ?? "",
      note.author ?? "",
      note.targetDepartment ?? ""
    );
  }
  if (order.estimateStaffNote) parts.push(order.estimateStaffNote);

  for (const shipment of order.shipments ?? []) {
    parts.push(
      shipment.method ?? "",
      shipment.methodKey ?? "",
      shipment.trackingNumber ?? "",
      shipment.label ?? "",
      shipment.destination ?? "",
      shipment.status ?? "",
      shipment.handlingNotes ?? ""
    );
  }

  if (order.shipping?.thirdPartyAccount) {
    const account = order.shipping.thirdPartyAccount;
    parts.push(
      account.label ?? "",
      account.carrier,
      account.carrierOther ?? "",
      account.accountNumber,
      account.accountName ?? "",
      account.billingPostalCode
    );
  }

  return parts.filter(Boolean).join(" ");
}

function orderSearchHaystack(order: Order): string {
  return [
    order.number,
    order.number.replace(/-/g, ""),
    order.customLabel ?? "",
    formatOrderDisplayLine(order),
    order.customerName,
    order.company,
    order.subCustomerName ?? "",
    order.clientStoreName ?? "",
    order.clientStoreShopperName ?? "",
    order.customerPoNumber ?? "",
    order.designCode ?? "",
    order.salesRepName ?? "",
    order.salesRepId ?? "",
    order.status,
    orderStatusLabel(order.status),
    order.type ?? "",
    order.rush ? "rush" : "",
    orderDecorationHaystack(order),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function orderMatchesConditionAlias(
  order: Order,
  key: string,
  options?: OrderListSearchOptions
): boolean | null {
  const predicate = ORDER_SEARCH_CONDITION_ALIASES[key];
  if (!predicate) return null;
  return predicate(order, options);
}

function orderMatchesStatusAlias(order: Order, key: string): boolean | null {
  if (key === "archived") return isArchivedOrder(order);
  const statuses = ORDER_SEARCH_STATUS_ALIASES[key];
  if (!statuses) return null;
  return statuses.includes(order.status);
}

function orderMatchesSearchToken(
  order: Order,
  token: string,
  options?: OrderListSearchOptions
): boolean {
  if (!token) return true;

  if (matchesDesignCodeSearch(order.designCode, token)) return true;

  const condition = orderMatchesConditionAlias(order, token, options);
  if (condition !== null) return condition;

  const status = orderMatchesStatusAlias(order, token);
  if (status !== null) return status;

  return orderSearchHaystack(order).includes(token);
}

function orderMatchesSearchQuery(
  order: Order,
  normalized: string,
  options?: OrderListSearchOptions
): boolean {
  const condition = orderMatchesConditionAlias(order, normalized, options);
  if (condition !== null) return condition;

  const status = orderMatchesStatusAlias(order, normalized);
  if (status !== null) return status;

  if (matchesDesignCodeSearch(order.designCode, normalized)) return true;

  // Whole-phrase match (company / vendor / product names).
  if (normalized.includes(" ")) {
    if (orderSearchHaystack(order).includes(normalized)) return true;
  }

  const tokens = normalized.split(" ").filter(Boolean);
  return tokens.every((token) =>
    orderMatchesSearchToken(order, token, options)
  );
}

/**
 * Free-text search for the orders list.
 * Matches customer, sales rep, vendor, supplier, garments, receiving state,
 * order # / PO / design code, status shortcuts (open, wip), and more.
 */
export function searchOrdersList(
  orders: Order[],
  query: string,
  options?: OrderListSearchOptions
): Order[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return orders;
  return orders.filter((order) =>
    orderMatchesSearchQuery(order, normalized, options)
  );
}

/**
 * Apply multiple committed search terms (chips). Each term is AND’d.
 */
export function searchOrdersListByTerms(
  orders: Order[],
  terms: string[],
  options?: OrderListSearchOptions
): Order[] {
  return terms.reduce(
    (current, term) => searchOrdersList(current, term, options),
    orders
  );
}

export function normalizeOrderSearchTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
