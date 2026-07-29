"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import {
  DesignStudioLayersPanel,
  type DesignStudioLayerRow,
} from "@/components/design-studio/design-studio-layers-panel";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  compressStoreMockupDataUrl,
  isImageUpload,
  readImagePreviewDataUrl,
} from "@/lib/artwork-preview";
import type {
  ClientStoreColorVariant,
  ClientStoreDesignArtLayer,
  ClientStoreDesignTransform,
  ClientStoreProductDesign,
} from "@/lib/client-stores";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  activeLayerUrl,
  artLayersCacheFingerprint,
  artLayersForCompose,
  createArtLayer,
  normalizeArtLayers,
  syncPrimaryFromLayers,
  updateLayerTransform,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import {
  ArtworkLoadError,
  composeDesignMockup,
  defaultColorStageTransform,
  defaultTransform,
  removeImageBackground,
  transformFromPreset,
} from "@/lib/order-design-mockup";
import { getDesignPlacementPresets } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

type BlankView = "front" | "back";

const VIEW_SLOT: Record<BlankView, number> = { front: 0, back: 1 };

function resolveVariantHex(variant?: ClientStoreColorVariant | null): string {
  return variant?.colorHex?.trim() || "#9CA3AF";
}

function blankSourceFor(
  variant: ClientStoreColorVariant | undefined,
  slot: number
): string | undefined {
  if (!variant) return undefined;
  // Once the studio has decorated this variant, mockupUrls hold composed art —
  // always compose from the recorded pristine blank to avoid stacking artwork.
  if (Array.isArray(variant.blankMockupUrls)) {
    return variant.blankMockupUrls[slot]?.trim() || undefined;
  }
  return variant.mockupUrls?.[slot]?.trim() || undefined;
}

/**
 * Capture the pristine blank sources before mockups get overwritten with
 * composed art, so re-opening the studio never stacks artwork.
 */
function recordBlank(variant: ClientStoreColorVariant, slot: number): string[] {
  const hadBlanks = Array.isArray(variant.blankMockupUrls);
  const blanks = [...(variant.blankMockupUrls || [])];
  while (blanks.length <= slot) blanks.push("");
  if (!hadBlanks) {
    (variant.mockupUrls || []).forEach((url, index) => {
      if (!blanks[index]) blanks[index] = url || "";
    });
  }
  return blanks;
}

function setMockupSlot(urls: string[], slot: number, value: string): string[] {
  const next = [...(urls || [])];
  while (next.length <= slot) next.push("");
  next[slot] = value;
  return next;
}

function toStoreArtLayers(
  layers: DesignMockupArtLayer[]
): ClientStoreDesignArtLayer[] {
  return layers.map((layer) => ({
    id: layer.id,
    url: layer.url,
    cleanUrl: layer.cleanUrl,
    backgroundRemoved: layer.backgroundRemoved,
    transform: layer.transform,
    label: layer.label,
  }));
}

function initialDesign(
  design: ClientStoreProductDesign | undefined
): ClientStoreProductDesign {
  const artLayers = normalizeArtLayers(design);
  const primary = syncPrimaryFromLayers(artLayers);
  return {
    stageMode: design?.stageMode ?? "garment",
    blankView: design?.blankView ?? "front",
    ...design,
    artLayers: toStoreArtLayers(artLayers),
    transform: primary.transform ?? design?.transform ?? defaultTransform(),
    artworkUrl: primary.artworkUrl,
    artworkCleanUrl: primary.artworkCleanUrl,
    backgroundRemoved: primary.backgroundRemoved,
  };
}

function designWithLayers(
  design: ClientStoreProductDesign,
  layers: DesignMockupArtLayer[],
  patch: Partial<ClientStoreProductDesign> = {}
): ClientStoreProductDesign {
  const primary = syncPrimaryFromLayers(layers);
  return {
    ...design,
    ...patch,
    artLayers: toStoreArtLayers(layers),
    artworkUrl: primary.artworkUrl,
    artworkCleanUrl: primary.artworkCleanUrl,
    backgroundRemoved: primary.backgroundRemoved,
    transform: primary.transform,
    updatedAt: new Date().toISOString(),
  };
}

