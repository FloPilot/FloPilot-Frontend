import type {
  DecorationType,
  MaterialReceiveStatus,
  Order,
  OrderMaterialKind,
  OrderMaterialLine,
  OrderMaterials,
} from "@/types";
import { inkPrepMaterialLine } from "@/lib/ink-prep";
import { getOrderProductionSteps } from "@/lib/order-production";

export function countExpectedGarmentPieces(order: Order): number {
  return order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );
}

export const MATERIAL_KIND_LABELS: Record<OrderMaterialKind, string> = {
  garments: "Blank garments",
  dtf_transfers: "DTF transfers",
  screen_setup: "Screens burned & ready",
  ink_prep: "Ink mixed & ready",
  screen_supplies: "Screen supplies",
  supplies: "Supplies",
};

export const BLANK_SOURCE_LABELS: Record<
  import("@/types").BlankSource,
  string
> = {
  shop_orders: "Shop orders blanks",
  customer_supplies: "Customer ships garments",
};

export function garmentReceivingLineId(lineItemId: string, size: string): string {
  return `garment-${lineItemId}-${size}`;
}

export function dtfReceivingLineId(jobId: string, imprintId: string): string {
  return `dtf-${jobId}-${imprintId}`;
}

export function inkPrepLineId(jobId: string, imprintId: string): string {
  return `ink-${jobId}-${imprintId}`;
}

export function computeMaterialLineStatus(
  expectedQty: number,
  receivedQty: number
): MaterialReceiveStatus {
  if (expectedQty <= 0) return "received";
  if (receivedQty >= expectedQty) return "received";
  if (receivedQty > 0) return "partial";
  return "waiting";
}

function applyLegacyMaterialMigration(
  order: Order,
  lines: OrderMaterialLine[]
): OrderMaterialLine[] {
  const saved = order.materials?.lines ?? [];
  const legacyGarment = saved.find(
    (line) => line.kind === "garments" && !line.lineItemId
  );
  const legacyDtf = saved.find(
    (line) => line.kind === "dtf_transfers" && !line.imprintId
  );

  return lines.map((line) => {
    if (
      line.kind === "garments" &&
      legacyGarment?.status === "received" &&
      line.receivedQty === 0
    ) {
      return {
        ...line,
        receivedQty: line.expectedQty,
        status: "received" as const,
      };
    }
    if (
      line.kind === "dtf_transfers" &&
      legacyDtf?.status === "received" &&
      line.receivedQty === 0
    ) {
      return {
        ...line,
        receivedQty: line.expectedQty,
        status: "received" as const,
      };
    }
    return line;
  });
}

export function buildGarmentReceivingLines(
  order: Order,
  savedLines: OrderMaterialLine[] = []
): OrderMaterialLine[] {
  const lines: OrderMaterialLine[] = [];

  for (const item of order.lineItems) {
    for (const sizeEntry of item.sizes) {
      if (sizeEntry.quantity <= 0) continue;

      const id = garmentReceivingLineId(item.id, sizeEntry.size);
      const existing = savedLines.find((line) => line.id === id);
      const expectedQty = sizeEntry.quantity;
      const receivedQty = existing?.receivedQty ?? 0;

      lines.push({
        id,
        kind: "garments",
        label: `${item.productName} · ${sizeEntry.size}`,
        productName: item.productName,
        brand: item.brand,
        color: item.color,
        size: sizeEntry.size,
        lineItemId: item.id,
        expectedQty,
        receivedQty,
        status: computeMaterialLineStatus(expectedQty, receivedQty),
        notes: existing?.notes,
        updatedAt: existing?.updatedAt,
      });
    }
  }

  return lines;
}

export function buildDtfReceivingLines(
  order: Order,
  savedLines: OrderMaterialLine[] = []
): OrderMaterialLine[] {
  const pieceCount = countExpectedGarmentPieces(order);
  if (pieceCount <= 0) return [];

  const steps = getOrderProductionSteps(order).filter(
    ({ imprint }) => imprint.decoration === "dtf"
  );

  return steps.map(({ job, imprint }) => {
    const id = dtfReceivingLineId(job.id, imprint.id);
    const existing = savedLines.find((line) => line.id === id);
    const expectedQty = pieceCount;
    const receivedQty = existing?.receivedQty ?? 0;

    return {
      id,
      kind: "dtf_transfers",
      label: imprint.label,
      jobId: job.id,
      imprintId: imprint.id,
      linkedJobIds: [job.id],
      expectedQty,
      receivedQty,
      status: computeMaterialLineStatus(expectedQty, receivedQty),
      notes: existing?.notes,
      updatedAt: existing?.updatedAt,
    };
  });
}

export function buildInkPrepLines(
  order: Order,
  savedLines: OrderMaterialLine[] = []
): OrderMaterialLine[] {
  const steps = getOrderProductionSteps(order).filter(
    ({ job, imprint }) =>
      job.kind !== "finishing" && imprint.decoration === "screen_print"
  );

  return steps.map(({ job, imprint }) => {
    const id = inkPrepLineId(job.id, imprint.id);
    const existing = savedLines.find((line) => line.id === id);

    return inkPrepMaterialLine(
      {
        id,
        kind: "ink_prep",
        label: imprint.label,
        jobId: job.id,
        imprintId: imprint.id,
        linkedJobIds: [job.id],
        expectedQty: 1,
        receivedQty: 0,
        status: "waiting",
      },
      imprint,
      existing
    );
  });
}

