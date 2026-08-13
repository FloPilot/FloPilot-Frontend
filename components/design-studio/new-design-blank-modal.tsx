"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  AddSsBlankPanel,
  type PickedSupplierBlank,
} from "@/components/orders/add-ss-blank-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESIGN_STUDIO_BASE } from "@/components/layout/nav-config";
import { createDesign, fetchSupplierIntegrations } from "@/lib/api";
import { isImageUpload, readImagePreviewDataUrl } from "@/lib/artwork-preview";
import { upsertDesignStudioCache } from "@/lib/design-studio-cache";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  getPrintLocationOptions,
} from "@/lib/shop-settings";
import {
  isSanMarIntegrationUsable,
  isSsIntegrationUsable,
} from "@/lib/supplier-integrations";
import { cn } from "@/lib/utils";

type BlankSource = "upload" | "ss" | "sanmar";

function SourceTabs({
  source,
  ssConnected,
  sanMarConnected,
  disabled,
  onChange,
}: {
  source: BlankSource;
  ssConnected: boolean;
  sanMarConnected: boolean;
  disabled?: boolean;
  onChange: (source: BlankSource) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-[#ebebeb] bg-[#f6f6f7] p-1">
      {(
        [
          { value: "upload" as const, label: "Upload blank" },
          { value: "ss" as const, label: "S&S", live: ssConnected },
          { value: "sanmar" as const, label: "SanMar", live: sanMarConnected },
        ] as const
      ).map((tab) => (
        <button
          key={tab.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex min-w-[6.5rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
            source === tab.value
              ? "bg-white text-[#303030] shadow-sm"
              : "text-[#616161] hover:text-[#303030]",
            disabled && "opacity-60"
          )}
        >
          {tab.label}
          {"live" in tab && tab.live ? (
            <span className="rounded bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
              Live
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function NewDesignBlankModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const { settings } = useShopSettings();
  const blankInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetKeyRef = useRef<string | null>(null);

  const locationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const [name, setName] = useState("");
  const [source, setSource] = useState<BlankSource>("upload");
  const [blankByLocation, setBlankByLocation] = useState<
    Record<string, string>
  >({});
  const [selectedLocationKeys, setSelectedLocationKeys] = useState<string[]>(
    []
  );
  const [locationsHighlight, setLocationsHighlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssConnected, setSsConnected] = useState(false);
  const [sanMarConnected, setSanMarConnected] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  const reset = () => {
    setName("");
    setSource("upload");
    setBlankByLocation({});
    setSelectedLocationKeys([]);
    setLocationsHighlight(false);
    setBusy(false);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadIntegrations() {
      setLoadingIntegrations(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { integrations } = await fetchSupplierIntegrations(token);
        const ssEntry = integrations.find(
          (entry) => entry.provider === "ssActivewear"
        );
        const sanMarEntry = integrations.find(
          (entry) => entry.provider === "sanMar"
        );
        if (!cancelled) {
          setSsConnected(isSsIntegrationUsable(ssEntry));
          setSanMarConnected(isSanMarIntegrationUsable(sanMarEntry));
        }
      } catch {
        if (!cancelled) {
          setSsConnected(false);
          setSanMarConnected(false);
        }
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    }

    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, open]);

  const handleBlankFile = async (file: File | null, locationKey: string) => {
    if (!file || !locationKey) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP blank photo.");
      return;
    }
    setError(null);
    const dataUrl = await readImagePreviewDataUrl(file);
    if (!dataUrl.previewUrl) {
      setError("Could not read that image.");
      return;
    }
    setBlankByLocation((current) => ({
      ...current,
      [locationKey]: dataUrl.previewUrl!,
    }));
    setSource("upload");
  };

  const openBlankPicker = (locationKey: string) => {
    uploadTargetKeyRef.current = locationKey;
    blankInputRef.current?.click();
  };

  const toggleLocation = (key: string) => {
    setLocationsHighlight(false);
    setSelectedLocationKeys((current) => {
      if (current.includes(key)) {
        setBlankByLocation((blanks) => {
          const next = { ...blanks };
          delete next[key];
          return next;
        });
        return current.filter((entry) => entry !== key);
      }
      return [...current, key];
    });
  };

  const selectedLocations = useMemo(
    () =>
      selectedLocationKeys.map((key) => {
        const match = locationOptions.find((option) => option.value === key);
        return {
          locationKey: key,
          locationLabel: match?.label || key.replace(/_/g, " "),
          blankImageUrl: blankByLocation[key],
        };
      }),
    [blankByLocation, locationOptions, selectedLocationKeys]
  );

  const isVendorSource = source === "ss" || source === "sanmar";
  const multiLocationUpload = selectedLocations.length > 1;

  const uploadBlanksReady =
    selectedLocations.length > 0 &&
    selectedLocations.every((loc) => Boolean(loc.blankImageUrl));

  const requireLocations = () => {
    setLocationsHighlight(true);
    setError("Pick at least one decoration location.");
  };

  const createFromBlank = async (payload: {
    name: string;
    blankImageUrl?: string;
    blankImageFrontUrl?: string;
    blankImageBackUrl?: string;
    blankColorHex?: string;
    previewUrl?: string;
    locations?: Array<{
      locationKey: string;
      locationLabel: string;
      blankImageUrl?: string;
      blankImageFrontUrl?: string;
      blankImageBackUrl?: string;
    }>;
  }) => {
    const locationsPayload = payload.locations || selectedLocations;
    if (locationsPayload.length === 0) {
      requireLocations();
      throw new Error("Pick at least one decoration location.");
    }

    setBusy(true);
    setError(null);
    setLocationsHighlight(false);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { design } = await createDesign(token, {
        name: payload.name,
        stageMode: "garment",
        blankImageUrl: payload.blankImageUrl,
        blankImageFrontUrl: payload.blankImageFrontUrl,
        blankImageBackUrl: payload.blankImageBackUrl,
        blankColorHex: payload.blankColorHex || "#9CA3AF",
        previewUrl: payload.previewUrl,
        locations: locationsPayload.map((loc) => ({
          locationKey: loc.locationKey,
          locationLabel: loc.locationLabel,
          blankImageUrl: loc.blankImageUrl,
          blankImageFrontUrl: loc.blankImageFrontUrl,
          blankImageBackUrl: loc.blankImageBackUrl,
        })),
        locationKey: locationsPayload[0].locationKey,
        locationLabel: locationsPayload[0].locationLabel,
        decoration: "screen_printing",
        author: "Shop",
      });

      upsertDesignStudioCache(design);
      handleOpenChange(false);
      router.push(`${DESIGN_STUDIO_BASE}/${encodeURIComponent(design.id)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create design";
      if (message.includes("decoration location")) {
        requireLocations();
        throw new Error(message);
      }
      const friendly =
        message === "Failed to fetch"
          ? "Could not reach the design service. Try again in a moment."
          : message;
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    if (!name.trim()) {
      setError("Give this design a name.");
      return;
    }
    if (selectedLocations.length === 0) {
      requireLocations();
      return;
    }
    if (!uploadBlanksReady) {
      setError("Upload a blank photo for each selected location.");
      return;
    }
    const primaryBlank = selectedLocations[0]?.blankImageUrl;
    await createFromBlank({
      name: name.trim(),
      blankImageUrl: primaryBlank,
      blankImageFrontUrl: primaryBlank,
      previewUrl: primaryBlank,
      locations: selectedLocations.map((loc) => ({
        locationKey: loc.locationKey,
        locationLabel: loc.locationLabel,
        blankImageUrl: loc.blankImageUrl,
        blankImageFrontUrl: loc.blankImageUrl,
      })),
    });
  };

  const handlePickVendorBlank = async (blank: PickedSupplierBlank) => {
    if (selectedLocations.length === 0) {
      requireLocations();
      throw new Error("Pick at least one decoration location.");
    }

    const fallbackName = [blank.brandName, blank.styleName, blank.colorName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const designName = name.trim() || fallbackName || "New design";
    const frontUrl = blank.frontImageUrl || blank.imageUrl;
    const backUrl = blank.backImageUrl;

    await createFromBlank({
      name: designName,
      blankImageUrl: blank.imageUrl,
      blankImageFrontUrl: frontUrl,
      blankImageBackUrl: backUrl,
      blankColorHex: blank.colorHex || "#9CA3AF",
      previewUrl: blank.imageUrl,
      locations: selectedLocations.map((loc) => ({
        locationKey: loc.locationKey,
        locationLabel: loc.locationLabel,
        blankImageUrl: blank.imageUrl,
        blankImageFrontUrl: frontUrl,
        blankImageBackUrl: backUrl,
      })),
    });
  };

  const vendorConnected =
    source === "ss" ? ssConnected : source === "sanmar" ? sanMarConnected : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className="flex h-[min(90vh,860px)] max-h-[min(90vh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle>New design</DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            {source === "ss"
              ? "Search the S&S catalog and pull a blank photo into Design Studio."
              : source === "sanmar"
                ? "Search SanMar and pull a blank photo into Design Studio."
                : multiLocationUpload
                  ? "Upload a blank photo for each decoration location."
                  : "Upload a garment mockup photo, or pick a blank from S&S / SanMar."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 pt-4",
            source === "upload" ? "pb-0" : "pb-5"
          )}
        >
          <div className="shrink-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-design-name">Design name</Label>
              <Input
                id="new-design-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  isVendorSource
                    ? "Optional — defaults to style + color"
                    : "e.g. Summer promo tee"
                }
                className={cn(dashboardControlClass, "h-9")}
                disabled={busy}
              />
            </div>

            <SourceTabs
              source={source}
              ssConnected={ssConnected}
              sanMarConnected={sanMarConnected}
              disabled={busy}
              onChange={(next) => {
                setError(null);
                setSource(next);
              }}
            />

            <div
              className={cn(
                "space-y-2 rounded-lg p-3 transition-colors",
                locationsHighlight
                  ? "border border-[#f5b5b5] bg-[#fff1f1] ring-2 ring-[#f5b5b5]/60"
                  : "border border-transparent"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Label
                  className={cn(locationsHighlight && "text-[#8f1f1f]")}
                >
                  Decoration locations
                </Label>
                <p
                  className={cn(
                    "text-[11px]",
                    locationsHighlight ? "text-[#8f1f1f]" : "text-[#8a8a8a]"
                  )}
                >
                  {selectedLocations.length} selected
                </p>
              </div>
              <p
                className={cn(
                  "text-[12px]",
                  locationsHighlight ? "font-medium text-[#8f1f1f]" : "text-[#8a8a8a]"
                )}
              >
                {locationsHighlight
                  ? "Select at least one location to continue."
                  : "Choose the spots you&apos;ll design — you can add or remove more later in Design Studio."}
              </p>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map((option) => {
                  const active = selectedLocationKeys.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={busy}
                      onClick={() => toggleLocation(option.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                        active
                          ? "border-brand-primary bg-[#eef1ff] text-[#303030]"
                          : locationsHighlight
                            ? "border-[#f0a8a8] bg-white text-[#616161] hover:border-[#d66]"
                            : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9d7ef]"
                      )}
                    >
                      {active ? (
                        <Check
                          className="size-3 text-[#2c6ecb]"
                          strokeWidth={2.5}
                        />
                      ) : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <input
            ref={blankInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const key = uploadTargetKeyRef.current;
              void handleBlankFile(event.target.files?.[0] ?? null, key || "");
              uploadTargetKeyRef.current = null;
              event.target.value = "";
            }}
          />

          {loadingIntegrations && isVendorSource ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              Checking supplier connections…
            </div>
          ) : isVendorSource ? (
            vendorConnected ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <AddSsBlankPanel
                  key={source}
                  provider={source === "sanmar" ? "sanMar" : "ssActivewear"}
                  pickMode="blankImage"
                  hidePricing
                  saving={busy}
                  onPickBlank={handlePickVendorBlank}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#d4d4d4] px-6 py-10 text-center">
                <p className="text-[14px] font-semibold text-[#303030]">
                  {source === "sanmar"
                    ? "Connect SanMar first"
                    : "Connect S&S Activewear first"}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#616161]">
                  {source === "sanmar"
                    ? "Add your SanMar customer number and SanMar.com login in Settings after web services access is enabled."
                    : "Add your S&S API credentials in Settings to search styles and pull blank photos into Design Studio."}
                </p>
                <Link
                  href="/app/settings/integrations"
                  className={cn(
                    dashboardPrimaryButtonClass,
                    "mt-4 inline-flex h-9 items-center gap-1.5 px-4 text-[13px]"
                  )}
                  onClick={() => handleOpenChange(false)}
                >
                  Open integrations
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            )
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
              {selectedLocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-12 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-white text-[#8a8a8a] shadow-sm">
                    <ImagePlus className="size-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#303030]">
                      Select locations above first
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      Then upload a blank photo for each one
                    </p>
                  </div>
                </div>
              ) : multiLocationUpload ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedLocations.map((loc) => (
                    <button
                      key={loc.locationKey}
                      type="button"
                      disabled={busy}
                      onClick={() => openBlankPicker(loc.locationKey)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-[#fafafa] px-3 py-5 text-center transition-colors hover:border-[#2c6ecb] hover:bg-[#f4f7fd]",
                        loc.blankImageUrl
                          ? "border-[#c9d7ef]"
                          : "border-[#d4d4d4]"
                      )}
                    >
                      {loc.blankImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={loc.blankImageUrl}
                          alt={`${loc.locationLabel} blank`}
                          className="max-h-32 w-full object-contain"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-full bg-white text-[#2c6ecb] shadow-sm">
                          <ImagePlus className="size-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-medium text-[#303030]">
                          {loc.locationLabel}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                          {loc.blankImageUrl
                            ? "Click to replace blank photo"
                            : "Upload blank photo"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    openBlankPicker(selectedLocations[0]?.locationKey || "")
                  }
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-10 text-center transition-colors hover:border-[#2c6ecb] hover:bg-[#f4f7fd]"
                  )}
                >
                  {selectedLocations[0]?.blankImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedLocations[0].blankImageUrl}
                      alt="Blank preview"
                      className="max-h-48 w-full object-contain"
                    />
                  ) : (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-full bg-white text-[#2c6ecb] shadow-sm">
                        <ImagePlus className="size-5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#303030]">
                          Upload blank mockup
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                          PNG, JPG, or WebP garment photo
                        </p>
                      </div>
                    </>
                  )}
                </button>
              )}
              {selectedLocations.length === 1 &&
              selectedLocations[0]?.blankImageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(dashboardControlClass, "h-9 w-full")}
                  disabled={busy}
                  onClick={() =>
                    openBlankPicker(selectedLocations[0]?.locationKey || "")
                  }
                >
                  <Upload className="size-3.5" />
                  Replace blank photo
                </Button>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {source === "upload" ? (
          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t border-[#ebebeb] bg-white px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              disabled={busy}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={busy || !name.trim()}
              onClick={() => void handleConfirm()}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Confirm blank
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
