"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  Check,
  ImagePlus,
  Loader2,
  Search,
  Shirt,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { DesignStudioBlankRequired } from "@/components/design-studio/design-studio-blank-required";
import { StoreProductDesignStudio } from "@/components/stores/store-product-design-studio";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isImageUpload,
  readImagePreviewDataUrl,
} from "@/lib/artwork-preview";
import type {
  ClientStoreColorVariant,
  ClientStoreDesignArtLayer,
  ClientStoreProductDesign,
} from "@/lib/client-stores";
import { useDesignStudioDesigns } from "@/lib/design-studio-cache";
import {
  createArtLayer,
  normalizeArtLayers,
  syncPrimaryFromLayers,
} from "@/lib/design-studio-layers";
import { decorationLabel } from "@/lib/format";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { defaultTransform } from "@/lib/order-design-mockup";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type { SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

type StudioStep = "chooser" | "library" | "blank" | "studio";

function toStoreArtLayers(
  layers: ReturnType<typeof normalizeArtLayers>
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

/** Pull artwork (and placement) from a Design Studio library design. */
export function clientDesignFromSaved(
  saved: SavedDesign
): ClientStoreProductDesign {
  const mockup =
    saved.designMockup || saved.locations?.[0]?.designMockup || undefined;
  let layers = normalizeArtLayers(mockup);
  if (layers.length === 0) {
    const preview =
      saved.artwork?.previewUrl?.trim() ||
      mockup?.composedPreviewUrl?.trim() ||
      "";
    if (preview) {
      layers = [
        createArtLayer(
          preview,
          mockup?.transform || defaultTransform(),
          saved.name || "Artwork"
        ),
      ];
    }
  }
  const primary = syncPrimaryFromLayers(layers);
  return {
    stageMode: mockup?.stageMode === "color" ? "color" : "garment",
    blankView: mockup?.blankView === "back" ? "back" : "front",
    artLayers: toStoreArtLayers(layers),
    artworkUrl: primary.artworkUrl,
    artworkCleanUrl: primary.artworkCleanUrl,
    backgroundRemoved: primary.backgroundRemoved,
    transform: primary.transform || mockup?.transform || defaultTransform(),
    placementPresetId: mockup?.placementPresetId,
    updatedAt: new Date().toISOString(),
  };
}

function variantHasGarmentBlank(variant: ClientStoreColorVariant): boolean {
  const blanks = variant.blankMockupUrls || [];
  const mockups = variant.mockupUrls || [];
  return Boolean(
    blanks.some((url) => Boolean(url?.trim())) ||
      mockups.some((url) => Boolean(url?.trim()))
  );
}

export function productHasGarmentBlanks(
  variants: ClientStoreColorVariant[]
): boolean {
  return variants.some(
    (variant) => variant.enabled !== false && variantHasGarmentBlank(variant)
  );
}

function applyBlankPhotos(
  variants: ClientStoreColorVariant[],
  frontUrl?: string,
  backUrl?: string
): ClientStoreColorVariant[] {
  return variants.map((variant) => {
    if (variant.enabled === false) return variant;
    const mockupUrls = [...(variant.mockupUrls || [])];
    while (mockupUrls.length < 2) mockupUrls.push("");
    if (frontUrl) mockupUrls[0] = frontUrl;
    if (backUrl) mockupUrls[1] = backUrl;
    return {
      ...variant,
      mockupUrls,
      // Fresh blanks — clear prior pristine record so studio uses these photos.
      blankMockupUrls: undefined,
    };
  });
}

function DesignThumb({
  design,
  selected,
  onSelect,
}: {
  design: SavedDesign;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview =
    design.designMockup?.composedPreviewUrl ||
    design.artwork?.previewUrl ||
    "";
  const bgColor = useImageBackgroundColor(preview || null);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-[#2c6ecb] bg-[#f7faff] ring-1 ring-[#2c6ecb]/25"
          : "border-[#e3e3e3] bg-white hover:border-[#c9d7ef]"
      )}
    >
      <div
        className="flex h-28 items-center justify-center bg-[#f6f6f7] p-3 transition-colors"
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            crossOrigin="anonymous"
            className="h-full w-full object-contain"
          />
        ) : (
          <Shirt className="size-7 text-[#a3a3a3]" strokeWidth={1.5} />
        )}
      </div>
      <div className="space-y-0.5 px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-[#303030]">
          {design.name}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {decorationLabel(design.decoration)} · {design.locationLabel}
        </p>
      </div>
    </button>
  );
}

