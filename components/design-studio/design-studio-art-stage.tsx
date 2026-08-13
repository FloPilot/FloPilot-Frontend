"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  activeLayerUrl,
  type DesignMockupArtLayer,
} from "@/lib/design-studio-layers";
import {
  ArtworkLoadError,
  composeDesignMockup,
} from "@/lib/order-design-mockup";
import { dashboardInsetSurfaceClass } from "@/lib/dashboard-styles";
import type { OrderDesignMockup } from "@/types";
import { cn } from "@/lib/utils";

type StageTransform = OrderDesignMockup["transform"];

type DragMode =
  | { kind: "move"; startX: number; startY: number; originX: number; originY: number }
  | {
      kind: "resize";
      startX: number;
      startY: number;
      originScale: number;
      originX: number;
      originY: number;
    };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Stable blank base + live selected-layer overlay with a resize box.
 * Avoids recomposing (and reloading) the blank on every scale tick.
 */
export function DesignStudioArtStage({
  blankImageUrl,
  blankColorHex,
  stageMode,
  stageBg,
  layers,
  selectedLayerId,
  onSelectLayer,
  onChangeTransform,
}: {
  blankImageUrl?: string;
  blankColorHex?: string;
  stageMode?: "garment" | "color";
  stageBg?: string | null;
  layers: DesignMockupArtLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onChangeTransform: (
    layerId: string,
    partial: Partial<StageTransform>
  ) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode | null>(null);
  const [basePreviewUrl, setBasePreviewUrl] = useState<string | undefined>();
  const [composingBase, setComposingBase] = useState(false);
  const [artAspect, setArtAspect] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const isColorStage = stageMode === "color";
  const selectedLayer =
    layers.find((layer) => layer.id === selectedLayerId) || null;
  const selectedUrl = selectedLayer
    ? activeLayerUrl(selectedLayer) || selectedLayer.url
    : null;
  const transform = selectedLayer?.transform;

  // Compose blank + non-selected layers only (stable while resizing selected art).
  const baseKey = JSON.stringify({
    blank: blankImageUrl,
    hex: blankColorHex,
    stage: stageMode,
    layers: layers
      .filter((layer) => layer.id !== selectedLayerId)
      .map((layer) => ({
        id: layer.id,
        url: activeLayerUrl(layer) || layer.url,
        transform: layer.transform,
      })),
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setComposingBase(true);
      setError(null);
      try {
        const otherLayers = layers
          .filter((layer) => layer.id !== selectedLayerId)
          .map((layer) => {
            const url = activeLayerUrl(layer) || layer.url;
            if (!url) return null;
            return { url, transform: layer.transform };
          })
          .filter(Boolean) as Array<{ url: string; transform: StageTransform }>;

        const composed = await composeDesignMockup({
          blankImageUrl: isColorStage ? undefined : blankImageUrl,
          blankColorHex: blankColorHex || "#9CA3AF",
          stageMode: isColorStage ? "color" : "garment",
          artworkLayers: otherLayers,
          transform: { x: 0.5, y: 0.5, scale: 0.28, rotation: 0 },
        });
        if (!cancelled) setBasePreviewUrl(composed);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ArtworkLoadError
              ? err.message
              : "Could not prepare blank"
          );
        }
      } finally {
        if (!cancelled) setComposingBase(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // baseKey captures blank + other layers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  useEffect(() => {
    if (!selectedUrl) {
      setArtAspect(1);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setArtAspect(
        img.naturalHeight / Math.max(1, img.naturalWidth) || 1
      );
    };
    img.onerror = () => {
      if (!cancelled) setArtAspect(1);
    };
    img.src = selectedUrl;
    return () => {
      cancelled = true;
    };
  }, [selectedUrl]);

  const onStagePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !selectedLayer || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (drag.kind === "move") {
      const dx = (event.clientX - drag.startX) / rect.width;
      const dy = (event.clientY - drag.startY) / rect.height;
      onChangeTransform(selectedLayer.id, {
        x: clamp(drag.originX + dx, 0.08, 0.92),
        y: clamp(drag.originY + dy, 0.08, 0.92),
      });
      return;
    }

    const cx = rect.left + rect.width * drag.originX;
    const cy = rect.top + rect.height * drag.originY;
    const startDist = Math.hypot(drag.startX - cx, drag.startY - cy) || 1;
    const nextDist = Math.hypot(event.clientX - cx, event.clientY - cy);
    const nextScale = clamp(
      drag.originScale * (nextDist / startDist),
      0.08,
      0.75
    );
    onChangeTransform(selectedLayer.id, { scale: nextScale });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      onStagePointerMove({
        clientX: event.clientX,
        clientY: event.clientY,
      } as React.PointerEvent);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer, onChangeTransform]);

  const boxWidthPct = (transform?.scale ?? 0.28) * 100;
  const boxHeightPct = boxWidthPct * artAspect;

  return (
    <div className="w-full max-w-[420px] shrink-0">
      <div
        ref={stageRef}
        className={cn(
          dashboardInsetSurfaceClass,
          "relative aspect-square w-full touch-none overflow-hidden rounded-lg"
        )}
        style={{
          backgroundColor:
            stageBg ||
            (isColorStage ? blankColorHex : undefined) ||
            "#f6f6f7",
        }}
        onPointerDown={() => {
          if (dragRef.current) return;
          onSelectLayer(null);
        }}
      >
        {basePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={basePreviewUrl}
            alt="Blank base"
            className="absolute inset-0 size-full object-contain"
            draggable={false}
          />
        ) : null}

        {selectedLayer && selectedUrl && transform ? (
          <div
            className="absolute z-10 cursor-move"
            style={{
              left: `${transform.x * 100}%`,
              top: `${transform.y * 100}%`,
              width: `${boxWidthPct}%`,
              height: `${boxHeightPct}%`,
              transform: `translate(-50%, -50%) rotate(${transform.rotation || 0}deg)`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              onSelectLayer(selectedLayer.id);
              dragRef.current = {
                kind: "move",
                startX: event.clientX,
                startY: event.clientY,
                originX: transform.x,
                originY: transform.y,
              };
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedUrl}
              alt={selectedLayer.label || "Artwork"}
              className="size-full object-contain"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 border-2 border-white shadow-[0_0_0_1px_rgba(44,110,203,0.9)]" />
            {(
              [
                { key: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
                { key: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
                { key: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
                { key: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
              ] as const
            ).map((handle) => (
              <button
                key={handle.key}
                type="button"
                aria-label={`Resize ${handle.key}`}
                className={cn(
                  "pointer-events-auto absolute size-3 rounded-sm border border-[#2c6ecb] bg-white shadow-sm",
                  handle.className
                )}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragRef.current = {
                    kind: "resize",
                    startX: event.clientX,
                    startY: event.clientY,
                    originScale: transform.scale,
                    originX: transform.x,
                    originY: transform.y,
                  };
                }}
              />
            ))}
            <p className="pointer-events-none absolute -bottom-6 left-0 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-[#616161] tabular-nums">
              {Math.round(transform.scale * 100)}%
            </p>
          </div>
        ) : null}

        {composingBase ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#f7f7f8]/80">
            <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
            <p className="text-[13px] font-medium text-[#616161]">
              Preparing blank…
            </p>
          </div>
        ) : null}

        {!composingBase && selectedLayer ? (
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#616161]">
            Drag to move · corner handles to resize · click blank to deselect
          </p>
        ) : !composingBase && layers.length > 0 ? (
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#616161]">
            Select a layer to edit placement
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-[12px] text-[#b42318]">{error}</p>
      ) : null}
    </div>
  );
}

/** Full flatten for save / library preview (includes selected overlay layer). */
export async function composeFullDesignPreview(options: {
  blankImageUrl?: string;
  blankColorHex?: string;
  stageMode?: "garment" | "color";
  layers: DesignMockupArtLayer[];
  fallbackTransform: StageTransform;
}): Promise<string> {
  const artworkLayers = options.layers
    .map((layer) => {
      const url = activeLayerUrl(layer) || layer.url;
      if (!url) return null;
      return { url, transform: layer.transform };
    })
    .filter(Boolean) as Array<{ url: string; transform: StageTransform }>;

  return composeDesignMockup({
    blankImageUrl:
      options.stageMode === "color" ? undefined : options.blankImageUrl,
    blankColorHex: options.blankColorHex || "#9CA3AF",
    stageMode: options.stageMode === "color" ? "color" : "garment",
    artworkLayers,
    transform: options.fallbackTransform,
  });
}
