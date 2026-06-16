import { addDays, format } from "date-fns";
import { buildCustomProductionJob } from "@/lib/order-production";
import type {
  Customer,
  DecorationType,
  ImprintLocationKey,
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
  /** Links an uploaded file from the Files step to this job's artwork */
  attachedFileId?: string;
};

export type NewOrderFileInput = {
  id: string;
  name: string;
  kind: OrderFileKind;
};

export function createFileDraftId(): string {
  return `file-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const NEW_ORDER_FILE_KINDS: { value: OrderFileKind; label: string }[] = [
  { value: "production_art", label: "Production artwork" },
  { value: "mockup", label: "Mockup / proof" },
  { value: "customer_supplied", label: "Customer supplied" },
  { value: "separation", label: "Separations" },
  { value: "embroidery_file", label: "Embroidery file" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "quote", label: "Quote" },
  { value: "other", label: "Other" },
];

export const ARTWORK_ATTACHABLE_KINDS: OrderFileKind[] = [
  "production_art",
  "mockup",
  "customer_supplied",
  "separation",
  "embroidery_file",
];

export function isArtworkAttachableFile(file: NewOrderFileInput): boolean {
  return ARTWORK_ATTACHABLE_KINDS.includes(file.kind);
}

export function createJobDraftId(): string {
  return `job-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    ...overrides,
  };
}

export const NEW_ORDER_STEPS = [
  { id: 1, title: "Customer" },
  { id: 2, title: "Files" },
  { id: 3, title: "Events" },
  { id: 4, title: "Products" },
  { id: 5, title: "Shipment" },
] as const;

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

export type NewOrderFormInput = {
  customerId: string;
  files: NewOrderFileInput[];
  jobs: NewOrderJobInput[];
  productKey: (typeof NEW_ORDER_PRODUCTS)[number]["key"];
  colorKey: (typeof NEW_ORDER_COLORS)[number]["key"];
  sizes: Record<(typeof NEW_ORDER_SIZES)[number], number>;
  shippingMethod: (typeof SHIPPING_METHODS)[number]["key"];
  inHandsDate: string;
  rush: boolean;
};

export function createEmptyNewOrderForm(
  customerId = ""
): NewOrderFormInput {
  return {
    customerId,
    files: [],
    jobs: [],
    productKey: "g64000",
    colorKey: "heather",
    sizes: { S: 0, M: 0, L: 0, XL: 0 },
    shippingMethod: "ups_ground",
    inHandsDate: format(addDays(new Date(), 21), "yyyy-MM-dd"),
    rush: false,
  };
}

export function countOrderFormPieces(form: NewOrderFormInput): number {
  return Object.values(form.sizes).reduce((sum, quantity) => sum + quantity, 0);
}

export function validateNewOrderStep(
  step: number,
  form: NewOrderFormInput
): string | null {
  switch (step) {
    case 1:
      return form.customerId ? null : "Select a customer to continue.";
    case 2:
      return null;
    case 3: {
      if (form.jobs.some((job) => !job.name.trim())) {
        return "Every event needs a name, or remove empty events.";
      }
      return null;
    }
    case 4:
      return null;
    case 5:
      return form.inHandsDate ? null : "Choose an in-hands date.";
    default:
      return null;
  }
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

export function previewOrderTotals(form: NewOrderFormInput) {
  return estimateOrderTotals(countOrderFormPieces(form));
}

export function buildOrderFromForm(
  form: NewOrderFormInput,
  customer: Customer,
  existingNumbers: string[]
): Order {
  const product =
    NEW_ORDER_PRODUCTS.find((item) => item.key === form.productKey) ??
    NEW_ORDER_PRODUCTS[0];
  const color =
    NEW_ORDER_COLORS.find((item) => item.key === form.colorKey) ??
    NEW_ORDER_COLORS[0];
  const shipping =
    SHIPPING_METHODS.find((item) => item.key === form.shippingMethod) ??
    SHIPPING_METHODS[0];

  const suffix = String(Date.now());
  const lineItemId = `li-${suffix}`;
  const sizeRows = NEW_ORDER_SIZES.map((size) => ({
    size,
    quantity: form.sizes[size] || 0,
  })).filter((row) => row.quantity > 0);

  const pieceCount = countOrderFormPieces(form);
  const { subtotal, tax, total } = estimateOrderTotals(pieceCount);
  const hasProducts = pieceCount > 0;
  const now = new Date().toISOString();
  const number = generateOrderNumber(existingNumbers);

  const attachedFileIds = new Set(
    form.jobs
      .map((job) => job.attachedFileId)
      .filter((id): id is string => Boolean(id))
  );

  const orderFiles: OrderFile[] = form.files
    .filter((file) => !attachedFileIds.has(file.id))
    .map((file, index) => ({
      id: `file-${suffix}-${index}`,
      name: file.name,
      kind: file.kind,
      uploadedAt: now,
      uploadedBy: "Shop",
    }));

  const jobs = form.jobs.map((jobInput, index) => {
    const built = buildCustomProductionJob({
      name: jobInput.name.trim(),
      locationKey: jobInput.locationKey,
      decoration:
        jobInput.kind === "finishing" ? "finishing" : jobInput.decorationType,
      kind: jobInput.kind,
    });
    if (jobInput.kind !== "finishing" && hasProducts) {
      built.lineItemIds = [lineItemId];
    }

    const attached = jobInput.attachedFileId
      ? form.files.find((file) => file.id === jobInput.attachedFileId)
      : undefined;

    if (attached && built.imprints[0] && jobInput.kind !== "finishing") {
      const artworkKind = isArtworkAttachableFile(attached)
        ? attached.kind
        : "production_art";

      built.imprints[0].artwork = {
        id: `art-${suffix}-${index}`,
        name: attached.name,
        version: 1,
        status: "pending",
        uploadedAt: now,
        uploadedBy: "Shop",
        kind: artworkKind,
      };
    }

    return built;
  });

  const internalNotes = [];
  form.jobs.forEach((jobInput, index) => {
    if (jobInput.notes.trim()) {
      internalNotes.push({
        id: `inote-job-${suffix}-${index}`,
        author: "Shop",
        content: `${jobInput.name.trim()}: ${jobInput.notes.trim()}`,
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
    lineItems: hasProducts
      ? [
          {
            id: lineItemId,
            productName: product.name,
            brand: product.brand,
            color: color.label,
            sizes: sizeRows,
            unitCost: product.unitCost,
            productKey: product.key,
            colorKey: color.key,
          },
        ]
      : [],
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
      ...form.files.map((file, index) => ({
        id: `act-file-${suffix}-${index}`,
        type: "file_uploaded" as const,
        title: "File uploaded",
        detail: file.name,
        timestamp: now,
        author: "Shop",
      })),
    ],
  };
}
