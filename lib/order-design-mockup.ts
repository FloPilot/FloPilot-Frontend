import type {
  DesignMockupStageMode,
  DesignMockupTransform,
  LineItem,
  Order,
  OrderDesignMockup,
} from "@/types";
import type { DesignPlacementPreset } from "@/lib/shop-settings";

export const DESIGN_CANVAS_SIZE = 720;

const CATALOG_COLOR_HEX: Record<string, string> = {
  heather: "#9CA3AF",
  "athletic heather": "#9CA3AF",
  black: "#1A1A1A",
  navy: "#1E3A5F",
  white: "#F5F5F5",
  red: "#B91C1C",
  royal: "#1D4ED8",
  charcoal: "#374151",
  gray: "#6B7280",
  grey: "#6B7280",
  forest: "#166534",
  green: "#15803D",
  maroon: "#7F1D1D",
  purple: "#6B21A8",
  orange: "#C2410C",
  yellow: "#CA8A04",
  pink: "#DB2777",
  khaki: "#A8A29E",
};

export function resolveBlankColorHex(item?: LineItem | null): string {
  if (!item) return "#9CA3AF";
  if (item.colorHex?.trim()) return item.colorHex.trim();
  if (item.colorKey && CATALOG_COLOR_HEX[item.colorKey.toLowerCase()]) {
    return CATALOG_COLOR_HEX[item.colorKey.toLowerCase()];
  }
  const color = (item.color || "").trim().toLowerCase();
  if (CATALOG_COLOR_HEX[color]) return CATALOG_COLOR_HEX[color];
  for (const [key, hex] of Object.entries(CATALOG_COLOR_HEX)) {
    if (color.includes(key)) return hex;
  }
  return "#9CA3AF";
}

/** Prefer the vendor photo that matches the decoration placement view. */
export type GarmentBlankView = "front" | "back";

export function normalizeGarmentBlankView(
  value?: string | null
): GarmentBlankView {
  if (value === "back") return "back";
  // Legacy "side" (and anything else) collapses to front — UI only offers front/back.
  return "front";
}

export function resolveGarmentBlankView(
  locationKey?: string | null
): GarmentBlankView {
  const key = (locationKey || "").trim().toLowerCase();
  if (!key) return "front";
  if (
    key === "full_back" ||
    key === "back" ||
    key.includes("back") ||
    key === "nape" ||
    key.includes("nape") ||
    key.includes("yoke")
  ) {
    return "back";
  }
  return "front";
}

export function garmentBlankViewLabel(view: GarmentBlankView): string {
  if (view === "back") return "Back";
  return "Front";
}

export function resolveSupplierColorImageUrl(
  color: {
    colorFrontImageLargeUrl?: string;
    colorFrontImageUrl?: string;
    colorSideImageUrl?: string;
    colorBackImageUrl?: string;
  },
  view: GarmentBlankView = "front"
): string | undefined {
  const front =
    color.colorFrontImageLargeUrl?.trim() ||
    color.colorFrontImageUrl?.trim() ||
    undefined;
  const side = color.colorSideImageUrl?.trim() || undefined;
  const back = color.colorBackImageUrl?.trim() || undefined;

  if (view === "back") {
    return back || side || front || undefined;
  }
  return front || side || back || undefined;
}

export function createDesignMockupId(): string {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function transformFromPreset(
  preset: DesignPlacementPreset
): DesignMockupTransform {
  return {
    x: (preset.x + preset.width / 2) / 100,
    y: (preset.y + preset.height / 2) / 100,
    scale: Math.max(0.05, preset.width / 100),
    rotation: 0,
  };
}

export function defaultTransform(): DesignMockupTransform {
  return { x: 0.5, y: 0.38, scale: 0.28, rotation: 0 };
}

/** Centered, larger art box — better for neck labels / tags on a color backdrop. */
export function defaultColorStageTransform(): DesignMockupTransform {
  return { x: 0.5, y: 0.5, scale: 0.42, rotation: 0 };
}

/**
 * Prefer a solid color backdrop for placements that aren't printed on the
 * outer garment face (neck labels, tags, inside prints).
 */
export function defaultStageMode(
  locationKey?: string | null
): DesignMockupStageMode {
  const key = (locationKey || "").trim().toLowerCase();
  if (
    key.includes("nape") ||
    key.includes("neck") ||
    key.includes("label") ||
    key.includes("tag") ||
    key.includes("inside") ||
    key.includes("care")
  ) {
    return "color";
  }
  return "garment";
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const isRemote = /^https?:\/\//i.test(src);
    // Vendor CDNs often block canvas CORS; load via same-origin proxy.
    const loadSrc = isRemote
      ? `/api/proxy-image?url=${encodeURIComponent(src)}`
      : src;
    if (isRemote || loadSrc.startsWith("/api/")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = loadSrc;
  });
}

