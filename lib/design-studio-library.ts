import type {
  Order,
  OrderDesignMockup,
  SavedDesign,
  SavedDesignLocation,
} from "@/types";
import { normalizeDesignLocations } from "@/lib/design-locations";

/** One location/file attached to a Design Line. */
export type DesignStudioFile = {
  id: string;
  name: string;
  locationLabel: string;
  decoration?: string;
  previewUrl?: string;
  updatedAt: string;
  versionCount: number;
  designId?: string;
  locationId?: string;
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  sourceJobId?: string;
  sourceImprintId?: string;
  hasStudioMockup: boolean;
  designMockup?: OrderDesignMockup;
};

/**
 * A Design Line groups related location files — e.g. front chest + full back
 * for the same order / decoration package.
 */
export type DesignStudioLine = {
  id: string;
  name: string;
  customerLabel: string;
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  orderCustomLabel?: string;
  updatedAt: string;
  files: DesignStudioFile[];
  hasStudioMockup: boolean;
  versionCount: number;
};

/** @deprecated Prefer DesignStudioFile — kept for older call sites. */
export type DesignStudioLibraryEntry = DesignStudioFile;

function entryIdForOrderMockup(
  orderId: string,
  jobId: string,
  imprintId: string
): string {
  return `order:${orderId}:${jobId}:${imprintId}`;
}

export function designLineIdForOrder(orderId: string): string {
  return `line:order:${orderId}`;
}

export function designLineIdForSolo(fileId: string): string {
  return `line:solo:${fileId}`;
}

/** File id for one location on a multi-location solo design. */
export function designLocationFileId(
  designId: string,
  locationId: string
): string {
  return `${designId}:${locationId}`;
}

export function parseDesignStudioEntryId(id: string): {
  kind: "design" | "order" | "line";
  designId?: string;
  locationId?: string;
  orderId?: string;
  jobId?: string;
  imprintId?: string;
  lineKind?: "order" | "solo";
  soloFileId?: string;
} {
  if (id.startsWith("line:order:")) {
    return {
      kind: "line",
      lineKind: "order",
      orderId: id.slice("line:order:".length),
    };
  }
  if (id.startsWith("line:solo:")) {
    return {
      kind: "line",
      lineKind: "solo",
      soloFileId: id.slice("line:solo:".length),
    };
  }
  if (id.startsWith("order:")) {
    const [, orderId, jobId, imprintId] = id.split(":");
    return { kind: "order", orderId, jobId, imprintId };
  }
  // designId:locationId — multi-location solo file
  const colon = id.indexOf(":");
  if (colon > 0 && !id.slice(colon + 1).includes(":")) {
    const designId = id.slice(0, colon);
    const locationId = id.slice(colon + 1);
    if (designId && locationId && !locationId.startsWith("order")) {
      return { kind: "design", designId, locationId };
    }
  }
  return { kind: "design", designId: id };
}

function previewForDesign(design: SavedDesign): string | undefined {
  const mockup = design.designMockup || design.locations?.[0]?.designMockup;
  const layerUrl =
    mockup?.artLayers
      ?.map((layer) => layer.cleanUrl || layer.url)
      .find((url) => typeof url === "string" && url.trim()) || undefined;
  return (
    mockup?.composedPreviewUrl ||
    design.artwork?.previewUrl ||
    mockup?.blankImageUrl ||
    mockup?.blankImageFrontUrl ||
    layerUrl ||
    undefined
  );
}

function previewForLocation(
  design: SavedDesign,
  location: SavedDesignLocation
): string | undefined {
  const mockup = location.designMockup;
  const layerUrl =
    mockup?.artLayers
      ?.map((layer) => layer.cleanUrl || layer.url)
      .find((url) => typeof url === "string" && url.trim()) || undefined;
  return (
    mockup?.composedPreviewUrl ||
    (location.id === design.locations?.[0]?.id
      ? previewForDesign(design)
      : undefined) ||
    mockup?.blankImageUrl ||
    mockup?.blankImageFrontUrl ||
    layerUrl ||
    undefined
  );
}

export function libraryEntryFromSavedDesign(
  design: SavedDesign
): DesignStudioFile {
  return {
    id: design.id,
    name: design.name,
    locationLabel: design.locationLabel || design.locationKey,
    decoration: design.decoration,
    previewUrl: previewForDesign(design),
    updatedAt: design.updatedAt || design.createdAt,
    versionCount: design.versions?.length ?? 0,
    designId: design.id,
    sourceOrderId: design.sourceOrderId,
    sourceOrderNumber: design.sourceOrderNumber,
    sourceJobId: design.sourceJobId,
    sourceImprintId: design.sourceImprintId,
    hasStudioMockup: Boolean(design.designMockup?.composedPreviewUrl),
    designMockup: design.designMockup,
  };
}

/** Expand a SavedDesign into one library file per decoration location. */
export function libraryFilesFromSavedDesign(
  design: SavedDesign
): DesignStudioFile[] {
  const locations = normalizeDesignLocations(design);
  if (locations.length <= 1) {
    const single = libraryEntryFromSavedDesign(design);
    return [
      {
        ...single,
        locationId: locations[0]?.id,
      },
    ];
  }

  return locations.map((location) => {
    const preview = previewForLocation(design, location);
    return {
      id: designLocationFileId(design.id, location.id),
      name: design.name,
      locationLabel: location.locationLabel || location.locationKey,
      decoration: design.decoration,
      previewUrl: preview,
      updatedAt:
        location.designMockup?.updatedAt ||
        design.updatedAt ||
        design.createdAt,
      versionCount: design.versions?.length ?? 0,
      designId: design.id,
      locationId: location.id,
      sourceOrderId: design.sourceOrderId,
      sourceOrderNumber: design.sourceOrderNumber,
      sourceJobId: design.sourceJobId,
      sourceImprintId: design.sourceImprintId,
      hasStudioMockup: Boolean(location.designMockup?.composedPreviewUrl),
      designMockup: location.designMockup,
    };
  });
}

