/**
 * Client-side artwork color tools for Design studio cleanup.
 * Digital Pantone matches are estimates — shops should confirm with a physical guide.
 */

export type DetectedArtworkColor = {
  id: string;
  /** CSS hex, e.g. #1A1A1A */
  hex: string;
  r: number;
  g: number;
  b: number;
  /** Share of opaque pixels (0–1) */
  share: number;
  /** Approximate Pantone Solid Coated name, when found */
  pantone?: string;
  pantoneCode?: string;
};

type PantoneEntry = {
  code: string;
  name: string;
  r: number;
  g: number;
  b: number;
};

type RgbCluster = {
  r: number;
  g: number;
  b: number;
  count: number;
  share: number;
};

/** Compact Solid Coated-ish palette for shop estimates (not a licensed Pantone DB). */
const PANTONE_APPROX: PantoneEntry[] = [
  { code: "Black C", name: "Black", r: 45, g: 41, b: 38 },
  { code: "Cool Gray 1 C", name: "Cool Gray 1", r: 217, g: 217, b: 214 },
  { code: "Cool Gray 5 C", name: "Cool Gray 5", r: 177, g: 179, b: 179 },
  { code: "Cool Gray 9 C", name: "Cool Gray 9", r: 117, g: 120, b: 123 },
  { code: "Cool Gray 11 C", name: "Cool Gray 11", r: 83, g: 86, b: 90 },
  { code: "White", name: "White", r: 255, g: 255, b: 255 },
  { code: "185 C", name: "Red 185", r: 228, g: 0, b: 43 },
  { code: "186 C", name: "Red 186", r: 200, g: 16, b: 46 },
  { code: "485 C", name: "Red 485", r: 218, g: 41, b: 28 },
  { code: "021 C", name: "Orange 021", r: 254, g: 80, b: 0 },
  { code: "137 C", name: "Orange 137", r: 255, g: 163, b: 0 },
  { code: "123 C", name: "Yellow 123", r: 255, g: 198, b: 0 },
  { code: "109 C", name: "Yellow 109", r: 255, g: 209, b: 0 },
  { code: "116 C", name: "Yellow 116", r: 255, g: 205, b: 0 },
  { code: "354 C", name: "Green 354", r: 0, g: 177, b: 64 },
  { code: "355 C", name: "Green 355", r: 0, g: 150, b: 57 },
  { code: "348 C", name: "Green 348", r: 0, g: 132, b: 61 },
  { code: "3425 C", name: "Forest 3425", r: 0, g: 98, b: 73 },
  { code: "299 C", name: "Blue 299", r: 0, g: 163, b: 224 },
  { code: "300 C", name: "Blue 300", r: 0, g: 94, b: 184 },
  { code: "286 C", name: "Blue 286", r: 0, g: 51, b: 160 },
  { code: "281 C", name: "Navy 281", r: 0, g: 32, b: 91 },
  { code: "282 C", name: "Navy 282", r: 4, g: 30, b: 66 },
  { code: "2728 C", name: "Royal 2728", r: 0, g: 71, b: 187 },
  { code: "2685 C", name: "Purple 2685", r: 51, g: 0, b: 114 },
  { code: "2597 C", name: "Purple 2597", r: 102, g: 0, b: 153 },
  { code: "512 C", name: "Purple 512", r: 131, g: 49, b: 119 },
  { code: "226 C", name: "Magenta 226", r: 208, g: 0, b: 112 },
  { code: "219 C", name: "Pink 219", r: 218, g: 24, b: 132 },
  { code: "205 C", name: "Pink 205", r: 240, g: 110, b: 170 },
  { code: "476 C", name: "Brown 476", r: 78, g: 54, b: 41 },
  { code: "4635 C", name: "Tan 4635", r: 152, g: 106, b: 63 },
  { code: "465 C", name: "Khaki 465", r: 182, g: 153, b: 100 },
  { code: "877 C", name: "Silver 877", r: 138, g: 141, b: 143 },
  { code: "871 C", name: "Gold 871", r: 166, g: 124, b: 0 },
  { code: "7502 C", name: "Sand 7502", r: 198, g: 170, b: 118 },
  { code: "7545 C", name: "Slate 7545", r: 66, g: 85, b: 99 },
  { code: "7540 C", name: "Charcoal 7540", r: 75, g: 79, b: 84 },
];

