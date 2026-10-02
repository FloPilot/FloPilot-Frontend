import { addDays, format } from "date-fns";
import { computeEstimateTotals } from "@/lib/order-estimate";
import { formatBrandProductName } from "@/lib/format-product-name";
import { findSubCustomer } from "@/lib/sub-customers";
import {
  resolvePrintLocationLabel,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";
import { buildCustomProductionJob } from "@/lib/order-production";
import { createLineItemId } from "@/lib/line-items";
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
  /** Links finishing jobs to Shop Setup → Finishing pricing sheets */
  finishingStepId?: string;
  /** Blank line items this decoration runs on */
  lineItemIds?: string[];
  /** Print size "W × H" — becomes imprint notes.dimensions */
  printSize?: string;
  /** Placement note — becomes imprint notes.placement */
  placement?: string;
  /** Customer/staff-specified ink colors (name + PMS) for this event */
  inkColors?: { id?: string; name: string; pmsCode?: string }[];
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
  /** Freeform manual catalog fields */
  productName: string;
  brand: string;
  color: string;
  /** Optional legacy catalog keys when still known */
  productKey?: string;
  colorKey?: string;
  sizes: ManualSizeQtyRecord;
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

  const productName = item.productName.trim();
  const brand = item.brand.trim();
  const color = item.color.trim();

  return {
    id: idOverride ?? item.id,
    productName: productName || "Custom blank",
    brand: brand || "Custom",
    color: color || "Unspecified",
    unitCost: item.unitCost,
    ...(item.productKey ? { productKey: item.productKey } : {}),
    ...(item.colorKey ? { colorKey: item.colorKey } : {}),
    markupPercent: item.markupPercent,
    customerUnitPrice: item.customerUnitPrice,
    sizes: Object.entries(item.sizes)
      .filter(([, quantity]) => quantity > 0)
      .map(([size, quantity]) => ({ size, quantity })),
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
  return {
    id: createLineItemDraftId(),
    productName: "",
    brand: "",
    color: "",
    sizes: emptyManualSizeRecord(),
    unitCost: 0,
  };
}

export const NEW_ORDER_STEPS = [
  { id: 1, title: "Customer" },
  { id: 2, title: "Blanks/garments" },
  { id: 3, title: "Events" },
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

export const NEW_ORDER_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
] as const;

/** Suggested labels when adding a size row in the manual catalog. */
export const MANUAL_BLANK_SIZE_SUGGESTIONS = [
  ...NEW_ORDER_SIZES,
  "4XL",
  "5XL",
  "One Size",
] as const;

export type ManualSizeQtyRecord = Record<string, number>;

export function emptyManualSizeRecord(): ManualSizeQtyRecord {
  return { S: 0, M: 0, L: 0, XL: 0 };
}

export function orderedManualSizeKeys(record: ManualSizeQtyRecord): string[] {
  const rank = new Map<string, number>(
    MANUAL_BLANK_SIZE_SUGGESTIONS.map((size, index) => [size, index])
  );
  return Object.keys(record).sort((a, b) => {
    const ia = rank.has(a) ? rank.get(a)! : Number.MAX_SAFE_INTEGER;
    const ib = rank.has(b) ? rank.get(b)! : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export const SHIPPING_METHODS = [
  { key: "ups_ground", label: "UPS Ground" },
  { key: "fedex_home", label: "FedEx Home" },
  { key: "will_call", label: "Will Call" },
] as const;

export const BLANK_SOURCE_OPTIONS: { value: BlankSource; label: string }[] = [
  { value: "shop_orders", label: "Shop orders blanks" },
  { value: "customer_supplies", label: "Customer supplied goods" },
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
  /** End business under a broker/contractor account */
  subCustomerId?: string;
  lineItems: NewOrderLineItemInput[];
  blankSource?: BlankSource;
  jobs: NewOrderJobInput[];
  shippingMethod: (typeof SHIPPING_METHODS)[number]["key"];
  inHandsDate: string;
  rush: boolean;
  /** Optional label shown as "SO-1234 — your label" on orders and calendar */
  customLabel?: string;
  /** Assigned sales rep — required; defaults from customer, else creator */
  salesRepId?: string;
};

export function resolveDefaultSalesRepId(
  customer: { salesRepId?: string | null } | null | undefined,
  currentUserId?: string | null
): string {
  const fromCustomer = customer?.salesRepId?.trim();
  if (fromCustomer) return fromCustomer;
  return currentUserId?.trim() || "";
}

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
    subCustomerId: "",
    lineItems: [],
    blankSource: undefined,
    jobs: [],
    shippingMethod: "ups_ground",
    inHandsDate: format(addDays(new Date(), 21), "yyyy-MM-dd"),
    rush: false,
    customLabel: "",
    salesRepId: "",
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
      if (!form.customerId) return "Select a customer to continue.";
      if (!form.salesRepId?.trim()) {
        return "Assign a sales rep to continue.";
      }
      return null;
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
  suffix: string,
  productionDefaults?: ShopProductionDefaults | null
) {
  const pieceCount = countOrderFormPieces(form);
  const hasProducts = pieceCount > 0;

  const draftToFinalId = new Map(
    form.lineItems.map((item) => [item.id, resolveLineItemId(item, suffix)])
  );

  const lineItems = activeLineItems(form).map((item) => {
    const id = resolveLineItemId(item, suffix);
    return draftLineItemToLineItem(item, id);
  });

  const lineItemIdSet = new Set(lineItems.map((item) => item.id));
  const jobNames = formatAutoEventNameList(
    orderNumber,
    form.jobs,
    productionDefaults
  );
  const now = new Date().toISOString();

  const jobs = form.jobs.map((jobInput, index) => {
    const eventName =
      jobNames[index] ??
      formatAutoEventName(orderNumber, jobInput.locationKey, productionDefaults);
    const built = buildCustomProductionJob(
      {
        name: eventName,
        locationKey: jobInput.locationKey,
        decoration:
          jobInput.kind === "finishing" ? "finishing" : jobInput.decorationType,
        kind: jobInput.kind,
        finishingStepId: jobInput.finishingStepId,
      },
      productionDefaults
    );

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

      if (jobInput.inkColors && jobInput.inkColors.length > 0) {
        built.imprints[0].inkColors = jobInput.inkColors
          .map((row, inkIndex) => {
            const name = (row.name || "").trim();
            const pmsCode = (row.pmsCode || "").trim();
            if (!name && !pmsCode) return null;
            return {
              id: row.id?.trim() || `ink-${suffix}-${index}-${inkIndex}`,
              name: name || pmsCode,
              pmsCode,
              isFlash: false,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row != null);
      }

      const printSize = jobInput.printSize?.trim() || "";
      const placement = jobInput.placement?.trim() || "";
      const instructions = jobInput.notes?.trim() || "";
      if (printSize || placement || instructions) {
        built.imprints[0].notes = {
          ...(built.imprints[0].notes || {}),
          ...(printSize ? { dimensions: printSize.slice(0, 40) } : {}),
          ...(placement ? { placement: placement.slice(0, 200) } : {}),
          ...(instructions
            ? { instructions: instructions.slice(0, 1000) }
            : {}),
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
    productionDefaults?: ShopProductionDefaults | null;
  }
) {
  const { lineItems, jobs } = buildOrderLineItemsAndJobs(
    form,
    options.previewOrderNumber,
    "preview",
    options.productionDefaults
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
    {
      pricingMatrix: options.pricingMatrix || {
        enabled: false,
        methods: [],
      },
      productionDefaults: options.productionDefaults ?? undefined,
    }
  );
}

export function compactOrderNumberForLabel(orderNumber: string): string {
  return orderNumber.replace(/-/g, "").toUpperCase();
}

/** e.g. SO1054 - FRONT LEFT CHEST */
export function formatAutoEventName(
  orderNumber: string,
  locationKey: ImprintLocationKey,
  productionDefaults?: ShopProductionDefaults | null
): string {
  const prefix = compactOrderNumberForLabel(orderNumber);
  const placement = resolvePrintLocationLabel(
    locationKey,
    productionDefaults
  ).toUpperCase();
  return `${prefix} - ${placement}`;
}

export function formatAutoEventNameList(
  orderNumber: string,
  jobs: Array<{ locationKey: ImprintLocationKey }>,
  productionDefaults?: ShopProductionDefaults | null
): string[] {
  const seen = new Map<string, number>();

  return jobs.map((job) => {
    const base = formatAutoEventName(orderNumber, job.locationKey, productionDefaults);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base} (${count})` : base;
  });
}

export function applyAutoEventNames(
  orderNumber: string,
  jobs: NewOrderJobInput[],
  productionDefaults?: ShopProductionDefaults | null
): NewOrderJobInput[] {
  const names = formatAutoEventNameList(orderNumber, jobs, productionDefaults);
  return jobs.map((job, index) => ({
    ...job,
    name:
      job.kind === "finishing" && job.name.trim()
        ? job.name
        : names[index],
  }));
}

export function formatLineItemInputLabel(item: NewOrderLineItemInput): string {
  const pieces = lineItemInputPieceCount(item);

  if (isSupplierDraftLineItem(item)) {
    const label = formatBrandProductName(
      item.item.brand,
      item.item.productName
    );
    return `${label} · ${item.item.color} · ${pieces} pcs`;
  }

  const label = formatBrandProductName(item.brand, item.productName);
  const color = item.color.trim() || "Unspecified";
  return `${label || "Custom blank"} · ${color} · ${pieces} pcs`;
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
    productionDefaults?: ShopProductionDefaults | null;
  }
): Order {
  const shipping =
    SHIPPING_METHODS.find((item) => item.key === form.shippingMethod) ??
    SHIPPING_METHODS[0];

  const suffix = String(Date.now());
  const number = generateOrderNumber(existingNumbers);
  const { lineItems, jobs, pieceCount, hasProducts, jobNames, draftToFinalId } =
    buildOrderLineItemsAndJobs(
      form,
      number,
      suffix,
      options?.productionDefaults
    );
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
    {
      pricingMatrix: options?.pricingMatrix || {
        enabled: false,
        methods: [],
      },
      productionDefaults: options?.productionDefaults ?? undefined,
    }
  );
  const { subtotal, tax, total } = financials;

  const internalNotes = [];
  form.jobs.forEach((jobInput, index) => {
    if (jobInput.notes.trim()) {
      const noteEventName =
        jobNames[index] ??
        formatAutoEventName(number, jobInput.locationKey, options?.productionDefaults);
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
  const selectedSubCustomer = form.subCustomerId
    ? findSubCustomer(customer, form.subCustomerId)
    : undefined;

  return {
    id: `ord-${suffix}`,
    number,
    type: "sales_order",
    status: "draft",
    customerId: customer.id,
    customerName: customer.name,
    company: customer.company,
    subCustomerId: selectedSubCustomer?.id,
    subCustomerName: selectedSubCustomer?.name,
    createdAt: now,
    inHandsDate: form.inHandsDate,
    subtotal,
    tax,
    total,
    paid: 0,
    balance: total,
    rush: form.rush,
    customLabel: form.customLabel?.trim() || undefined,
    salesRepId: form.salesRepId?.trim() || undefined,
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
            : `${formatBrandProductName(item.brand, item.productName)} · ${item.color}`,
          timestamp: now,
          author: "Shop",
        };
      }),
    ],
  };
}
