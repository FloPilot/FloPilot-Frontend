import { defaultTransform } from "@/lib/order-design-mockup";
import type {
  DesignMockupArtLayer,
  DesignMockupTransform,
  OrderDesignMockup,
} from "@/types";

export type { DesignMockupArtLayer };

export function createArtLayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `art_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `art_${Date.now().toString(36)}`;
}

export function createArtLayer(
  url: string,
  transform?: DesignMockupTransform,
  label?: string
): DesignMockupArtLayer {
  return {
    id: createArtLayerId(),
    url,
    transform: transform ?? defaultTransform(),
    label: label ?? "Artwork",
  };
}

export function activeLayerUrl(
  layer: DesignMockupArtLayer | undefined | null
): string | undefined {
  if (!layer) return undefined;
  if (layer.backgroundRemoved) {
    return layer.cleanUrl || layer.url;
  }
  return layer.url;
}

/** Prefer `artLayers`; fall back to legacy single artworkUrl + transform. */
export function normalizeArtLayers(
  source?: Pick<
    OrderDesignMockup,
    | "artLayers"
    | "artworkUrl"
    | "artworkCleanUrl"
    | "backgroundRemoved"
    | "transform"
  > | null
): DesignMockupArtLayer[] {
  if (!source) return [];
  if (Array.isArray(source.artLayers) && source.artLayers.length > 0) {
    return source.artLayers
      .filter((layer) => layer && typeof layer.url === "string" && layer.url)
      .map((layer, index) => ({
        id:
          typeof layer.id === "string" && layer.id.trim()
            ? layer.id.trim()
            : createArtLayerId(),
        url: layer.url,
        cleanUrl: layer.cleanUrl,
        backgroundRemoved: layer.backgroundRemoved === true,
        transform: layer.transform ?? source.transform ?? defaultTransform(),
        label: layer.label?.trim() || `Artwork ${index + 1}`,
      }));
  }
  if (source.artworkUrl) {
    return [
      {
        id: createArtLayerId(),
        url: source.artworkUrl,
        cleanUrl: source.artworkCleanUrl,
        backgroundRemoved: source.backgroundRemoved === true,
        transform: source.transform ?? defaultTransform(),
        label: "Artwork",
      },
    ];
  }
  return [];
}

/** Keep legacy single-art fields in sync for older readers / proofs. */
export function syncPrimaryFromLayers(layers: DesignMockupArtLayer[]): {
  artworkUrl?: string;
  artworkCleanUrl?: string;
  backgroundRemoved?: boolean;
  transform: DesignMockupTransform;
} {
  const top = layers[layers.length - 1];
  if (!top) {
    return { transform: defaultTransform() };
  }
  return {
    artworkUrl: top.url,
    artworkCleanUrl: top.cleanUrl,
    backgroundRemoved: top.backgroundRemoved === true,
    transform: top.transform,
  };
}

export function updateLayerTransform(
  layers: DesignMockupArtLayer[],
  layerId: string,
  patch: Partial<DesignMockupTransform>
): DesignMockupArtLayer[] {
  return layers.map((layer) =>
    layer.id === layerId
      ? { ...layer, transform: { ...layer.transform, ...patch } }
      : layer
  );
}

export function artLayersForCompose(layers: DesignMockupArtLayer[]): Array<{
  url: string;
  transform: DesignMockupTransform;
}> {
  return layers
    .map((layer) => {
      const url = activeLayerUrl(layer);
      if (!url) return null;
      return { url, transform: layer.transform };
    })
    .filter((entry): entry is { url: string; transform: DesignMockupTransform } =>
      Boolean(entry)
    );
}

function shortUrlFingerprint(url: string): string {
  // Data URLs share the same long `data:image/png;base64,` prefix — hashing
  // only the head makes every cleaned PNG look identical in the compose cache.
  const len = url.length;
  if (len <= 96) return url;
  const head = url.slice(0, 24);
  const mid = url.slice(Math.floor(len / 2) - 16, Math.floor(len / 2) + 16);
  const tail = url.slice(-32);
  let hash = 0;
  for (let i = 0; i < url.length; i += Math.max(1, Math.floor(url.length / 200))) {
    hash = (hash * 33 + url.charCodeAt(i)) >>> 0;
  }
  return `${len}:${head}:${mid}:${tail}:${hash.toString(36)}`;
}

export function artLayersCacheFingerprint(
  layers: DesignMockupArtLayer[]
): string {
  return artLayersForCompose(layers)
    .map(
      (layer) =>
        `${shortUrlFingerprint(layer.url)}@${layer.transform.x.toFixed(3)},${layer.transform.y.toFixed(3)},${layer.transform.scale.toFixed(3)},${layer.transform.rotation ?? 0}`
    )
    .join("|");
}
