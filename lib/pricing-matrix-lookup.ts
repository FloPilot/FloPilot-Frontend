import { decorationLabel } from "@/lib/format";
import { lineItemPieceCount } from "@/lib/order-estimate";
import type { PricingMatrix, PricingMethod } from "@/lib/shop-settings";
import type { DecorationType, Job, JobImprint, Order } from "@/types";

export type PricingColumnMode = "color" | "size";

export type PricingMatrixHighlight = {
  /** Stable accent index for matching callout cards to matrix cells */
  stepIndex: number;
  methodId: string;
  methodName: string;
  rowIndex: number;
  colIndex: number;
  pieceCount: number;
  colorCount: number;
  unitPrice: number;
  qtyLabel: string;
  columnLabel: string;
  imprintLabel: string;
  jobName: string;
  decoration: string;
  decorationKey: DecorationType;
  columnMode: PricingColumnMode;
  /** Print size for DTF / size-tier pricing */
  sizeLabel?: string;
};

export type PricingStepAccent = {
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  priceText: string;
  cellBg: string;
  cellText: string;
  cellRing: string;
  dot: string;
};

/** Neutral chrome for applied-pricing sections — per-decoration color comes from step accents */
export const PRICING_APPLIED_CHROME = {
  callout: "border-[#e3e3e3] bg-[#fafafa]",
  calloutIcon: "text-[#616161]",
  tableWrap:
    "border-[#d4d4d4] shadow-[inset_0_0_0_1px_rgba(26,26,26,0.04)]",
  tableHeader: "border-[#ebebeb] bg-[#fafafa]",
  badge: "bg-[#f0f0f0] text-[#616161]",
} as const;

/** Distinct accents per decoration — avoid brand blue and similar hues (e.g. emerald + teal) */
export const PRICING_STEP_ACCENTS: PricingStepAccent[] = [
  {
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    cardBorder: "border-l-emerald-600",
    priceText: "text-emerald-800",
    cellBg: "bg-emerald-50",
    cellText: "text-emerald-800",
    cellRing: "ring-emerald-500/40",
    dot: "bg-emerald-600",
  },
  {
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-900",
    cardBorder: "border-l-amber-500",
    priceText: "text-amber-900",
    cellBg: "bg-amber-50",
    cellText: "text-amber-900",
    cellRing: "ring-amber-500/40",
    dot: "bg-amber-500",
  },
  {
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-800",
    cardBorder: "border-l-violet-600",
    priceText: "text-violet-800",
    cellBg: "bg-violet-50",
    cellText: "text-violet-800",
    cellRing: "ring-violet-500/40",
    dot: "bg-violet-600",
  },
  {
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    cardBorder: "border-l-rose-500",
    priceText: "text-rose-800",
    cellBg: "bg-rose-50",
    cellText: "text-rose-800",
    cellRing: "ring-rose-500/40",
    dot: "bg-rose-500",
  },
  {
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-800",
    cardBorder: "border-l-orange-500",
    priceText: "text-orange-800",
    cellBg: "bg-orange-50",
    cellText: "text-orange-800",
    cellRing: "ring-orange-500/40",
    dot: "bg-orange-500",
  },
  {
    badgeBg: "bg-fuchsia-50",
    badgeText: "text-fuchsia-800",
    cardBorder: "border-l-fuchsia-600",
    priceText: "text-fuchsia-800",
    cellBg: "bg-fuchsia-50",
    cellText: "text-fuchsia-800",
    cellRing: "ring-fuchsia-500/40",
    dot: "bg-fuchsia-600",
  },
];

export function getPricingStepAccent(stepIndex: number): PricingStepAccent {
  return PRICING_STEP_ACCENTS[stepIndex % PRICING_STEP_ACCENTS.length];
}

export type PricingMatrixLookupResult = {
  highlights: PricingMatrixHighlight[];
  /** Cells to highlight: methodId -> cellKey -> step indices (multiple decorations can share a cell) */
  cellsByMethod: Map<string, Map<string, number[]>>;
  /** Method ids that apply to at least one decoration on this order */
  appliedMethodIds: Set<string>;
};

function normalizeSizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** DTF and similar methods price by transfer size, not ink color count. */
export function pricingColumnMode(decoration: DecorationType): PricingColumnMode {
  return decoration === "dtf" || decoration === "vinyl" ? "size" : "color";
}

function imprintSizeLabel(imprint: JobImprint): string | undefined {
  const dimensions = imprint.notes?.dimensions?.trim();
  return dimensions || undefined;
}

function resolveSizeColumn(method: PricingMethod, imprint: JobImprint): number {
  const dimensions = imprint.notes?.dimensions?.trim();
  if (dimensions && method.columns.length > 1) {
    const key = normalizeSizeKey(dimensions);
    for (let i = 0; i < method.columns.length; i += 1) {
      const colKey = normalizeSizeKey(method.columns[i]);
      if (colKey && (colKey.includes(key) || key.includes(colKey))) return i;
    }

    const dimMatch = dimensions.match(
      /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
    );
    if (dimMatch) {
      for (let i = 0; i < method.columns.length; i += 1) {
        const colMatch = method.columns[i].match(
          /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
        );
        if (
          colMatch &&
          colMatch[1] === dimMatch[1] &&
          colMatch[2] === dimMatch[2]
        ) {
          return i;
        }
      }
    }
  }

  const priceIdx = method.columns.findIndex((col) =>
    /^price$/i.test(col.trim())
  );
  return priceIdx >= 0 ? priceIdx : 0;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDtfPricingMethod(method: PricingMethod): boolean {
  return normalizeName(method.name).includes("dtf");
}

export function formatPricingHighlightDetail(
  entry: PricingMatrixHighlight
): string {
  if (entry.columnMode === "size") {
    const size = entry.sizeLabel || entry.columnLabel;
    return `${entry.methodName} · ${entry.qtyLabel} tier · ${size}`;
  }
  return `${entry.methodName} · ${entry.qtyLabel} tier · ${entry.columnLabel}`;
}

export function formatPricingHighlightSummary(
  entry: PricingMatrixHighlight
): string {
  if (entry.columnMode === "size") {
    const size = entry.sizeLabel || entry.columnLabel;
    return `${entry.pieceCount} pcs · ${size}`;
  }
  return `${entry.pieceCount} pcs · ${entry.colorCount} color${
    entry.colorCount !== 1 ? "s" : ""
  }`;
}

export function filterPricingHighlights(
  highlights: PricingMatrixHighlight[],
  mode: "dtf" | "matrix"
): PricingMatrixHighlight[] {
  return highlights.filter((entry) =>
    mode === "dtf"
      ? entry.decorationKey === "dtf"
      : entry.decorationKey !== "dtf"
  );
}

export function filterMatrixMethodsForOrder(
  methods: PricingMethod[],
  options: { hasDtf: boolean; appliedMethodIds: Set<string> }
): PricingMethod[] {
  const { hasDtf, appliedMethodIds } = options;
  return methods.filter((method) => {
    if (hasDtf && isDtfPricingMethod(method)) return false;
    if (appliedMethodIds.size === 0) return true;
    return appliedMethodIds.has(method.id);
  });
}

function findPricingMethod(
  methods: PricingMethod[],
  decoration: string
): PricingMethod | null {
  const target = normalizeName(decorationLabel(decoration));

  const exact = methods.find((m) => normalizeName(m.name) === target);
  if (exact) return exact;

  return (
    methods.find(
      (m) =>
        normalizeName(m.name).includes(target) ||
        target.includes(normalizeName(m.name))
    ) ?? null
  );
}

function parseColumnColorCount(column: string): number | null {
  const match = column.match(/(\d+)\s*colou?r/i);
  if (match) return Number.parseInt(match[1], 10);
  if (/^price$/i.test(column.trim())) return 1;
  return null;
}

function resolveColorColumn(method: PricingMethod, colorCount: number): number {
  if (method.columns.length === 1) return 0;

  for (let i = 0; i < method.columns.length; i += 1) {
    const parsed = parseColumnColorCount(method.columns[i]);
    if (parsed === colorCount) return i;
  }

  return Math.min(Math.max(colorCount - 1, 0), method.columns.length - 1);
}

/** Highest quantity tier whose minimum is met by piece count. */
function resolveQtyRowIndex(
  method: PricingMethod,
  pieceCount: number
): number | null {
  if (pieceCount <= 0 || method.rows.length === 0) return null;

  let match: number | null = null;
  for (let i = 0; i < method.rows.length; i += 1) {
    if (method.rows[i].minQty <= pieceCount) match = i;
  }
  return match;
}

export function imprintColorCount(imprint: JobImprint): number {
  const fromNotes = imprint.notes?.colorCount;
  if (typeof fromNotes === "number" && fromNotes > 0) return fromNotes;

  const inks = (imprint.inkColors || []).filter((color) => !color.isFlash);
  if (inks.length > 0) return inks.length;

  return 1;
}

function pieceCountForJob(order: Order, job: Job): number {
  if (job.lineItemIds?.length) {
    return order.lineItems
      .filter((item) => job.lineItemIds!.includes(item.id))
      .reduce((sum, item) => sum + lineItemPieceCount(item), 0);
  }

  return order.lineItems.reduce(
    (sum, item) => sum + lineItemPieceCount(item),
    0
  );
}

function decorationImprints(order: Order): { job: Job; imprint: JobImprint }[] {
  const entries: { job: Job; imprint: JobImprint }[] = [];

  for (const job of order.jobs || []) {
    if (job.kind === "finishing") continue;
    for (const imprint of job.imprints || []) {
      if (imprint.decoration === "finishing") continue;
      entries.push({ job, imprint });
    }
  }

  return entries;
}

export function resolveOrderPricingHighlights(
  order: Order,
  matrix: PricingMatrix
): PricingMatrixLookupResult {
  const highlights: PricingMatrixHighlight[] = [];
  const cellsByMethod = new Map<string, Map<string, number[]>>();
  const appliedMethodIds = new Set<string>();

  if (!matrix.enabled) {
    return { highlights, cellsByMethod, appliedMethodIds };
  }

  const methods = matrix.methods.filter((m) => m.rows.length > 0);

  for (const { job, imprint } of decorationImprints(order)) {
    const method = findPricingMethod(methods, imprint.decoration);
    if (!method) continue;

    const pieceCount = pieceCountForJob(order, job);
    const colorCount = imprintColorCount(imprint);
    const rowIndex = resolveQtyRowIndex(method, pieceCount);
    if (rowIndex === null) continue;

    const columnMode = pricingColumnMode(imprint.decoration);
    const colIndex =
      columnMode === "size"
        ? resolveSizeColumn(method, imprint)
        : resolveColorColumn(method, colorCount);
    const row = method.rows[rowIndex];
    const unitPrice = row.prices[colIndex] ?? 0;
    const columnLabel = method.columns[colIndex] ?? `Column ${colIndex + 1}`;

    appliedMethodIds.add(method.id);

    if (!cellsByMethod.has(method.id)) {
      cellsByMethod.set(method.id, new Map());
    }

    const stepIndex = highlights.length;
    const methodCells = cellsByMethod.get(method.id)!;
    const cellKey = `${rowIndex}:${colIndex}`;
    const existing = methodCells.get(cellKey) ?? [];
    methodCells.set(cellKey, [...existing, stepIndex]);

    highlights.push({
      stepIndex,
      methodId: method.id,
      methodName: method.name,
      rowIndex,
      colIndex,
      pieceCount,
      colorCount,
      unitPrice,
      qtyLabel: `${row.minQty}+`,
      columnLabel,
      imprintLabel: imprint.label,
      jobName: job.name,
      decoration: decorationLabel(imprint.decoration),
      decorationKey: imprint.decoration,
      columnMode,
      sizeLabel:
        columnMode === "size"
          ? imprintSizeLabel(imprint) || columnLabel
          : undefined,
    });
  }

  return { highlights, cellsByMethod, appliedMethodIds };
}
