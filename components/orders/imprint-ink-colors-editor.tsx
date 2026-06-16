"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFlashInkColor,
  createInkColorId,
  SQUEEGEE_OPTIONS,
} from "@/lib/imprint-design";
import type { ImprintInkColor } from "@/types";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-9 rounded-lg border-border/80 bg-white text-sm shadow-none";

export function ImprintInkColorsEditor({
  inkColors,
  onChange,
  readOnly = false,
  compact = false,
}: {
  inkColors: ImprintInkColor[];
  onChange: (inkColors: ImprintInkColor[]) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const updateRow = (id: string, patch: Partial<ImprintInkColor>) => {
    onChange(
      inkColors.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (id: string) => {
    onChange(inkColors.filter((row) => row.id !== id));
  };

  const addColorRow = () => {
    onChange([
      ...inkColors,
      {
        id: createInkColorId(),
        name: "",
        pmsCode: "",
        mesh: undefined,
        squeegee: "medium",
        isFlash: false,
      },
    ]);
  };

  const addFlashRow = () => {
    onChange([...inkColors, createFlashInkColor()]);
  };

  if (readOnly && inkColors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ink colors assigned yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/70",
          compact && "text-sm"
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_72px_88px_40px] gap-2 border-b border-border/70 bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>PMS</span>
          <span>Ink / stroke</span>
          <span>Mesh</span>
          <span>Squeegee</span>
          <span className="sr-only">Remove</span>
        </div>

        {inkColors.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Add ink colors and flash strokes for this location.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {inkColors.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_72px_88px_40px] gap-2 px-3 py-2 items-center",
                  row.isFlash && "bg-amber-50/60"
                )}
              >
                {readOnly ? (
                  <>
                    <span className="font-mono text-xs">
                      {row.isFlash ? "—" : row.pmsCode || "—"}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {row.isFlash && (
                        <Zap className="size-3.5 text-amber-600 shrink-0" />
                      )}
                      {row.name || "—"}
                    </span>
                    <span>{row.mesh ?? "—"}</span>
                    <span className="capitalize">{row.squeegee ?? "—"}</span>
                    <span />
                  </>
                ) : (
                  <>
                    <Input
                      value={row.pmsCode ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, { pmsCode: event.target.value })
                      }
                      placeholder={row.isFlash ? "—" : "289 C"}
                      disabled={row.isFlash}
                      className={inputClassName}
                    />
                    <Input
                      value={row.name}
                      onChange={(event) =>
                        updateRow(row.id, { name: event.target.value })
                      }
                      placeholder={row.isFlash ? "Flash" : "White"}
                      className={inputClassName}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={row.mesh ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, {
                          mesh: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                      placeholder="160"
                      className={inputClassName}
                    />
                    <Select
                      value={row.squeegee ?? "medium"}
                      onValueChange={(value) =>
                        updateRow(row.id, {
                          squeegee: value as ImprintInkColor["squeegee"],
                        })
                      }
                    >
                      <SelectTrigger className={cn(inputClassName, "w-full")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SQUEEGEE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                      aria-label="Remove ink row"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={addColorRow}
          >
            <Plus className="size-3.5" />
            Add color
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={addFlashRow}
          >
            <Zap className="size-3.5" />
            Add flash
          </Button>
        </div>
      )}
    </div>
  );
}