/** Simple corner flood-fill style background removal for solid/white backdrops. */
export async function removeImageBackground(
  sourceUrl: string,
  tolerance = 42
): Promise<string> {
  const image = await loadImageElement(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceUrl;

  ctx.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };

  const corners = [
    sample(2, 2),
    sample(width - 3, 2),
    sample(2, height - 3),
    sample(width - 3, height - 3),
  ];
  const avg = corners
    .reduce(
      (acc, rgb) => [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]],
      [0, 0, 0]
    )
    .map((v) => v / corners.length) as [number, number, number];

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - avg[0];
    const dg = data[i + 1] - avg[1];
    const db = data[i + 2] - avg[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance <= tolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

const DEFAULT_STAGE_BACKGROUND = "#f4f4f5";

/**
 * Averages an image's border pixels to estimate the backdrop behind the
 * garment, so the mockup canvas blends with the vendor photo (usually white)
 * instead of framing it in grey. Mirrors `useImageBackgroundColor`.
 */
function sampleImageBackgroundColor(
  image: HTMLImageElement
): string | undefined {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    const sample = (x: number, y: number) => {
      const i = (y * size + x) * 4;
      if (data[i + 3] < 200) return; // ignore transparent edges
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    };
    for (let x = 0; x < size; x++) {
      sample(x, 0);
      sample(x, size - 1);
    }
    for (let y = 0; y < size; y++) {
      sample(0, y);
      sample(size - 1, y);
    }

    if (count === 0) return undefined;
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(
      b / count
    )})`;
  } catch {
    // Tainted canvas — fall back to the default stage background.
    return undefined;
  }
}

/**
 * Raised when the placed artwork can't be loaded. Callers must not fall back to
 * a blank-only render — that silently wipes a saved design off the stage.
 */
export class ArtworkLoadError extends Error {
  constructor() {
    super("Could not load the saved artwork");
    this.name = "ArtworkLoadError";
  }
}

async function drawArtworkLayer(
  ctx: CanvasRenderingContext2D,
  size: number,
  artworkUrl: string,
  transform: DesignMockupTransform
) {
  const art = await loadImageElement(artworkUrl);
  const boxW = size * transform.scale;
  const aspect = art.height / Math.max(1, art.width);
  const boxH = boxW * aspect;
  const cx = size * transform.x;
  const cy = size * transform.y;
  const rotation = ((transform.rotation ?? 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(art, -boxW / 2, -boxH / 2, boxW, boxH);
  ctx.restore();
}

export async function composeDesignMockup(options: {
  blankImageUrl?: string | null;
  blankColorHex: string;
  /** garment = vendor photo; color = solid blank color backdrop */
  stageMode?: DesignMockupStageMode;
  /** When true (silhouette / generic blank), tint with blankColorHex. Skip for vendor color photos. */
  applyColorOverlay?: boolean;
  artworkUrl?: string | null;
  transform: DesignMockupTransform;
  /** When set, paint these instead of the single artworkUrl (bottom → top). */
  artworkLayers?: Array<{ url: string; transform: DesignMockupTransform }>;
  size?: number;
}): Promise<string> {
  const size = options.size ?? DESIGN_CANVAS_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const stageMode = options.stageMode === "color" ? "color" : "garment";
  const applyOverlay = options.applyColorOverlay === true;
  const layers =
    options.artworkLayers && options.artworkLayers.length > 0
      ? options.artworkLayers
      : options.artworkUrl
        ? [{ url: options.artworkUrl, transform: options.transform }]
        : [];

  // Color backdrop: solid garment color — for neck labels, tags, etc.
  if (stageMode === "color") {
    ctx.fillStyle = options.blankColorHex || DEFAULT_STAGE_BACKGROUND;
    ctx.fillRect(0, 0, size, size);

    for (const layer of layers) {
      try {
        await drawArtworkLayer(ctx, size, layer.url, layer.transform);
      } catch {
        throw new ArtworkLoadError();
      }
    }

    return canvas.toDataURL("image/jpeg", 0.88);
  }

  // Load the blank first so the stage can inherit its backdrop color.
  let blank: HTMLImageElement | null = null;
  if (options.blankImageUrl) {
    try {
      blank = await loadImageElement(options.blankImageUrl);
    } catch {
      blank = null;
    }
  }

  const stageBackground = blank
    ? sampleImageBackgroundColor(blank) ?? DEFAULT_STAGE_BACKGROUND
    : DEFAULT_STAGE_BACKGROUND;

  ctx.fillStyle = stageBackground;
  ctx.fillRect(0, 0, size, size);

  if (blank) {
    const scale = Math.min(size / blank.width, size / blank.height) * 0.92;
    const w = blank.width * scale;
    const h = blank.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(blank, x, y, w, h);

    if (applyOverlay) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = options.blankColorHex;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  } else {
    drawShirtSilhouette(ctx, size, options.blankColorHex);
  }

  for (const layer of layers) {
    try {
      await drawArtworkLayer(ctx, size, layer.url, layer.transform);
    } catch {
      throw new ArtworkLoadError();
    }
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

function drawShirtSilhouette(
  ctx: CanvasRenderingContext2D,
  size: number,
  colorHex: string
) {
  const cx = size / 2;
  const top = size * 0.12;
  const bodyW = size * 0.46;
  const bodyH = size * 0.68;
  const sleeveW = size * 0.18;
  const sleeveH = size * 0.22;

  ctx.save();
  ctx.fillStyle = colorHex;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  // Left sleeve
  ctx.moveTo(cx - bodyW / 2, top + size * 0.08);
  ctx.lineTo(cx - bodyW / 2 - sleeveW, top + size * 0.02);
  ctx.lineTo(cx - bodyW / 2 - sleeveW * 0.7, top + sleeveH);
  ctx.lineTo(cx - bodyW / 2, top + sleeveH * 0.75);
  // Body left → bottom → right
  ctx.lineTo(cx - bodyW / 2, top + bodyH);
  ctx.lineTo(cx + bodyW / 2, top + bodyH);
  ctx.lineTo(cx + bodyW / 2, top + sleeveH * 0.75);
  // Right sleeve
  ctx.lineTo(cx + bodyW / 2 + sleeveW * 0.7, top + sleeveH);
  ctx.lineTo(cx + bodyW / 2 + sleeveW, top + size * 0.02);
  ctx.lineTo(cx + bodyW / 2, top + size * 0.08);
  // Collar
  ctx.quadraticCurveTo(cx + bodyW * 0.18, top, cx + bodyW * 0.1, top + size * 0.05);
  ctx.quadraticCurveTo(cx, top + size * 0.1, cx - bodyW * 0.1, top + size * 0.05);
  ctx.quadraticCurveTo(cx - bodyW * 0.18, top, cx - bodyW / 2, top + size * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Soft highlight
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - bodyW * 0.15, top + size * 0.18, bodyW * 0.12, bodyH * 0.55);
  ctx.restore();
}

export function listDesignableImprints(order: Order) {
  return order.jobs
    .filter((job) => job.kind !== "finishing")
    .flatMap((job) =>
      (job.imprints ?? []).map((imprint) => ({
        job,
        imprint,
        key: `${job.id}:${imprint.id}`,
      }))
    );
}

export function seedMockupFromExisting(
  existing: OrderDesignMockup | undefined,
  options: {
    lineItemId?: string;
    stageMode?: DesignMockupStageMode;
    blankView?: GarmentBlankView;
    blankColorHex: string;
    blankImageUrl?: string;
    locationKey?: string;
    transform: DesignMockupTransform;
    placementPresetId?: string;
  }
): OrderDesignMockup {
  return {
    id: existing?.id ?? createDesignMockupId(),
    lineItemId: options.lineItemId ?? existing?.lineItemId,
    stageMode: options.stageMode ?? existing?.stageMode ?? "garment",
    blankView:
      options.blankView ?? normalizeGarmentBlankView(existing?.blankView),
    blankImageUrl: options.blankImageUrl ?? existing?.blankImageUrl,
    blankColorHex: options.blankColorHex,
    artLayers: existing?.artLayers,
    artworkUrl: existing?.artworkUrl,
    artworkCleanUrl: existing?.artworkCleanUrl,
    backgroundRemoved: existing?.backgroundRemoved,
    placementPresetId: options.placementPresetId ?? existing?.placementPresetId,
    locationKey: options.locationKey ?? existing?.locationKey,
    transform: options.transform,
    composedPreviewUrl: existing?.composedPreviewUrl,
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    updatedBy: existing?.updatedBy,
  };
}
