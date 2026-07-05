import { addDays, format } from "date-fns";
import { computeEstimateTotals } from "@/lib/order-estimate";
import { IMPRINT_LOCATION_LABELS } from "@/lib/job-imprints";
import { buildCustomProductionJob } from "@/lib/order-production";
import { buildLineItemFromCatalog, createLineItemId } from "@/lib/line-items";
import type { PricingMatrix } from "@/lib/shop-settings";
import type {
  BlankSource,
  Customer,
  DecorationType,
  ImprintLocationKey,
  LineItem,
  Order,
  OrderFile,
  OrderFileKind,
} from "@/types";

export type NewOrderJobInput = {
  id: string;
  name: string;
  decorationType: DecorationType;
  locationKey: ImprintLocationKey;
  notes: string;
  kind: "decoration" | "finishing";
  /** Blank line items this decoration runs on */
  lineItemIds?: string[];
  /** Optional mockup uploaded for this event during order creation */
  mockupFile?: NewOrderMockupFile;
};

export type NewOrderMockupFile = {
  id: string;
  name: string;
  previewUrl?: string;
};

export type NewOrderCatalogLineItemInput = {
  id: string;
  productKey: (typeof NEW_ORDER_PRODUCTS)[number]["key"];
  colorKey: (typeof NEW_ORDER_COLORS)[number]["key"];
  sizes: Record<(typeof NEW_ORDER_SIZES)[number], number>;
  unitCost: number;
  markupPercent?: number;
  customerUnitPrice?: number;
};

export type NewOrderSupplierLineItemInput = {
  id: string;
  source: "supplier";
  item: LineItem;
  markupPercent?: number;
  customerUnitPrice?: number;
};

export type NewOrderLineItemInput =
  | NewOrderCatalogLineItemInput
  | NewOrderSupplierLineItemInput;

export function isSupplierDraftLineItem(
  item: NewOrderLineItemInput
): item is NewOrderSupplierLineItemInput {
  return "source" in item && item.source === "supplier";
}

export function draftLineItemToLineItem(
  item: NewOrderLineItemInput,
  idOverride?: string
): LineItem {
  if (isSupplierDraftLineItem(item)) {
    return {
      ...item.item,
      id: idOverride ?? item.id,
      markupPercent: item.markupPercent ?? item.item.markupPercent,
      customerUnitPrice:
        item.customerUnitPrice ?? item.item.customerUnitPrice,
    };
  }

  const built = buildLineItemFromCatalog(
    item.productKey,
    item.colorKey,
    item.sizes,
    idOverride ?? item.id
  );

  return {
    ...built,
    unitCost: item.unitCost,
    markupPercent: item.markupPercent,
    customerUnitPrice: item.customerUnitPrice,
  };
}

export function draftLineItemsToLineItems(
  items: NewOrderLineItemInput[]
): LineItem[] {
  return items
    .filter((item) => lineItemInputPieceCount(item) > 0)
    .map((item) => draftLineItemToLineItem(item));
}

export function createLineItemDraftId(): string {
  return createLineItemId();
}

