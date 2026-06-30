import type { ArtworkFile, Order, OrderFile, OrderFileKind } from "@/types";
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

export type OrderFileItem = {
  id: string;
  name: string;
  kind: OrderFileKind;
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
    items.push({
      id: file.id,
      name: file.name,
      kind: file.kind,
      category: KIND_TO_CATEGORY[file.kind],
      uploadedAt: file.uploadedAt,
      uploadedBy: file.uploadedBy,
      source: "order",
      notes: file.notes,
      jobId: file.jobId,
      imprintId: file.imprintId,
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
  return items.filter((f) => f.category === category);
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

  return {
    all: items.length,
    mockups: mockupCount,
    artwork: items.filter((f) => f.category === "artwork" && !f.archived).length,
    purchase_order: items.filter((f) => f.kind === "purchase_order").length,
    invoice: items.filter((f) => f.kind === "invoice").length,
    quote: items.filter((f) => f.kind === "quote").length,
    packing_list: items.filter((f) => f.kind === "packing_list").length,
    customer_supplied: items.filter((f) => f.kind === "customer_supplied")
      .length,
    internal: items.filter(
      (f) => f.kind === "internal" || f.kind === "other"
    ).length,
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