export function StoreProductDesignStudio({
  variants,
  design: designProp,
  onVariantsChange,
  onDesignChange,
  onError,
}: {
  variants: ClientStoreColorVariant[];
  design?: ClientStoreProductDesign;
  onVariantsChange: (next: ClientStoreColorVariant[]) => void;
  onDesignChange: (next: ClientStoreProductDesign) => void;
  onError: (message: string | null) => void;
}) {
  const { settings } = useShopSettings();
  const placements = useMemo(
    () => getDesignPlacementPresets(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const enabledVariants = useMemo(
    () => variants.filter((variant) => variant.enabled !== false && variant.name),
    [variants]
  );

  const [design, setDesign] = useState<ClientStoreProductDesign>(() =>
    initialDesign(designProp)
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => {
    const layers = normalizeArtLayers(designProp);
    return layers[layers.length - 1]?.id ?? null;
  });
  const [activeVariantId, setActiveVariantId] = useState(
    enabledVariants[0]?.id || ""
  );
  const [blankView, setBlankView] = useState<BlankView>(
    designProp?.blankView === "back" ? "back" : "front"
  );
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [composing, setComposing] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const artInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const artLayers = normalizeArtLayers(design);
  const selectedLayer =
    artLayers.find((layer) => layer.id === selectedLayerId) ??
    artLayers[artLayers.length - 1];
  const transform =
    selectedLayer?.transform ?? design.transform ?? defaultTransform();
  const composeLayers = artLayersForCompose(artLayers);
  const hasArtwork = composeLayers.length > 0;
  const artLayersKey = artLayersCacheFingerprint(artLayers);
  const activeArtUrl = activeLayerUrl(selectedLayer);

  const activeVariant =
    enabledVariants.find((variant) => variant.id === activeVariantId) ||
    enabledVariants[0];
  const slot = VIEW_SLOT[blankView];
  const isColorStage = design.stageMode === "color";
  const activePreset =
    placements.find((entry) => entry.id === design.placementPresetId) ||
    placements[0];
  const blankColorHex = resolveVariantHex(activeVariant);
  const blankSource = blankSourceFor(activeVariant, slot);

  const layerRows: DesignStudioLayerRow[] = [
    {
      id: "blank-base",
      kind: "blank",
      label: activeVariant?.name || "Blank",
      detail: isColorStage ? "Color backdrop" : `${blankView} garment`,
      thumbUrl: isColorStage ? undefined : blankSource,
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

  useEffect(() => {
    if (!activeVariant && enabledVariants[0]) {
      setActiveVariantId(enabledVariants[0].id);
    }
  }, [activeVariant, enabledVariants]);

  const commitDesign = (next: ClientStoreProductDesign) => {
    setDesign(next);
    onDesignChange(next);
  };

  const patchDesign = (
    patch: Partial<ClientStoreProductDesign>,
    commit = true
  ) => {
    setDesign((prev) => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      if (commit) onDesignChange(next);
      return next;
    });
  };

  const patchLayers = (
    layers: DesignMockupArtLayer[],
    patch: Partial<ClientStoreProductDesign> = {},
    commit = true
  ) => {
    setDesign((prev) => {
      const next = designWithLayers(prev, layers, patch);
      if (commit) onDesignChange(next);
      return next;
    });
  };

  const patchSelectedTransform = (
    patch: Partial<ClientStoreDesignTransform>,
    commit = true
  ) => {
    if (!selectedLayer) return;
    const nextLayers = updateLayerTransform(
      artLayers,
      selectedLayer.id,
      patch
    );
    patchLayers(nextLayers, {}, commit);
  };

  // Recompose the live preview whenever the design or active garment changes.
  useEffect(() => {
    let cancelled = false;
    setComposing(true);
    void (async () => {
      try {
        const composed = await composeDesignMockup({
          blankImageUrl: isColorStage ? undefined : blankSource,
          blankColorHex,
          stageMode: design.stageMode === "color" ? "color" : "garment",
          applyColorOverlay: false,
          artworkUrl: activeArtUrl,
          transform,
          artworkLayers: artLayersForCompose(artLayers),
        });
        if (!cancelled) setPreviewUrl(composed);
      } catch (err) {
        if (!cancelled && err instanceof ArtworkLoadError) {
          onError(
            "Could not load this artwork. Re-upload it to keep editing."
          );
        }
      } finally {
        if (!cancelled) setComposing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeVariantId,
    blankView,
    blankSource,
    blankColorHex,
    isColorStage,
    design.stageMode,
    activeArtUrl,
    transform.x,
    transform.y,
    transform.scale,
    artLayersKey,
  ]);

  const handleArtUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      onError("Upload a PNG, JPG, or WebP artwork file.");
      return;
    }
    setBusy("Reading artwork…");
    onError(null);
    try {
      const { previewUrl: art, error } = await readImagePreviewDataUrl(file);
      if (error || !art) {
        onError(error || "Could not read that artwork.");
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
      const nextLayers = [...artLayers, layer];
      commitDesign(designWithLayers(design, nextLayers));
      setSelectedLayerId(layer.id);
      setMessage(
        "Artwork layer added. Select it in Layers to move or delete it, then save."
      );
    } catch {
      onError("Could not upload that artwork.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedLayer) return;
    setBusy("Removing background…");
    onError(null);
    try {
      const cleaned = await removeImageBackground(selectedLayer.url);
      const nextLayers = artLayers.map((layer) =>
        layer.id === selectedLayer.id
          ? {
              ...layer,
              cleanUrl: cleaned,
              backgroundRemoved: true,
            }
          : layer
      );
      commitDesign(designWithLayers(design, nextLayers));
      setMessage("Background removed — art sits cleanly on the garment.");
    } catch {
      onError("Could not remove the background.");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    const nextLayers = artLayers.filter((layer) => layer.id !== layerId);
    const nextSelected =
      selectedLayerId === layerId
        ? (nextLayers[nextLayers.length - 1]?.id ?? null)
        : selectedLayerId;
    commitDesign(designWithLayers(design, nextLayers));
    setSelectedLayerId(nextSelected);
    setMessage("Artwork layer removed.");
  };

  const applyPreset = (presetId: string) => {
    const preset = placements.find((entry) => entry.id === presetId);
    patchDesign({
      placementPresetId: presetId,
    });
    if (preset && !isColorStage) {
      patchSelectedTransform(transformFromPreset(preset));
    }
  };

  const switchStageMode = (mode: "garment" | "color") => {
    if (mode === (design.stageMode || "garment")) return;
    patchDesign({ stageMode: mode });
    if (mode === "color" && !hasArtwork) {
      patchSelectedTransform(defaultColorStageTransform());
    } else if (mode === "garment" && activePreset && !hasArtwork) {
      patchSelectedTransform(transformFromPreset(activePreset));
    }
  };

  const switchBlankView = (view: BlankView) => {
    if (view === blankView) return;
    setBlankView(view);
    patchDesign({ blankView: view });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeArtUrl || !selectedLayer) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !selectedLayer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.startX) / rect.width;
    const dy = (event.clientY - dragRef.current.startY) / rect.height;
    patchSelectedTransform(
      {
        x: Math.max(0.08, Math.min(0.92, dragRef.current.originX + dx)),
        y: Math.max(0.08, Math.min(0.92, dragRef.current.originY + dy)),
      },
      false
    );
  };

  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      setDesign((prev) => {
        onDesignChange({ ...prev, updatedAt: new Date().toISOString() });
        return prev;
      });
    }
  };

  const composeForVariant = async (
    variant: ClientStoreColorVariant
  ): Promise<string> => {
    const composed = await composeDesignMockup({
      blankImageUrl: isColorStage ? undefined : blankSourceFor(variant, slot),
      blankColorHex: resolveVariantHex(variant),
      stageMode: design.stageMode === "color" ? "color" : "garment",
      applyColorOverlay: false,
      artworkUrl: activeArtUrl,
      transform,
      artworkLayers: artLayersForCompose(artLayers),
    });
    return compressStoreMockupDataUrl(composed);
  };

  const applyToVariant = async (variant: ClientStoreColorVariant) => {
    const composed = await composeForVariant(variant);
    return {
      ...variant,
      blankMockupUrls: recordBlank(variant, slot),
      mockupUrls: setMockupSlot(variant.mockupUrls || [], slot, composed),
    };
  };

  const handleSaveActive = async () => {
    if (!activeVariant) return;
    if (!hasArtwork) {
      onError("Upload artwork before saving.");
      return;
    }
    setBusy("Saving mockup…");
    onError(null);
    setMessage(null);
    try {
      const updated = await applyToVariant(activeVariant);
      onVariantsChange(
        variants.map((variant) =>
          variant.id === activeVariant.id ? updated : variant
        )
      );
      setMessage(`Saved the ${blankView} mockup for ${activeVariant.name}.`);
    } catch {
      onError("Could not save this mockup.");
    } finally {
      setBusy(null);
    }
  };

  const handleApplyAll = async () => {
    if (!hasArtwork) {
      onError("Upload artwork before applying.");
      return;
    }
    setBusy("Applying to all colors…");
    onError(null);
    setMessage(null);
    try {
      const enabledIds = new Set(enabledVariants.map((variant) => variant.id));
      const updates = new Map<string, ClientStoreColorVariant>();
      for (const variant of enabledVariants) {
        updates.set(variant.id, await applyToVariant(variant));
      }
      onVariantsChange(
        variants.map((variant) =>
          enabledIds.has(variant.id)
            ? updates.get(variant.id) || variant
            : variant
        )
      );
      setMessage(
        `Applied to ${enabledVariants.length} color${
          enabledVariants.length === 1 ? "" : "s"
        } on the ${blankView}.`
      );
    } catch {
      onError("Could not apply to all colors.");
    } finally {
      setBusy(null);
    }
  };

  if (enabledVariants.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="text-[13px] font-medium text-[#303030]">
            No colors to design yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-md", dashboardTaskDetailClass)}>
            Add at least one color on this product first to open Design studio.
            Each color gets its own decorated mockup here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className={cn(dashboardCardClass, "h-fit overflow-hidden")}>
        <div className="border-b border-[#ebebeb] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#303030]">Colors</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Build a mockup per color
          </p>
        </div>
        <div className="max-h-[420px] divide-y divide-[#ebebeb] overflow-y-auto">
          {enabledVariants.map((variant) => {
            const active = variant.id === activeVariant?.id;
            const hasArt = (variant.mockupUrls || []).some(Boolean);
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setActiveVariantId(variant.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors",
                  active ? "bg-[#f4f7fd]" : "bg-white hover:bg-[#fafafa]"
                )}
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-[#d4d4d4]"
                  style={{ backgroundColor: variant.colorHex || "#e5e5e5" }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#303030]">
                  {variant.name}
                </span>
                {hasArt ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div>
            <h2 className={dashboardTaskTitleClass}>
              {activeVariant?.name || "Design"}
            </h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Place artwork on the blank, then save it to your colors.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              disabled={Boolean(busy) || !hasArtwork}
              onClick={() => void handleSaveActive()}
            >
              {busy === "Saving mockup…" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Save this color
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={Boolean(busy) || !hasArtwork}
              onClick={() => void handleApplyAll()}
            >
              {busy === "Applying to all colors…" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Apply to all colors
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-5">
          <div>
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "relative aspect-square overflow-hidden rounded-xl",
                composing ? "pointer-events-none" : null
              )}
              style={
                !composing
                  ? { backgroundColor: isColorStage ? blankColorHex : undefined }
                  : undefined
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {previewUrl && !composing ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Product mockup preview"
                  className="size-full object-contain"
                  draggable={false}
                />
              ) : null}

              {composing ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#f7f7f8]/90">
                  <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
                  <p className="text-[13px] font-medium text-[#616161]">
                    Preparing mockup…
                  </p>
                </div>
              ) : null}

              {!composing && activeArtUrl ? (
                <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#616161]">
                  Drag artwork to reposition
                </p>
              ) : null}
            </div>
            <div className="mt-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Art size
              </Label>
              <input
                type="range"
                min={0.08}
                max={0.7}
                step={0.01}
                value={transform.scale}
                disabled={!selectedLayer}
                onChange={(event) =>
                  patchSelectedTransform({ scale: Number(event.target.value) })
                }
                className="mt-2 w-full accent-[#2c6ecb]"
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

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Backdrop
              </Label>
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
                      (design.stageMode || "garment") === mode
                        ? "bg-white text-[#303030] shadow-sm"
                        : "text-[#8a8a8a] hover:text-[#616161]"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className={dashboardTaskDetailClass}>
                {isColorStage
                  ? "Solid backdrop uses the color’s swatch — good for neck labels."
                  : "Place artwork on the color’s blank mockup photo."}
              </p>
            </div>

            {!isColorStage ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  View
                </Label>
                <div
                  className="grid h-10 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                  role="group"
                  aria-label="Garment view"
                >
                  {(["front", "back"] as BlankView[]).map((view) => (
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
                <p className={dashboardTaskDetailClass}>
                  Front saves to the first mockup slot, back to the second.
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Placement
              </Label>
              <Select
                value={activePreset?.id}
                onValueChange={(value) => {
                  if (value) applyPreset(value);
                }}
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
                >
                  <SelectValue>
                    {activePreset?.label ?? "Select placement"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {placements.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                      {entry.maxPrintWidthIn ? ` · ${entry.maxPrintWidthIn}"` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={dashboardTaskDetailClass}>
                Defaults come from Settings → Design placements.
              </p>
            </div>

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
                className={cn(dashboardPrimaryButtonClass, "h-10 w-full justify-center")}
                onClick={() => artInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {hasArtwork ? "Add artwork layer" : "Upload artwork"}
              </Button>
              {selectedLayer ? (
                <div className="space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
                  <p className="text-[12px] text-[#616161]">
                    Remove the background so only the design sits on the garment?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(dashboardControlClass, "h-8")}
                      disabled={Boolean(busy)}
                      onClick={() => void handleRemoveBackground()}
                    >
                      <Wand2 className="size-3.5" />
                      Remove background
                    </Button>
                    {selectedLayer.backgroundRemoved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          const nextLayers = artLayers.map((layer) =>
                            layer.id === selectedLayer.id
                              ? { ...layer, backgroundRemoved: false }
                              : layer
                          );
                          commitDesign(designWithLayers(design, nextLayers));
                        }}
                      >
                        Use original
                      </Button>
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
            {message ? (
              <p className="rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3 py-2 text-[13px] text-[#0d5c2e]">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
