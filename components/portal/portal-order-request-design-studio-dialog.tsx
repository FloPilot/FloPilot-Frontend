"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import { DesignStudioBlankRequired } from "@/components/design-studio/design-studio-blank-required";
import {
  DesignStudioLayersPanel,
  type DesignStudioLayerRow,
} from "@/components/design-studio/design-studio-layers-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  compressStoreMockupDataUrl,
  isImageUpload,
  readImagePreviewDataUrl,
} from "@/lib/artwork-preview";
import {
  activeLayerUrl,
  artLayersForCompose,
  createArtLayer,
  updateLayerTransform,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import { createDraftId } from "@/lib/order-requests";
import type {
  OrderRequestDraftEvent,
  OrderRequestDraftLineItem,
} from "@/lib/order-requests";
import {
  composeDesignMockup,
  defaultColorStageTransform,
  defaultStageMode,
  defaultTransform,
  garmentBlankViewLabel,
  normalizeGarmentBlankView,
  removeImageBackground,
  resolveBlankColorHex,
  resolveGarmentBlankView,
  transformFromPreset,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import { formatPrintDimensions } from "@/lib/imprint-design";
import {
  getDesignPlacementPresets,
  type DesignPlacementPreset,
} from "@/lib/shop-settings";
import type { DesignMockupStageMode, DesignMockupTransform } from "@/types";
import { cn } from "@/lib/utils";

type StudioBlank = {
  id: string;
  label: string;
  previewUrl?: string;
  color: string;
  colorHex: string;
};

function blankLabel(item: OrderRequestDraftLineItem, index: number) {
  const parts = [item.brand, item.productName, item.color]
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : `Blank ${index + 1}`;
}

function toStudioBlanks(lineItems: OrderRequestDraftLineItem[]): StudioBlank[] {
  return lineItems.map((item, index) => ({
    id: item.id,
    label: blankLabel(item, index),
    previewUrl: item.previewUrl?.trim() || undefined,
    color: item.color || "",
    colorHex: resolveBlankColorHex({
      color: item.color,
      colorKey: item.colorCode || undefined,
    } as never),
  }));
}

export function PortalOrderRequestDesignStudioDialog({
  open,
  onOpenChange,
  event,
  eventTitle,
  lineItems,
  accent,
  placementPresets,
  onSave,
  onRequestAddBlank,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: OrderRequestDraftEvent | null;
  eventTitle: string;
  lineItems: OrderRequestDraftLineItem[];
  accent: string;
  placementPresets?: DesignPlacementPreset[] | null;
  onSave: (result: {
    id: string;
    name: string;
    previewUrl: string;
    suggestedPrintSize?: string;
    blankView?: GarmentBlankView;
  }) => void;
  onRequestAddBlank?: () => void;
}) {
  const placements = useMemo(
    () =>
      getDesignPlacementPresets(
        placementPresets?.length
          ? { designPlacementPresets: placementPresets }
          : null
      ),
    [placementPresets]
  );

  const blanks = useMemo(() => toStudioBlanks(lineItems), [lineItems]);

  const preferredBlankId =
    event?.lineItemIds?.find((id) => blanks.some((blank) => blank.id === id)) ||
    blanks[0]?.id ||
    "";

  const [blankId, setBlankId] = useState(preferredBlankId);
  const activeBlank =
    blanks.find((blank) => blank.id === blankId) || blanks[0] || null;

  const locationKey = event?.locationKey || "";
  const matchingPreset =
    placements.find((entry) => entry.locationKey === locationKey) ||
    placements[0];

  const [placementId, setPlacementId] = useState(matchingPreset?.id || "");
  const activePreset =
    placements.find((entry) => entry.id === placementId) || matchingPreset;

  const [stageMode, setStageMode] = useState<DesignMockupStageMode>(() =>
    defaultStageMode(locationKey)
  );
  const isColorStage = stageMode === "color";
  const [blankView, setBlankView] = useState<GarmentBlankView>(() =>
    resolveGarmentBlankView(locationKey)
  );

  const [blankImageUrl, setBlankImageUrl] = useState<string | undefined>(
    undefined
  );
  const [blankImagesByView, setBlankImagesByView] = useState<
    Partial<Record<GarmentBlankView, string>>
  >({});
  const [artLayers, setArtLayers] = useState<DesignMockupArtLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const selectedLayer =
    artLayers.find((layer) => layer.id === selectedLayerId) ??
    artLayers[artLayers.length - 1];
  const transform =
    selectedLayer?.transform ??
    (isColorStage
      ? defaultColorStageTransform()
      : activePreset
        ? transformFromPreset(activePreset)
        : defaultTransform());
  const activeArtUrl = activeLayerUrl(selectedLayer);
  const composeLayers = artLayersForCompose(artLayers);
  const hasArtwork = composeLayers.length > 0;

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const artInputRef = useRef<HTMLInputElement>(null);
  const blankInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  const blankColorHex = activeBlank?.colorHex || "#9CA3AF";
  const viewBlankUrl = blankImagesByView[blankView];
  const effectiveBlankUrl = isColorStage
    ? undefined
    : viewBlankUrl || blankImageUrl || activeBlank?.previewUrl;

  const patchSelectedTransform = (
    patch:
      | Partial<DesignMockupTransform>
      | ((current: DesignMockupTransform) => DesignMockupTransform)
  ) => {
    if (!selectedLayer) return;
    setArtLayers((layers) => {
      const current = layers.find((layer) => layer.id === selectedLayer.id);
      if (!current) return layers;
      const nextTransform =
        typeof patch === "function"
          ? patch(current.transform)
          : { ...current.transform, ...patch };
      return updateLayerTransform(layers, selectedLayer.id, nextTransform);
    });
  };

  const layerRows: DesignStudioLayerRow[] = [
    {
      id: "blank-base",
      kind: "blank",
      label: activeBlank?.label || "Blank",
      detail: isColorStage
        ? "Color backdrop"
        : `${garmentBlankViewLabel(blankView)} garment`,
      thumbUrl: isColorStage ? undefined : effectiveBlankUrl,
      thumbColor: blankColorHex,
      locked: true,
    },
    ...artLayers.map((layer, index) => ({
      id: layer.id,
      kind: "artwork" as const,
      label: layer.label || `Artwork ${index + 1}`,
      detail: layer.backgroundRemoved ? "Background removed" : "Artwork layer",
      thumbUrl: activeLayerUrl(layer),
    })),
  ];

  // Reset studio state when opening for a different event.
  useEffect(() => {
    if (!open || !event) return;
    const key = event.id;
    if (sessionKeyRef.current === key) return;
    sessionKeyRef.current = key;

    const nextBlankId =
      event.lineItemIds?.find((id) =>
        blanks.some((blank) => blank.id === id)
      ) ||
      blanks[0]?.id ||
      "";
    const nextBlank =
      blanks.find((blank) => blank.id === nextBlankId) || blanks[0] || null;
    const nextPreset =
      placements.find((entry) => entry.locationKey === event.locationKey) ||
      placements[0];
    const nextStage = defaultStageMode(event.locationKey);
    const nextView = resolveGarmentBlankView(event.locationKey);

    setBlankId(nextBlankId);
    setBlankImageUrl(nextBlank?.previewUrl);
    setBlankImagesByView(
      nextBlank?.previewUrl ? { [nextView]: nextBlank.previewUrl } : {}
    );
    setBlankView(nextView);
    setPlacementId(nextPreset?.id || "");
    setStageMode(nextStage);
    setArtLayers([]);
    setSelectedLayerId(null);
    setError(null);
    setMessage(null);
    setBusy(null);
    setIsDragging(false);
  }, [open, event, blanks, placements]);

  useEffect(() => {
    if (!open) {
      sessionKeyRef.current = null;
    }
  }, [open]);

  // Keep default blank image in sync when switching garments.
  useEffect(() => {
    if (!open) return;
    if (isColorStage) return;
    const preview = activeBlank?.previewUrl;
    if (!preview) return;
    setBlankImageUrl(preview);
    setBlankImagesByView((prev) =>
      prev[blankView] ? prev : { ...prev, [blankView]: preview }
    );
  }, [open, activeBlank?.id, activeBlank?.previewUrl, isColorStage, blankView]);

  const handleArtUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP artwork file.");
      return;
    }
    setBusy("Reading artwork…");
    setError(null);
    try {
      const { previewUrl: art, error: readError } =
        await readImagePreviewDataUrl(file);
      if (readError || !art) {
        setError(readError || "Could not read that artwork.");
        return;
      }
      const baseTransform = isColorStage
        ? defaultColorStageTransform()
        : activePreset
          ? transformFromPreset(activePreset)
          : defaultTransform();
      const layer = createArtLayer(
        art,
        baseTransform,
        `Artwork ${artLayers.length + 1}`
      );
      setArtLayers((current) => [...current, layer]);
      setSelectedLayerId(layer.id);
      setMessage(
        "Artwork layer added. Select it in Layers to move or delete it, then save."
      );
    } catch {
      setError("Could not upload that artwork.");
    } finally {
      setBusy(null);
    }
  };

  const handleBlankUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP blank photo.");
      return;
    }
    setBusy("Reading blank…");
    setError(null);
    try {
      const { previewUrl: blank, error: readError } =
        await readImagePreviewDataUrl(file);
      if (readError || !blank) {
        setError(readError || "Could not read that blank photo.");
        return;
      }
      setBlankImageUrl(blank);
      setBlankImagesByView((prev) => ({ ...prev, [blankView]: blank }));
      setStageMode("garment");
      setMessage(
        `${garmentBlankViewLabel(blankView)} blank photo added. Place your artwork on it.`
      );
    } catch {
      setError("Could not upload that blank photo.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedLayer) return;
    setBusy("Removing background…");
    setError(null);
    try {
      const cleaned = await removeImageBackground(selectedLayer.url);
      setArtLayers((layers) =>
        layers.map((layer) =>
          layer.id === selectedLayer.id
            ? {
                ...layer,
                cleanUrl: cleaned,
                backgroundRemoved: true,
              }
            : layer
        )
      );
      setMessage("Background removed — art sits cleanly on the garment.");
    } catch {
      setError("Could not remove the background.");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    setArtLayers((layers) => {
      const next = layers.filter((layer) => layer.id !== layerId);
      const nextSelected =
        selectedLayerId === layerId
          ? (next[next.length - 1]?.id ?? null)
          : selectedLayerId;
      setSelectedLayerId(nextSelected);
      return next;
    });
    setMessage("Artwork layer removed.");
  };

  const applyPreset = (presetId: string) => {
    const preset = placements.find((entry) => entry.id === presetId);
    setPlacementId(presetId);
    if (preset && !isColorStage) {
      patchSelectedTransform(transformFromPreset(preset));
    }
  };

  const switchStageMode = (mode: DesignMockupStageMode) => {
    if (mode === stageMode) return;
    setStageMode(mode);
    if (mode === "color" && !hasArtwork) {
      patchSelectedTransform(defaultColorStageTransform());
    } else if (mode === "garment" && activePreset && !hasArtwork) {
      patchSelectedTransform(transformFromPreset(activePreset));
    }
  };

  const switchBlankView = (view: GarmentBlankView) => {
    if (view === blankView) return;
    setBlankView(normalizeGarmentBlankView(view));
  };

  const onPointerDown = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (!activeArtUrl || !selectedLayer) return;
    dragRef.current = {
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setIsDragging(true);
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const onPointerMove = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    const dx = (pointerEvent.clientX - dragRef.current.startX) / rect.width;
    const dy = (pointerEvent.clientY - dragRef.current.startY) / rect.height;
    patchSelectedTransform({
      x: Math.max(0.08, Math.min(0.92, dragRef.current.originX + dx)),
      y: Math.max(0.08, Math.min(0.92, dragRef.current.originY + dy)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!hasArtwork) {
      setError("Upload artwork before saving the mockup.");
      return;
    }
    setBusy("Saving mockup…");
    setError(null);
    try {
      const composed = await composeDesignMockup({
        blankImageUrl: effectiveBlankUrl,
        blankColorHex,
        stageMode: isColorStage ? "color" : "garment",
        applyColorOverlay: false,
        artworkUrl: activeArtUrl,
        transform,
        artworkLayers: artLayersForCompose(artLayers),
      });
      const compressed = await compressStoreMockupDataUrl(composed);
      const suggestedPrintSize =
        activePreset?.maxPrintWidthIn && activePreset?.maxPrintHeightIn
          ? formatPrintDimensions(
              activePreset.maxPrintWidthIn,
              activePreset.maxPrintHeightIn
            )
          : undefined;
      onSave({
        id: createDraftId("mockup"),
        name: `${eventTitle || "Event"} mockup.jpg`,
        previewUrl: compressed,
        suggestedPrintSize,
        blankView,
      });
      onOpenChange(false);
    } catch {
      setError("Could not save this mockup.");
    } finally {
      setBusy(null);
    }
  };

  const showBlankRequired = open && blanks.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(94vh,920px)] w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 pb-4 pt-5 sm:px-6">
          <DialogTitle className="text-lg font-semibold text-[#303030]">
            Design studio · {eventTitle || "Event"}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px] text-[#8a8a8a]">
            Upload artwork, place it on the blank, then attach the mockup to
            this event.
          </DialogDescription>
        </DialogHeader>

        {showBlankRequired ? (
          <DesignStudioBlankRequired
            embedded
            contextLabel="order request"
            addBlankLabel="Add a blank to this request"
            onAddBlank={() => {
              onRequestAddBlank?.();
              onOpenChange(false);
            }}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px] sm:p-5">
              <div>
                <div
                  className={cn(
                    "relative aspect-square touch-none overflow-hidden rounded-xl border border-[#ebebeb]",
                    activeArtUrl ? "cursor-grab" : null,
                    isDragging ? "cursor-grabbing" : null
                  )}
                  style={{
                    backgroundColor: isColorStage ? blankColorHex : "#f6f6f7",
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  {!isColorStage && effectiveBlankUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveBlankUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 size-full object-contain"
                      draggable={false}
                    />
                  ) : null}

                  {artLayers.map((layer) => {
                    const url = activeLayerUrl(layer);
                    if (!url) return null;
                    const isSelected = layer.id === selectedLayer?.id;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={layer.id}
                        src={url}
                        alt={layer.label || "Artwork"}
                        className={cn(
                          "pointer-events-none absolute max-h-none select-none",
                          isSelected ? "ring-2 ring-[#2c6ecb]" : null
                        )}
                        draggable={false}
                        style={{
                          left: `${layer.transform.x * 100}%`,
                          top: `${layer.transform.y * 100}%`,
                          width: `${layer.transform.scale * 100}%`,
                          height: "auto",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    );
                  })}

                  {!hasArtwork ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        Upload artwork to start
                      </p>
                      <p className="text-[12px] text-[#8a8a8a]">
                        Then drag and resize it on the blank
                      </p>
                    </div>
                  ) : null}

                  {activeArtUrl ? (
                    <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#616161]">
                      Drag artwork to reposition
                    </p>
                  ) : null}
                </div>

                <div className="mt-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Art size
                  </label>
                  <input
                    type="range"
                    min={0.08}
                    max={0.7}
                    step={0.01}
                    value={transform.scale}
                    disabled={!selectedLayer}
                    onChange={(e) =>
                      patchSelectedTransform({ scale: Number(e.target.value) })
                    }
                    className="mt-2 w-full"
                    style={{ accentColor: accent }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <DesignStudioLayersPanel
                  layers={layerRows}
                  selectedId={selectedLayerId}
                  onSelect={setSelectedLayerId}
                  onDelete={handleDeleteLayer}
                />

                {blanks.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Blank
                    </label>
                    <select
                      className="h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
                      value={activeBlank?.id || ""}
                      onChange={(e) => setBlankId(e.target.value)}
                    >
                      {blanks.map((blank) => (
                        <option key={blank.id} value={blank.id}>
                          {blank.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Backdrop
                  </label>
                  <div
                    className="grid h-10 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                    role="group"
                    aria-label="Mockup backdrop"
                  >
                    {(["garment", "color"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => switchStageMode(mode)}
                        className={cn(
                          "rounded-md text-[12px] font-semibold capitalize transition-colors",
                          stageMode === mode
                            ? "bg-white text-[#303030] shadow-sm"
                            : "text-[#8a8a8a] hover:text-[#616161]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {isColorStage
                      ? "Solid color backdrop — great for neck labels."
                      : "Place artwork on the garment blank photo."}
                  </p>
                </div>

                {!isColorStage ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      View
                    </label>
                    <div
                      className="grid h-10 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                      role="group"
                      aria-label="Garment view"
                    >
                      {(["front", "back"] as GarmentBlankView[]).map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => switchBlankView(view)}
                          className={cn(
                            "rounded-md text-[12px] font-semibold capitalize transition-colors",
                            blankView === view
                              ? "bg-white text-[#303030] shadow-sm"
                              : "text-[#8a8a8a] hover:text-[#616161]"
                          )}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] text-[#8a8a8a]">
                      Toggle front/back, then upload a blank photo for that view
                      if needed.
                    </p>
                  </div>
                ) : null}

                {!isColorStage ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Blank photo · {garmentBlankViewLabel(blankView)}
                    </label>
                    <input
                      ref={blankInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        void handleBlankUpload(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => blankInputRef.current?.click()}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
                    >
                      <Upload className="size-3.5" />
                      {effectiveBlankUrl
                        ? "Replace blank photo"
                        : "Upload blank photo"}
                    </button>
                    {!effectiveBlankUrl ? (
                      <p className="text-[12px] text-[#8a8a8a]">
                        No blank image yet — upload one, or switch to Color
                        backdrop.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {placements.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Placement
                    </label>
                    <select
                      className="h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
                      value={activePreset?.id || ""}
                      onChange={(e) => applyPreset(e.target.value)}
                      disabled={isColorStage}
                    >
                      {placements.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                          {entry.maxPrintWidthIn
                            ? ` · ${entry.maxPrintWidthIn}"`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Artwork
                  </label>
                  <input
                    ref={artInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleArtUpload(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => artInputRef.current?.click()}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <Upload className="size-3.5" />
                    {hasArtwork ? "Add artwork layer" : "Upload artwork"}
                  </button>
                  {selectedLayer ? (
                    <div className="space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
                      <p className="text-[12px] text-[#616161]">
                        Remove the background so only the design sits on the
                        garment?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => void handleRemoveBackground()}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7] disabled:opacity-60"
                        >
                          <Wand2 className="size-3.5" />
                          Remove background
                        </button>
                        {selectedLayer.backgroundRemoved ? (
                          <button
                            type="button"
                            onClick={() =>
                              setArtLayers((layers) =>
                                layers.map((layer) =>
                                  layer.id === selectedLayer.id
                                    ? {
                                        ...layer,
                                        backgroundRemoved: false,
                                      }
                                    : layer
                                )
                              )
                            }
                            className="inline-flex h-8 items-center px-2 text-[12px] font-medium text-[#616161] hover:text-[#303030]"
                          >
                            Use original
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                {busy ? (
                  <p className="flex items-center gap-2 text-[13px] text-[#616161]">
                    <Loader2 className="size-3.5 animate-spin" />
                    {busy}
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3 py-2 text-[13px] text-[#0d5c2e]">
                    {message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center rounded-lg border border-[#ebebeb] bg-white px-4 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
          >
            Cancel
          </button>
          {!showBlankRequired ? (
            <button
              type="button"
              disabled={Boolean(busy) || !hasArtwork}
              onClick={() => void handleSave()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {busy === "Saving mockup…" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Attach mockup to event
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