/** Ignore clusters smaller than this share of opaque art (anti-alias / jpeg noise). */
const MIN_COLOR_SHARE = 0.05;
/** RGB distance under which buckets merge into one ink. */
const MERGE_RGB_DISTANCE = 42;

function rgbDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r >= 245 && g >= 245 && b >= 245;
}

function isNearBlack(r: number, g: number, b: number): boolean {
  return r <= 28 && g <= 28 && b <= 28;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function nearestPantoneApprox(
  r: number,
  g: number,
  b: number
): { code: string; name: string; distance: number } {
  let best = PANTONE_APPROX[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const entry of PANTONE_APPROX) {
    const d = rgbDistance({ r, g, b }, entry);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return { code: best.code, name: best.name, distance: bestDist };
}

function mergeClusters(
  ranked: RgbCluster[],
  total: number,
  maxDistance: number
): RgbCluster[] {
  const merged: RgbCluster[] = [];
  for (const color of ranked) {
    const twin = merged.find((entry) => rgbDistance(entry, color) < maxDistance);
    if (twin) {
      const w = twin.count + color.count;
      twin.r = Math.round((twin.r * twin.count + color.r * color.count) / w);
      twin.g = Math.round((twin.g * twin.count + color.g * color.count) / w);
      twin.b = Math.round((twin.b * twin.count + color.b * color.count) / w);
      twin.count = w;
      twin.share = w / total;
    } else {
      merged.push({ ...color });
    }
  }
  return merged.sort((a, b) => b.count - a.count);
}

async function readImagePixels(
  sourceUrl: string,
  maxSide = 120
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isRemote = /^https?:\/\//i.test(sourceUrl);
    const loadSrc = isRemote
      ? `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
      : sourceUrl;
    if (isRemote || loadSrc.startsWith("/api/")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load artwork"));
    img.src = loadSrc;
  });

  const nw = image.naturalWidth || image.width;
  const nh = image.naturalHeight || image.height;
  const scale = Math.min(1, maxSide / Math.max(nw, nh));
  const width = Math.max(1, Math.round(nw * scale));
  const height = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { data, width, height };
}

/**
 * Quantize opaque pixels into dominant ink colors + Pantone estimates.
 * Filters anti-alias fringe noise and merges clusters that map to the same PMS.
 */
export async function detectArtworkColors(
  sourceUrl: string,
  maxColors = 6,
  options?: { minShare?: number }
): Promise<DetectedArtworkColor[]> {
  const minShare = options?.minShare ?? MIN_COLOR_SHARE;
  const { data } = await readImagePixels(sourceUrl, 180);
  const buckets = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();

  // 5-bit channel buckets — fine enough for solid art, coarse enough for AA edges.
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    // Skip soft anti-alias fringe (semi-transparent edge pixels).
    if (alpha < 220) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Near-white opaque pixels are usually backdrop leftovers, not ink.
    if (isNearWhite(r, g, b)) continue;
    const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return [];

  const ranked: RgbCluster[] = [...buckets.values()]
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);
      return { r, g, b, count: bucket.count, share: bucket.count / total };
    })
    .sort((a, b) => b.count - a.count);

  // Merge near-duplicates so logos don't explode into fringe greys/greens.
  let merged = mergeClusters(ranked, total, MERGE_RGB_DISTANCE);

  // Fold near-black fringe into the dominant black cluster when one exists.
  const blackish = merged.filter((color) => isNearBlack(color.r, color.g, color.b));
  if (blackish.length > 1) {
    const primaryBlack = blackish[0];
    const extras = blackish.slice(1);
    for (const extra of extras) {
      const w = primaryBlack.count + extra.count;
      primaryBlack.r = Math.round(
        (primaryBlack.r * primaryBlack.count + extra.r * extra.count) / w
      );
      primaryBlack.g = Math.round(
        (primaryBlack.g * primaryBlack.count + extra.g * extra.count) / w
      );
      primaryBlack.b = Math.round(
        (primaryBlack.b * primaryBlack.count + extra.b * extra.count) / w
      );
      primaryBlack.count = w;
      primaryBlack.share = w / total;
    }
    const drop = new Set(extras);
    merged = merged.filter((color) => !drop.has(color));
  }

  // Drop tiny fringe clusters before Pantone mapping.
  merged = merged.filter((color) => color.share >= minShare);
  if (merged.length === 0) {
    // Fall back to the single strongest color rather than an empty list.
    merged = mergeClusters(ranked, total, MERGE_RGB_DISTANCE).slice(0, 1);
  }

  // Merge clusters that resolve to the same Pantone (e.g. three shades of 354 C).
  const byPantone = new Map<
    string,
    RgbCluster & { pantone: string; pantoneCode: string }
  >();
  for (const color of merged) {
    const pantone = nearestPantoneApprox(color.r, color.g, color.b);
    const existing = byPantone.get(pantone.code);
    if (existing) {
      const w = existing.count + color.count;
      existing.r = Math.round(
        (existing.r * existing.count + color.r * color.count) / w
      );
      existing.g = Math.round(
        (existing.g * existing.count + color.g * color.count) / w
      );
      existing.b = Math.round(
        (existing.b * existing.count + color.b * color.count) / w
      );
      existing.count = w;
      existing.share = w / total;
    } else {
      byPantone.set(pantone.code, {
        ...color,
        pantone: pantone.name,
        pantoneCode: pantone.code,
      });
    }
  }

  const inkColors = [...byPantone.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors);

  // Renormalize shares so UI percentages reflect shown inks only.
  const shownTotal = inkColors.reduce((sum, color) => sum + color.count, 0) || 1;

  return inkColors.map((color, index) => ({
    id: `c${index}-${color.pantoneCode.replace(/\s+/g, "")}-${color.r}-${color.g}-${color.b}`,
    hex: rgbToHex(color.r, color.g, color.b),
    r: color.r,
    g: color.g,
    b: color.b,
    share: color.count / shownTotal,
    pantone: color.pantone,
    pantoneCode: color.pantoneCode,
  }));
}

/** Make pixels near any of the target colors transparent. */
export async function removeColorsFromImage(
  sourceUrl: string,
  colors: Array<{ r: number; g: number; b: number }>,
  tolerance = 48
): Promise<string> {
  if (colors.length === 0) return sourceUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isRemote = /^https?:\/\//i.test(sourceUrl);
    const loadSrc = isRemote
      ? `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
      : sourceUrl;
    if (isRemote || loadSrc.startsWith("/api/")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load artwork"));
    img.src = loadSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceUrl;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
    for (const target of colors) {
      if (rgbDistance(pixel, target) <= tolerance) {
        data[i + 3] = 0;
        break;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Shift hue of matching colors toward a replacement color (keeps luminosity). */
export async function recolorArtworkColors(
  sourceUrl: string,
  fromColors: Array<{ r: number; g: number; b: number }>,
  toColor: { r: number; g: number; b: number },
  tolerance = 48
): Promise<string> {
  if (fromColors.length === 0) return sourceUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isRemote = /^https?:\/\//i.test(sourceUrl);
    const loadSrc = isRemote
      ? `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
      : sourceUrl;
    if (isRemote || loadSrc.startsWith("/api/")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load artwork"));
    img.src = loadSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceUrl;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
    for (const target of fromColors) {
      if (rgbDistance(pixel, target) <= tolerance) {
        // Preserve relative brightness vs the matched target.
        const srcLum = (target.r + target.g + target.b) / 3 || 1;
        const pixLum = (pixel.r + pixel.g + pixel.b) / 3;
        const factor = Math.max(0.35, Math.min(1.65, pixLum / srcLum));
        data[i] = Math.max(0, Math.min(255, Math.round(toColor.r * factor)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(toColor.g * factor)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(toColor.b * factor)));
        break;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function formatDetectedColorsForNotes(
  colors: DetectedArtworkColor[]
): string {
  return colors
    .map((color) =>
      color.pantoneCode
        ? `${color.hex} ≈ PMS ${color.pantoneCode}`
        : color.hex
    )
    .join(" · ");
}
