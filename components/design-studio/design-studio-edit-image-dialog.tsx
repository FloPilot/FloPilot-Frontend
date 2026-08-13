"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Check,
  Copy,
  Droplet,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  RotateCcw,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  detectArtworkColors,
  hexToRgb,
  nearestPantoneApprox,
  recolorArtworkColors,
  removeColorsFromImage,
  rgbToHex,
  type DetectedArtworkColor,
} from "@/lib/artwork-color-tools";
import { removeImageBackground } from "@/lib/order-design-mockup";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type EditImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Original uploaded artwork URL (restore target). */
  originalUrl: string;
  /** Current working artwork (may already be cleaned). */
  workingUrl: string;
  fileLabel?: string;
  onApply: (result: {
    cleanUrl: string;
    backgroundRemoved: boolean;
    detectedColors: DetectedArtworkColor[];
  }) => void;
};

export function DesignStudioEditImageDialog({
  open,
  onOpenChange,
  originalUrl,
  workingUrl,
  fileLabel,
  onApply,
}: EditImageDialogProps) {
  const [draftUrl, setDraftUrl] = useState(workingUrl);
  const [colors, setColors] = useState<DetectedArtworkColor[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPmsIds, setSelectedPmsIds] = useState<Set<string>>(new Set());
  const [tolerance, setTolerance] = useState(48);
  const [replaceHex, setReplaceHex] = useState("#2C6ECB");
  const [bgRemoved, setBgRemoved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detectEpochRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setDraftUrl(workingUrl);
    setSelectedIds(new Set());
    setSelectedPmsIds(new Set());
    setError(null);
    setBgRemoved(workingUrl !== originalUrl);
  }, [open, workingUrl, originalUrl]);

  const runDetect = async (url: string) => {
    const epoch = ++detectEpochRef.current;
    setBusy("Detecting colors…");
    setError(null);
    try {
      const detected = await detectArtworkColors(url, 8);
      if (epoch !== detectEpochRef.current) return;
      setColors(detected);
      setSelectedIds(new Set());
    } catch {
      if (epoch !== detectEpochRef.current) return;
      setColors([]);
      setError("Could not read colors from this artwork.");
    } finally {
      if (epoch === detectEpochRef.current) setBusy(null);
    }
  };

  useEffect(() => {
    if (!open || !draftUrl) return;
    void runDetect(draftUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftUrl]);

  const selectedColors = useMemo(
    () => colors.filter((color) => selectedIds.has(color.id)),
    [colors, selectedIds]
  );

  const selectedPmsColors = useMemo(
    () => colors.filter((color) => selectedPmsIds.has(color.id)),
    [colors, selectedPmsIds]
  );

  const toggleColor = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePms = (id: string) => {
    setSelectedPmsIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyDraft = (nextUrl: string, removedBg: boolean) => {
    setDraftUrl(nextUrl);
    setBgRemoved(removedBg);
  };

  const handleToggleBackground = async (enabled: boolean) => {
    if (enabled) {
      setBusy("Removing background…");
      setError(null);
      try {
        const cleaned = await removeImageBackground(draftUrl);
        applyDraft(cleaned, true);
      } catch {
        setError("Could not remove the background. Try selecting colors instead.");
        setBusy(null);
      }
      return;
    }
    applyDraft(originalUrl, false);
  };

  const handleAutoClean = async () => {
    setBusy("Auto-cleaning background…");
    setError(null);
    try {
      const cleaned = await removeImageBackground(draftUrl);
      applyDraft(cleaned, true);
    } catch {
      setError("Auto clean failed — try selecting colors instead.");
      setBusy(null);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedColors.length === 0) {
      setError("Select one or more colors to remove.");
      return;
    }
    setBusy("Removing selected colors…");
    setError(null);
    try {
      const wipeTolerance = Math.max(tolerance, 56);
      const cleaned = await removeColorsFromImage(
        draftUrl,
        selectedColors.map((color) => ({
          r: color.r,
          g: color.g,
          b: color.b,
        })),
        wipeTolerance
      );
      setSelectedIds(new Set());
      applyDraft(cleaned, true);
    } catch {
      setError("Could not remove those colors.");
      setBusy(null);
    }
  };

  const handleRecolorSelected = async () => {
    if (selectedColors.length === 0) {
      setError("Select a color to change.");
      return;
    }
    const to = hexToRgb(replaceHex);
    if (!to) {
      setError("Pick a valid replacement color.");
      return;
    }
    setBusy("Changing selected colors…");
    setError(null);
    try {
      const next = await recolorArtworkColors(
        draftUrl,
        selectedColors.map((color) => ({
          r: color.r,
          g: color.g,
          b: color.b,
        })),
        to,
        tolerance
      );
      setSelectedIds(new Set());
      applyDraft(next, true);
    } catch {
      setError("Could not recolor those pixels.");
      setBusy(null);
    }
  };

  const handleDone = () => {
    onApply({
      cleanUrl: draftUrl,
      backgroundRemoved: bgRemoved && draftUrl !== originalUrl,
      detectedColors: selectedPmsColors.length > 0 ? selectedPmsColors : colors,
    });
    onOpenChange(false);
  };

  const displayName =
    fileLabel?.trim() ||
    "Artwork";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,900px)] max-h-[min(92vh,900px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>Edit image</DialogTitle>
              <DialogDescription className={dashboardTaskDetailClass}>
                Clean the artwork, remove or change colors, and mark PMS inks.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-[#8a8a8a] hover:bg-[#f3f3f3] hover:text-[#303030]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-[#ebebeb] lg:w-[300px] lg:border-r lg:border-b-0">
            <div className="flex flex-wrap gap-1 border-b border-[#ebebeb] px-3 py-2">
              {(
                [
                  { icon: AlignCenterHorizontal, label: "Center X" },
                  { icon: AlignCenterVertical, label: "Center Y" },
                  { icon: FlipHorizontal, label: "Flip H" },
                  { icon: FlipVertical, label: "Flip V" },
                  { icon: Copy, label: "Clone" },
                ] as const
              ).map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    title={`${tool.label} — coming soon on the mockup stage`}
                    disabled
                    className="inline-flex size-8 items-center justify-center rounded-md text-[#b0b0b0]"
                  >
                    <Icon className="size-3.5" />
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <p className="truncate text-[12px] font-medium text-[#303030]">
                  {displayName}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                  Edits apply to this artwork layer
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
                <div>
                  <p className="text-[12px] font-semibold text-[#303030]">
                    Remove background
                  </p>
                  <p className="text-[11px] text-[#8a8a8a]">
                    Best on solid / white backdrops
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bgRemoved}
                  disabled={Boolean(busy)}
                  onClick={() => void handleToggleBackground(!bgRemoved)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    bgRemoved ? "bg-[#2c6ecb]" : "bg-[#d4d4d4]"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                      bgRemoved && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Colors
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    disabled={Boolean(busy)}
                    onClick={() => void handleAutoClean()}
                  >
                    <Wand2 className="size-3" />
                    Auto clean
                  </Button>
                </div>
                {colors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => {
                      const selected = selectedIds.has(color.id);
                      return (
                        <button
                          key={color.id}
                          type="button"
                          disabled={Boolean(busy)}
                          title={
                            color.pantoneCode
                              ? `≈ PMS ${color.pantoneCode}`
                              : color.hex
                          }
                          onClick={() => toggleColor(color.id)}
                          className={cn(
                            "relative size-8 rounded-full border-2 transition",
                            selected
                              ? "border-[#2c6ecb]"
                              : "border-transparent ring-1 ring-[#e3e3e3]"
                          )}
                          style={{ backgroundColor: color.hex }}
                        >
                          {selected ? (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                              <Check className="size-3.5 text-white" strokeWidth={3} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : !busy ? (
                  <p className="text-[12px] text-[#8a8a8a]">
                    No strong colors detected yet.
                  </p>
                ) : null}
                <p className="text-[11px] text-[#8a8a8a]">
                  Click colors to select, then remove or change them.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Tolerance
                </Label>
                <input
                  type="range"
                  min={16}
                  max={90}
                  step={1}
                  value={tolerance}
                  disabled={Boolean(busy)}
                  onChange={(event) => setTolerance(Number(event.target.value))}
                  className="w-full accent-[#2c6ecb]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-8")}
                  disabled={Boolean(busy) || selectedColors.length === 0}
                  onClick={() => void handleRemoveSelected()}
                >
                  <Eraser className="size-3.5" />
                  Remove color
                </Button>
                <label
                  className={cn(
                    dashboardControlClass,
                    "inline-flex h-8 cursor-pointer items-center gap-2 px-2.5 text-[12px]"
                  )}
                >
                  <Droplet className="size-3.5 text-[#616161]" />
                  <input
                    type="color"
                    value={replaceHex}
                    disabled={Boolean(busy)}
                    onChange={(event) =>
                      setReplaceHex(event.target.value.toUpperCase())
                    }
                    className="size-5 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(dashboardControlClass, "h-8")}
                  disabled={Boolean(busy) || selectedColors.length === 0}
                  onClick={() => void handleRecolorSelected()}
                >
                  Change color
                </Button>
              </div>

              <div className="space-y-2 border-t border-[#ebebeb] pt-3">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  PMS in artwork
                </Label>
                <p className="text-[11px] leading-snug text-[#8a8a8a]">
                  Select estimated Pantone matches to keep with this design.
                  Confirm with a physical Solid Coated guide before mixing.
                </p>
                {colors.some((color) => color.pantoneCode) ? (
                  <div className="flex flex-col gap-1.5">
                    {colors
                      .filter((color) => color.pantoneCode)
                      .map((color) => {
                        const selected = selectedPmsIds.has(color.id);
                        return (
                          <button
                            key={`pms-${color.id}`}
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => togglePms(color.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg border bg-white px-2.5 py-2 text-left transition-colors",
                              selected
                                ? "border-[#2c6ecb] ring-1 ring-[#2c6ecb]/25"
                                : "border-[#e3e3e3] hover:border-[#c9cccf]"
                            )}
                          >
                            <span
                              className="size-5 shrink-0 rounded-full border border-[#d4d4d4]"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-semibold text-[#303030]">
                                PMS {color.pantoneCode}
                              </span>
                              <span className="block text-[11px] text-[#8a8a8a]">
                                {color.pantone || color.hex} ·{" "}
                                {Math.round(color.share * 100)}%
                              </span>
                            </span>
                            {selected ? (
                              <Check className="size-3.5 text-[#2c6ecb]" />
                            ) : null}
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8a8a8a]">
                    No Pantone estimates yet — upload clearer ink art or clean
                    the background first.
                  </p>
                )}
              </div>

              {busy ? (
                <p className="flex items-center gap-2 text-[12px] text-[#616161]">
                  <Loader2 className="size-3.5 animate-spin" />
                  {busy}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-md border border-[#f5b5b5] bg-[#fff1f1] px-2.5 py-1.5 text-[12px] text-[#8f1f1f]">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-[#ebebeb] px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-9 flex-1")}
                disabled={Boolean(busy) || draftUrl === originalUrl}
                onClick={() => applyDraft(originalUrl, false)}
              >
                <RotateCcw className="size-3.5" />
                Original
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9 flex-1")}
                disabled={Boolean(busy)}
                onClick={handleDone}
              >
                Done
              </Button>
            </div>
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[#ececee] p-6">
            <div
              className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-lg border border-[#d8d8d8] bg-[length:16px_16px] bg-[linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3),linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3)] bg-[position:0_0,8px_8px]"
              style={{ backgroundColor: "#ffffff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draftUrl}
                alt="Artwork preview"
                className="max-h-[min(70vh,640px)] max-w-full object-contain"
                draggable={false}
              />
            </div>
            {selectedColors.length > 0 ? (
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-[#303030] shadow-sm">
                {selectedColors.length} color
                {selectedColors.length === 1 ? "" : "s"} selected
                {selectedColors[0]?.pantoneCode
                  ? ` · ≈ PMS ${selectedColors[0].pantoneCode}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Map detected colors into a compact PMS note for design notes / ink hints. */
export function formatSelectedPmsForNotes(
  colors: DetectedArtworkColor[]
): string {
  const codes = colors
    .map((color) => color.pantoneCode)
    .filter((code): code is string => Boolean(code));
  if (codes.length === 0) return "";
  return codes.map((code) => `PMS ${code}`).join(", ");
}

export function approxPmsForHex(hex: string): { code: string; name: string } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const match = nearestPantoneApprox(rgb.r, rgb.g, rgb.b);
  return { code: match.code, name: match.name };
}

export function hexFromDetected(color: DetectedArtworkColor): string {
  return color.hex || rgbToHex(color.r, color.g, color.b);
}
