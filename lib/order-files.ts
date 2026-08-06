import type { ArtworkFile, Order, OrderFileKind } from "@/types";
import { getOrderProductionSteps } from "@/lib/order-production";

export const ORDER_FILE_KIND_LABELS: Record<OrderFileKind, string> = {
  mockup: "Mockup / proof",
  production_art: "Production artwork",
  separation: "Separations",
  embroidery_file: "Embroidery file",
  purchase_order: "Purchase order",
  invoice: "Invoice",
  quote: "Quote",
  packing_list: "Packing list",
  customer_supplied: "Customer supplied",
  internal: "Internal",
  other: "Other",
};

/** Categories staff can assign when editing an uploaded order file. */
export const ORDER_FILE_CATEGORY_OPTIONS: {
  kind: OrderFileKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "mockup",
    label: "Mockup / proof",
    description: "Customer-facing proofs and mockups",
  },
  {
    kind: "production_art",
    label: "Production artwork",
    description: "Print-ready art for the floor",
  },
  {
    kind: "separation",
    label: "Separations",
    description: "Color separations and film",
  },
  {
    kind: "embroidery_file",
    label: "Embroidery file",
    description: "DST, PES, and stitch files",
  },
  {
    kind: "purchase_order",
    label: "Purchase order",
    description: "Vendor POs and blank orders",
  },
  {
    kind: "invoice",
    label: "Invoice",
    description: "Customer or vendor invoices",
  },
  {
    kind: "quote",
    label: "Quote",
    description: "Estimates and quote PDFs",
  },
  {
    kind: "packing_list",
    label: "Packing list",
    description: "Ship lists and packing slips",
  },
  {
    kind: "customer_supplied",
    label: "Customer supplied",
    description: "Files the customer sent in",
  },
  {
    kind: "internal",
    label: "Internal",
    description: "Shop-only notes and docs",
  },
  {
    kind: "other",
    label: "Other",
    description: "Anything that doesn’t fit above",
  },
];

export type FileCategoryFilter =
  | "all"
  | "mockups"
  | "artwork"
  | "purchase_order"
  | "invoice"
  | "quote"
  | "packing_list"
  | "customer_supplied"
  | "internal";

export const FILE_CATEGORY_TABS: {
  id: FileCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "All files" },
  { id: "mockups", label: "Mockups" },
  { id: "artwork", label: "Artwork" },
  { id: "purchase_order", label: "Purchase orders" },
  { id: "invoice", label: "Invoices" },
  { id: "quote", label: "Quotes" },
  { id: "packing_list", label: "Packing lists" },
  { id: "customer_supplied", label: "Customer files" },
  { id: "internal", label: "Internal" },
];

const KIND_TO_CATEGORY: Record<OrderFileKind, FileCategoryFilter> = {
  mockup: "mockups",
  production_art: "artwork",
  separation: "artwork",
  embroidery_file: "artwork",
  purchase_order: "purchase_order",
  invoice: "invoice",
  quote: "quote",
  packing_list: "packing_list",
  customer_supplied: "customer_supplied",
  internal: "internal",
  other: "internal",
};

export function normalizeOrderFileKinds(
  input: {
    kind?: OrderFileKind | string | null;
    kinds?: Array<OrderFileKind | string> | null;
  } | null | undefined
): OrderFileKind[] {
  const valid = new Set(Object.keys(ORDER_FILE_KIND_LABELS) as OrderFileKind[]);
  const seen = new Set<OrderFileKind>();
  const next: OrderFileKind[] = [];
  const candidates = [
    ...(Array.isArray(input?.kinds) ? input!.kinds! : []),
    input?.kind,
  ];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const kind = value.trim() as OrderFileKind;
    if (!valid.has(kind) || seen.has(kind)) continue;
    seen.add(kind);
    next.push(kind);
  }
  return next.length > 0 ? next : ["internal"];
}

export function fileMatchesCategory(
  kinds: OrderFileKind[],
  category: FileCategoryFilter
): boolean {
  if (category === "all") return true;
  return kinds.some((kind) => KIND_TO_CATEGORY[kind] === category);
}

export type OrderFileItem = {
  id: string;
  name: string;
  kind: OrderFileKind;
  kinds: OrderFileKind[];
  category: FileCategoryFilter;
  uploadedAt: string;
  uploadedBy?: string;
  version?: number;
  status?: ArtworkFile["status"];
  source: "imprint" | "order";
  jobId?: string;
  imprintId?: string;
  imprintLabel?: string;
  jobName?: string;
  notes?: string;
  archived?: boolean;
  previewUrl?: string;
  downloadUrl?: string;
};

function imprintFileKind(artwork: ArtworkFile): OrderFileKind {
  return artwork.kind ?? "production_art";
}

