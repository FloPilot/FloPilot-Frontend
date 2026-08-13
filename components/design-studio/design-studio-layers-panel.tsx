"use client";

import { Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dashboardControlClass, dashboardTaskDetailClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type DesignStudioLayerRow = {
  id: string;
  kind: "blank" | "artwork";
  label: string;
  detail?: string;
  thumbUrl?: string;
  thumbColor?: string;
  /** Blank rows are informational; artwork rows can be selected / deleted. */
  locked?: boolean;
};

export function DesignStudioLayersPanel({
  layers,
  selectedId,
  onSelect,
  onDelete,
  className,
}: {
  layers: DesignStudioLayerRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  className?: string;
}) {
  const artworkCount = layers.filter((layer) => layer.kind === "artwork").length;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Layers
        </Label>
        <span className="inline-flex items-center gap-1 text-[11px] text-[#8a8a8a]">
          <Layers className="size-3" />
          {artworkCount} art
        </span>
      </div>

      {layers.length === 0 ? (
        <p className={dashboardTaskDetailClass}>
          Upload artwork to create a layer you can select and delete.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
          {/* Top of list = top of stack (design-tool convention). */}
          {[...layers].reverse().map((layer, visualIndex) => {
            const selected = selectedId === layer.id && !layer.locked;
            const badge =
              layer.kind === "blank"
                ? "Base"
                : visualIndex === 0
                  ? "Top"
                  : null;
            return (
              <li
                key={layer.id}
                className={cn(
                  "border-b border-[#ebebeb] last:border-b-0",
                  selected ? "bg-[#f4f7fd]" : "bg-white"
                )}
              >
                <div className="flex items-stretch gap-0">
                  <button
                    type="button"
                    disabled={layer.locked}
                    onClick={() => {
                      if (layer.locked) return;
                      onSelect(selected ? null : layer.id);
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                      layer.locked
                        ? "cursor-default"
                        : "hover:bg-[#fafafa]",
                      selected ? "hover:bg-[#f4f7fd]" : null
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border",
                        selected
                          ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
                          : "border-[#e3e3e3]"
                      )}
                      style={
                        !layer.thumbUrl && layer.thumbColor
                          ? { backgroundColor: layer.thumbColor }
                          : { backgroundColor: "#f6f6f7" }
                      }
                    >
                      {layer.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={layer.thumbUrl}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                      ) : layer.kind === "blank" ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Blank
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-[#303030]">
                          {layer.label}
                        </span>
                        {badge ? (
                          <span className="shrink-0 rounded bg-[#f0f0f1] px-1.5 py-0.5 text-[10px] font-medium text-[#616161]">
                            {badge}
                          </span>
                        ) : null}
                      </span>
                      {layer.detail ? (
                        <span className="mt-0.5 block truncate text-[11px] text-[#8a8a8a]">
                          {layer.detail}
                        </span>
                      ) : layer.locked ? (
                        <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                          Garment base
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                          Select to move or delete
                        </span>
                      )}
                    </span>
                  </button>
                  {!layer.locked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        dashboardControlClass,
                        "h-auto shrink-0 rounded-none border-0 border-l border-[#ebebeb] px-3 text-[#8f1f1f] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                      )}
                      aria-label={`Delete ${layer.label}`}
                      onClick={() => onDelete(layer.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