export function StoreProductDesignStudioDialog({
  open,
  onOpenChange,
  productName,
  supplierLabel,
  variants,
  design,
  onVariantsChange,
  onDesignChange,
  onError,
  onManageColors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  /** e.g. "S&S" — shown when vendor blanks are available */
  supplierLabel?: string | null;
  variants: ClientStoreColorVariant[];
  design?: ClientStoreProductDesign;
  onVariantsChange: (next: ClientStoreColorVariant[]) => void;
  onDesignChange: (next: ClientStoreProductDesign) => void;
  onError: (message: string | null) => void;
  /** Jump out to color/mockup setup when the product has no colors. */
  onManageColors?: () => void;
}) {
  const { getIdToken } = useAuth();
  const { designs, loading: libraryLoading, refresh } =
    useDesignStudioDesigns(getIdToken);

  const [step, setStep] = useState<StudioStep>("chooser");
  const [query, setQuery] = useState("");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [frontBlank, setFrontBlank] = useState<string | null>(null);
  const [backBlank, setBackBlank] = useState<string | null>(null);
  const [blankBusy, setBlankBusy] = useState(false);
  const [blankError, setBlankError] = useState<string | null>(null);
  const [studioKey, setStudioKey] = useState(0);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const enabledVariants = useMemo(
    () => variants.filter((variant) => variant.enabled !== false && variant.name),
    [variants]
  );
  const hasColors = enabledVariants.length > 0;
  const hasBlanks = productHasGarmentBlanks(variants);
  const hasArtwork = useMemo(() => {
    if (!design) return false;
    if (normalizeArtLayers(design).length > 0) return true;
    return Boolean(design.artworkUrl || design.artworkCleanUrl);
  }, [design]);

  const filteredDesigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter((row) => {
      const hay = [
        row.name,
        row.locationLabel,
        row.customerName,
        row.company,
        decorationLabel(row.decoration),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [designs, query]);

  const selectedLibraryDesign =
    designs.find((row) => row.id === selectedDesignId) || null;

  const resolveOpenStep = (): StudioStep => {
    if (!hasColors) return "chooser";
    // Existing artwork on the product → go straight into the studio (or blank
    // gate only when garment photos are missing).
    if (hasArtwork) return hasBlanks ? "studio" : "blank";
    // Vendor/uploaded blanks ready but no art yet — still open the canvas so
    // they can place artwork without an extra chooser click.
    if (hasBlanks) return "studio";
    return "chooser";
  };

  const wasOpenRef = useRef(false);
  /** True until the user manually navigates (Back) — allows late hydration upgrades. */
  const autoRouteRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      autoRouteRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      autoRouteRef.current = true;
      setQuery("");
      setSelectedDesignId(null);
      setFrontBlank(null);
      setBackBlank(null);
      setBlankError(null);
      const nextStep = resolveOpenStep();
      setStep(nextStep);
      if (nextStep === "studio") setStudioKey((key) => key + 1);
      void refresh();
      return;
    }

    // Product data arrived after open (e.g. colorVariants sync) — upgrade from
    // the auto chooser once, but don't fight a manual Back to chooser.
    if (autoRouteRef.current && step === "chooser") {
      const nextStep = resolveOpenStep();
      if (nextStep !== "chooser") {
        setStep(nextStep);
        if (nextStep === "studio") setStudioKey((key) => key + 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasColors, hasArtwork, hasBlanks, step]);

  const goToChooser = () => {
    autoRouteRef.current = false;
    setStep("chooser");
  };

  const enterStudio = () => {
    setStudioKey((key) => key + 1);
    setStep("studio");
    onError(null);
  };

  const startNewDesign = () => {
    onDesignChange({
      stageMode: "garment",
      blankView: "front",
      artLayers: [],
      artworkUrl: undefined,
      artworkCleanUrl: undefined,
      backgroundRemoved: undefined,
      transform: defaultTransform(),
      updatedAt: new Date().toISOString(),
    });
    if (!hasColors) {
      onManageColors?.();
      onOpenChange(false);
      return;
    }
    if (hasBlanks) {
      enterStudio();
      return;
    }
    setStep("blank");
  };

  const continueDesigning = () => {
    if (!hasColors) {
      onManageColors?.();
      onOpenChange(false);
      return;
    }
    if (!hasBlanks) {
      setStep("blank");
      return;
    }
    enterStudio();
  };

  const applyLibraryDesign = () => {
    if (!selectedLibraryDesign) return;
    const next = clientDesignFromSaved(selectedLibraryDesign);
    if (!next.artLayers?.length && !next.artworkUrl) {
      onError("That library design has no artwork to apply.");
      return;
    }
    onDesignChange(next);
    onError(null);
    if (!hasColors) {
      onManageColors?.();
      onOpenChange(false);
      return;
    }
    if (!hasBlanks) {
      setStep("blank");
      return;
    }
    enterStudio();
  };

  const handleBlankFile = async (
    file: File | null,
    view: "front" | "back"
  ) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setBlankError("Upload a PNG, JPG, or WebP garment photo.");
      return;
    }
    setBlankBusy(true);
    setBlankError(null);
    try {
      const { previewUrl, error } = await readImagePreviewDataUrl(file);
      if (!previewUrl) {
        setBlankError(error || "Could not read that photo.");
        return;
      }
      if (view === "front") setFrontBlank(previewUrl);
      else setBackBlank(previewUrl);
    } finally {
      setBlankBusy(false);
    }
  };

  const confirmBlanksAndEnter = () => {
    if (!frontBlank && !backBlank) {
      setBlankError("Upload at least a front or back garment photo.");
      return;
    }
    const next = applyBlankPhotos(
      variants,
      frontBlank || undefined,
      backBlank || undefined
    );
    onVariantsChange(next);
    enterStudio();
  };

  const title =
    step === "library"
      ? "Choose a design"
      : step === "blank"
        ? "Add a garment blank"
        : step === "studio"
          ? "Design studio"
          : "Design studio";

  const description =
    step === "library"
      ? "Pick artwork from your Design Studio library and place it on this product’s colors."
      : step === "blank"
        ? supplierLabel
          ? `No garment photos on this product yet. Upload a blank, or pull one from ${supplierLabel} when you set up colors.`
          : "Upload a blank garment photo so you can place artwork on it."
        : step === "studio"
          ? "Place artwork on each color, then save decorated mockups back to this product."
          : "Start fresh, or pull artwork from your Design Studio library.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={step !== "studio"}
        className="flex h-[min(94vh,920px)] max-h-[min(94vh,920px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            {step !== "chooser" ? (
              <button
                type="button"
                onClick={goToChooser}
                className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white text-[#616161] transition-colors hover:bg-[#fafafa] hover:text-[#303030]"
                aria-label="Back"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#121a2e]">
                {title}
                {productName?.trim() ? (
                  <span className="font-normal text-[#8a8a8a]">
                    {" "}
                    · {productName.trim()}
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription className="pt-1 text-[13px] text-[#8a8a8a]">
                {description}
              </DialogDescription>
            </div>
            {step === "studio" ? (
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9 shrink-0")}
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === "chooser" ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 p-5 sm:p-8">
              {!hasColors ? (
                <DesignStudioBlankRequired
                  embedded
                  contextLabel="product"
                  addBlankLabel="Set up colors first"
                  onAddBlank={() => {
                    onManageColors?.();
                    onOpenChange(false);
                  }}
                />
              ) : (
                <>
                  {hasArtwork ? (
                    <button
                      type="button"
                      onClick={continueDesigning}
                      className="flex items-start gap-4 rounded-2xl border border-[#2c6ecb]/35 bg-[#f4f7fd] px-5 py-4 text-left transition-colors hover:bg-[#eef3fb]"
                    >
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#2c6ecb] shadow-sm">
                        <Wand2 className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-[#121a2e]">
                          Continue designing
                        </span>
                        <span className={cn("mt-1 block", dashboardTaskDetailClass)}>
                          {hasBlanks
                            ? "Reopen the studio with your current artwork and garment blanks."
                            : "Add a garment blank, then keep editing placement."}
                        </span>
                      </span>
                      <Check className="mt-1 size-4 shrink-0 text-[#2c6ecb]" />
                    </button>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setStep("library")}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-[#e3e3e3] bg-white px-5 py-5 text-left transition-colors hover:border-[#c9d7ef] hover:bg-[#fafafa]"
                    >
                      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[#ebebeb] bg-[#f6f6f7] text-[#303030]">
                        <BookMarked className="size-5" strokeWidth={1.75} />
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-[#121a2e]">
                          From Design Studio library
                        </span>
                        <span
                          className={cn("mt-1 block", dashboardTaskDetailClass)}
                        >
                          Reuse artwork you already saved in Design Studio.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={startNewDesign}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-[#e3e3e3] bg-white px-5 py-5 text-left transition-colors hover:border-[#c9d7ef] hover:bg-[#fafafa]"
                    >
                      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[#ebebeb] bg-[#f6f6f7] text-[#303030]">
                        <Sparkles className="size-5" strokeWidth={1.75} />
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-[#121a2e]">
                          Start a new design
                        </span>
                        <span
                          className={cn("mt-1 block", dashboardTaskDetailClass)}
                        >
                          {hasBlanks
                            ? supplierLabel
                              ? `Uses your ${supplierLabel} garment photos automatically.`
                              : "Uses the blank photos already on this product."
                            : "We’ll ask for a blank garment photo next."}
                        </span>
                      </span>
                    </button>
                  </div>

                  {hasBlanks ? (
                    <p className="rounded-xl border border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-[12px] text-[#616161]">
                      {supplierLabel
                        ? `${enabledVariants.length} color${enabledVariants.length === 1 ? "" : "s"} ready with ${supplierLabel} garment photos.`
                        : `${enabledVariants.length} color${enabledVariants.length === 1 ? "" : "s"} already have blank photos.`}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {step === "library" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-[#ebebeb] px-5 py-3 sm:px-6">
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search designs…"
                    className="h-9 rounded-lg border-[#e3e3e3] bg-white pl-9 text-[13px]"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                {libraryLoading && designs.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
                    <Loader2 className="size-4 animate-spin" />
                    Loading library…
                  </div>
                ) : filteredDesigns.length === 0 ? (
                  <div className="mx-auto max-w-md py-16 text-center">
                    <Shirt className="mx-auto size-8 text-[#a3a3a3]" strokeWidth={1.5} />
                    <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                      No designs found
                    </p>
                    <p className={cn("mt-1", dashboardTaskDetailClass)}>
                      Create a design in Design Studio first, or start a new
                      design here.
                    </p>
                    <Button
                      type="button"
                      className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
                      onClick={startNewDesign}
                    >
                      Start a new design
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDesigns.map((row) => (
                      <DesignThumb
                        key={row.id}
                        design={row}
                        selected={row.id === selectedDesignId}
                        onSelect={() => setSelectedDesignId(row.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ebebeb] px-5 py-3 sm:px-6">
                <p className="truncate text-[12px] text-[#8a8a8a]">
                  {selectedLibraryDesign
                    ? `Selected · ${selectedLibraryDesign.name}`
                    : "Select a design to continue"}
                </p>
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  disabled={!selectedLibraryDesign}
                  onClick={applyLibraryDesign}
                >
                  Use this design
                </Button>
              </div>
            </div>
          ) : null}

          {step === "blank" ? (
            <div className="mx-auto flex max-w-xl flex-col gap-5 p-5 sm:p-8">
              {hasBlanks ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                  Garment photos are ready
                  {supplierLabel ? ` from ${supplierLabel}` : ""}. You can
                  continue, or replace them below.
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#c9cccf] bg-[#fafafa] px-5 py-8 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-dashed border-[#c9ccdf] bg-white">
                    <ImagePlus className="size-5 text-[#8a8a8a]" strokeWidth={1.5} />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#303030]">
                    Add a blank garment photo
                  </p>
                  <p className={cn("mt-1.5 max-w-sm", dashboardTaskDetailClass)}>
                    This is the shirt (or other blank) your artwork sits on.
                    Front is enough to start — back is optional.
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "front" as const,
                      label: "Front",
                      value: frontBlank,
                      ref: frontInputRef,
                    },
                    {
                      key: "back" as const,
                      label: "Back",
                      value: backBlank,
                      ref: backInputRef,
                    },
                  ] as const
                ).map((slot) => (
                  <div key={slot.key} className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      {slot.label}
                    </Label>
                    <input
                      ref={slot.ref}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        void handleBlankFile(
                          event.target.files?.[0] ?? null,
                          slot.key
                        );
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={blankBusy}
                      onClick={() => slot.ref.current?.click()}
                      className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white transition-colors hover:border-[#c9d7ef]"
                    >
                      {slot.value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot.value}
                          alt={`${slot.label} blank`}
                          className="size-full object-contain p-2"
                        />
                      ) : (
                        <>
                          <Upload className="size-5 text-[#8a8a8a]" />
                          <span className="text-[12px] font-medium text-[#616161]">
                            Upload {slot.label.toLowerCase()}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {blankError ? (
                <p className="text-[13px] text-[#b42318]">{blankError}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {hasBlanks ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(dashboardControlClass, "h-10")}
                    onClick={enterStudio}
                  >
                    Use existing blanks
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-10")}
                  disabled={blankBusy || (!frontBlank && !backBlank)}
                  onClick={confirmBlanksAndEnter}
                >
                  {blankBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  Continue to studio
                </Button>
              </div>
            </div>
          ) : null}

          {step === "studio" ? (
            <div className="p-4 sm:p-5">
              <StoreProductDesignStudio
                key={studioKey}
                variants={variants}
                design={design}
                onVariantsChange={onVariantsChange}
                onDesignChange={onDesignChange}
                onError={onError}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
