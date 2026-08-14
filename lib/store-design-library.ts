import { createDesign, updateDesign } from "@/lib/api";
import type { ClientStoreProductDesign } from "@/lib/client-stores";
import { upsertDesignStudioCache } from "@/lib/design-studio-cache";
import {
  activeLayerUrl,
  normalizeArtLayers,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import type { OrderDesignMockup } from "@/types";

function locationForView(view: "front" | "back"): {
  locationKey: string;
  locationLabel: string;
} {
  if (view === "back") {
    return { locationKey: "full_back", locationLabel: "Full back" };
  }
  return { locationKey: "front_chest", locationLabel: "Front chest" };
}

function buildLibraryMockup(args: {
  design: ClientStoreProductDesign;
  artLayers: DesignMockupArtLayer[];
  blankView: "front" | "back";
  blankColorHex: string;
  blankFrontUrl?: string;
  blankBackUrl?: string;
  composedPreviewUrl?: string;
}): OrderDesignMockup {
  const {
    design,
    artLayers,
    blankView,
    blankColorHex,
    blankFrontUrl,
    blankBackUrl,
    composedPreviewUrl,
  } = args;
  const { locationKey } = locationForView(blankView);
  const activeBlank =
    blankView === "back"
      ? blankBackUrl || blankFrontUrl
      : blankFrontUrl || blankBackUrl;
  const primary = artLayers[artLayers.length - 1];

  return {
    id: `dm-store-${Date.now().toString(36)}`,
    stageMode: design.stageMode === "color" ? "color" : "garment",
    blankView,
    blankImageUrl: activeBlank,
    blankImageFrontUrl: blankFrontUrl || undefined,
    blankImageBackUrl: blankBackUrl || undefined,
    blankColorHex,
    artLayers: artLayers.map((layer) => ({
      ...layer,
      url: layer.url,
      cleanUrl: layer.cleanUrl,
    })),
    artworkUrl: activeLayerUrl(primary) || design.artworkUrl,
    artworkCleanUrl: primary?.cleanUrl || design.artworkCleanUrl,
    backgroundRemoved:
      primary?.backgroundRemoved === true || design.backgroundRemoved === true,
    transform: primary?.transform || design.transform,
    placementPresetId: design.placementPresetId,
    locationKey,
    composedPreviewUrl,
    updatedAt: new Date().toISOString(),
    updatedBy: "Shop",
  };
}

/**
 * Create or update a Design Studio library file from a client-store product
 * design so store artwork also lives in the shared design library.
 */
export async function upsertStoreDesignToLibrary(args: {
  token: string;
  design: ClientStoreProductDesign;
  productName?: string;
  blankView: "front" | "back";
  blankColorHex: string;
  blankFrontUrl?: string;
  blankBackUrl?: string;
  composedPreviewUrl?: string;
}): Promise<{ design: ClientStoreProductDesign; libraryDesignId: string }> {
  const artLayers = normalizeArtLayers(args.design);
  if (artLayers.length === 0 && !args.design.artworkUrl) {
    throw new Error("Upload artwork before saving to Design Studio.");
  }

  const stageMode = args.design.stageMode === "color" ? "color" : "garment";
  const activeBlank =
    args.blankView === "back"
      ? args.blankBackUrl || args.blankFrontUrl
      : args.blankFrontUrl || args.blankBackUrl;

  if (stageMode === "garment" && !activeBlank) {
    throw new Error("Add a garment blank before saving to Design Studio.");
  }

  const { locationKey, locationLabel } = locationForView(args.blankView);
  const name = (
    args.productName?.trim() ||
    artLayers[artLayers.length - 1]?.label ||
    "Store design"
  ).slice(0, 120);

  const mockup = buildLibraryMockup({
    design: args.design,
    artLayers,
    blankView: args.blankView,
    blankColorHex: args.blankColorHex,
    blankFrontUrl: args.blankFrontUrl,
    blankBackUrl: args.blankBackUrl,
    composedPreviewUrl: args.composedPreviewUrl,
  });

  let libraryDesignId = args.design.libraryDesignId?.trim() || "";

  if (libraryDesignId) {
    try {
      const { design: saved } = await updateDesign(args.token, {
        designId: libraryDesignId,
        patch: {
          name,
          designMockup: mockup,
          locationKey,
          locationLabel,
        },
        changeSummary: "Updated from client store Design Studio",
        author: "Shop",
      });
      upsertDesignStudioCache(saved);
      libraryDesignId = saved.id;
    } catch {
      // Linked id may have been deleted — fall through to create.
      libraryDesignId = "";
    }
  }

  if (!libraryDesignId) {
    const { design: created } = await createDesign(args.token, {
      name,
      stageMode,
      blankImageUrl:
        stageMode === "garment" ? activeBlank : undefined,
      blankImageFrontUrl: args.blankFrontUrl,
      blankImageBackUrl: args.blankBackUrl,
      blankColorHex: args.blankColorHex,
      blankView: args.blankView,
      locationKey,
      locationLabel,
      previewUrl: args.composedPreviewUrl,
      decoration: "screen_printing",
      tags: ["client-store"],
      author: "Shop",
    });

    const { design: saved } = await updateDesign(args.token, {
      designId: created.id,
      patch: {
        designMockup: mockup,
      },
      changeSummary: "Artwork saved from client store",
      author: "Shop",
    });
    upsertDesignStudioCache(saved);
    libraryDesignId = saved.id;
  }

  return {
    libraryDesignId,
    design: {
      ...args.design,
      libraryDesignId,
      updatedAt: new Date().toISOString(),
    },
  };
}
