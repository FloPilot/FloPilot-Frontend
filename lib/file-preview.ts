export type FilePreviewKind = "pdf" | "image" | "other";

function looksLikePdf(value?: string | null): boolean {
  const raw = (value || "").toLowerCase();
  if (!raw) return false;
  const path = raw.split("?")[0] || raw;
  return (
    path.endsWith(".pdf") ||
    raw.includes("application/pdf") ||
    raw.startsWith("data:application/pdf")
  );
}

function looksLikeImage(value?: string | null): boolean {
  const raw = (value || "").toLowerCase();
  if (!raw) return false;
  if (raw.startsWith("data:image/")) return true;
  const path = raw.split("?")[0] || raw;
  return /\.(png|jpe?g|gif|webp|svg|bmp|heic|avif)$/i.test(path);
}

/**
 * Best URL for in-app preview / print.
 * Prefer the real downloadable file for PDFs so Chrome's multi-page PDF viewer
 * (thumbnails, zoom, print) appears — previewUrl is often only a thumbnail image.
 */
export function filePreviewSource(file: {
  name?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
}): string | null {
  const preview = file.previewUrl?.trim() || null;
  const download = file.downloadUrl?.trim() || null;
  const name = file.name || "";

  if (looksLikePdf(name) || looksLikePdf(download)) {
    return download || preview;
  }

  if (looksLikePdf(preview) && !looksLikeImage(preview)) {
    return preview || download;
  }

  // Prefer a real downloadable file over a tiny generated thumbnail when both exist.
  if (download && preview && looksLikeImage(preview) && !looksLikeImage(download)) {
    return download;
  }

  return preview || download || null;
}

export function resolveFilePreviewKind(params: {
  name?: string | null;
  url?: string | null;
  contentType?: string | null;
}): FilePreviewKind {
  const type = (params.contentType || "").toLowerCase();
  const name = params.name || "";
  const url = params.url || "";

  if (
    type.includes("pdf") ||
    looksLikePdf(name) ||
    looksLikePdf(url)
  ) {
    return "pdf";
  }

  if (
    type.startsWith("image/") ||
    looksLikeImage(name) ||
    looksLikeImage(url)
  ) {
    return "image";
  }

  return "other";
}