/** Collect composed mockups from live orders that are not already in the library. */
export function collectOrderStudioEntries(
  orders: Order[],
  knownDesignIds: Set<string>
): DesignStudioFile[] {
  const entries: DesignStudioFile[] = [];

  for (const order of orders) {
    for (const job of order.jobs || []) {
      for (const imprint of job.imprints || []) {
        const mockup = imprint.designMockup;
        const preview =
          mockup?.composedPreviewUrl || imprint.artwork?.previewUrl;
        if (!preview) continue;

        if (imprint.libraryDesignId && knownDesignIds.has(imprint.libraryDesignId)) {
          continue;
        }

        const name =
          imprint.customLabel?.trim() ||
          imprint.label ||
          `${job.name} · ${order.number}`;

        entries.push({
          id: entryIdForOrderMockup(order.id, job.id, imprint.id),
          name,
          locationLabel: imprint.label || imprint.locationKey,
          decoration: imprint.decoration,
          previewUrl: preview,
          updatedAt: mockup?.updatedAt || order.createdAt,
          versionCount: 0,
          sourceOrderId: order.id,
          sourceOrderNumber: order.number,
          sourceJobId: job.id,
          sourceImprintId: imprint.id,
          hasStudioMockup: Boolean(mockup?.composedPreviewUrl),
          designMockup: mockup,
        });
      }
    }
  }

  return entries;
}

function lineNameForOrderGroup(
  files: DesignStudioFile[],
  order?: Order
): string {
  const custom = order?.customLabel?.trim();
  if (custom) return custom;

  const fromDesign = files.find((file) =>
    file.name.includes("—")
  )?.name;
  // Prefer "Proof — Order label" style names when present.
  if (fromDesign?.includes("—")) {
    const after = fromDesign.split("—").slice(1).join("—").trim();
    if (after) return after;
  }

  if (order?.number) return `Order ${order.number}`;
  if (files[0]?.sourceOrderNumber) return `Order ${files[0].sourceOrderNumber}`;
  return files[0]?.name || "Design line";
}

function buildLineFromFiles(
  files: DesignStudioFile[],
  order?: Order
): DesignStudioLine {
  const sorted = [...files].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const sourceOrderId = sorted[0]?.sourceOrderId || order?.id;
  const id = sourceOrderId
    ? designLineIdForOrder(sourceOrderId)
    : designLineIdForSolo(sorted[0]!.id);

  return {
    id,
    name: sourceOrderId
      ? lineNameForOrderGroup(sorted, order)
      : sorted[0]?.name || "Design line",
    customerLabel:
      order?.company ||
      order?.customerName ||
      sorted[0]?.name ||
      "Unassigned",
    sourceOrderId,
    sourceOrderNumber: order?.number || sorted[0]?.sourceOrderNumber,
    orderCustomLabel: order?.customLabel,
    updatedAt: sorted[0]?.updatedAt || new Date().toISOString(),
    files: sorted,
    hasStudioMockup: sorted.some((file) => file.hasStudioMockup),
    versionCount: sorted.reduce((sum, file) => sum + file.versionCount, 0),
  };
}

/** Flat file list (legacy). */
export function mergeDesignStudioLibrary(
  designs: SavedDesign[],
  orders: Order[]
): DesignStudioFile[] {
  const fromLibrary = designs.flatMap(libraryFilesFromSavedDesign);
  const knownIds = new Set(designs.map((design) => design.id));
  const fromOrders = collectOrderStudioEntries(orders, knownIds);

  return [...fromLibrary, ...fromOrders].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Group files into Design Lines (order packages + solo designs). */
export function mergeDesignStudioLines(
  designs: SavedDesign[],
  orders: Order[]
): DesignStudioLine[] {
  const files = mergeDesignStudioLibrary(designs, orders);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const designsById = new Map(designs.map((design) => [design.id, design]));
  const grouped = new Map<string, DesignStudioFile[]>();
  const soloByDesign = new Map<string, DesignStudioFile[]>();

  for (const file of files) {
    if (file.sourceOrderId) {
      const bucket = grouped.get(file.sourceOrderId) || [];
      bucket.push(file);
      grouped.set(file.sourceOrderId, bucket);
    } else if (file.designId) {
      const bucket = soloByDesign.get(file.designId) || [];
      bucket.push(file);
      soloByDesign.set(file.designId, bucket);
    }
  }

  const lines: DesignStudioLine[] = [];

  for (const [orderId, groupFiles] of grouped) {
    const order = ordersById.get(orderId);
    const line = buildLineFromFiles(groupFiles, order);
    line.customerLabel =
      order?.company ||
      order?.customerName ||
      groupFiles[0]?.name ||
      "Unassigned";
    if (!order && designs.length) {
      const linked = designs.find((design) => design.sourceOrderId === orderId);
      if (linked) {
        line.customerLabel =
          linked.company || linked.customerName || line.customerLabel;
        if (!line.name || line.name.startsWith("Order ")) {
          const label = linked.sourceOrderCustomLabel?.trim();
          if (label) line.name = label;
        }
      }
    }
    lines.push(line);
  }

  for (const [designId, groupFiles] of soloByDesign) {
    const linked = designsById.get(designId);
    const line = buildLineFromFiles(groupFiles);
    line.id = designLineIdForSolo(designId);
    line.name = linked?.name || groupFiles[0]?.name || "Design";
    line.customerLabel =
      linked?.company || linked?.customerName || "Design Studio";
    lines.push(line);
  }

  return lines.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
