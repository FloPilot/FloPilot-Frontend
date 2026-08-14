"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked,
  Check,
  Loader2,
  Pencil,
  Sparkles,
  Upload,
} from "lucide-react";
import { DesignStudioArtStage } from "@/components/design-studio/design-studio-art-stage";
import {
  DesignStudioEditImageDialog,
  formatSelectedPmsForNotes,
} from "@/components/design-studio/design-studio-edit-image-dialog";
import {
  DesignStudioLayersPanel,
  type DesignStudioLayerRow,
} from "@/components/design-studio/design-studio-layers-panel";
import { DesignStudioPickArtworkDialog } from "@/components/design-studio/design-studio-pick-artwork-dialog";
import { useAuth } from "@/components/providers/auth-provider";
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
import type { DetectedArtworkColor } from "@/lib/artwork-color-tools";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  activeLayerUrl,
  artLayersForCompose,
  createArtLayer,
  normalizeArtLayers,
  syncPrimaryFromLayers,
  updateLayerTransform,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import {
  composeDesignMockup,
  defaultColorStageTransform,
  defaultTransform,
  garmentBlankViewLabel,
  transformFromPreset,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import { getDesignPlacementPresets } from "@/lib/shop-settings";
import { upsertStoreDesignToLibrary } from "@/lib/store-design-library";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import { cn } from "@/lib/utils";

type BlankView = GarmentBlankView;

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
    transform: primary.transform || design.transform || defaultTransform(),
    updatedAt: new Date().toISOString(),
  };
}

