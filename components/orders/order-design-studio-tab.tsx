"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
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
  composeDesignMockup,
  createDesignMockupId,
  defaultColorStageTransform,
  defaultStageMode,
  defaultTransform,
  garmentBlankViewLabel,
  listDesignableImprints,
  normalizeGarmentBlankView,
  removeImageBackground,
  resolveBlankColorHex,
  resolveGarmentBlankView,
  seedMockupFromExisting,
  transformFromPreset,
  type GarmentBlankView,
} from "@/lib/order-design-mockup";
import { getDesignPlacementPresets } from "@/lib/shop-settings";
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
  const product = item.productName.startsWith(item.brand)
    ? item.productName
    : `${item.brand} ${item.productName}`;
  return `${product} · ${item.color}`;
}

function imprintTitle(imprint: JobImprint): string {
  return imprint.customLabel?.trim() || imprint.label;
}

export function OrderDesignStudioTab({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const { updateImprintDesignMockup } = useSchedule();
  const entries = useMemo(() => listDesignableImprints(order), [order]);
  const placements = useMemo(
    () => getDesignPlacementPresets(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    entries[0]?.key ?? null
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const selected = entries.find((entry) => entry.key === selectedKey) ?? entries[0];

  useEffect(() => {
    if (!selected && entries[0]) setSelectedKey(entries[0].key);
  }, [entries, selected]);

  const selectLocation = (key: string) => {
    if (key === selectedKey) return;
    setIsSwitching(true);
    setSelectedKey(key);
  };

  const handleEditorReady = useCallback(() => {
    setIsSwitching(false);
  }, []);

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
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className={cn(dashboardCardClass, "h-fit overflow-hidden")}>
        <div className="border-b border-[#ebebeb] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#303030]">Locations</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Build a mockup per event
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
                  active
                    ? "bg-[#f4f7fd]"
                    : "bg-white hover:bg-[#fafafa]"
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
          "min-w-0 transition-opacity duration-200 ease-out",
          isSwitching ? "opacity-60" : "opacity-100"
        )}
      >
        <DesignMockupEditor
          key={selected.key}
          order={order}
          job={selected.job}
          imprint={selected.imprint}
          placements={placements}
          onSave={updateImprintDesignMockup}
          onReady={handleEditorReady}
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
  onReady,
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
    options?: { attachToProof?: boolean; proofLabel?: string }
  ) => Promise<Order>;
  onReady?: () => void;
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
  const [artworkUrl, setArtworkUrl] = useState(
    imprint.designMockup?.artworkUrl
  );
  const [artworkCleanUrl, setArtworkCleanUrl] = useState(
    imprint.designMockup?.artworkCleanUrl
  );
  const [backgroundRemoved, setBackgroundRemoved] = useState(
    imprint.designMockup?.backgroundRemoved === true
  );
  const [transform, setTransform] = useState<DesignMockupTransform>(() => {
    if (imprint.designMockup?.transform) return imprint.designMockup.transform;
    if (
      (imprint.designMockup?.stageMode ??
        defaultStageMode(imprint.locationKey || preset?.locationKey)) ===
      "color"
    ) {
      return defaultColorStageTransform();
    }
    return activePreset ? transformFromPreset(activePreset) : defaultTransform();
  });
  const activeArtUrlSeed = backgroundRemoved
    ? artworkCleanUrl || artworkUrl
    : artworkUrl;
  const initialBlankForCompose = isColorStage
    ? undefined
    : cachedBlank?.imageUrl ??
      savedBlankImageUrl ??
      (blankView === "front" ? lineItem?.imageUrl : undefined);
  const initialComposedPreview =
    savedComposedPreviewUrl ??
    (initialBlankForCompose
      ? readComposedCache(
          composedPreviewCacheKey({
            orderId: order.id,
            lineItemId: lineItem?.id,
            blankView,
            stageMode,
            blankImageUrl: initialBlankForCompose,
            blankColorHex,
            artworkUrl: activeArtUrlSeed,
            transform,
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  const blankInputRef = useRef<HTMLInputElement>(null);
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

  const activeArtUrl = backgroundRemoved
    ? artworkCleanUrl || artworkUrl
    : artworkUrl;

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
        if (err instanceof ArtworkLoadError && activeArtUrl) {
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
    setPlacementId(nextPlacementId);
    const next = placements.find((entry) => entry.id === nextPlacementId);
    if (next && !isColorStage) setTransform(transformFromPreset(next));
  };

  const switchStageMode = (mode: DesignMockupStageMode) => {
    if (mode === stageMode) return;
    setStageMode(mode);
    setFadeIn(false);
    setStageReady(false);
    setPreviewComposing(true);
    setPreviewUrl(undefined);
    if (mode === "color") {
      setBlankLoading(false);
      setBlankIsVendorPhoto(false);
      if (!artworkUrl) setTransform(defaultColorStageTransform());
    } else {
      manualBlankOverrideRef.current = false;
      if (!artworkUrl && activePreset) {
        setTransform(transformFromPreset(activePreset));
      }
      // blank effect will fetch the garment photo
      setBlankLoading(true);
    }
  };

  const switchBlankView = (view: GarmentBlankView) => {
    if (view === blankView) return;
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
      setArtworkUrl(dataUrl.previewUrl);
      setArtworkCleanUrl(undefined);
      setBackgroundRemoved(false);
      setMessage(
        "Artwork added. You can remove the background, then save the mockup."
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

  const handleRemoveBackground = async () => {
    if (!artworkUrl) return;
    setBusy("Removing background…");
    setError(null);
    try {
      const cleaned = await removeImageBackground(artworkUrl);
      setArtworkCleanUrl(cleaned);
      setBackgroundRemoved(true);
      setMessage("Background removed — art sits cleanly on the garment.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove background"
      );
    } finally {
      setBusy(null);
    }
  };

  const buildPayload = (): OrderDesignMockup => {
    const existing = imprint.designMockup;
    return {
      ...seedMockupFromExisting(existing, {
        lineItemId: lineItem?.id,
        stageMode,
        blankView,
        blankColorHex,
        blankImageUrl: isColorStage ? undefined : blankImageUrl,
        locationKey: imprint.locationKey,
        transform,
        placementPresetId: activePreset?.id,
      }),
      id: existing?.id ?? createDesignMockupId(),
      stageMode,
      blankView,
      garmentKey: lineItem ? garmentFingerprint(lineItem) : undefined,
      artworkUrl,
      artworkCleanUrl,
      backgroundRemoved,
      composedPreviewUrl: previewUrl,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = async (attachToProof: boolean) => {
    if (!previewUrl) {
      setError("Wait for the preview to finish rendering.");
      return;
    }
    setBusy(attachToProof ? "Saving & attaching to proof…" : "Saving mockup…");
    setError(null);
    setMessage(null);
    try {
      await onSave(order.id, job.id, imprint.id, buildPayload(), {
        attachToProof,
        proofLabel: `${imprintTitle(imprint)} mockup`,
      });
      setMessage(
        attachToProof
          ? "Mockup saved and attached to the Proofs tab for this event."
          : "Mockup saved on this event."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mockup");
    } finally {
      setBusy(null);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeArtUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    void rect;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.startX) / rect.width;
    const dy = (event.clientY - dragRef.current.startY) / rect.height;
    setTransform((current) => ({
      ...current,
      x: Math.max(0.08, Math.min(0.92, dragRef.current!.originX + dx)),
      y: Math.max(0.08, Math.min(0.92, dragRef.current!.originY + dy)),
    }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
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
            className={cn(dashboardControlClass, "h-9")}
            disabled={Boolean(busy)}
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
            disabled={Boolean(busy) || !previewUrl}
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

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px] sm:p-5">
        <div>
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "relative aspect-square overflow-hidden rounded-xl transition-colors",
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
                  "size-full object-contain transition-opacity duration-300 ease-out",
                  fadeIn ? "opacity-100" : "opacity-0"
                )}
                draggable={false}
                onLoad={() => setFadeIn(true)}
              />
            ) : null}

            {isStageLoading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#f7f7f8]/90 backdrop-blur-[1px]">
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
                {isColorStage
                  ? "Drag to reposition on color"
                  : "Drag artwork to reposition"}
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
              onChange={(event) =>
                setTransform((current) => ({
                  ...current,
                  scale: Number(event.target.value),
                }))
              }
              className="mt-2 w-full accent-[#2c6ecb]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Backdrop
            </Label>
            <div
              className={cn(
                "grid h-10 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5",
                "shadow-[0_1px_0_rgba(26,26,26,0.05)]"
              )}
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
            <p className={dashboardTaskDetailClass}>
              {isColorStage
                ? "Solid backdrop matches the blank color — ideal for neck labels and tags."
                : "Place artwork on the vendor garment photo."}
            </p>
          </div>

          {!isColorStage ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Blank view
              </Label>
              <div
                className={cn(
                  "grid h-10 w-full grid-cols-2 gap-0.5 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5",
                  "shadow-[0_1px_0_rgba(26,26,26,0.05)]"
                )}
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
                Defaults from the event — switch anytime. Views are cached after
                the first load.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Blank / garment
            </Label>
            {blankOptions.length > 0 ? (
              <Select
                value={lineItem?.id}
                onValueChange={(value) => {
                  if (!value) return;
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
            <div className="flex items-center gap-2 pt-1">
              <span
                className="inline-block size-4 rounded-full border border-[#e3e3e3]"
                style={{ backgroundColor: blankColorHex }}
                title={
                  isColorStage
                    ? "Backdrop color"
                    : blankIsVendorPhoto
                      ? "Vendor color"
                      : "Fallback color"
                }
              />
              <p className="text-[12px] text-[#616161]">
                {isColorStage
                  ? "Backdrop inherits this blank’s color"
                  : blankLoading
                    ? "Loading vendor garment photo…"
                  : blankIsVendorPhoto
                      ? `Vendor ${garmentBlankViewLabel(blankView).toLowerCase()} photo for this blank`
                      : "No vendor photo — showing color silhouette"}
              </p>
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
                  className={cn(
                    dashboardControlClass,
                    "mt-1 h-9 w-full justify-center"
                  )}
                  onClick={() => blankInputRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  {blankImageUrl ? "Replace blank photo" : "Upload blank photo"}
                </Button>
              </>
            ) : null}
          </div>

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
              {artworkUrl
                ? "Replace artwork"
                : isColorStage
                  ? "Upload label / artwork"
                  : "Upload artwork"}
            </Button>
            {artworkUrl ? (
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
                    onClick={handleRemoveBackground}
                  >
                    <Wand2 className="size-3.5" />
                    Remove background
                  </Button>
                  {backgroundRemoved ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setBackgroundRemoved(false)}
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
          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
