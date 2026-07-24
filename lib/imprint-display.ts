import type { JobImprint } from "@/types";

/** Primary display name for a proof/imprint — custom name when set, else location. */
export function imprintDisplayName(imprint: Pick<JobImprint, "label" | "customLabel">): string {
  const custom = imprint.customLabel?.trim();
  return custom || imprint.label;
}

/** Location line shown under a custom proof name. */
export function imprintLocationSubtitle(
  imprint: Pick<JobImprint, "label" | "customLabel">
): string | null {
  const custom = imprint.customLabel?.trim();
  if (!custom) return null;
  return imprint.label;
}

export function formatImprintOptionLabel(
  imprint: Pick<JobImprint, "label" | "customLabel">
): string {
  const custom = imprint.customLabel?.trim();
  if (custom) return `${custom} · ${imprint.label}`;
  return imprint.label;
}
