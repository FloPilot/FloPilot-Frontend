import type {
  DecorationType,
  ImprintInkColor,
  ImprintProductionNotes,
  InkSqueegeeType,
  JobImprint,
} from "@/types";

export const INK_TYPE_OPTIONS = [
  "Plastisol",
  "Water-based",
  "Discharge",
  "Silicone",
  "Other",
] as const;

export const SQUEEGEE_OPTIONS: { value: InkSqueegeeType; label: string }[] = [
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function createInkColorId(): string {
  return `ink-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Stable id for prep tracking — legacy rows may lack persisted ids */
export function inkColorStableId(
  row: ImprintInkColor,
  index: number
): string {
  if (row.id?.trim()) return row.id.trim();
  const key = (row.pmsCode || row.name || `stroke-${index}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `ink-stable-${key || index}`;
}

export function ensureInkColorIds(
  inkColors: ImprintInkColor[]
): ImprintInkColor[] {
  return inkColors.map((row, index) => ({
    ...row,
    id: inkColorStableId(row, index),
  }));
}

export function createEmptyInkColor(
  overrides?: Partial<ImprintInkColor>
): ImprintInkColor {
  return {
    id: createInkColorId(),
    name: "",
    pmsCode: "",
    mesh: undefined,
    squeegee: "medium",
    isFlash: false,
    ...overrides,
  };
}

export function createFlashInkColor(): ImprintInkColor {
  return createEmptyInkColor({
    name: "Flash",
    isFlash: true,
    pmsCode: "",
  });
}

/** Stable empty array — avoids new `[]` references on every render */
export const EMPTY_INK_COLORS: ImprintInkColor[] = [];

/** Stable empty object — avoids new `{}` references on every render */
export const EMPTY_NOTES: ImprintProductionNotes = {};

export function productionNotesEqual(
  a: ImprintProductionNotes,
  b: ImprintProductionNotes
): boolean {
  if (a === b) return true;
  const keys = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ]) as Set<keyof ImprintProductionNotes>;
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function inkColorsEqual(
  a: ImprintInkColor[],
  b: ImprintInkColor[]
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const other = b[index];
    return (
      row.id === other.id &&
      row.name === other.name &&
      row.pmsCode === other.pmsCode &&
      row.mesh === other.mesh &&
      row.squeegee === other.squeegee &&
      row.transferType === other.transferType &&
      row.isFlash === other.isFlash
    );
  });
}

export function summarizeInkColors(inkColors?: ImprintInkColor[]): string {
  if (!inkColors?.length) return "";
  const printable = inkColors.filter(
    (row) => !row.isFlash && (row.pmsCode?.trim() || row.name?.trim())
  );
  if (printable.length === 0) return "";
  return printable
    .map((row) => row.pmsCode?.trim() || row.name.trim())
    .filter(Boolean)
    .join(" · ");
}

export function countPrintColors(inkColors?: ImprintInkColor[]): number {
  return (
    inkColors?.filter(
      (row) => !row.isFlash && (row.pmsCode?.trim() || row.name?.trim())
    ).length ?? 0
  );
}

export function normalizeInkColorsForSave(
  inkColors: ImprintInkColor[],
  decoration: DecorationType = "screen_print"
): ImprintInkColor[] {
  const isScreenPrint = decoration === "screen_print";
  const isDtf = decoration === "dtf";
  return inkColors.map((row) => {
    if (row.isFlash) return row;
    const pms = row.pmsCode?.trim() ?? "";
    if (isScreenPrint) {
      return {
        ...row,
        pmsCode: pms,
        name: pms || row.name?.trim() || "",
      };
    }
    if (isDtf) {
      return {
        ...row,
        pmsCode: pms || row.pmsCode,
        name: row.name?.trim() ?? "",
        transferType: row.transferType?.trim() || undefined,
      };
    }
    return {
      ...row,
      pmsCode: pms || row.pmsCode,
      name: row.name?.trim() ?? "",
    };
  });
}

export function countFlashes(inkColors?: ImprintInkColor[]): number {
  return inkColors?.filter((row) => row.isFlash).length ?? 0;
}

export function syncImprintColorCounts(imprint: JobImprint): JobImprint {
  const inkColors = imprint.inkColors ?? [];
  const colorCount = countPrintColors(inkColors);
  const flashCount = countFlashes(inkColors);
  const summary = summarizeInkColors(inkColors);

  return {
    ...imprint,
    notes: {
      ...imprint.notes,
      colorCount: colorCount || imprint.notes?.colorCount,
      flashCount: flashCount || imprint.notes?.flashCount,
      colors: summary || imprint.notes?.colors,
    },
  };
}
