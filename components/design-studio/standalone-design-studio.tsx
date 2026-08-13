"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import {
  DesignStudioArtStage,
  composeFullDesignPreview,
} from "@/components/design-studio/design-studio-art-stage";
import {
  DesignStudioLayersPanel,
  type DesignStudioLayerRow,
} from "@/components/design-studio/design-studio-layers-panel";
import {
  DesignStudioEditImageDialog,
  formatSelectedPmsForNotes,
} from "@/components/design-studio/design-studio-edit-image-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isImageUpload, readImagePreviewDataUrl } from "@/lib/artwork-preview";
import { updateDesign } from "@/lib/api";
import type { DetectedArtworkColor } from "@/lib/artwork-color-tools";
import {
  createDesignLocationId,
  normalizeDesignLocations,
  seedMockupFromLocation,
  syncPrimaryFromLocations,
} from "@/lib/design-locations";
import { upsertDesignStudioCache } from "@/lib/design-studio-cache";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  activeLayerUrl,
  createArtLayer,
  normalizeArtLayers,
  syncPrimaryFromLayers,
  updateLayerTransform,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import {
  defaultColorStageTransform,
  defaultTransform,
  garmentBlankViewLabel,
  normalizeGarmentBlankView,
  resolveGarmentBlankView,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import { getPrintLocationOptions } from "@/lib/shop-settings";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type {
  OrderDesignMockup,
  SavedDesign,
  SavedDesignLocation,
} from "@/types";
import { cn } from "@/lib/utils";

export type DesignArtInsights = {
  layerId: string;
  layerLabel: string;
  backgroundRemoved: boolean;
  pmsCodes: string[];
  colors: Array<{
    hex: string;
    pantoneCode?: string;
    pantone?: string;
    share?: number;
  }>;
} | null;

function blankFallbackFromDesign(design: SavedDesign) {
  const primary = design.designMockup || design.locations?.[0]?.designMockup;
  return {
    blankImageUrl: primary?.blankImageUrl,
    blankImageFrontUrl: primary?.blankImageFrontUrl,
    blankImageBackUrl: primary?.blankImageBackUrl,
    blankColorHex: primary?.blankColorHex || "#9CA3AF",
    stageMode: primary?.stageMode,
    blankView: primary?.blankView,
  };
}

export function StandaloneDesignStudio({
  design: designProp,
  onDesignChange,
  initialLocationId,
  onArtInsightsChange,
}: {
  design: SavedDesign;
  onDesignChange?: (design: SavedDesign) => void;
  /** When opening a specific location file from the library. */
  initialLocationId?: string | null;
  onArtInsightsChange?: (insights: DesignArtInsights) => void;
}) {
  const { getIdToken } = useAuth();
  const { settings } = useShopSettings();
  const locationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const [locations, setLocations] = useState<SavedDesignLocation[]>(() =>
    normalizeDesignLocations(designProp)
  );
  const [activeLocationId, setActiveLocationId] = useState(() => {
    const normalized = normalizeDesignLocations(designProp);
    if (
      initialLocationId &&
      normalized.some((loc) => loc.id === initialLocationId)
    ) {
      return initialLocationId;
    }
    return normalized[0]?.id || "";
  });
  const [mockup, setMockup] = useState<OrderDesignMockup>(() => {
    const normalized = normalizeDesignLocations(designProp);
    const active =
      (initialLocationId
        ? normalized.find((loc) => loc.id === initialLocationId)
        : undefined) || normalized[0];
    return seedMockupFromLocation(
      active || {
        id: "tmp",
        locationKey: designProp.locationKey,
        locationLabel: designProp.locationLabel,
        designMockup: designProp.designMockup,
      },
      blankFallbackFromDesign(designProp)
    );
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => {
    const layers = normalizeArtLayers(designProp.designMockup);
    return layers[layers.length - 1]?.id ?? null;
  });
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    designProp.designMockup?.composedPreviewUrl
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [detectedColors, setDetectedColors] = useState<DetectedArtworkColor[]>(
    []
  );
  const [detectedPmsNote, setDetectedPmsNote] = useState<string | null>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  const blankInputRef = useRef<HTMLInputElement>(null);

  const activeLocation =
    locations.find((loc) => loc.id === activeLocationId) || locations[0] || null;

  const usedLocationKeys = useMemo(
    () => new Set(locations.map((loc) => loc.locationKey)),
    [locations]
  );
  const addableLocations = useMemo(
    () => locationOptions.filter((option) => !usedLocationKeys.has(option.value)),
    [locationOptions, usedLocationKeys]
  );

  const artLayers = useMemo(() => normalizeArtLayers(mockup), [mockup]);
  const selectedLayer =
    artLayers.find((layer) => layer.id === selectedLayerId) ||
    artLayers[artLayers.length - 1] ||
    null;
  const isColorStage = mockup.stageMode === "color";
  const stageBg = useImageBackgroundColor(
    isColorStage ? null : mockup.blankImageUrl
  );

  const layerRows: DesignStudioLayerRow[] = artLayers.map((layer, index) => ({
    id: layer.id,
    kind: "artwork" as const,
    label: layer.label || `Layer ${index + 1}`,
    thumbUrl: activeLayerUrl(layer) || layer.url,
  }));

  useEffect(() => {
    if (!onArtInsightsChange) return;
    if (!selectedLayer) {
      onArtInsightsChange(null);
      return;
    }
    onArtInsightsChange({
      layerId: selectedLayer.id,
      layerLabel: selectedLayer.label || "Artwork",
      backgroundRemoved: Boolean(selectedLayer.backgroundRemoved),
      pmsCodes: detectedColors
        .map((color) => color.pantoneCode)
        .filter((code): code is string => Boolean(code)),
      colors: detectedColors.map((color) => ({
        hex: color.hex,
        pantoneCode: color.pantoneCode,
        pantone: color.pantone,
        share: color.share,
      })),
    });
  }, [detectedColors, onArtInsightsChange, selectedLayer]);

  const flushActiveMockup = useCallback(
    (nextMockup: OrderDesignMockup = mockup, nextPreview = previewUrl) => {
      if (!activeLocationId) return locations;
      return locations.map((loc) =>
        loc.id === activeLocationId
          ? {
              ...loc,
              designMockup: {
                ...nextMockup,
                composedPreviewUrl:
                  nextPreview || nextMockup.composedPreviewUrl,
                locationKey: loc.locationKey,
                updatedAt: new Date().toISOString(),
              },
            }
          : loc
      );
    },
    [activeLocationId, locations, mockup, previewUrl]
  );

  const switchLocation = (locationId: string) => {
    if (locationId === activeLocationId) return;
    const next = locations.find((loc) => loc.id === locationId);
    if (!next) return;

    const flushed = flushActiveMockup();
    setLocations(flushed);
    setActiveLocationId(locationId);
    const seeded = seedMockupFromLocation(
      flushed.find((loc) => loc.id === locationId) || next,
      blankFallbackFromDesign(designProp)
    );
    setMockup(seeded);
    const layers = normalizeArtLayers(seeded);
    setSelectedLayerId(layers[layers.length - 1]?.id ?? null);
    setPreviewUrl(seeded.composedPreviewUrl);
    setMessage(null);
    setError(null);
    setAddingLocation(false);
  };

  const handleAddLocation = (locationKey: string) => {
    const match = locationOptions.find((option) => option.value === locationKey);
    if (!match) return;
    const blank = blankFallbackFromDesign({
      ...designProp,
      designMockup: mockup,
      locations,
    });
    const seeded = seedMockupFromLocation(
      {
        id: "new",
        locationKey: match.value,
        locationLabel: match.label,
      },
      {
        ...blank,
        blankView: resolveGarmentBlankView(match.value),
      }
    );
    const location: SavedDesignLocation = {
      id: createDesignLocationId(),
      locationKey: match.value,
      locationLabel: match.label,
      designMockup: {
        ...seeded,
        artLayers: [],
        artworkUrl: undefined,
        artworkCleanUrl: undefined,
        backgroundRemoved: undefined,
        composedPreviewUrl:
          seeded.blankImageUrl || blank.blankImageUrl || mockup.composedPreviewUrl,
      },
    };
    const flushed = flushActiveMockup();
    const nextLocations = [...flushed, location];
    setLocations(nextLocations);
    setActiveLocationId(location.id);
    setMockup(location.designMockup!);
    setSelectedLayerId(null);
    setPreviewUrl(location.designMockup?.composedPreviewUrl);
    setAddingLocation(false);
    setMessage(null);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (locations.length <= 1) {
      setError("Keep at least one decoration location.");
      return;
    }
    const flushed =
      locationId === activeLocationId ? flushActiveMockup() : locations;
    const nextLocations = flushed.filter((loc) => loc.id !== locationId);
    const nextActive =
      locationId === activeLocationId
        ? nextLocations[0]
        : nextLocations.find((loc) => loc.id === activeLocationId) ||
          nextLocations[0];
    setLocations(nextLocations);
    if (nextActive) {
      setActiveLocationId(nextActive.id);
      const seeded = seedMockupFromLocation(
        nextActive,
        blankFallbackFromDesign(designProp)
      );
      setMockup(seeded);
      const layers = normalizeArtLayers(seeded);
      setSelectedLayerId(layers[layers.length - 1]?.id ?? null);
      setPreviewUrl(seeded.composedPreviewUrl);
    }
  };

  const patchLayers = useCallback((layers: DesignMockupArtLayer[]) => {
    const primary = syncPrimaryFromLayers(layers);
    setMockup((current) => ({
      ...current,
      artLayers: layers,
      artworkUrl: primary.artworkUrl,
      artworkCleanUrl: primary.artworkCleanUrl,
      backgroundRemoved: primary.backgroundRemoved,
      transform: primary.transform || current.transform,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleChangeLayerTransform = useCallback(
    (layerId: string, partial: Partial<OrderDesignMockup["transform"]>) => {
      const layer = artLayers.find((row) => row.id === layerId);
      if (!layer) return;
      patchLayers(
        updateLayerTransform(artLayers, layerId, {
          ...layer.transform,
          ...partial,
        })
      );
    },
    [artLayers, patchLayers]
  );

  const blankView = normalizeGarmentBlankView(mockup.blankView);
  const frontBlankUrl =
    mockup.blankImageFrontUrl ||
    (blankView === "front" ? mockup.blankImageUrl : undefined);
  const backBlankUrl =
    mockup.blankImageBackUrl ||
    (blankView === "back" ? mockup.blankImageUrl : undefined);
  const activeViewBlankUrl =
    blankView === "back" ? backBlankUrl : frontBlankUrl;

  const switchBlankView = (view: GarmentBlankView) => {
    if (view === blankView) return;
    const nextUrl =
      view === "back"
        ? backBlankUrl || frontBlankUrl
        : frontBlankUrl || backBlankUrl;
    setMockup((current) => ({
      ...current,
      blankView: view,
      blankImageUrl: nextUrl || current.blankImageUrl,
      blankImageFrontUrl: frontBlankUrl || current.blankImageFrontUrl,
      blankImageBackUrl: backBlankUrl || current.blankImageBackUrl,
      updatedAt: new Date().toISOString(),
    }));
    if (view === "back" && !backBlankUrl) {
      setMessage(
        "No back product photo yet — upload one, or keep using the front photo."
      );
    } else if (view === "front" && !frontBlankUrl) {
      setMessage(
        "No front product photo yet — upload one for this view."
      );
    } else {
      setMessage(
        `Showing ${garmentBlankViewLabel(view).toLowerCase()} product photo.`
      );
    }
    setError(null);
  };

  const handleBlankUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP blank photo.");
      return;
    }
    setError(null);
    const dataUrl = await readImagePreviewDataUrl(file);
    if (!dataUrl.previewUrl) {
      setError("Could not read that blank photo.");
      return;
    }
    const view = blankView;
    setMockup((current) => {
      const front =
        view === "front"
          ? dataUrl.previewUrl
          : current.blankImageFrontUrl ||
            (current.blankView !== "back" ? current.blankImageUrl : undefined);
      const back =
        view === "back"
          ? dataUrl.previewUrl
          : current.blankImageBackUrl ||
            (current.blankView === "back" ? current.blankImageUrl : undefined);
      return {
        ...current,
        blankView: view,
        blankImageUrl: dataUrl.previewUrl,
        blankImageFrontUrl: front,
        blankImageBackUrl: back,
        stageMode: "garment",
        updatedAt: new Date().toISOString(),
      };
    });
    setMessage(
      `${garmentBlankViewLabel(view)} product photo updated.`
    );
  };

  const handleArtUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP artwork file.");
      return;
    }
    setError(null);
    const dataUrl = await readImagePreviewDataUrl(file);
    if (!dataUrl.previewUrl) {
      setError("Could not read that artwork.");
      return;
    }
    const layer = createArtLayer(
      dataUrl.previewUrl,
      isColorStage ? defaultColorStageTransform() : defaultTransform(),
      file.name.replace(/\.[^.]+$/, "") || "Artwork"
    );
    const next = [...artLayers, layer];
    patchLayers(next);
    setSelectedLayerId(layer.id);
    setEditImageOpen(true);
  };

  const handleApplyArtworkEdit = (result: {
    cleanUrl: string;
    backgroundRemoved: boolean;
    detectedColors: DetectedArtworkColor[];
  }) => {
    if (!selectedLayer) return;
    const isOriginal = result.cleanUrl === selectedLayer.url;
    patchLayers(
      artLayers.map((layer) =>
        layer.id === selectedLayer.id
          ? {
              ...layer,
              cleanUrl: isOriginal ? undefined : result.cleanUrl,
              backgroundRemoved: result.backgroundRemoved && !isOriginal,
            }
          : layer
      )
    );
    const pmsNote = formatSelectedPmsForNotes(result.detectedColors);
    setDetectedColors(result.detectedColors);
    if (pmsNote) setDetectedPmsNote(pmsNote);
    setMessage(
      isOriginal
        ? "Using original artwork."
        : pmsNote
          ? `Artwork updated · ${pmsNote}`
          : "Artwork updated on the mockup."
    );
  };

  const handleSave = async () => {
    setBusy("Saving design…");
    setMessage(null);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const composed = await composeFullDesignPreview({
        blankImageUrl: mockup.blankImageUrl,
        blankColorHex: mockup.blankColorHex,
        stageMode: mockup.stageMode,
        layers: artLayers,
        fallbackTransform: mockup.transform,
      });
      setPreviewUrl(composed);

      const payloadMockup: OrderDesignMockup = {
        ...mockup,
        composedPreviewUrl: composed,
        locationKey: activeLocation?.locationKey,
        updatedAt: new Date().toISOString(),
      };
      const nextLocations = flushActiveMockup(payloadMockup, composed);
      const primary = syncPrimaryFromLocations(nextLocations, activeLocationId);
      const notesPatch =
        detectedPmsNote &&
        !(designProp.notes?.instructions || "").includes(detectedPmsNote)
          ? {
              notes: {
                ...(designProp.notes || {}),
                instructions: [
                  designProp.notes?.instructions?.trim(),
                  `Detected ink colors: ${detectedPmsNote}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            }
          : {};

      const { design: next } = await updateDesign(token, {
        designId: designProp.id,
        patch: {
          locations: nextLocations,
          locationKey: primary.locationKey,
          locationLabel: primary.locationLabel,
          designMockup: primary.designMockup,
          ...notesPatch,
        },
        changeSummary: "Studio mockup saved",
        author: "Shop",
      });
      upsertDesignStudioCache(next);
      onDesignChange?.(next);
      const normalized = normalizeDesignLocations(next);
      setLocations(normalized);
      const stillActive =
        normalized.find((loc) => loc.id === activeLocationId) || normalized[0];
      if (stillActive) {
        setActiveLocationId(stillActive.id);
        setMockup(
          seedMockupFromLocation(stillActive, blankFallbackFromDesign(next))
        );
      }
      setMessage("Design saved to your library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch">
      <aside
        className={cn(
          dashboardCardClass,
          "w-full shrink-0 overflow-y-auto overscroll-contain lg:max-h-full lg:w-[220px]"
        )}
      >
        <div className="border-b border-[#ebebeb] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#303030]">Locations</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Edit one at a time — add more if needed
          </p>
        </div>
        <div className="divide-y divide-[#ebebeb]">
          {locations.map((loc) => {
            const active = loc.id === activeLocationId;
            const hasMockup = Boolean(
              (loc.id === activeLocationId
                ? previewUrl || mockup.composedPreviewUrl
                : loc.designMockup?.composedPreviewUrl)
            );
            return (
              <div
                key={loc.id}
                className={cn(
                  "flex items-start gap-1 px-2 py-1",
                  active ? "bg-[#f4f7fd]" : "bg-white"
                )}
              >
                <button
                  type="button"
                  onClick={() => switchLocation(loc.id)}
                  className="min-w-0 flex-1 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#fafafa]"
                >
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {loc.locationLabel}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
                    {hasMockup ? "Mockup ready" : "Needs artwork"}
                  </p>
                </button>
                {hasMockup ? (
                  <span className="mt-2 inline-flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-3" />
                  </span>
                ) : null}
                <button
                  type="button"
                  title="Remove location"
                  disabled={locations.length <= 1 || Boolean(busy)}
                  onClick={() => handleDeleteLocation(loc.id)}
                  className="mt-1.5 rounded-md p-1.5 text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#b42318] disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-[#ebebeb] p-3">
          {addingLocation ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Add location
              </p>
              {addableLocations.length === 0 ? (
                <p className="text-[12px] text-[#8a8a8a]">
                  All shop locations are already on this design.
                </p>
              ) : (
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {addableLocations.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleAddLocation(option.value)}
                      className="rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-[#303030] hover:bg-[#f4f7fd]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-8 w-full text-[12px]")}
                onClick={() => setAddingLocation(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9 w-full text-[12px]")}
              disabled={Boolean(busy)}
              onClick={() => setAddingLocation(true)}
            >
              <Plus className="size-3.5" />
              Add location
            </Button>
          )}
        </div>
      </aside>

      <section
        className={cn(dashboardCardClass, "flex min-w-0 flex-1 flex-col overflow-hidden")}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              {activeLocation?.locationLabel || "Location"}
            </p>
            <p className={dashboardTaskDetailClass}>
              Place artwork on the blank, then save to your Design Studio library.
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            disabled={Boolean(busy)}
            onClick={() => void handleSave()}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Save design
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="flex flex-col items-center justify-center gap-3 border-b border-[#ebebeb] p-4 sm:p-6 lg:min-w-0 lg:flex-1 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
            <DesignStudioArtStage
              blankImageUrl={mockup.blankImageUrl}
              blankColorHex={mockup.blankColorHex}
              stageMode={mockup.stageMode}
              stageBg={stageBg}
              layers={artLayers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onChangeTransform={handleChangeLayerTransform}
            />
          </div>

          <div className="min-w-0 space-y-4 p-4 sm:p-5 lg:w-[320px] lg:shrink-0">
            {!isColorStage ? (
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Product photo
                </Label>
                <div
                  className="grid h-9 grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                  role="group"
                  aria-label="Blank garment view"
                >
                  {(["front", "back"] as GarmentBlankView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => switchBlankView(view)}
                      className={cn(
                        "rounded-md text-[12px] font-semibold transition-colors",
                        blankView === view
                          ? "bg-white text-[#303030] shadow-sm"
                          : "text-[#8a8a8a] hover:text-[#616161]"
                      )}
                    >
                      {garmentBlankViewLabel(view)}
                    </button>
                  ))}
                </div>
                <p className={dashboardTaskDetailClass}>
                  {activeViewBlankUrl
                    ? `Using ${garmentBlankViewLabel(blankView).toLowerCase()} garment photo for this location.`
                    : `No ${garmentBlankViewLabel(blankView).toLowerCase()} photo yet — upload one below.`}
                </p>
                <input
                  ref={blankInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    void handleBlankUpload(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    dashboardControlClass,
                    "h-9 w-full justify-center text-[12px]"
                  )}
                  onClick={() => blankInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {activeViewBlankUrl
                    ? `Replace ${garmentBlankViewLabel(blankView).toLowerCase()} photo`
                    : `Upload ${garmentBlankViewLabel(blankView).toLowerCase()} photo`}
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Artwork
              </Label>
              <input
                ref={artInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  void handleArtUpload(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-10 w-full justify-center"
                )}
                onClick={() => artInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {artLayers.length ? "Add artwork layer" : "Upload artwork"}
              </Button>
              {selectedLayer ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    dashboardControlClass,
                    "h-10 w-full justify-center"
                  )}
                  onClick={() => setEditImageOpen(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit image
                </Button>
              ) : null}
              {detectedPmsNote ? (
                <p className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[12px] text-[#616161]">
                  PMS selected:{" "}
                  <span className="font-medium text-[#303030]">
                    {detectedPmsNote}
                  </span>
                </p>
              ) : null}
            </div>

            <DesignStudioLayersPanel
              layers={layerRows}
              selectedId={selectedLayerId}
              onSelect={setSelectedLayerId}
              onDelete={(id) => {
                const next = artLayers.filter((layer) => layer.id !== id);
                patchLayers(next);
                if (selectedLayerId === id) {
                  setSelectedLayerId(next[next.length - 1]?.id ?? null);
                }
              }}
            />

            {busy ? (
              <p className="flex items-center gap-2 text-[13px] text-[#616161]">
                <Loader2 className="size-3.5 animate-spin" />
                {busy}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3 py-2 text-[13px] text-[#0d5c2e]">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {selectedLayer ? (
        <DesignStudioEditImageDialog
          open={editImageOpen}
          onOpenChange={setEditImageOpen}
          originalUrl={selectedLayer.url}
          workingUrl={activeLayerUrl(selectedLayer) || selectedLayer.url}
          fileLabel={selectedLayer.label}
          onApply={handleApplyArtworkEdit}
        />
      ) : null}
    </div>
  );
}
