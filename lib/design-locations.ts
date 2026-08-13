import type {
  OrderDesignMockup,
  SavedDesign,
  SavedDesignLocation,
} from "@/types";
import { createDesignMockupId } from "@/lib/order-design-mockup";

export function createDesignLocationId(): string {
  return `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Normalize a SavedDesign into a locations array.
 * Legacy designs only have top-level locationKey + designMockup.
 */
export function normalizeDesignLocations(
  design: Pick<
    SavedDesign,
    "locationKey" | "locationLabel" | "designMockup" | "locations"
  >
): SavedDesignLocation[] {
  if (Array.isArray(design.locations) && design.locations.length > 0) {
    return design.locations.map((loc, index) => ({
      id:
        typeof loc.id === "string" && loc.id.trim()
          ? loc.id.trim()
          : createDesignLocationId(),
      locationKey: loc.locationKey || design.locationKey || `loc-${index}`,
      locationLabel:
        loc.locationLabel ||
        loc.locationKey ||
        design.locationLabel ||
        "Location",
      designMockup: loc.designMockup || (index === 0 ? design.designMockup : undefined),
    }));
  }

  return [
    {
      id: createDesignLocationId(),
      locationKey: design.locationKey || "front_chest",
      locationLabel: design.locationLabel || design.locationKey || "Front chest",
      designMockup: design.designMockup,
    },
  ];
}

export function syncPrimaryFromLocations(
  locations: SavedDesignLocation[],
  preferredId?: string | null
): Pick<SavedDesign, "locationKey" | "locationLabel" | "designMockup"> {
  const primary =
    (preferredId
      ? locations.find((loc) => loc.id === preferredId)
      : undefined) || locations[0];

  return {
    locationKey: primary?.locationKey || "front_chest",
    locationLabel: primary?.locationLabel || "Front chest",
    designMockup: primary?.designMockup,
  };
}

export function seedMockupFromLocation(
  location: SavedDesignLocation,
  fallbackBlank?: {
    blankImageUrl?: string;
    blankImageFrontUrl?: string;
    blankImageBackUrl?: string;
    blankColorHex?: string;
    stageMode?: OrderDesignMockup["stageMode"];
    blankView?: OrderDesignMockup["blankView"];
  }
): OrderDesignMockup {
  const existing = location.designMockup;
  const stageMode =
    existing?.stageMode === "color"
      ? "color"
      : fallbackBlank?.stageMode === "color"
        ? "color"
        : "garment";

  const blankImageFrontUrl =
    existing?.blankImageFrontUrl ||
    fallbackBlank?.blankImageFrontUrl ||
    existing?.blankImageUrl ||
    fallbackBlank?.blankImageUrl;
  const blankImageBackUrl =
    existing?.blankImageBackUrl || fallbackBlank?.blankImageBackUrl;
  const blankView =
    existing?.blankView === "back"
      ? "back"
      : fallbackBlank?.blankView === "back"
        ? "back"
        : "front";
  const blankImageUrl =
    existing?.blankImageUrl ||
    (blankView === "back"
      ? blankImageBackUrl || blankImageFrontUrl
      : blankImageFrontUrl || blankImageBackUrl) ||
    fallbackBlank?.blankImageUrl;

  return {
    id: existing?.id || createDesignMockupId(),
    stageMode,
    blankView,
    blankImageUrl,
    blankImageFrontUrl,
    blankImageBackUrl,
    blankColorHex:
      existing?.blankColorHex || fallbackBlank?.blankColorHex || "#9CA3AF",
    artLayers: existing?.artLayers || [],
    artworkUrl: existing?.artworkUrl,
    artworkCleanUrl: existing?.artworkCleanUrl,
    backgroundRemoved: existing?.backgroundRemoved,
    transform: existing?.transform || {
      x: 0.5,
      y: stageMode === "color" ? 0.5 : 0.38,
      scale: stageMode === "color" ? 0.42 : 0.28,
      rotation: 0,
    },
    printWidthIn: existing?.printWidthIn,
    printHeightIn: existing?.printHeightIn,
    offsetBelowCollarIn: existing?.offsetBelowCollarIn,
    productionNotes: existing?.productionNotes,
    composedPreviewUrl: existing?.composedPreviewUrl,
    locationKey: location.locationKey,
    updatedAt: existing?.updatedAt || new Date().toISOString(),
  };
}