export function StoreProductDesignStudio({
  variants,
  design: designProp,
  productName,
  onVariantsChange,
  onDesignChange,
  onError,
}: {
  variants: ClientStoreColorVariant[];
  design?: ClientStoreProductDesign;
  /** Used as the Design Studio library name when creating a new file. */
  productName?: string;
  onVariantsChange: (next: ClientStoreColorVariant[]) => void;
  onDesignChange: (next: ClientStoreProductDesign) => void;
  onError: (message: string | null) => void;
}) {
  const { getIdToken } = useAuth();
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
  const designRef = useRef(design);
  designRef.current = design;

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
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [pickArtworkOpen, setPickArtworkOpen] = useState(false);
  const [detectedPmsNote, setDetectedPmsNote] = useState<string | null>(null);

  const artInputRef = useRef<HTMLInputElement>(null);

  const artLayers = useMemo(() => normalizeArtLayers(design), [design]);
  const selectedLayer =
    artLayers.find((layer) => layer.id === selectedLayerId) ||
    artLayers[artLayers.length - 1] ||
    null;
  const hasArtwork = artLayersForCompose(artLayers).length > 0;

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
  const stageBg = useImageBackgroundColor(isColorStage ? null : blankSource);

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

  /** Never call parent setters inside a React state updater. */
  const commitDesign = (next: ClientStoreProductDesign) => {
    designRef.current = next;
    setDesign(next);
    onDesignChange(next);
  };

  const patchDesign = (patch: Partial<ClientStoreProductDesign>) => {
    commitDesign({
      ...designRef.current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const patchLayers = (
    layers: DesignMockupArtLayer[],
    patch: Partial<ClientStoreProductDesign> = {}
  ) => {
    commitDesign(designWithLayers(designRef.current, layers, patch));
  };

  const handleChangeLayerTransform = (
    layerId: string,
    partial: Partial<ClientStoreDesignTransform>
  ) => {
    const layer = artLayers.find((row) => row.id === layerId);
    if (!layer) return;
    patchLayers(
      updateLayerTransform(artLayers, layerId, {
        ...layer.transform,
        ...partial,
      })
    );
  };

  const handleArtUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      onError("Upload a PNG, JPG, or WebP artwork file.");
      return;
    }
    onError(null);
    const dataUrl = await readImagePreviewDataUrl(file);
    if (!dataUrl.previewUrl) {
      onError("Could not read that artwork.");
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
    setMessage(null);
  };

  const handlePickLibraryArtwork = (
    layers: DesignMockupArtLayer[],
    source: { name?: string }
  ) => {
    if (!layers.length) {
      onError("That library item has no artwork to add.");
      return;
    }
    const added = layers.map((layer, index) => {
      const created = createArtLayer(
        activeLayerUrl(layer) || layer.url,
        layer.transform ||
          (isColorStage ? defaultColorStageTransform() : defaultTransform()),
        layer.label || source.name || `Artwork ${artLayers.length + index + 1}`
      );
      return {
        ...created,
        url: layer.url || created.url,
        cleanUrl: layer.cleanUrl,
        backgroundRemoved: layer.backgroundRemoved,
      };
    });
    const next = [...artLayers, ...added];
    patchLayers(next);
    setSelectedLayerId(added[added.length - 1]?.id ?? null);
    setMessage(`Added artwork from “${source.name || "library"}”.`);
    onError(null);
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
    if (pmsNote) setDetectedPmsNote(pmsNote);
    setMessage(
      isOriginal
        ? "Using original artwork."
        : pmsNote
          ? `Artwork updated · ${pmsNote}`
          : "Artwork updated on the mockup."
    );
  };

  const handleDeleteLayer = (layerId: string) => {
    const next = artLayers.filter((layer) => layer.id !== layerId);
    patchLayers(next);
    if (selectedLayerId === layerId) {
      setSelectedLayerId(next[next.length - 1]?.id ?? null);
    }
    setMessage("Artwork layer removed.");
  };

  const applyPreset = (presetId: string) => {
    const preset = placements.find((entry) => entry.id === presetId);
    patchDesign({ placementPresetId: presetId });
    if (preset && !isColorStage && selectedLayer) {
      handleChangeLayerTransform(selectedLayer.id, transformFromPreset(preset));
    }
  };

  const switchStageMode = (mode: "garment" | "color") => {
    if (mode === (design.stageMode || "garment")) return;
    patchDesign({ stageMode: mode });
    if (selectedLayer) {
      if (mode === "color" && !hasArtwork) {
        handleChangeLayerTransform(
          selectedLayer.id,
          defaultColorStageTransform()
        );
      } else if (mode === "garment" && activePreset && !hasArtwork) {
        handleChangeLayerTransform(
          selectedLayer.id,
          transformFromPreset(activePreset)
        );
      }
    }
  };

  const switchBlankView = (view: BlankView) => {
    if (view === blankView) return;
    setBlankView(view);
    patchDesign({ blankView: view });
  };

  const composeForVariant = async (
    variant: ClientStoreColorVariant
  ): Promise<string> => {
    const selected = artLayers.find((layer) => layer.id === selectedLayerId);
    const transform =
      selected?.transform || design.transform || defaultTransform();
    const composed = await composeDesignMockup({
      blankImageUrl: isColorStage ? undefined : blankSourceFor(variant, slot),
      blankColorHex: resolveVariantHex(variant),
      stageMode: design.stageMode === "color" ? "color" : "garment",
      applyColorOverlay: false,
      artworkUrl: activeLayerUrl(selected) || design.artworkUrl,
      transform,
      artworkLayers: artLayersForCompose(artLayers),
    });
    return compressStoreMockupDataUrl(composed);
  };

  const applyToVariant = async (
    variant: ClientStoreColorVariant
  ): Promise<{ variant: ClientStoreColorVariant; composedPreviewUrl: string }> => {
    const composed = await composeForVariant(variant);
    return {
      composedPreviewUrl: composed,
      variant: {
        ...variant,
        blankMockupUrls: recordBlank(variant, slot),
        mockupUrls: setMockupSlot(variant.mockupUrls || [], slot, composed),
      },
    };
  };

  const syncToDesignLibrary = async (
    composedPreviewUrl?: string
  ): Promise<ClientStoreProductDesign> => {
    const token = await getIdToken();
    if (!token) throw new Error("Not signed in");
    const current = designRef.current;
    const front = blankSourceFor(activeVariant, 0);
    const back = blankSourceFor(activeVariant, 1);
    const { design: next } = await upsertStoreDesignToLibrary({
      token,
      design: current,
      productName,
      blankView,
      blankColorHex: resolveVariantHex(activeVariant),
      blankFrontUrl: front,
      blankBackUrl: back,
      composedPreviewUrl,
    });
    setDesign(next);
    onDesignChange(next);
    return next;
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
      const { variant: updated, composedPreviewUrl } =
        await applyToVariant(activeVariant);
      onVariantsChange(
        variants.map((variant) =>
          variant.id === activeVariant.id ? updated : variant
        )
      );
      try {
        await syncToDesignLibrary(composedPreviewUrl);
        setMessage(
          `Saved the ${blankView} mockup for ${activeVariant.name} and Design Studio.`
        );
      } catch (err) {
        setMessage(
          `Saved the ${blankView} mockup for ${activeVariant.name}.`
        );
        onError(
          err instanceof Error
            ? err.message
            : "Mockup saved, but Design Studio library update failed."
        );
      }
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
      let preview: string | undefined;
      for (const variant of enabledVariants) {
        const result = await applyToVariant(variant);
        updates.set(variant.id, result.variant);
        if (variant.id === activeVariant?.id || !preview) {
          preview = result.composedPreviewUrl;
        }
      }
      onVariantsChange(
        variants.map((variant) =>
          enabledIds.has(variant.id)
            ? updates.get(variant.id) || variant
            : variant
        )
      );
      try {
        await syncToDesignLibrary(preview);
        setMessage(
          `Applied to ${enabledVariants.length} color${
            enabledVariants.length === 1 ? "" : "s"
          } on the ${blankView} and saved to Design Studio.`
        );
      } catch (err) {
        setMessage(
          `Applied to ${enabledVariants.length} color${
            enabledVariants.length === 1 ? "" : "s"
          } on the ${blankView}.`
        );
        onError(
          err instanceof Error
            ? err.message
            : "Colors updated, but Design Studio library update failed."
        );
      }
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
              Same studio tools as Design Studio — place art, then save onto
              colors.
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

        <div className="flex flex-col lg:flex-row">
          <div className="flex flex-col items-center justify-center gap-3 border-b border-[#ebebeb] p-4 sm:p-6 lg:min-w-0 lg:flex-1 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
            <DesignStudioArtStage
              blankImageUrl={isColorStage ? undefined : blankSource}
              blankColorHex={blankColorHex}
              stageMode={isColorStage ? "color" : "garment"}
              stageBg={stageBg}
              layers={artLayers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onChangeTransform={handleChangeLayerTransform}
            />
          </div>

          <div className="min-w-0 space-y-4 p-4 sm:p-5 lg:w-[300px] lg:shrink-0">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Backdrop
              </Label>
              <div
                className="grid h-9 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
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
            </div>

            {!isColorStage ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  View
                </Label>
                <div
                  className="grid h-9 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                  role="group"
                  aria-label="Garment view"
                >
                  {(["front", "back"] as BlankView[]).map((view) => (
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
                  className={cn(
                    dashboardControlClass,
                    "h-10 w-full justify-between"
                  )}
                >
                  <SelectValue>
                    {activePreset?.label ?? "Select placement"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {placements.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                      {entry.maxPrintWidthIn
                        ? ` · ${entry.maxPrintWidthIn}"`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-10 w-full justify-center"
                )}
                onClick={() => artInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {hasArtwork ? "Add artwork layer" : "Upload artwork"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  dashboardControlClass,
                  "h-10 w-full justify-center"
                )}
                onClick={() => setPickArtworkOpen(true)}
              >
                <BookMarked className="size-3.5" />
                From artwork library
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
              onDelete={handleDeleteLayer}
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

      <DesignStudioPickArtworkDialog
        open={pickArtworkOpen}
        onOpenChange={setPickArtworkOpen}
        onPick={handlePickLibraryArtwork}
      />
    </div>
  );
}
