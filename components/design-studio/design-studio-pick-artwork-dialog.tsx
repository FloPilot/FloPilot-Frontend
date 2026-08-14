"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Loader2, Search, Shirt } from "lucide-react";
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
import { useDesignStudioDesigns } from "@/lib/design-studio-cache";
import {
  createArtLayer,
  normalizeArtLayers,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import {
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import { defaultTransform } from "@/lib/order-design-mockup";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type { SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

/** Prefer raw art layers; fall back to artwork preview (not composed mockup). */
export function artLayersFromSavedDesign(
  design: SavedDesign
): DesignMockupArtLayer[] {
  const mockup =
    design.designMockup || design.locations?.[0]?.designMockup || undefined;
  const layers = normalizeArtLayers(mockup);
  if (layers.length > 0) return layers;

  // Prefer artwork.previewUrl when it looks like source art. Avoid using
  // composedPreviewUrl alone — that includes the blank garment.
  const preview = design.artwork?.previewUrl?.trim() || "";
  const composed = mockup?.composedPreviewUrl?.trim() || "";
  if (preview && preview !== composed) {
    return [
      createArtLayer(
        preview,
        mockup?.transform || defaultTransform(),
        design.name || "Artwork"
      ),
    ];
  }
  if (mockup?.artworkUrl) {
    return normalizeArtLayers(mockup);
  }
  if (preview) {
    return [
      createArtLayer(
        preview,
        mockup?.transform || defaultTransform(),
        design.name || "Artwork"
      ),
    ];
  }
  return [];
}

function ArtworkThumb({
  design,
  selected,
  onSelect,
}: {
  design: SavedDesign;
  selected: boolean;
  onSelect: () => void;
}) {
  const layers = artLayersFromSavedDesign(design);
  const preview =
    layers[layers.length - 1]?.cleanUrl ||
    layers[layers.length - 1]?.url ||
    design.artwork?.previewUrl ||
    design.designMockup?.composedPreviewUrl ||
    "";
  const bgColor = useImageBackgroundColor(preview || null);
  const hasArt = layers.length > 0 || Boolean(design.artwork?.previewUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!hasArt}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-[#2c6ecb] bg-[#f7faff] ring-1 ring-[#2c6ecb]/25"
          : "border-[#e3e3e3] bg-white hover:border-[#c9d7ef]",
        !hasArt && "cursor-not-allowed opacity-50"
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

export function DesignStudioPickArtworkDialog({
  open,
  onOpenChange,
  excludeDesignId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hide the design currently being edited. */
  excludeDesignId?: string | null;
  onPick: (layers: DesignMockupArtLayer[], source: SavedDesign) => void;
}) {
  const { getIdToken } = useAuth();
  const { designs, loading, refresh } = useDesignStudioDesigns(getIdToken);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedId(null);
    void refresh();
  }, [open, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designs.filter((design) => {
      if (excludeDesignId && design.id === excludeDesignId) return false;
      const layers = artLayersFromSavedDesign(design);
      if (layers.length === 0 && !design.artwork?.previewUrl) return false;
      if (!q) return true;
      const hay = [
        design.name,
        design.locationLabel,
        design.customerName,
        design.company,
        decorationLabel(design.decoration),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [designs, excludeDesignId, query]);

  const selected = designs.find((design) => design.id === selectedId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,820px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[#121a2e]">
            <BookMarked className="size-4 text-[#2c6ecb]" />
            Choose artwork
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px] text-[#8a8a8a]">
            Pick art from your Design Studio / Artwork library and place it on
            this blank. Saving keeps this as its own design file.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-[#ebebeb] px-5 py-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artwork…"
              className="h-9 rounded-lg border-[#e3e3e3] bg-white pl-9 text-[13px]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && designs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              Loading artwork…
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-sm py-16 text-center">
              <Shirt className="mx-auto size-8 text-[#a3a3a3]" strokeWidth={1.5} />
              <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                No artwork found
              </p>
              <p className={cn("mt-1", dashboardTaskDetailClass)}>
                Upload artwork on a design first, or add a file in the Artwork
                library.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((design) => (
                <ArtworkThumb
                  key={design.id}
                  design={design}
                  selected={design.id === selectedId}
                  onSelect={() => setSelectedId(design.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ebebeb] px-5 py-3">
          <p className="truncate text-[12px] text-[#8a8a8a]">
            {selected ? `Selected · ${selected.name}` : "Select artwork to add"}
          </p>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              const layers = artLayersFromSavedDesign(selected);
              if (layers.length === 0) return;
              onPick(layers, selected);
              onOpenChange(false);
            }}
          >
            Use artwork
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
