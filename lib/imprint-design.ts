import type { ImprintInkColor, InkSqueegeeType, JobImprint } from "@/types";

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

export function summarizeInkColors(inkColors?: ImprintInkColor[]): string {
  if (!inkColors?.length) return "";
  const printable = inkColors.filter((row) => !row.isFlash && row.name.trim());
  if (printable.length === 0) return "";
  return printable
    .map((row) => row.pmsCode?.trim() || row.name.trim())
    .filter(Boolean)
    .join(" · ");
}

export function countPrintColors(inkColors?: ImprintInkColor[]): number {
  return inkColors?.filter((row) => !row.isFlash && row.name.trim()).length ?? 0;
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