export function buildScreenSetupLine(
  order: Order,
  savedLines: OrderMaterialLine[] = []
): OrderMaterialLine | null {
  const hasScreenPrint = order.jobs.some(
    (job) =>
      job.kind !== "finishing" &&
      job.imprints.some((imp) => imp.decoration === "screen_print")
  );
  if (!hasScreenPrint) return null;

  const existing = savedLines.find((line) => line.kind === "screen_setup");
  const receivedQty = existing?.status === "received" ? 1 : 0;

  return {
    id: existing?.id ?? "mat-screens",
    kind: "screen_setup",
    label: existing?.label ?? "Screens burned & ready",
    expectedQty: 1,
    receivedQty,
    status: receivedQty ? "received" : "waiting",
    notes: existing?.notes,
    updatedAt: existing?.updatedAt,
  };
}

export function buildDefaultMaterials(order: Order): OrderMaterials {
  const savedLines = order.materials?.lines ?? [];
  const lines: OrderMaterialLine[] = [
    ...buildGarmentReceivingLines(order, savedLines),
    ...buildDtfReceivingLines(order, savedLines),
  ];

  const screenLine = buildScreenSetupLine(order, savedLines);
  if (screenLine) lines.push(screenLine);

  lines.push(...buildInkPrepLines(order, savedLines));

  const migrated = applyLegacyMaterialMigration(order, lines);

  return {
    lines: migrated,
    blankSource: order.materials?.blankSource,
    updatedAt: order.materials?.updatedAt,
  };
}

export function mergeOrderMaterials(order: Order): OrderMaterials {
  return buildDefaultMaterials(order);
}

export function resolveOrderMaterials(order: Order): OrderMaterials | null {
  const merged = mergeOrderMaterials(order);
  return merged.lines.length > 0 ? merged : null;
}

export function getGarmentReceivingLines(
  materials: OrderMaterials
): OrderMaterialLine[] {
  return materials.lines.filter((line) => line.kind === "garments");
}

export function getDtfReceivingLines(
  materials: OrderMaterials
): OrderMaterialLine[] {
  return materials.lines.filter((line) => line.kind === "dtf_transfers");
}

export function getScreenSetupLine(
  materials: OrderMaterials
): OrderMaterialLine | undefined {
  return materials.lines.find((line) => line.kind === "screen_setup");
}

export function getInkPrepLines(
  materials: OrderMaterials
): OrderMaterialLine[] {
  return materials.lines.filter((line) => line.kind === "ink_prep");
}

export function getInkPrepLine(
  materials: OrderMaterials,
  jobId: string,
  imprintId: string
): OrderMaterialLine | undefined {
  return materials.lines.find(
    (line) =>
      line.kind === "ink_prep" &&
      line.jobId === jobId &&
      line.imprintId === imprintId
  );
}

export function materialsRequiredForImprint(
  order: Order,
  decoration: DecorationType,
  jobId: string,
  imprintId?: string
): OrderMaterialLine[] {
  const materials = resolveOrderMaterials(order);
  if (!materials || decoration === "finishing") return [];

  const lines = [...getGarmentReceivingLines(materials)];

  if (decoration === "dtf" && imprintId) {
    const transfer = materials.lines.find(
      (line) =>
        line.kind === "dtf_transfers" &&
        line.imprintId === imprintId &&
        line.jobId === jobId
    );
    if (transfer) lines.push(transfer);
  }

  if (decoration === "screen_print" && imprintId) {
    const inkLine = getInkPrepLine(materials, jobId, imprintId);
    if (inkLine) lines.push(inkLine);
  }

  return lines;
}

export function allMaterialsReceived(order: Order): boolean {
  const materials = resolveOrderMaterials(order);
  if (!materials) return true;
  return materials.lines.every((line) => line.status === "received");
}

export function pendingMaterialLines(order: Order): OrderMaterialLine[] {
  const materials = resolveOrderMaterials(order);
  if (!materials) return [];
  return materials.lines.filter((line) => line.status !== "received");
}

export function materialsSummary(order: Order): string {
  const materials = resolveOrderMaterials(order);
  if (!materials) return "No materials to receive";

  const garments = getGarmentReceivingLines(materials);
  const dtf = getDtfReceivingLines(materials);
  const parts: string[] = [];

  if (garments.length > 0) {
    const done = garments.filter((line) => line.status === "received").length;
    parts.push(`Blanks ${done}/${garments.length}`);
  }
  if (dtf.length > 0) {
    const done = dtf.filter((line) => line.status === "received").length;
    parts.push(`DTF ${done}/${dtf.length}`);
  }

  const screen = getScreenSetupLine(materials);
  if (screen) {
    parts.push(screen.status === "received" ? "Screens ready" : "Screens pending");
  }

  const inkLines = getInkPrepLines(materials);
  if (inkLines.length > 0) {
    const done = inkLines.filter((line) => line.status === "received").length;
    parts.push(`Ink ${done}/${inkLines.length}`);
  }

  return parts.join(" · ");
}

export function materialStatusLabel(status: MaterialReceiveStatus): string {
  switch (status) {
    case "received":
      return "Received";
    case "partial":
      return "Partial";
    default:
      return "Waiting";
  }
}

export function garmentStatusLabel(status: MaterialReceiveStatus): string {
  return materialStatusLabel(status);
}

export function orderHasDtfEvents(order: Order): boolean {
  return getOrderProductionSteps(order).some(
    ({ imprint }) => imprint.decoration === "dtf"
  );
}

export function orderHasScreenPrintEvents(order: Order): boolean {
  return getOrderProductionSteps(order).some(
    ({ imprint }) => imprint.decoration === "screen_print"
  );
}
