import type { ArtworkFile, ProofSlide } from "@/types";

const MAX_PROOF_SLIDES = 12;

export { MAX_PROOF_SLIDES };

type ProofArtworkSource = Pick<
  ArtworkFile,
  "id" | "name" | "previewUrl" | "mockupLabel" | "proofSlides"
> & {
  uploadedAt?: string;
  uploadedBy?: string;
};

/** Ordered slides for the current proof version (backward compatible with single previewUrl). */
export function getProofSlides(
  artwork: ProofArtworkSource | null | undefined
): ProofSlide[] {
  if (!artwork) return [];

  const stored: ProofSlide[] = [];
  for (let index = 0; index < (artwork.proofSlides || []).length; index += 1) {
    const slide = artwork.proofSlides![index];
    if (!slide) continue;
    const previewUrl =
      typeof slide.previewUrl === "string" ? slide.previewUrl.trim() : "";
    if (!previewUrl && !slide.id) continue;
    stored.push({
      ...slide,
      id: slide.id || `${artwork.id || "slide"}-${index}`,
      previewUrl: previewUrl || undefined,
      sortOrder: typeof slide.sortOrder === "number" ? slide.sortOrder : index,
      uploadedAt:
        slide.uploadedAt || artwork.uploadedAt || new Date(0).toISOString(),
    });
  }
  stored.sort((a, b) => a.sortOrder - b.sortOrder);

  if (stored.length > 0) return stored;

  if (artwork.previewUrl?.trim()) {
    return [
      {
        id: artwork.id || "primary-preview",
        previewUrl: artwork.previewUrl,
        label: artwork.mockupLabel || artwork.name,
        sortOrder: 0,
        uploadedAt: artwork.uploadedAt || new Date(0).toISOString(),
        uploadedBy: artwork.uploadedBy,
      },
    ];
  }

  return [];
}

export function artworkHasProofImages(
  artwork: ProofArtworkSource | null | undefined
): boolean {
  return getProofSlides(artwork).some((slide) => Boolean(slide.previewUrl?.trim()));
}

export function syncArtworkPrimaryPreview<T extends ArtworkFile>(artwork: T): T {
  const slides = getProofSlides(artwork);
  const primary = slides[0];
  return {
    ...artwork,
    proofSlides: slides.length > 0 ? slides : artwork.proofSlides,
    previewUrl: primary?.previewUrl || artwork.previewUrl,
  };
}

export function reorderProofSlides(
  slides: ProofSlide[],
  orderedIds: string[]
): ProofSlide[] {
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  const ordered: ProofSlide[] = [];

  for (const id of orderedIds) {
    const slide = byId.get(id);
    if (slide) ordered.push(slide);
  }

  for (const slide of slides) {
    if (!orderedIds.includes(slide.id)) ordered.push(slide);
  }

  return ordered.map((slide, index) => ({ ...slide, sortOrder: index }));
}

export function sanitizeProofSlidesForSave(
  slides: ProofSlide[]
): ProofSlide[] {
  return slides
    .slice(0, MAX_PROOF_SLIDES)
    .map((slide, index) => ({
      id: String(slide.id || "").slice(0, 64),
      previewUrl:
        typeof slide.previewUrl === "string" && slide.previewUrl.trim()
          ? slide.previewUrl.trim()
          : undefined,
      label:
        typeof slide.label === "string" && slide.label.trim()
          ? slide.label.trim().slice(0, 120)
          : undefined,
      sortOrder: index,
      uploadedAt: slide.uploadedAt || new Date().toISOString(),
      uploadedBy: slide.uploadedBy,
    }))
    .filter((slide) => slide.id);
}
