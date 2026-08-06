/**
 * Placement size helpers — map canvas transform.scale/y ↔ print inches.
 * Reference width approximates a tee chest in the garment photo frame.
 */
export const DESIGN_CHEST_REF_IN = 18;
export const DESIGN_COLLAR_Y = 0.18;

export function scaleToPrintWidthIn(scale: number): number {
  const inches = scale * DESIGN_CHEST_REF_IN;
  return Math.round(Math.max(0.5, Math.min(16, inches)) * 10) / 10;
}

export function printWidthInToScale(widthIn: number): number {
  const scale = widthIn / DESIGN_CHEST_REF_IN;
  return Math.max(0.04, Math.min(0.85, scale));
}

export function yToOffsetBelowCollarIn(y: number): number {
  const inches = (y - DESIGN_COLLAR_Y) * DESIGN_CHEST_REF_IN;
  return Math.round(Math.max(0, Math.min(14, inches)) * 10) / 10;
}

export function offsetBelowCollarInToY(offsetIn: number): number {
  const y = DESIGN_COLLAR_Y + offsetIn / DESIGN_CHEST_REF_IN;
  return Math.max(0.08, Math.min(0.92, y));
}

export function printHeightFromWidth(
  widthIn: number,
  aspectHeightOverWidth: number
): number {
  if (!Number.isFinite(aspectHeightOverWidth) || aspectHeightOverWidth <= 0) {
    return Math.round(widthIn * 10) / 10;
  }
  return Math.round(widthIn * aspectHeightOverWidth * 10) / 10;
}

export function formatPrintSpecLine(options: {
  widthIn?: number;
  heightIn?: number;
  offsetBelowCollarIn?: number;
  locationLabel?: string;
}): string {
  const parts: string[] = [];
  if (options.widthIn && options.heightIn) {
    parts.push(`${options.widthIn}" W × ${options.heightIn}" H`);
  } else if (options.widthIn) {
    parts.push(`${options.widthIn}" wide`);
  }
  if (
    options.offsetBelowCollarIn !== undefined &&
    options.offsetBelowCollarIn > 0
  ) {
    parts.push(`${options.offsetBelowCollarIn}" below collar`);
  }
  if (options.locationLabel) {
    parts.push(options.locationLabel);
  }
  return parts.join(" · ");
}
