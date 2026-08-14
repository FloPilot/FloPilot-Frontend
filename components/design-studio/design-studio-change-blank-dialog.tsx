"use client";

import { useEffect, useState } from "react";
import { Loader2, Shirt, Upload } from "lucide-react";
import {
  AddSsBlankPanel,
  type PickedSupplierBlank,
} from "@/components/orders/add-ss-blank-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isImageUpload, readImagePreviewDataUrl } from "@/lib/artwork-preview";
import { fetchSupplierIntegrations } from "@/lib/api";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  isSanMarIntegrationUsable,
  isSsIntegrationUsable,
  type SupplierProviderId,
} from "@/lib/supplier-integrations";
import { cn } from "@/lib/utils";

export type ChangedBlank = {
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  colorHex?: string;
  label?: string;
};

type BlankSource = "upload" | "ss" | "sanmar";

/**
 * Swap the garment blank on an existing Design Studio mockup —
 * upload a photo or pull a different color/style from S&S / SanMar.
 */
export function DesignStudioChangeBlankDialog({
  open,
  onOpenChange,
  onChangeBlank,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeBlank: (blank: ChangedBlank) => void;
}) {
  const { getIdToken } = useAuth();
  const [source, setSource] = useState<BlankSource>("upload");
  const [ssConnected, setSsConnected] = useState(false);
  const [sanMarConnected, setSanMarConnected] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource("upload");
    setPreview(null);
    setError(null);
    setBusy(false);

    let cancelled = false;
    setLoadingIntegrations(true);
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { integrations } = await fetchSupplierIntegrations(token);
        if (cancelled) return;
        setSsConnected(
          integrations.some(
            (row) =>
              row.provider === "ssActivewear" && isSsIntegrationUsable(row)
          )
        );
        setSanMarConnected(
          integrations.some(
            (row) => row.provider === "sanMar" && isSanMarIntegrationUsable(row)
          )
        );
      } catch {
        if (!cancelled) {
          setSsConnected(false);
          setSanMarConnected(false);
        }
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, getIdToken]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!isImageUpload(file)) {
      setError("Upload a PNG, JPG, or WebP garment photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { previewUrl, error: readError } = await readImagePreviewDataUrl(file);
      if (!previewUrl) {
        setError(readError || "Could not read that photo.");
        return;
      }
      setPreview(previewUrl);
    } finally {
      setBusy(false);
    }
  };

  const confirmUpload = () => {
    if (!preview) {
      setError("Upload a blank photo first.");
      return;
    }
    onChangeBlank({ imageUrl: preview, frontImageUrl: preview });
    onOpenChange(false);
  };

  const handlePickVendor = async (blank: PickedSupplierBlank) => {
    onChangeBlank({
      imageUrl: blank.imageUrl,
      frontImageUrl: blank.frontImageUrl || blank.imageUrl,
      backImageUrl: blank.backImageUrl,
      colorHex: blank.colorHex,
      label: [blank.brandName, blank.styleName, blank.colorName]
        .filter(Boolean)
        .join(" · "),
    });
    onOpenChange(false);
  };

  const vendorConnected =
    source === "ss" ? ssConnected : source === "sanmar" ? sanMarConnected : false;
  const vendorProvider: SupplierProviderId =
    source === "sanmar" ? "sanMar" : "ssActivewear";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,860px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-[#121a2e]">
            Change blank
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px] text-[#8a8a8a]">
            Pick a different garment color or photo. Your artwork stays in place
            — save when you’re happy with the new blank.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-[#ebebeb] px-5 py-3">
          <div className="flex w-fit gap-1 rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-1">
            {(
              [
                { value: "upload" as const, label: "Upload", live: true },
                { value: "ss" as const, label: "S&S", live: ssConnected },
                {
                  value: "sanmar" as const,
                  label: "SanMar",
                  live: sanMarConnected,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                disabled={loadingIntegrations && tab.value !== "upload"}
                onClick={() => {
                  setSource(tab.value);
                  setError(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  source === tab.value
                    ? "bg-white text-[#303030] shadow-sm"
                    : "text-[#616161] hover:text-[#303030]",
                  tab.value !== "upload" && !tab.live && "opacity-60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {source === "upload" ? (
            <div className="mx-auto flex max-w-md flex-col gap-4">
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[#c9cccf] bg-[#fafafa] transition-colors hover:border-[#c9d7ef]">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Blank preview"
                    className="size-full object-contain p-3"
                  />
                ) : (
                  <>
                    <Shirt className="size-8 text-[#a3a3a3]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-[#616161]">
                      {busy ? "Reading photo…" : "Upload garment photo"}
                    </span>
                  </>
                )}
              </label>
              {error ? (
                <p className="text-[13px] text-[#b42318]">{error}</p>
              ) : (
                <p className={dashboardTaskDetailClass}>
                  Use a flat product photo of the color you want. Artwork on this
                  design will stay where you placed it.
                </p>
              )}
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-10")}
                disabled={!preview || busy}
                onClick={confirmUpload}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Use this blank
              </Button>
            </div>
          ) : loadingIntegrations ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              Checking suppliers…
            </div>
          ) : !vendorConnected ? (
            <div className="mx-auto max-w-md py-12 text-center">
              <p className="text-[14px] font-semibold text-[#303030]">
                {source === "ss" ? "S&S" : "SanMar"} isn’t connected
              </p>
              <p className={cn("mt-1", dashboardTaskDetailClass)}>
                Connect the supplier in Settings → Integrations, or upload a
                blank photo instead.
              </p>
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "mt-4 h-9")}
                onClick={() => setSource("upload")}
              >
                Upload a blank
              </Button>
            </div>
          ) : (
            <AddSsBlankPanel
              provider={vendorProvider}
              pickMode="blankImage"
              onPickBlank={handlePickVendor}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
