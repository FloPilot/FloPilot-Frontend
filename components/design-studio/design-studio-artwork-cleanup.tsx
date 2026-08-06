"use client";

import { useEffect, useRef, useState } from "react";
import {
  Droplet,
  Eraser,
  Loader2,
  Pipette,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  detectArtworkColors,
  formatDetectedColorsForNotes,
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

export function DesignStudioArtworkCleanup({
  originalUrl,
  workingUrl,
  disabled,
  onApplyCleanUrl,
  onDetectedColors,
}: {
  /** First uploaded artwork (restore target). */
  originalUrl: string;
  /** Current art on the stage (original or last cleaned/recolored result). */
  workingUrl: string;
  disabled?: boolean;
  onApplyCleanUrl: (cleanUrl: string) => void;
  onDetectedColors?: (colors: DetectedArtworkColor[]) => void;
}) {
  const [colors, setColors] = useState<DetectedArtworkColor[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tolerance, setTolerance] = useState(48);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replaceHex, setReplaceHex] = useState("#2C6ECB");
  const onDetectedRef = useRef(onDetectedColors);
  onDetectedRef.current = onDetectedColors;
  const detectEpochRef = useRef(0);

  const runDetect = async (url: string, opts?: { quiet?: boolean }) => {
    const epoch = ++detectEpochRef.current;
    if (!opts?.quiet) setBusy("Detecting colors…");
    setError(null);
    try {
      const detected = await detectArtworkColors(url, 6);
      if (epoch !== detectEpochRef.current) return;
      setColors(detected);
      setSelectedIds(new Set());
      onDetectedRef.current?.(detected);
    } catch {
      if (epoch !== detectEpochRef.current) return;
      setColors([]);
      setError("Could not read colors from this artwork.");
    } finally {
      if (epoch === detectEpochRef.current && !opts?.quiet) setBusy(null);
    }
  };

  useEffect(() => {
    void runDetect(workingUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingUrl]);

  const selectedColors = colors.filter((color) => selectedIds.has(color.id));

  const toggleColor = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAutoClean = async () => {
    setBusy("Auto-cleaning background…");
    setError(null);
    try {
      const cleaned = await removeImageBackground(workingUrl);
      onApplyCleanUrl(cleaned);
      // Parent updates workingUrl → detect effect refreshes the list.
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
    const removedIds = new Set(selectedColors.map((c) => c.id));
    const removedCodes = new Set(
      selectedColors
        .map((c) => c.pantoneCode)
        .filter((code): code is string => Boolean(code))
    );
    setBusy("Removing selected colors…");
    setError(null);
    try {
      // Slightly wider than the slider so anti-aliased edges of the
      // selected ink actually clear instead of reappearing as 1–3% noise.
      const wipeTolerance = Math.max(tolerance, 56);
      const cleaned = await removeColorsFromImage(
        workingUrl,
        selectedColors.map((color) => ({
          r: color.r,
          g: color.g,
          b: color.b,
        })),
        wipeTolerance
      );
      setColors((current) =>
        current.filter(
          (c) =>
            !removedIds.has(c.id) &&
            !(c.pantoneCode && removedCodes.has(c.pantoneCode))
        )
      );
      setSelectedIds(new Set());
      onApplyCleanUrl(cleaned);
    } catch {
      setError("Could not remove those colors.");
    } finally {
      setBusy(null);
    }
  };

  const handleRecolorSelected = async () => {
    if (selectedColors.length === 0) {
      setError("Select a color to recolor.");
      return;
    }
    const to = hexToRgb(replaceHex);
    if (!to) {
      setError("Pick a valid replacement color.");
      return;
    }
    setBusy("Recoloring artwork…");
    setError(null);
    try {
      const next = await recolorArtworkColors(
        workingUrl,
        selectedColors.map((color) => ({
          r: color.r,
          g: color.g,
          b: color.b,
        })),
        to,
        tolerance
      );
      const pantone = nearestPantoneApprox(to.r, to.g, to.b);
      const nextHex = rgbToHex(to.r, to.g, to.b);
      // Optimistic list update — selected chips become the new color.
      setColors((current) =>
        current.map((color) =>
          selectedIds.has(color.id)
            ? {
                ...color,
                r: to.r,
                g: to.g,
                b: to.b,
                hex: nextHex,
                pantone: pantone.name,
                pantoneCode: pantone.code,
              }
            : color
        )
      );
      setSelectedIds(new Set());
      onApplyCleanUrl(next);
    } catch {
      setError("Could not recolor those pixels.");
      setBusy(null);
    }
  };

  const handleRestoreOriginal = () => {
    onApplyCleanUrl(originalUrl);
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-[#303030]">
            Clean up artwork
          </p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Select colors to remove or recolor. Changes stack on the current
            art.
          </p>
        </div>
        <Pipette className="mt-0.5 size-3.5 shrink-0 text-[#8a8a8a]" />
      </div>

      {busy ? (
        <p className="flex items-center gap-2 text-[12px] text-[#616161]">
          <Loader2 className="size-3.5 animate-spin" />
          {busy}
        </p>
      ) : null}

      {colors.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Detected colors
          </Label>
          <div className="flex flex-col gap-1.5">
            {colors.map((color) => {
              const selected = selectedIds.has(color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  disabled={disabled || Boolean(busy)}
                  onClick={() => toggleColor(color.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border bg-white px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "border-[#2c6ecb] ring-1 ring-[#2c6ecb]/25"
                      : "border-[#e3e3e3] hover:border-[#c9cccf]"
                  )}
                  title={
                    color.pantoneCode
                      ? `≈ PMS ${color.pantoneCode}`
                      : color.hex
                  }
                >
                  <span
                    className="size-6 shrink-0 rounded-md border border-[#d4d4d4]"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-[#303030]">
                      {color.pantoneCode
                        ? `PMS ${color.pantoneCode}`
                        : color.hex}
                    </span>
                    <span className="block text-[11px] text-[#8a8a8a]">
                      {Math.round(color.share * 100)}% of art
                      {selected ? " · selected" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-[#8a8a8a]">
            Showing inks that make up at least 5% of the art. Digital Pantone
            matches are estimates — confirm with a physical Pantone Solid
            Coated guide before mixing.
          </p>
        </div>
      ) : !busy ? (
        <p className={dashboardTaskDetailClass}>
          No strong colors found — try Auto clean for a white/solid backdrop.
        </p>
      ) : null}

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
          disabled={disabled || Boolean(busy)}
          onChange={(event) => setTolerance(Number(event.target.value))}
          className="w-full accent-[#2c6ecb]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(dashboardControlClass, "h-8")}
          disabled={disabled || Boolean(busy)}
          onClick={() => void handleAutoClean()}
        >
          <Wand2 className="size-3.5" />
          Auto clean
        </Button>
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "h-8")}
          disabled={
            disabled || Boolean(busy) || selectedColors.length === 0
          }
          onClick={() => void handleRemoveSelected()}
        >
          <Eraser className="size-3.5" />
          Remove selected
        </Button>
      </div>

      <div className="space-y-2 border-t border-[#ebebeb] pt-3">
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Recolor selected
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-2 text-[12px] text-[#616161]">
            <Droplet className="size-3.5" />
            <input
              type="color"
              value={replaceHex}
              disabled={disabled || Boolean(busy)}
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
            disabled={
              disabled || Boolean(busy) || selectedColors.length === 0
            }
            onClick={() => void handleRecolorSelected()}
          >
            Apply recolor
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8"
            disabled={disabled || Boolean(busy) || workingUrl === originalUrl}
            onClick={handleRestoreOriginal}
            title="Use original uploaded artwork"
          >
            <RotateCcw className="size-3.5" />
            Original
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-[#f5b5b5] bg-[#fff1f1] px-2.5 py-1.5 text-[12px] text-[#8f1f1f]">
          {error}
        </p>
      ) : null}

      {colors.length > 0 ? (
        <p className="text-[11px] text-[#8a8a8a]">
          Ink hint: {formatDetectedColorsForNotes(colors)}
        </p>
      ) : null}
    </div>
  );
}
