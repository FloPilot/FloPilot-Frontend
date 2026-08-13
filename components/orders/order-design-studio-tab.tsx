"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  Pencil,
  Redo2,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { DesignStudioBlankRequired } from "@/components/design-studio/design-studio-blank-required";
import { DesignStudioArtworkCleanup } from "@/components/design-studio/design-studio-artwork-cleanup";
import { DesignStudioEditImageDialog } from "@/components/design-studio/design-studio-edit-image-dialog";
import {
  DesignStudioLayersPanel,
  type DesignStudioLayerRow,
} from "@/components/design-studio/design-studio-layers-panel";
import {
  useRegisterUnsavedChanges,
  useStaffUnsavedChanges,
} from "@/components/layout/staff-unsaved-changes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isImageUpload, readImagePreviewDataUrl } from "@/lib/artwork-preview";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  formatPrintSpecLine,
  offsetBelowCollarInToY,
  printHeightFromWidth,
  printWidthInToScale,
  scaleToPrintWidthIn,
  yToOffsetBelowCollarIn,
} from "@/lib/design-studio-placement";
import {
  formatDetectedColorsForNotes,
  type DetectedArtworkColor,
} from "@/lib/artwork-color-tools";
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
  composedPreviewCacheKey,
  garmentFingerprint,
  isDesignMockupGarmentStale,
  looksLikeVendorImageUrl,
  readBlankCache,
  readComposedCache,
  resolveVendorBlankImage,
  supplierProviderForDesignBlank,
  writeBlankCache,
  writeComposedCache,
  type BlankCacheEntry,
} from "@/lib/order-design-blank-cache";
import {
  ArtworkLoadError,
  composeCleanProofSheet,
  composeDesignMockup,
  createDesignMockupId,
  defaultColorStageTransform,
  defaultStageMode,
  defaultTransform,
  garmentBlankViewLabel,
  listDesignableImprints,
  normalizeGarmentBlankView,
  resolveBlankColorHex,
  resolveGarmentBlankView,
  seedMockupFromExisting,
  transformFromPreset,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import { getDesignPlacementPresets } from "@/lib/shop-settings";
import { formatBrandProductName } from "@/lib/format-product-name";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type {
  DesignMockupStageMode,
  DesignMockupTransform,
  Job,
  JobImprint,
  LineItem,
  Order,
  OrderDesignMockup,
} from "@/types";
import { cn } from "@/lib/utils";

function formatBlankLabel(item: LineItem): string {
  return `${formatBrandProductName(item.brand, item.productName)} · ${item.color}`;
}

function imprintTitle(imprint: JobImprint): string {
  return imprint.customLabel?.trim() || imprint.label;
}

type DesignMockupSaveOptions = {
  attachToProof?: boolean;
  proofLabel?: string;
  proofPreviewUrl?: string;
};

export function OrderDesignStudioTab({
  order,
  onRequestAddBlank,
  onSave,
  persistBlankImages = true,
  canSave = true,
  messages,
  blankContextLabel = "order",
  addBlankLabel = "Add a blank to this order",
  initialImprintKey,
}: {
  order: Order;
  onRequestAddBlank?: () => void;
  onSave?: (
    orderId: string,
    jobId: string,
    imprintId: string,
    designMockup: OrderDesignMockup,
    options?: DesignMockupSaveOptions
  ) => Promise<Order | void>;
  /** When false, resolved vendor blank URLs stay local (order-request mode). */
  persistBlankImages?: boolean;
  canSave?: boolean;
  messages?: {
    saved?: string;
    attached?: string;
  };
  blankContextLabel?: string;
  addBlankLabel?: string;
  /** Prefer this imprint key (`jobId:imprintId`) when opening the studio. */
  initialImprintKey?: string;
}) {
  const { settings } = useShopSettings();
  const { updateImprintDesignMockup } = useSchedule();
  const { requestLeave } = useStaffUnsavedChanges();
  const saveHandler = onSave ?? updateImprintDesignMockup;
  const entries = useMemo(() => listDesignableImprints(order), [order]);
  const placements = useMemo(
    () => getDesignPlacementPresets(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    () =>
      (initialImprintKey &&
        entries.some((entry) => entry.key === initialImprintKey) &&
        initialImprintKey) ||
      entries[0]?.key ||
      null
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const seededInitialKeyRef = useRef(Boolean(initialImprintKey));
  const selected = entries.find((entry) => entry.key === selectedKey) ?? entries[0];

  useEffect(() => {
    if (
      !seededInitialKeyRef.current &&
      initialImprintKey &&
      entries.some((entry) => entry.key === initialImprintKey)
    ) {
      seededInitialKeyRef.current = true;
      setSelectedKey(initialImprintKey);
      return;
    }
    if (!entries.some((entry) => entry.key === selectedKey) && entries[0]) {
      setSelectedKey(entries[0].key);
    }
  }, [entries, initialImprintKey, selectedKey]);

  const selectLocation = (key: string) => {
    if (key === selectedKey) return;
    if (!requestLeave(undefined, { inPage: true })) return;
    setIsSwitching(true);
    setSelectedKey(key);
  };

  const handleEditorReady = useCallback(() => {
    setIsSwitching(false);
  }, []);

  const handleDiscardEditor = useCallback(() => {
    setEditorEpoch((value) => value + 1);
  }, []);

  if (order.lineItems.length === 0) {
    return (
      <DesignStudioBlankRequired
        contextLabel={blankContextLabel}
        addBlankLabel={addBlankLabel}
        onAddBlank={onRequestAddBlank}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="text-[13px] font-medium text-[#303030]">
            No decoration events yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-md", dashboardTaskDetailClass)}>
            Add events on the Events tab first — each location gets its own
            design mockup here.
          </p>
        </div>
      </section>
    );
  }

  if (!selected) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch">
      <aside
        className={cn(
          dashboardCardClass,
          "w-full shrink-0 overflow-y-auto overscroll-contain lg:max-h-full lg:w-[200px]"
        )}
      >
        <div className="border-b border-[#ebebeb] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#303030]">Locations</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Edit one at a time — click to switch
          </p>
        </div>
        <div className="divide-y divide-[#ebebeb]">
          {entries.map(({ job, imprint, key }) => {
            const active = key === selected.key;
            const hasMockup = Boolean(imprint.designMockup?.composedPreviewUrl);
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectLocation(key)}
                disabled={isSwitching && key !== selected.key}
                className={cn(
                  "flex w-full items-start gap-2 px-4 py-3 text-left transition-colors",
                  active ? "bg-[#f4f7fd]" : "bg-white hover:bg-[#fafafa]"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {imprintTitle(imprint)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
                    {job.name}
                  </p>
                </div>
                {hasMockup ? (
                  <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 transition-opacity duration-200 ease-out",
          isSwitching ? "opacity-60" : "opacity-100"
        )}
      >
        <DesignMockupEditor
          key={`${selected.key}-${editorEpoch}`}
          order={order}
          job={selected.job}
          imprint={selected.imprint}
          placements={placements}
          onSave={saveHandler}
          persistBlankImages={persistBlankImages}
          canSave={canSave}
          messages={messages}
          onReady={handleEditorReady}
          onDiscardRequest={handleDiscardEditor}
        />
      </div>
    </div>
  );
}

function DesignMockupEditor({
  order,
  job,
  imprint,
  placements,
  onSave,
  persistBlankImages = true,
  canSave = true,
  messages,
  onReady,
  onDiscardRequest,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  placements: ReturnType<typeof getDesignPlacementPresets>;
  onSave: (
    orderId: string,
    jobId: string,
    imprintId: string,
    designMockup: OrderDesignMockup,
    options?: DesignMockupSaveOptions
  ) => Promise<Order | void>;
  persistBlankImages?: boolean;
  canSave?: boolean;
  messages?: {
    saved?: string;
    attached?: string;
  };
  onReady?: () => void;
  onDiscardRequest?: () => void;
}) {
  const { getIdToken } = useAuth();
  const { updateOrderLineItem } = useSchedule();
  const blankOptions = order.lineItems;
  const preferredLineItemId =
    imprint.designMockup?.lineItemId ??
    job.lineItemIds?.[0] ??
    blankOptions[0]?.id;

  const [lineItemId, setLineItemId] = useState<string | undefined>(
    preferredLineItemId
  );
  const lineItem =
    blankOptions.find((item) => item.id === lineItemId) ?? blankOptions[0];

  const preset =
    placements.find((entry) => entry.locationKey === imprint.locationKey) ??
    placements[0];

  const [placementId, setPlacementId] = useState(
    imprint.designMockup?.placementPresetId ?? preset?.id
  );
  const activePreset =
    placements.find((entry) => entry.id === placementId) ?? preset;

  const [stageMode, setStageMode] = useState<DesignMockupStageMode>(
    imprint.designMockup?.stageMode ??
      defaultStageMode(imprint.locationKey || preset?.locationKey)
  );
  const isColorStage = stageMode === "color";

  const [blankView, setBlankView] = useState<GarmentBlankView>(() =>
    normalizeGarmentBlankView(
      imprint.designMockup?.blankView ??
        resolveGarmentBlankView(imprint.locationKey || preset?.locationKey)
    )
  );

  const [resolvedColorHex, setResolvedColorHex] = useState<string | undefined>(
    lineItem?.colorHex
  );
  const blankColorHex = resolveBlankColorHex(
    lineItem
      ? { ...lineItem, colorHex: resolvedColorHex ?? lineItem.colorHex }
      : undefined
  );
  const needsVendorResolve = Boolean(
    !isColorStage && lineItem && supplierProviderForDesignBlank(lineItem)
  );
  const savedMockupStale = isDesignMockupGarmentStale(
    imprint.designMockup,
    lineItem
  );
  const savedBlankImageUrl = savedMockupStale
    ? undefined
    : imprint.designMockup?.blankImageUrl;
  const savedComposedPreviewUrl = savedMockupStale
    ? undefined
    : imprint.designMockup?.composedPreviewUrl;
  const cachedBlank =
    !isColorStage && lineItem
      ? readBlankCache(order.id, lineItem, blankView)
      : undefined;

  /** Vendor color photos must not get the silhouette tint overlay. */
  const [blankIsVendorPhoto, setBlankIsVendorPhoto] = useState(
    cachedBlank?.vendor === true
  );
  const [blankImageUrl, setBlankImageUrl] = useState<string | undefined>(
    () =>
      isColorStage
        ? undefined
        : cachedBlank?.imageUrl ??
          savedBlankImageUrl ??
          (blankView === "front" ? lineItem?.imageUrl : undefined)
  );
  const [blankLoading, setBlankLoading] = useState(
    needsVendorResolve && !cachedBlank?.imageUrl
  );
  const [artLayers, setArtLayers] = useState<DesignMockupArtLayer[]>(() =>
    normalizeArtLayers(imprint.designMockup)
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => {
    const layers = normalizeArtLayers(imprint.designMockup);
    return layers[layers.length - 1]?.id ?? null;
  });
  const selectedLayer =
    artLayers.find((layer) => layer.id === selectedLayerId) ??
    artLayers[artLayers.length - 1];
  const transform =
    selectedLayer?.transform ??
    (imprint.designMockup?.stageMode === "color" ||
    (!imprint.designMockup?.transform &&
      defaultStageMode(imprint.locationKey || preset?.locationKey) === "color")
      ? defaultColorStageTransform()
      : activePreset
        ? transformFromPreset(activePreset)
        : defaultTransform());
  const primaryArt = syncPrimaryFromLayers(artLayers);
  const artworkUrl = primaryArt.artworkUrl;
  const activeArtUrlSeed = activeLayerUrl(selectedLayer) ?? artworkUrl;
  const composeLayers = artLayersForCompose(artLayers);
  const artLayersKey = artLayersCacheFingerprint(artLayers);
  const initialBlankForCompose = isColorStage
    ? undefined
    : cachedBlank?.imageUrl ??
      savedBlankImageUrl ??
      (blankView === "front" ? lineItem?.imageUrl : undefined);
  const initialComposedPreview =
    savedComposedPreviewUrl ??
    (initialBlankForCompose || isColorStage
      ? readComposedCache(
          composedPreviewCacheKey({
            orderId: order.id,
            lineItemId: lineItem?.id,
            blankView,
            stageMode,
            blankImageUrl: initialBlankForCompose,
            blankColorHex,
            artworkUrl: activeArtUrlSeed,
            transform: selectedLayer?.transform ?? transform,
            artLayersKey,
          })
        )
      : undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    () => initialComposedPreview
  );
  const [previewComposing, setPreviewComposing] = useState(
    !(
      isColorStage ||
      ((cachedBlank?.imageUrl || savedBlankImageUrl) && initialComposedPreview)
    )
  );
  /** First paint for this location — hide canvas until blank + compose settle. */
  const [stageReady, setStageReady] = useState(
    Boolean(
      isColorStage ||
        ((cachedBlank?.imageUrl || !needsVendorResolve) &&
          (initialComposedPreview || !needsVendorResolve))
    )
  );
  const [fadeIn, setFadeIn] = useState(() =>
    Boolean(
      initialComposedPreview &&
        (isColorStage || cachedBlank?.imageUrl || !needsVendorResolve)
    )
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** Explicit dirty flag — never inferred from snapshots (post-save URL sync breaks that). */
  const [userDirty, setUserDirty] = useState(false);
  const allowDirtyRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productionNotes, setProductionNotes] = useState(
    () => imprint.designMockup?.productionNotes ?? ""
  );
  const [artAspectRatio, setArtAspectRatio] = useState(1);
  const [historyPast, setHistoryPast] = useState<
    Array<{
      artLayers: DesignMockupArtLayer[];
      selectedLayerId: string | null;
      productionNotes: string;
    }>
  >([]);
  const [historyFuture, setHistoryFuture] = useState<
    Array<{
      artLayers: DesignMockupArtLayer[];
      selectedLayerId: string | null;
      productionNotes: string;
    }>
  >([]);
  const skippingHistoryRef = useRef(false);

  const markDirty = useCallback(() => {
    if (!allowDirtyRef.current || isSaving) return;
    setUserDirty(true);
  }, [isSaving]);

  const clearDirty = useCallback(() => {
    setUserDirty(false);
    // Ignore any sync/recompose side-effects for a couple frames after save/discard.
    allowDirtyRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        allowDirtyRef.current = true;
      });
    });
  }, []);

  // Don't treat auto blank/preview settle as edits.
  useEffect(() => {
    if (!stageReady || blankLoading || previewComposing) return;
    const timer = window.setTimeout(() => {
      allowDirtyRef.current = true;
    }, 450);
    return () => window.clearTimeout(timer);
  }, [stageReady, blankLoading, previewComposing]);

  const cloneArtLayers = (layers: DesignMockupArtLayer[]) =>
    JSON.parse(JSON.stringify(layers)) as DesignMockupArtLayer[];

  const pushDesignHistory = useCallback(() => {
    if (skippingHistoryRef.current) return;
    markDirty();
    setHistoryPast((past) =>
      [
        ...past,
        {
          artLayers: cloneArtLayers(artLayers),
          selectedLayerId,
          productionNotes,
        },
      ].slice(-40)
    );
    setHistoryFuture([]);
  }, [artLayers, selectedLayerId, productionNotes, markDirty]);

  const undoDesign = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    skippingHistoryRef.current = true;
    markDirty();
    setHistoryFuture((future) =>
      [
        {
          artLayers: cloneArtLayers(artLayers),
          selectedLayerId,
          productionNotes,
        },
        ...future,
      ].slice(0, 40)
    );
    setHistoryPast((past) => past.slice(0, -1));
    setArtLayers(previous.artLayers);
    setSelectedLayerId(previous.selectedLayerId);
    setProductionNotes(previous.productionNotes);
    setPreviewComposing(true);
    setFadeIn(false);
    setMessage("Undid last design change.");
    requestAnimationFrame(() => {
      skippingHistoryRef.current = false;
    });
  };

  const redoDesign = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    skippingHistoryRef.current = true;
    markDirty();
    setHistoryPast((past) =>
      [
        ...past,
        {
          artLayers: cloneArtLayers(artLayers),
          selectedLayerId,
          productionNotes,
        },
      ].slice(-40)
    );
    setHistoryFuture((future) => future.slice(1));
    setArtLayers(next.artLayers);
    setSelectedLayerId(next.selectedLayerId);
    setProductionNotes(next.productionNotes);
    setPreviewComposing(true);
    setFadeIn(false);
    setMessage("Redid design change.");
    requestAnimationFrame(() => {
      skippingHistoryRef.current = false;
    });
  };

  const mockupDirty = canSave && (userDirty || isSaving);
  const artInputRef = useRef<HTMLInputElement>(null);
  const blankInputRef = useRef<HTMLInputElement>(null);
  const mockupColumnRef = useRef<HTMLDivElement | null>(null);
  const controlsScrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  /** Skip re-fetch when user manually uploaded a blank photo for this selection. */
  const manualBlankOverrideRef = useRef(false);
  const blankLoadEpochRef = useRef(0);
  const readyNotifiedRef = useRef(false);

  const activeArtUrl = activeLayerUrl(selectedLayer);
  const hasArtwork = composeLayers.length > 0;

  const specLine = formatPrintSpecLine({
    widthIn: scaleToPrintWidthIn(transform.scale),
    heightIn: printHeightFromWidth(
      scaleToPrintWidthIn(transform.scale),
      artAspectRatio
    ),
    offsetBelowCollarIn: yToOffsetBelowCollarIn(transform.y),
  });

  const patchSelectedTransform = (
    patch:
      | Partial<DesignMockupTransform>
      | ((current: DesignMockupTransform) => DesignMockupTransform)
  ) => {
    if (!selectedLayer) return;
    markDirty();
    setArtLayers((layers) => {
      const current = layers.find((layer) => layer.id === selectedLayer.id);
      if (!current) return layers;
      const nextTransform =
        typeof patch === "function" ? patch(current.transform) : {
          ...current.transform,
          ...patch,
        };
      return updateLayerTransform(layers, selectedLayer.id, nextTransform);
    });
  };

  useEffect(() => {
    const url = activeArtUrl;
    if (!url) {
      setArtAspectRatio(1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width > 0) {
        setArtAspectRatio(img.height / img.width);
      }
    };
    img.src = url;
  }, [activeArtUrl]);

  const isStageLoading =
    blankLoading || !stageReady || (previewComposing && !previewUrl);

  // Color stage uses the blank hex directly; garment stage samples the composed preview.
  const sampledStageBg = useImageBackgroundColor(
    isColorStage ? null : previewUrl
  );
  const stageBgColor = isColorStage ? blankColorHex : sampledStageBg;

  // Pull the vendor garment photo that matches this decoration location (front/back/side).
  useEffect(() => {
    let cancelled = false;
    const epoch = ++blankLoadEpochRef.current;

    if (isColorStage) {
      setBlankLoading(false);
      setBlankIsVendorPhoto(false);
      return;
    }

    const view = blankView;
    const mockupBlankUrl =
      !savedMockupStale &&
      imprint.designMockup?.lineItemId === lineItem?.id
        ? imprint.designMockup?.blankImageUrl?.trim()
        : undefined;

    const applyBlank = (next: BlankCacheEntry | null, fromCache: boolean) => {
      if (cancelled || epoch !== blankLoadEpochRef.current) return;
      if (manualBlankOverrideRef.current) return;

      if (next?.colorHex) setResolvedColorHex(next.colorHex);
      if (next?.imageUrl) {
        // Keep current photo visible on cache hits — no blank flash.
        setBlankImageUrl(next.imageUrl);
        setBlankIsVendorPhoto(next.vendor);
      } else if (!fromCache) {
        setBlankImageUrl(undefined);
        setBlankIsVendorPhoto(false);
      }
      setBlankLoading(false);
    };

    const run = async () => {
      if (!lineItem) {
        applyBlank(null, false);
        return;
      }

      // Manual blank upload wins until the user switches garments/locations.
      if (manualBlankOverrideRef.current && blankImageUrl) {
        setBlankLoading(false);
        return;
      }

      const cached = readBlankCache(order.id, lineItem, view);
      if (cached) {
        applyBlank(cached, true);
        return;
      }

      setError(null);
      // Only clear the stage when we don't already have something to show.
      if (!blankImageUrl && !previewUrl) {
        setStageReady(false);
        setPreviewComposing(true);
      }
      setBlankLoading(true);

      try {
        const provider = supplierProviderForDesignBlank(lineItem);

        if (provider) {
          const token = await getIdToken();
          if (!token) throw new Error("Not signed in");

          const resolved = await resolveVendorBlankImage(
            token,
            order.id,
            lineItem,
            view
          );
          if (cancelled || epoch !== blankLoadEpochRef.current) return;

          if (resolved) {
            applyBlank(resolved, false);

            if (
              persistBlankImages &&
              view === "front" &&
              !lineItem.imageUrl &&
              resolved.imageUrl
            ) {
              void updateOrderLineItem(order.id, lineItem.id, {
                ...lineItem,
                imageUrl: resolved.imageUrl,
                ...(resolved.colorHex ? { colorHex: resolved.colorHex } : {}),
              }).catch(() => {
                /* non-blocking */
              });
            }
            return;
          }

          if (mockupBlankUrl) {
            const entry = {
              imageUrl: mockupBlankUrl,
              vendor: looksLikeVendorImageUrl(mockupBlankUrl),
              colorHex: lineItem.colorHex,
            };
            writeBlankCache(order.id, lineItem, view, entry);
            applyBlank({ ...entry, garmentKey: garmentFingerprint(lineItem) }, false);
            return;
          }

          applyBlank(null, false);
          return;
        }

        if (mockupBlankUrl) {
          const entry = {
            imageUrl: mockupBlankUrl,
            vendor: looksLikeVendorImageUrl(mockupBlankUrl),
            colorHex: lineItem.colorHex,
          };
          writeBlankCache(order.id, lineItem, view, entry);
          applyBlank({ ...entry, garmentKey: garmentFingerprint(lineItem) }, false);
          return;
        }

        if (lineItem.imageUrl?.trim()) {
          const entry = {
            imageUrl: lineItem.imageUrl.trim(),
            vendor: looksLikeVendorImageUrl(lineItem.imageUrl),
            colorHex: lineItem.colorHex,
          };
          writeBlankCache(order.id, lineItem, view, entry);
          applyBlank({ ...entry, garmentKey: garmentFingerprint(lineItem) }, false);
          return;
        }

        applyBlank(null, false);
      } catch (err) {
        if (!cancelled && epoch === blankLoadEpochRef.current) {
          // Keep any already-visible blank rather than wiping to empty.
          setBlankLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : "Could not load vendor garment photo"
          );
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Intentionally omit blankImageUrl/previewUrl — those are outputs of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blankView,
    getIdToken,
    imprint.designMockup?.blankImageUrl,
    imprint.designMockup?.lineItemId,
    imprint.designMockup?.garmentKey,
    isColorStage,
    lineItem?.id,
    lineItem?.color,
    lineItem?.colorKey,
    lineItem?.colorHex,
    lineItem?.imageUrl,
    lineItem?.supplier,
    lineItem?.supplierPartNumber,
    lineItem?.supplierStyleId,
    lineItem?.productKey,
    order.id,
    savedMockupStale,
    updateOrderLineItem,
    persistBlankImages,
  ]);

  useEffect(() => {
    if (blankLoading) return;

    let cancelled = false;
    const cacheKey = composedPreviewCacheKey({
      orderId: order.id,
      lineItemId: lineItem?.id,
      blankView,
      stageMode,
      blankImageUrl: isColorStage ? undefined : blankImageUrl,
      blankColorHex,
      artworkUrl: activeArtUrl,
      transform,
      artLayersKey,
    });

    const cachedPreview = readComposedCache(cacheKey);
    if (cachedPreview) {
      setPreviewUrl(cachedPreview);
      setPreviewComposing(false);
      setStageReady(true);
      setFadeIn(true);
      return;
    }

    const run = async () => {
      setPreviewComposing(true);
      try {
        const composed = await composeDesignMockup({
          blankImageUrl: isColorStage ? undefined : blankImageUrl,
          blankColorHex,
          stageMode,
          applyColorOverlay: false,
          artworkUrl: activeArtUrl,
          transform,
          artworkLayers: artLayersForCompose(artLayers),
        });
        if (cancelled) return;
        writeComposedCache(cacheKey, composed);
        setPreviewUrl(composed);
        setPreviewComposing(false);
        setStageReady(true);
      } catch (err) {
        if (cancelled) return;
        // Never replace a saved design with a blank-only render — show the
        // stored mockup instead so the work stays visible and editable.
        const saved = imprint.designMockup?.composedPreviewUrl;
        if (saved) setPreviewUrl((current) => current ?? saved);
        if (err instanceof ArtworkLoadError && hasArtwork) {
          setError("Could not load this design's artwork. Re-upload it to keep editing.");
        }
        setPreviewComposing(false);
        setStageReady(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    blankLoading,
    imprint.designMockup?.composedPreviewUrl,
    blankImageUrl,
    blankColorHex,
    blankView,
    isColorStage,
    stageMode,
    activeArtUrl,
    transform,
    artLayersKey,
    artLayers,
    hasArtwork,
    order.id,
    lineItem?.id,
  ]);

  // Fade the stage in once loading settles. Keep this effect independent of
  // `onReady` — notifying the parent re-renders with a new callback identity,
  // which would cancel the rAF and leave the cached preview stuck at opacity-0.
  useEffect(() => {
    if (isStageLoading) {
      setFadeIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(frame);
  }, [isStageLoading]);

  useEffect(() => {
    if (isStageLoading) {
      readyNotifiedRef.current = false;
      return;
    }
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    onReady?.();
  }, [isStageLoading, onReady]);

  const applyPreset = (nextPlacementId: string) => {
    markDirty();
    setPlacementId(nextPlacementId);
    const next = placements.find((entry) => entry.id === nextPlacementId);
    if (next && !isColorStage) {
      patchSelectedTransform(transformFromPreset(next));
    }
  };

  const switchStageMode = (mode: DesignMockupStageMode) => {
    if (mode === stageMode) return;
    markDirty();
    setStageMode(mode);
    setFadeIn(false);
    setStageReady(false);
    setPreviewComposing(true);
    setPreviewUrl(undefined);
    if (mode === "color") {
      setBlankLoading(false);
      setBlankIsVendorPhoto(false);
      if (!hasArtwork) patchSelectedTransform(defaultColorStageTransform());
    } else {
      manualBlankOverrideRef.current = false;
      if (!hasArtwork && activePreset) {
        patchSelectedTransform(transformFromPreset(activePreset));
      }
      // blank effect will fetch the garment photo
      setBlankLoading(true);
    }
  };

  const switchBlankView = (view: GarmentBlankView) => {
    if (view === blankView) return;
    markDirty();
    manualBlankOverrideRef.current = false;
    setBlankView(view);
    setFadeIn(false);

    const cachedBlankEntry = lineItem
      ? readBlankCache(order.id, lineItem, view)
      : undefined;

    if (cachedBlankEntry) {
      setBlankImageUrl(cachedBlankEntry.imageUrl);
      setBlankIsVendorPhoto(cachedBlankEntry.vendor);
      if (cachedBlankEntry.colorHex) {
        setResolvedColorHex(cachedBlankEntry.colorHex);
      }
      setBlankLoading(false);

      const composedKey = composedPreviewCacheKey({
        orderId: order.id,
        lineItemId: lineItem?.id,
        blankView: view,
        stageMode,
        blankImageUrl: cachedBlankEntry.imageUrl,
        blankColorHex: cachedBlankEntry.colorHex || blankColorHex,
        artworkUrl: activeArtUrl,
        transform,
      });
      const cachedPreview = readComposedCache(composedKey);
      if (cachedPreview) {
        setPreviewUrl(cachedPreview);
        setPreviewComposing(false);
        setStageReady(true);
        setFadeIn(true);
        return;
      }
    } else {
      // Keep the current blank visible while the next view loads — no empty flash.
      setBlankLoading(true);
    }

    setStageReady(false);
    setPreviewComposing(true);
  };

  const handleArtUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP artwork file.");
      return;
    }
    setBusy("Reading artwork…");
    setError(null);
    try {
      const dataUrl = await readImagePreviewDataUrl(file);
      if (!dataUrl.previewUrl) {
        throw new Error(dataUrl.error || "Could not read artwork");
      }
      const baseTransform =
        isColorStage
          ? defaultColorStageTransform()
          : activePreset
            ? transformFromPreset(activePreset)
            : defaultTransform();
      const layer = createArtLayer(
        dataUrl.previewUrl,
        baseTransform,
        `Artwork ${artLayers.length + 1}`
      );
      pushDesignHistory();
      setArtLayers((current) => [...current, layer]);
      setSelectedLayerId(layer.id);
      setEditImageOpen(true);
      setMessage(
        "Artwork layer added. Clean it up in Edit image, then save the mockup."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload artwork");
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
      const dataUrl = await readImagePreviewDataUrl(file);
      if (!dataUrl.previewUrl) {
        throw new Error(dataUrl.error || "Could not read blank image");
      }
      markDirty();
      manualBlankOverrideRef.current = true;
      setBlankImageUrl(dataUrl.previewUrl);
      setBlankIsVendorPhoto(false);
      if (lineItem) {
        writeBlankCache(order.id, lineItem, blankView, {
          imageUrl: dataUrl.previewUrl,
          colorHex: resolvedColorHex ?? lineItem.colorHex,
          vendor: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload blank");
    } finally {
      setBusy(null);
    }
  };

  const handleApplyArtworkClean = (cleanUrl: string) => {
    if (!selectedLayer) return;
    const isOriginal = cleanUrl === selectedLayer.url;
    pushDesignHistory();
    setArtLayers((layers) =>
      layers.map((layer) =>
        layer.id === selectedLayer.id
          ? {
              ...layer,
              cleanUrl: isOriginal ? undefined : cleanUrl,
              backgroundRemoved: !isOriginal,
            }
          : layer
      )
    );
    // Force the stage to rebuild immediately (don't wait for a drag/nudge).
    setPreviewComposing(true);
    setFadeIn(false);
    setMessage(
      isOriginal
        ? "Using original artwork."
        : "Artwork updated on the mockup."
    );
  };

  const handleDetectedColors = useCallback(
    (colors: DetectedArtworkColor[]) => {
      if (colors.length === 0) return;
      // Only seed empty notes during initial settle — never after the user can edit.
      if (allowDirtyRef.current) return;
      const hint = formatDetectedColorsForNotes(colors);
      setProductionNotes((current) => {
        if (current.trim()) return current;
        return `Detected ink colors: ${hint}`;
      });
    },
    []
  );

  const handleDeleteLayer = (layerId: string) => {
    pushDesignHistory();
    setArtLayers((layers) => {
      const next = layers.filter((layer) => layer.id !== layerId);
      const nextSelected =
        selectedLayerId === layerId
          ? next[next.length - 1]?.id ?? null
          : selectedLayerId;
      setSelectedLayerId(nextSelected);
      return next;
    });
    setMessage("Artwork layer removed.");
  };

  const layerRows: DesignStudioLayerRow[] = [
    {
      id: "blank-base",
      kind: "blank",
      label: lineItem ? formatBlankLabel(lineItem) : "Blank",
      detail: isColorStage
        ? "Color backdrop"
        : blankIsVendorPhoto
          ? `${garmentBlankViewLabel(blankView)} vendor photo`
          : "Garment base",
      thumbUrl: isColorStage ? undefined : blankImageUrl,
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

  const buildPayload = (): OrderDesignMockup => {
    const existing = imprint.designMockup;
    const primary = syncPrimaryFromLayers(artLayers);
    const widthIn = scaleToPrintWidthIn(transform.scale);
    const heightIn = printHeightFromWidth(widthIn, artAspectRatio);
    const offsetIn = yToOffsetBelowCollarIn(transform.y);
    return {
      ...seedMockupFromExisting(existing, {
        lineItemId: lineItem?.id,
        stageMode,
        blankView,
        blankColorHex,
        blankImageUrl: isColorStage ? undefined : blankImageUrl,
        locationKey: imprint.locationKey,
        transform: primary.transform,
        placementPresetId: activePreset?.id,
      }),
      id: existing?.id ?? createDesignMockupId(),
      stageMode,
      blankView,
      garmentKey: lineItem ? garmentFingerprint(lineItem) : undefined,
      artLayers,
      artworkUrl: primary.artworkUrl,
      artworkCleanUrl: primary.artworkCleanUrl,
      backgroundRemoved: primary.backgroundRemoved,
      printWidthIn: widthIn,
      printHeightIn: heightIn,
      offsetBelowCollarIn: offsetIn,
      productionNotes: productionNotes.trim() || undefined,
      composedPreviewUrl: previewUrl,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = async (attachToProof: boolean) => {
    if (!canSave) {
      setError("This request can’t be edited right now.");
      return;
    }
    if (!previewUrl) {
      setError("Wait for the preview to finish rendering.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    setBusy(attachToProof ? "Saving & attaching to proof…" : "Saving mockup…");
    setError(null);
    setMessage(null);
    try {
      const widthIn = scaleToPrintWidthIn(transform.scale);
      const heightIn = printHeightFromWidth(widthIn, artAspectRatio);
      const offsetIn = yToOffsetBelowCollarIn(transform.y);
      const saveOptions: DesignMockupSaveOptions = {
        attachToProof,
        proofLabel: `${imprintTitle(imprint)} mockup`,
      };

      if (attachToProof) {
        saveOptions.proofPreviewUrl = await composeCleanProofSheet({
          mockupDataUrl: previewUrl,
          title: imprintTitle(imprint),
          subtitle: lineItem
            ? `${job.name} · ${formatBlankLabel(lineItem)}`
            : job.name,
          specs: [
            formatPrintSpecLine({
              widthIn,
              heightIn,
              offsetBelowCollarIn: offsetIn,
              locationLabel: imprintTitle(imprint),
            }),
          ],
          notes: productionNotes.trim() || undefined,
        });
      }

      const savedOrder = await onSave(
        order.id,
        job.id,
        imprint.id,
        buildPayload(),
        saveOptions
      );

      // Prefer the server mockup (storage URLs) so local data: URLs don't keep
      // the editor "dirty" after a successful save.
      const savedMockup = savedOrder
        ? savedOrder.jobs
            .find((entry) => entry.id === job.id)
            ?.imprints?.find((entry) => entry.id === imprint.id)?.designMockup
        : undefined;

      if (savedMockup) {
        skippingHistoryRef.current = true;
        setArtLayers(normalizeArtLayers(savedMockup));
        setProductionNotes(savedMockup.productionNotes ?? "");
        if (savedMockup.lineItemId) setLineItemId(savedMockup.lineItemId);
        if (savedMockup.placementPresetId) {
          setPlacementId(savedMockup.placementPresetId);
        }
        if (savedMockup.stageMode) setStageMode(savedMockup.stageMode);
        if (savedMockup.blankView) {
          setBlankView(normalizeGarmentBlankView(savedMockup.blankView));
        }
        requestAnimationFrame(() => {
          skippingHistoryRef.current = false;
        });
      }

      clearDirty();
      setMessage(
        attachToProof
          ? messages?.attached ||
              "Mockup saved and attached to the Proofs tab for this event."
          : messages?.saved || "Mockup saved on this event."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mockup");
    } finally {
      setBusy(null);
      setIsSaving(false);
    }
  };

  useRegisterUnsavedChanges(
    canSave
      ? {
          dirty: mockupDirty,
          saving: isSaving,
          label: "Unsaved mockup",
          onSave: async () => {
            await handleSave(false);
          },
          onDiscard: () => {
            setError(null);
            setMessage(null);
            clearDirty();
            onDiscardRequest?.();
          },
        }
      : null,
    `design-studio-${imprint.id}`
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeArtUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    pushDesignHistory();
    event.currentTarget.setPointerCapture(event.pointerId);
    void rect;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.startX) / rect.width;
    const dy = (event.clientY - dragRef.current.startY) / rect.height;
    patchSelectedTransform({
      x: Math.max(0.08, Math.min(0.92, dragRef.current.originX + dx)),
      y: Math.max(0.08, Math.min(0.92, dragRef.current.originY + dy)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const liveWidthIn = scaleToPrintWidthIn(transform.scale);
  const liveHeightIn = printHeightFromWidth(liveWidthIn, artAspectRatio);
  const liveOffsetIn = yToOffsetBelowCollarIn(transform.y);

  // Any wheel on the editor (outside the controls pane) scrolls the right sidebar.
  useEffect(() => {
    const stage = mockupColumnRef.current;
    const panel = controlsScrollRef.current;
    if (!stage || !panel) return;

    const root = stage.closest("section");
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      if (window.matchMedia("(max-width: 1023px)").matches) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-design-controls-scroll]")) return;
      event.preventDefault();
      panel.scrollTop += event.deltaY;
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section
      className={cn(
        dashboardCardClass,
        "flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden"
      )}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <div>
          <h2 className={dashboardTaskTitleClass}>{imprintTitle(imprint)}</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {job.name} · place artwork on the blank, then attach to proofs
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "h-9 px-2.5")}
            disabled={historyPast.length === 0 || Boolean(busy)}
            onClick={undoDesign}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "h-9 px-2.5")}
            disabled={historyFuture.length === 0 || Boolean(busy)}
            onClick={redoDesign}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "h-9")}
            disabled={Boolean(busy) || !canSave}
            onClick={() => handleSave(false)}
          >
            {busy?.startsWith("Saving mockup") ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Save mockup
          </Button>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            disabled={Boolean(busy) || !previewUrl || !canSave}
            onClick={() => handleSave(true)}
          >
            {busy?.includes("attaching") ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Save & attach to proof
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <div
          ref={mockupColumnRef}
          className="flex flex-col items-center justify-center gap-3 border-b border-[#ebebeb] p-4 sm:p-6 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:overflow-hidden lg:border-b-0 lg:border-r lg:px-6 lg:py-6"
        >
          <div className="w-full max-w-[min(460px,100%)] shrink-0">
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "relative aspect-square w-full overflow-hidden rounded-lg transition-colors",
                isStageLoading ? "pointer-events-none" : null
              )}
              style={
                !isStageLoading
                  ? {
                      backgroundColor:
                        stageBgColor ||
                        (isColorStage ? blankColorHex : undefined),
                    }
                  : undefined
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {previewUrl && !isStageLoading ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={previewUrl.slice(0, 48)}
                  src={previewUrl}
                  alt="Design mockup preview"
                  className={cn(
                    "absolute inset-0 size-full object-contain transition-opacity duration-300 ease-out",
                    fadeIn ? "opacity-100" : "opacity-0"
                  )}
                  draggable={false}
                  onLoad={() => setFadeIn(true)}
                />
              ) : null}

              {isStageLoading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#f7f7f8]/90">
                  <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
                  <p className="text-[13px] font-medium text-[#616161]">
                    {isColorStage
                      ? "Preparing color backdrop…"
                      : blankLoading
                        ? "Loading garment…"
                        : "Preparing mockup…"}
                  </p>
                </div>
              ) : null}

              {!isStageLoading && activeArtUrl ? (
                <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#616161]">
                  Drag artwork to reposition
                </p>
              ) : null}
            </div>
          </div>

          <div className="w-full max-w-[min(460px,100%)] shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-[160px] flex-1">
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
              {specLine ? (
                <p className="text-[12px] text-[#8a8a8a]">{specLine}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={controlsScrollRef}
          data-design-controls-scroll
          className="min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:w-[320px] lg:shrink-0"
        >
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
              {hasArtwork
                ? "Add artwork layer"
                : isColorStage
                  ? "Upload label / artwork"
                  : "Upload artwork"}
            </Button>
            {selectedLayer ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(dashboardControlClass, "h-10 w-full justify-center")}
                  onClick={() => setEditImageOpen(true)}
                  disabled={Boolean(busy) || !canSave}
                >
                  <Pencil className="size-3.5" />
                  Edit image
                </Button>
                <DesignStudioArtworkCleanup
                  originalUrl={selectedLayer.url}
                  workingUrl={activeLayerUrl(selectedLayer) || selectedLayer.url}
                  disabled={Boolean(busy) || !canSave}
                  onApplyCleanUrl={handleApplyArtworkClean}
                  onDetectedColors={handleDetectedColors}
                />
              </>
            ) : null}
          </div>

          <DesignStudioLayersPanel
            layers={layerRows}
            selectedId={selectedLayerId}
            onSelect={setSelectedLayerId}
            onDelete={handleDeleteLayer}
          />

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Blank / garment
            </Label>
            {blankOptions.length > 0 ? (
              <Select
                value={lineItem?.id}
                onValueChange={(value) => {
                  if (!value) return;
                  markDirty();
                  manualBlankOverrideRef.current = false;
                  setLineItemId(value);
                }}
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
                >
                  <SelectValue>
                    {lineItem ? formatBlankLabel(lineItem) : "Select blank"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {blankOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {formatBlankLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className={dashboardTaskDetailClass}>
                Add blanks on the Blanks / Garments tab first.
              </p>
            )}
            <p className={dashboardTaskDetailClass}>
              {isColorStage
                ? "Color backdrop for labels and tags"
                : blankLoading
                  ? "Loading vendor garment photo…"
                  : blankIsVendorPhoto
                    ? `Vendor ${garmentBlankViewLabel(blankView).toLowerCase()} photo`
                    : "Color silhouette — upload a blank photo if needed"}
            </p>
          </div>

          <div className={cn("grid gap-3", isColorStage ? "grid-cols-1" : "grid-cols-2")}>
            {!isColorStage ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  View
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
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Backdrop
              </Label>
              <div
                className="grid h-9 grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5"
                role="group"
                aria-label="Mockup backdrop"
              >
                <button
                  type="button"
                  onClick={() => switchStageMode("garment")}
                  className={cn(
                    "rounded-md text-[12px] font-semibold transition-colors",
                    stageMode === "garment"
                      ? "bg-white text-[#303030] shadow-sm"
                      : "text-[#8a8a8a] hover:text-[#616161]"
                  )}
                >
                  Garment
                </button>
                <button
                  type="button"
                  onClick={() => switchStageMode("color")}
                  className={cn(
                    "rounded-md text-[12px] font-semibold transition-colors",
                    stageMode === "color"
                      ? "bg-white text-[#303030] shadow-sm"
                      : "text-[#8a8a8a] hover:text-[#616161]"
                  )}
                >
                  Color
                </button>
              </div>
            </div>
          </div>

          {!isColorStage ? (
            <>
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
                className={cn(dashboardControlClass, "h-9 w-full justify-center")}
                onClick={() => blankInputRef.current?.click()}
              >
                <ImagePlus className="size-3.5" />
                {blankImageUrl ? "Replace blank photo" : "Upload blank photo"}
              </Button>
            </>
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
                    {entry.maxPrintWidthIn
                      ? ` · ${entry.maxPrintWidthIn}"`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Print size
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor={`print-width-${imprint.id}`}
                  className="text-[11px] text-[#8a8a8a]"
                >
                  W (in)
                </Label>
                <Input
                  id={`print-width-${imprint.id}`}
                  type="number"
                  min={0.5}
                  max={16}
                  step={0.1}
                  value={liveWidthIn}
                  disabled={!selectedLayer}
                  className={cn(dashboardControlClass, "h-9 px-2")}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    patchSelectedTransform({
                      scale: printWidthInToScale(next),
                    });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`print-height-${imprint.id}`}
                  className="text-[11px] text-[#8a8a8a]"
                >
                  H (in)
                </Label>
                <Input
                  id={`print-height-${imprint.id}`}
                  type="number"
                  readOnly
                  value={liveHeightIn}
                  className={cn(
                    dashboardControlClass,
                    "h-9 bg-[#f6f6f7] px-2 text-[#616161]"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`print-offset-${imprint.id}`}
                  className="text-[11px] text-[#8a8a8a]"
                >
                  Below (in)
                </Label>
                <Input
                  id={`print-offset-${imprint.id}`}
                  type="number"
                  min={0}
                  max={14}
                  step={0.1}
                  value={liveOffsetIn}
                  disabled={!selectedLayer}
                  className={cn(dashboardControlClass, "h-9 px-2")}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    patchSelectedTransform({
                      y: offsetBelowCollarInToY(next),
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={`production-notes-${imprint.id}`}
              className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]"
            >
              Notes
            </Label>
            <Textarea
              id={`production-notes-${imprint.id}`}
              value={productionNotes}
              onChange={(event) => {
                markDirty();
                setProductionNotes(event.target.value);
              }}
              placeholder="PMS, special placement, customer notes…"
              className={cn(dashboardControlClass, "min-h-[72px] text-[13px]")}
            />
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
          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {selectedLayer ? (
        <DesignStudioEditImageDialog
          open={editImageOpen}
          onOpenChange={setEditImageOpen}
          originalUrl={selectedLayer.url}
          workingUrl={activeLayerUrl(selectedLayer) || selectedLayer.url}
          fileLabel={selectedLayer.label}
          onApply={(result) => {
            handleApplyArtworkClean(result.cleanUrl);
            if (result.detectedColors.length > 0) {
              handleDetectedColors(result.detectedColors);
            }
          }}
        />
      ) : null}
    </section>
  );
}
