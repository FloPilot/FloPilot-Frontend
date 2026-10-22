"use client";

import { Plus, Trash2 } from "lucide-react";
import { ShopPresetSelect } from "@/components/orders/shop-preset-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
} from "@/lib/dashboard-styles";
import {
  getEmbroideryBackingOptions,
  getEmbroideryHoopOptions,
} from "@/lib/shop-settings";
import type {
  EmbroideryExtraLine,
  EmbroideryThreadLine,
  ImprintProductionNotes,
} from "@/types";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  dashboardControlClass,
  "h-9 w-full justify-start px-3 text-[13px] shadow-none"
);

function createLineId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function ReadValue({ value }: { value?: string | null }) {
  return (
    <p className="text-sm font-medium text-[#303030]">{value?.trim() || "—"}</p>
  );
}

export function EmbroideryMethodSpecs({
  notes,
  readOnly = false,
  productionDefaults,
  onChange,
}: {
  notes: ImprintProductionNotes;
  readOnly?: boolean;
  productionDefaults?: Parameters<typeof getEmbroideryHoopOptions>[0];
  onChange: (patch: Partial<ImprintProductionNotes>) => void;
}) {
  const hoopOptions = getEmbroideryHoopOptions(productionDefaults);
  const backingOptions = getEmbroideryBackingOptions(productionDefaults);
  const threads = notes.embroideryThreads ?? [];
  const extras = notes.embroideryExtras ?? [];

  const patchThreads = (next: EmbroideryThreadLine[]) => {
    onChange({ embroideryThreads: next });
  };

  const patchExtras = (next: EmbroideryExtraLine[]) => {
    onChange({ embroideryExtras: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
        Embroidery settings
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Stitch count
          </Label>
          {readOnly ? (
            <ReadValue value={notes.stitchCount} />
          ) : (
            <Input
              value={notes.stitchCount ?? ""}
              onChange={(event) =>
                onChange({ stitchCount: event.target.value })
              }
              placeholder="e.g. 8500"
              className={fieldClassName}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Hoop size
          </Label>
          {readOnly ? (
            <ReadValue
              value={
                hoopOptions.find(
                  (option) => option.value === notes.embroideryHoopSizeId
                )?.label ?? notes.embroideryHoopSizeId
              }
            />
          ) : (
            <ShopPresetSelect
              value={notes.embroideryHoopSizeId ?? ""}
              options={hoopOptions}
              onChange={(value) =>
                onChange({ embroideryHoopSizeId: value || undefined })
              }
              className={fieldClassName}
              placeholder="Select hoop"
            />
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Backing
          </Label>
          {readOnly ? (
            <ReadValue
              value={
                backingOptions.find(
                  (option) => option.value === notes.embroideryBackingType
                )?.label ?? notes.embroideryBackingType
              }
            />
          ) : (
            <ShopPresetSelect
              value={notes.embroideryBackingType ?? ""}
              options={backingOptions}
              onChange={(value) =>
                onChange({ embroideryBackingType: value || undefined })
              }
              className={fieldClassName}
              placeholder="Select backing"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Thread color / # · MFG code
          </p>
          {!readOnly ? (
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-7 text-[11px]")}
              onClick={() =>
                patchThreads([
                  ...threads,
                  { id: createLineId("thread"), color: "", mfgCode: "" },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add thread
            </Button>
          ) : null}
        </div>
        {threads.length === 0 ? (
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "px-3 py-4 text-[12px] text-[#8a8a8a]"
            )}
          >
            {readOnly
              ? "No thread colors set."
              : "Add thread colors and manufacturer codes for this embroidery."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {threads.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2"
              >
                <span className="text-[11px] font-medium text-[#8a8a8a]">
                  {index + 1}
                </span>
                {readOnly ? (
                  <>
                    <ReadValue value={row.color} />
                    <ReadValue value={row.mfgCode} />
                    <span />
                  </>
                ) : (
                  <>
                    <Input
                      value={row.color ?? ""}
                      onChange={(event) =>
                        patchThreads(
                          threads.map((entry) =>
                            entry.id === row.id
                              ? { ...entry, color: event.target.value }
                              : entry
                          )
                        )
                      }
                      placeholder="Color / #"
                      className={fieldClassName}
                    />
                    <Input
                      value={row.mfgCode ?? ""}
                      onChange={(event) =>
                        patchThreads(
                          threads.map((entry) =>
                            entry.id === row.id
                              ? { ...entry, mfgCode: event.target.value }
                              : entry
                          )
                        )
                      }
                      placeholder="MFG code"
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#b42318]"
                      aria-label="Remove thread"
                      onClick={() =>
                        patchThreads(
                          threads.filter((entry) => entry.id !== row.id)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Puff · stops · letter height
          </p>
          {!readOnly ? (
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-7 text-[11px]")}
              onClick={() =>
                patchExtras([
                  ...extras,
                  { id: createLineId("extra"), text: "" },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add line
            </Button>
          ) : null}
        </div>
        {extras.length === 0 ? (
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "px-3 py-4 text-[12px] text-[#8a8a8a]"
            )}
          >
            {readOnly
              ? "No puff / stop lines."
              : "Add lines like 2mm puff, 3mm puff, or stop."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {extras.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                {readOnly ? (
                  <ReadValue value={row.text} />
                ) : (
                  <>
                    <Input
                      value={row.text ?? ""}
                      onChange={(event) =>
                        patchExtras(
                          extras.map((entry) =>
                            entry.id === row.id
                              ? { ...entry, text: event.target.value }
                              : entry
                          )
                        )
                      }
                      placeholder="e.g. 2mm puff"
                      className={cn(fieldClassName, "flex-1")}
                    />
                    <button
                      type="button"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#b42318]"
                      aria-label="Remove line"
                      onClick={() =>
                        patchExtras(
                          extras.filter((entry) => entry.id !== row.id)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeatTransferMethodSpecs({
  notes,
  readOnly = false,
  onChange,
}: {
  notes: ImprintProductionNotes;
  readOnly?: boolean;
  onChange: (patch: Partial<ImprintProductionNotes>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
        Heat transfer settings
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Application temperature
          </Label>
          {readOnly ? (
            <ReadValue value={notes.applicationTemp} />
          ) : (
            <Input
              value={notes.applicationTemp ?? ""}
              onChange={(event) =>
                onChange({ applicationTemp: event.target.value })
              }
              placeholder='e.g. 320°F / 15 sec'
              className={fieldClassName}
            />
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Application notes
          </Label>
          {readOnly ? (
            <p className="text-sm leading-relaxed text-[#303030]">
              {notes.applicationNotes?.trim() || "—"}
            </p>
          ) : (
            <Textarea
              value={notes.applicationNotes ?? ""}
              onChange={(event) =>
                onChange({ applicationNotes: event.target.value })
              }
              placeholder="Peel type, pressure, cover sheet, cool-down…"
              rows={3}
              className={cn(
                dashboardControlClass,
                "min-h-0 resize-none px-3 py-2 text-[13px] shadow-none"
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