export function createMockupDraftId(): string {
  return `mockup-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createJobDraftId(): string {
  return `job-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyNewOrderLineItem(): NewOrderLineItemInput {
  const product = NEW_ORDER_PRODUCTS[0];
  return {
    id: createLineItemDraftId(),
    productKey: product.key,
    colorKey: "heather",
    sizes: { S: 0, M: 0, L: 0, XL: 0 },
    unitCost: product.unitCost,
  };
}

export const NEW_ORDER_STEPS = [
  { id: 1, title: "Customer" },
  { id: 2, title: "Blanks/garments" },
  { id: 3, title: "Events" },
  { id: 4, title: "Mockups" },
] as const;

export const NEW_ORDER_STEP_COUNT = NEW_ORDER_STEPS.length;

export const NEW_ORDER_PRODUCTS = [
  {
    key: "g64000",
    name: "Gildan 64000 Softstyle",
    brand: "Gildan",
    unitCost: 3.85,
  },
  {
    key: "g5000",
    name: "Gildan 5000 Heavy Cotton",
    brand: "Gildan",
    unitCost: 3.45,
  },
  {
    key: "nl6210",
    name: "Next Level 6210 CVC",
    brand: "Next Level",
    unitCost: 4.25,
  },
] as const;

export const NEW_ORDER_COLORS = [
  { key: "heather", label: "Athletic Heather" },
  { key: "black", label: "Black" },
  { key: "navy", label: "Navy" },
] as const;

export const NEW_ORDER_SIZES = ["S", "M", "L", "XL"] as const;

export const SHIPPING_METHODS = [
  { key: "ups_ground", label: "UPS Ground" },
  { key: "fedex_home", label: "FedEx Home" },
  { key: "will_call", label: "Will Call" },
] as const;

export const BLANK_SOURCE_OPTIONS: { value: BlankSource; label: string }[] = [
  { value: "shop_orders", label: "Shop orders blanks" },
  { value: "customer_supplies", label: "Customer ships garments" },
];

export const ARTWORK_ATTACHABLE_KINDS: OrderFileKind[] = [
  "production_art",
  "mockup",
  "customer_supplied",
  "separation",
  "embroidery_file",
];

export type NewOrderFormInput = {
  customerId: string;
  lineItems: NewOrderLineItemInput[];
  blankSource?: BlankSource;
  jobs: NewOrderJobInput[];
  shippingMethod: (typeof SHIPPING_METHODS)[number]["key"];
  inHandsDate: string;
  rush: boolean;
};

export function createEmptyNewOrderJob(
  overrides?: Partial<NewOrderJobInput>
): NewOrderJobInput {
  return {
    id: createJobDraftId(),
    name: "",
    decorationType: "screen_print",
    locationKey: "front_chest",
    notes: "",
    kind: "decoration",
    lineItemIds: [],
    ...overrides,
  };
}

export function createEmptyNewOrderForm(
  customerId = ""
): NewOrderFormInput {
  return {
    customerId,
    lineItems: [],
    blankSource: undefined,
    jobs: [],
    shippingMethod: "ups_ground",
    inHandsDate: format(addDays(new Date(), 21), "yyyy-MM-dd"),
    rush: false,
  };
}

export function lineItemInputPieceCount(item: NewOrderLineItemInput): number {
  if (isSupplierDraftLineItem(item)) {
    return item.item.sizes.reduce((sum, row) => sum + (row.quantity || 0), 0);
  }

  return Object.values(item.sizes).reduce((sum, quantity) => sum + quantity, 0);
}

export function countOrderFormPieces(form: NewOrderFormInput): number {
  return form.lineItems.reduce(
    (sum, item) => sum + lineItemInputPieceCount(item),
    0
  );
}

export function activeLineItems(form: NewOrderFormInput): NewOrderLineItemInput[] {
  return form.lineItems.filter((item) => lineItemInputPieceCount(item) > 0);
}

export function validateNewOrderStep(
  step: number,
  form: NewOrderFormInput
): string | null {
  switch (step) {
    case 1:
      return form.customerId ? null : "Select a customer to continue.";
    case 2: {
      const blanks = activeLineItems(form);
      if (blanks.length > 0 && !form.blankSource) {
        return "Choose who is ordering the blank garments.";
      }
      return null;
    }
    case 3: {
      if (form.jobs.some((job) => !job.name.trim())) {
        return "Every event needs a name, or remove empty events.";
      }
      const blanks = activeLineItems(form);
      for (const job of form.jobs) {
        if (job.kind === "finishing" || blanks.length === 0) continue;
        if (!job.lineItemIds?.length) {
          return `Select which blanks apply to "${job.name.trim() || "this event"}".`;
        }
      }
      return null;
    }
    case 4:
      return null;
    default:
      return null;
  }
}

export function validateNewOrderForm(form: NewOrderFormInput): string | null {
  for (let step = 1; step <= NEW_ORDER_STEP_COUNT; step += 1) {
    const error = validateNewOrderStep(step, form);
    if (error) return error;
  }
  return null;
}

export function generateOrderNumber(existingNumbers: string[]): string {
  const numeric = existingNumbers
    .map((number) => number.match(/^SO-(\d+)/)?.[1])
    .filter(Boolean)
    .map((value) => parseInt(value!, 10));

  const next = numeric.length > 0 ? Math.max(...numeric) + 1 : 1043;
  let candidate = `SO-${next}`;
  let attempt = 0;

  while (existingNumbers.includes(candidate) && attempt < 20) {
    attempt += 1;
    candidate = `SO-${next + attempt}`;
  }

  return candidate;
}

export function estimateOrderTotals(pieceCount: number) {
  const subtotal = Math.round(pieceCount * 38.9 * 100) / 100;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  return {
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

function buildOrderLineItemsAndJobs(
  form: NewOrderFormInput,
  orderNumber: string,
  suffix: string
) {
  const pieceCount = countOrderFormPieces(form);
  const hasProducts = pieceCount > 0;

  const draftToFinalId = new Map(
    form.lineItems.map((item) => [item.id, resolveLineItemId(item, suffix)])
  );

  const lineItems = activeLineItems(form).map((item) => {
    const id = resolveLineItemId(item, suffix);

    if (isSupplierDraftLineItem(item)) {
      return draftLineItemToLineItem(item, id);
    }

    const built = buildLineItemFromCatalog(
      item.productKey,
      item.colorKey,
      item.sizes,
      id
    );
    return {
      ...built,
      unitCost: item.unitCost,
      markupPercent: item.markupPercent,
      customerUnitPrice: item.customerUnitPrice,
    };
  });

  const lineItemIdSet = new Set(lineItems.map((item) => item.id));
  const jobNames = formatAutoEventNameList(orderNumber, form.jobs);
  const now = new Date().toISOString();

  const jobs = form.jobs.map((jobInput, index) => {
    const eventName =
      jobNames[index] ?? formatAutoEventName(orderNumber, jobInput.locationKey);
    const built = buildCustomProductionJob({
      name: eventName,
      locationKey: jobInput.locationKey,
      decoration:
        jobInput.kind === "finishing" ? "finishing" : jobInput.decorationType,
      kind: jobInput.kind,
    });

    if (jobInput.kind !== "finishing" && hasProducts) {
      const linkedIds = (jobInput.lineItemIds ?? [])
        .map((id) => draftToFinalId.get(id) ?? id)
        .filter((id) => lineItemIdSet.has(id));
      built.lineItemIds =
        linkedIds.length > 0 ? linkedIds : lineItems.map((item) => item.id);
    }

    if (built.imprints[0] && jobInput.kind !== "finishing") {
      if (jobInput.mockupFile) {
        built.imprints[0].artwork = {
          id: `art-${suffix}-${index}`,
          name: eventName,
          version: 1,
          status: "pending",
          uploadedAt: now,
          uploadedBy: "Shop",
          kind: "mockup",
          previewUrl: jobInput.mockupFile.previewUrl,
        };
      } else {
        built.imprints[0].artwork = {
          id: `art-${suffix}-${index}`,
          name: "No mockup attached",
          version: 1,
          status: "pending",
          uploadedAt: now,
          uploadedBy: "Shop",
          kind: "mockup",
        };
      }
    }

    return built;
  });

  return { lineItems, jobs, pieceCount, hasProducts, jobNames, draftToFinalId };
}

export function previewOrderTotals(
  form: NewOrderFormInput,
  options: {
    previewOrderNumber: string;
    taxRate: number;
    pricingMatrix?: PricingMatrix;
  }
) {
  const { lineItems, jobs } = buildOrderLineItemsAndJobs(
    form,
    options.previewOrderNumber,
    "preview"
  );

  const previewOrder: Order = {
    id: "preview",
    number: options.previewOrderNumber,
    type: "sales_order",
    status: "draft",
    customerId: form.customerId,
    customerName: "",
    company: "",
    createdAt: new Date().toISOString(),
    inHandsDate: form.inHandsDate,
    subtotal: 0,
    tax: 0,
    total: 0,
    paid: 0,
    balance: 0,
    rush: form.rush,
    lineItems,
    jobs,
    shipments: [],
    messages: [],
    materials: form.blankSource
      ? { lines: [], blankSource: form.blankSource }
      : undefined,
  };

  return computeEstimateTotals(
    previewOrder,
    options.taxRate,
    options.pricingMatrix
  );
}

export function compactOrderNumberForLabel(orderNumber: string): string {
  return orderNumber.replace(/-/g, "").toUpperCase();
}

/** e.g. SO1054 - FRONT LEFT CHEST */
export function formatAutoEventName(
  orderNumber: string,
  locationKey: ImprintLocationKey
): string {
  const prefix = compactOrderNumberForLabel(orderNumber);
  const placement = IMPRINT_LOCATION_LABELS[locationKey].toUpperCase();
  return `${prefix} - ${placement}`;
}

export function formatAutoEventNameList(
  orderNumber: string,
  jobs: Array<{ locationKey: ImprintLocationKey }>
): string[] {
  const seen = new Map<string, number>();

  return jobs.map((job) => {
    const base = formatAutoEventName(orderNumber, job.locationKey);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base} (${count})` : base;
  });
}

export function applyAutoEventNames(
  orderNumber: string,
  jobs: NewOrderJobInput[]
): NewOrderJobInput[] {
  const names = formatAutoEventNameList(orderNumber, jobs);
  return jobs.map((job, index) => ({ ...job, name: names[index] }));
}

export function formatLineItemInputLabel(item: NewOrderLineItemInput): string {
  const pieces = lineItemInputPieceCount(item);

  if (isSupplierDraftLineItem(item)) {
    const label = `${item.item.brand} ${item.item.productName}`.trim();
    return `${label} · ${item.item.color} · ${pieces} pcs`;
  }

  const product =
    NEW_ORDER_PRODUCTS.find((entry) => entry.key === item.productKey) ??
    NEW_ORDER_PRODUCTS[0];
  const color =
    NEW_ORDER_COLORS.find((entry) => entry.key === item.colorKey) ??
    NEW_ORDER_COLORS[0];
  return `${product.brand} ${product.name} · ${color.label} · ${pieces} pcs`;
}

function resolveLineItemId(item: NewOrderLineItemInput, suffix: string): string {
  return item.id.startsWith("li-") ? item.id : `li-${suffix}-${item.id}`;
}

export function buildOrderFromForm(
  form: NewOrderFormInput,
  customer: Customer,
  existingNumbers: string[],
  options?: {
    taxRate?: number;
    pricingMatrix?: PricingMatrix;
  }
): Order {
  const shipping =
    SHIPPING_METHODS.find((item) => item.key === form.shippingMethod) ??
    SHIPPING_METHODS[0];

  const suffix = String(Date.now());
  const number = generateOrderNumber(existingNumbers);
  const { lineItems, jobs, pieceCount, hasProducts, jobNames, draftToFinalId } =
    buildOrderLineItemsAndJobs(form, number, suffix);
  const now = new Date().toISOString();

  const financials = computeEstimateTotals(
    {
      id: `ord-${suffix}`,
      number,
      type: "sales_order",
      status: "draft",
      customerId: customer.id,
      customerName: customer.name,
      company: customer.company,
      createdAt: now,
      inHandsDate: form.inHandsDate,
      subtotal: 0,
      tax: 0,
      total: 0,
      paid: 0,
      balance: 0,
      rush: form.rush,
      lineItems,
      jobs,
      shipments: [],
      messages: [],
      materials: form.blankSource
        ? { lines: [], blankSource: form.blankSource }
        : undefined,
    },
    options?.taxRate ?? 0.08,
    options?.pricingMatrix
  );
  const { subtotal, tax, total } = financials;

  const internalNotes = [];
  form.jobs.forEach((jobInput, index) => {
    if (jobInput.notes.trim()) {
      const noteEventName =
        jobNames[index] ?? formatAutoEventName(number, jobInput.locationKey);
      internalNotes.push({
        id: `inote-job-${suffix}-${index}`,
        author: "Shop",
        content: `${noteEventName}: ${jobInput.notes.trim()}`,
        timestamp: now,
      });
    }
  });
  internalNotes.push({
    id: `inote-ship-${suffix}`,
    author: "Shop",
    content: `Shipping method: ${shipping.label}`,
    timestamp: now,
  });
  if (form.rush) {
    internalNotes.push({
      id: `inote-rush-${suffix}`,
      author: "Shop",
      content: "Priority: Rush order",
      timestamp: now,
    });
  }

  const orderFiles: OrderFile[] = [];

  return {
    id: `ord-${suffix}`,
    number,
    type: "sales_order",
    status: "draft",
    customerId: customer.id,
    customerName: customer.name,
    company: customer.company,
    createdAt: now,
    inHandsDate: form.inHandsDate,
    subtotal,
    tax,
    total,
    paid: 0,
    balance: total,
    rush: form.rush,
    garments: hasProducts
      ? {
          status: "waiting",
          expectedCount: pieceCount,
          receivedCount: 0,
        }
      : undefined,
    materials: hasProducts
      ? {
          blankSource: form.blankSource,
          lines: [],
        }
      : undefined,
    lineItems,
    jobs,
    shipments: [],
    messages: [],
    files: orderFiles.length > 0 ? orderFiles : undefined,
    internalNotes,
    activity: [
      {
        id: `act-${suffix}`,
        type: "status",
        title: "Order created",
        detail: `Draft sales order ${number} started for ${customer.company}.`,
        timestamp: now,
        author: "Shop",
      },
      ...lineItems.map((item, index) => {
        const source = form.lineItems.find(
          (entry) => draftToFinalId.get(entry.id) === item.id
        );
        return {
          id: `act-blank-${suffix}-${index}`,
          type: "status" as const,
          title: "Blank added",
          detail: source
            ? formatLineItemInputLabel(source)
            : `${item.brand} ${item.productName} · ${item.color}`,
          timestamp: now,
          author: "Shop",
        };
      }),
    ],
  };
}
