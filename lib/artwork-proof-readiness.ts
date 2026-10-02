import type { ArtworkFile, ImprintInkColor, JobImprint } from "@/types";
import { getProofSlides } from "@/lib/proof-slides";

export function imprintHasRequiredColors(
  imprint: Pick<JobImprint, "inkColors" | "decoration"> | null | undefined
): boolean {
  if (!imprint) return false;
  if (imprint.decoration === "finishing") return true;
  const colors = imprint.inkColors ?? [];
  return colors.some(
    (color: ImprintInkColor) =>
      !color.isFlash &&
      Boolean(color.name?.trim() || color.pmsCode?.trim())
  );
}

export function artworkHasProofImages(
  artwork: ArtworkFile | null | undefined
): boolean {
  if (!artwork) return false;
  return getProofSlides(artwork).some((slide) =>
    Boolean(slide.previewUrl?.trim())
  );
}

export function canCompleteArtworkProof(
  imprint: JobImprint | null | undefined
): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!imprint) {
    return { ok: false, missing: ["Proof location"] };
  }
  if (!artworkHasProofImages(imprint.artwork)) {
    missing.push("Upload at least one proof image");
  }
  if (!imprintHasRequiredColors(imprint)) {
    missing.push("Add ink / Pantone colors");
  }
  return { ok: missing.length === 0, missing };
}
