import { inkColorStableId } from "@/lib/imprint-design";
import { computeMaterialLineStatus } from "@/lib/order-materials";
import type {
  ImprintInkColor,
  JobImprint,
  MaterialReceiveStatus,
  OrderMaterialLine,
} from "@/types";

export function inkColorsForPrep(imprint: JobImprint): ImprintInkColor[] {
  return (imprint.inkColors ?? []).map((row, index) => ({
    ...row,
    id: inkColorStableId(row, index),
  }));
}

export function sanitizePreppedInkColorIds(
  inkColors: ImprintInkColor[],
  preppedIds: string[] = []
): string[] {
  const valid = new Set(
    inkColors.map((row, index) => inkColorStableId(row, index))
  );
  return preppedIds.filter((id) => valid.has(id));
}

export function resolvePreppedInkColorIds(
  imprint: JobImprint,
  existing?: Pick<OrderMaterialLine, "preppedInkColorIds" | "status">
): string[] {
  const inkColors = inkColorsForPrep(imprint);
  let preppedIds = sanitizePreppedInkColorIds(
    inkColors,
    existing?.preppedInkColorIds ?? []
  );

  if (
    preppedIds.length === 0 &&
    existing?.status === "received" &&
    inkColors.length > 0
  ) {
    preppedIds = inkColors.map((row, index) => inkColorStableId(row, index));
  }

  return preppedIds;
}

export function computeInkPrepProgress(
  imprint: JobImprint,
  preppedIds: string[]
): { prepped: number; total: number } {
  const inkColors = inkColorsForPrep(imprint);
  const sanitized = sanitizePreppedInkColorIds(inkColors, preppedIds);
  return { prepped: sanitized.length, total: inkColors.length };
}

export function computeInkPrepLineStatus(
  imprint: JobImprint,
  preppedIds: string[]
): MaterialReceiveStatus {
  const { prepped, total } = computeInkPrepProgress(imprint, preppedIds);
  if (total === 0) return "waiting";
  return computeMaterialLineStatus(total, prepped);
}

export function inkPrepMaterialLine(
  template: OrderMaterialLine,
  imprint: JobImprint,
  existing?: OrderMaterialLine
): OrderMaterialLine {
  const preppedInkColorIds = resolvePreppedInkColorIds(imprint, existing);
  const status = computeInkPrepLineStatus(imprint, preppedInkColorIds);

  return {
    ...template,
    preppedInkColorIds,
    receivedQty: status === "received" ? 1 : 0,
    status,
    notes: existing?.notes,
    prepDueAt: existing?.prepDueAt,
    updatedAt: existing?.updatedAt,
  };
}

export function inkPrepLineFromColorToggle(
  line: OrderMaterialLine,
  imprint: JobImprint,
  colorId: string,
  prepped: boolean
): OrderMaterialLine {
  const inkColors = inkColorsForPrep(imprint);
  const current = sanitizePreppedInkColorIds(
    inkColors,
    line.preppedInkColorIds ?? []
  );
  const next = prepped
    ? current.includes(colorId)
      ? current
      : [...current, colorId]
    : current.filter((id) => id !== colorId);
  const status = computeInkPrepLineStatus(imprint, next);

  return {
    ...line,
    preppedInkColorIds: next,
    receivedQty: status === "received" ? 1 : 0,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function inkPrepLineMarkAll(
  line: OrderMaterialLine,
  imprint: JobImprint,
  prepped: boolean
): OrderMaterialLine {
  const inkColors = inkColorsForPrep(imprint);
  const next = prepped ? inkColors.map((row, index) => inkColorStableId(row, index)) : [];
  const status = computeInkPrepLineStatus(imprint, next);

  return {
    ...line,
    preppedInkColorIds: next,
    receivedQty: status === "received" ? 1 : 0,
    status,
    updatedAt: new Date().toISOString(),
  };
}