function pushImprintFile(
  items: OrderFileItem[],
  params: {
    id: string;
    name: string;
    kind: OrderFileKind;
    uploadedAt: string;
    uploadedBy?: string;
    version?: number;
    status?: ArtworkFile["status"];
    jobId: string;
    imprintId: string;
    imprintLabel: string;
    jobName: string;
    archived?: boolean;
    previewUrl?: string;
  }
) {
  const kind = params.kind;
  if (kind === "production_art" && params.name === "n/a") return;

  items.push({
    id: params.id,
    name: params.name,
    kind,
    kinds: [kind],
    category: KIND_TO_CATEGORY[kind],
    uploadedAt: params.uploadedAt,
    uploadedBy: params.uploadedBy,
    version: params.version,
    status: params.status,
    source: "imprint",
    jobId: params.jobId,
    imprintId: params.imprintId,
    imprintLabel: params.imprintLabel,
    jobName: params.jobName,
    archived: params.archived,
    previewUrl: params.previewUrl,
  });
}

export function buildOrderFileList(order: Order): OrderFileItem[] {
  const items: OrderFileItem[] = [];

  for (const { job, imprint } of getOrderProductionSteps(order)) {
    const art = imprint.artwork;
    pushImprintFile(items, {
      id: art.id,
      name: art.name,
      kind: imprintFileKind(art),
      uploadedAt: art.uploadedAt,
      uploadedBy: art.uploadedBy,
      version: art.version,
      status: art.status,
      jobId: job.id,
      imprintId: imprint.id,
      imprintLabel: imprint.label,
      jobName: job.name,
      previewUrl: art.previewUrl,
    });

    for (const v of art.history ?? []) {
      pushImprintFile(items, {
        id: v.id,
        name: v.name,
        kind: imprintFileKind(art),
        uploadedAt: v.uploadedAt,
        uploadedBy: v.uploadedBy,
        version: v.version,
        jobId: job.id,
        imprintId: imprint.id,
        imprintLabel: imprint.label,
        jobName: job.name,
        archived: true,
        previewUrl: v.previewUrl,
      });
    }
  }

  for (const file of order.files ?? []) {
    const linkedJob = file.jobId
      ? order.jobs.find((job) => job.id === file.jobId)
      : undefined;
    const linkedImprint =
      linkedJob && file.imprintId
        ? linkedJob.imprints.find((imprint) => imprint.id === file.imprintId)
        : undefined;
    const kinds = normalizeOrderFileKinds(file);
    const kind = kinds[0];
    items.push({
      id: file.id,
      name: file.name,
      kind,
      kinds,
      category: KIND_TO_CATEGORY[kind],
      uploadedAt: file.uploadedAt,
      uploadedBy: file.uploadedBy,
      source: "order",
      notes: file.notes,
      jobId: file.jobId,
      imprintId: file.imprintId,
      jobName: linkedJob?.name,
      imprintLabel: linkedImprint?.customLabel?.trim() || linkedImprint?.label,
      previewUrl: file.previewUrl,
      downloadUrl: file.downloadUrl,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

export function filterFilesByCategory(
  items: OrderFileItem[],
  category: FileCategoryFilter
): OrderFileItem[] {
  if (category === "all") return items;
  if (category === "mockups") {
    return items.filter((f) => f.source === "imprint" && !f.archived);
  }
  return items.filter((f) => fileMatchesCategory(f.kinds, category));
}

/** Imprint locations with at least one file (for mockup gallery count) */
export function countMockupLocations(order: Order): number {
  return getOrderProductionSteps(order).filter(
    ({ job, imprint }) =>
      job.kind !== "finishing" && imprint.artwork.name !== "n/a"
  ).length;
}

export function getCategoryCounts(
  order: Order,
  items: OrderFileItem[]
): Record<FileCategoryFilter, number> {
  const mockupCount = countMockupLocations(order);
  const active = items.filter((f) => !f.archived);

  return {
    all: items.length,
    mockups: mockupCount,
    artwork: active.filter((f) => fileMatchesCategory(f.kinds, "artwork"))
      .length,
    purchase_order: active.filter((f) =>
      fileMatchesCategory(f.kinds, "purchase_order")
    ).length,
    invoice: active.filter((f) => fileMatchesCategory(f.kinds, "invoice"))
      .length,
    quote: active.filter((f) => fileMatchesCategory(f.kinds, "quote")).length,
    packing_list: active.filter((f) =>
      fileMatchesCategory(f.kinds, "packing_list")
    ).length,
    customer_supplied: active.filter((f) =>
      fileMatchesCategory(f.kinds, "customer_supplied")
    ).length,
    internal: active.filter((f) => fileMatchesCategory(f.kinds, "internal"))
      .length,
  };
}

export function defaultUploadKindForCategory(
  category: FileCategoryFilter
): OrderFileKind {
  switch (category) {
    case "purchase_order":
      return "purchase_order";
    case "invoice":
      return "invoice";
    case "quote":
      return "quote";
    case "packing_list":
      return "packing_list";
    case "customer_supplied":
      return "customer_supplied";
    case "internal":
      return "internal";
    case "artwork":
      return "production_art";
    case "mockups":
      return "mockup";
    default:
      return "internal";
  }
}

export function categoryFromFocus(
  focus?: { jobId: string; imprintId: string } | null
): FileCategoryFilter {
  return focus ? "mockups" : "all";
}
