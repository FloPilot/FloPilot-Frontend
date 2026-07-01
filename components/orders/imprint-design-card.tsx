"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  FileImage,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import {
  ShopPresetSelect,
  slugifyPresetValue,
} from "@/components/orders/shop-preset-select";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { readImagePreviewDataUrl } from "@/lib/artwork-preview";
import { ARTWORK_ATTACHABLE_KINDS } from "@/lib/create-order";
import {
  EMPTY_INK_COLORS,
  EMPTY_NOTES,
  formatPrintDimensions,
  parsePrintDimensions,
  productionNotesEqual,
} from "@/lib/imprint-design";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  findDtfImprintArea,
  getDtfImprintAreaOptions,
  getInkTypeOptions,
} from "@/lib/shop-settings";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import type {
  DecorationType,
  ImprintProductionNotes,
  Job,
  JobImprint,
  Order,
} from "@/types";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  dashboardControlClass,
  "h-9 w-full justify-start px-3 text-[13px] shadow-none"
);

function PrintSizeFields({
  dimensions,
  readOnly,
  onChange,
}: {
  dimensions?: string;
  readOnly?: boolean;
  onChange: (next: string | undefined) => void;
}) {
  const parsed = parsePrintDimensions(dimensions);
  const display =
    formatPrintDimensions(parsed.width, parsed.height) ||
    dimensions?.trim() ||
    "—";

  const commit = (width?: number, height?: number) => {
    const formatted = formatPrintDimensions(width, height);
    onChange(formatted);
  };

  if (readOnly) {
    return <p className="text-sm font-medium text-[#303030]">{display}</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          type="number"
          min={0}
          step={0.1}
          inputMode="decimal"
          value={parsed.width ?? ""}
          onChange={(event) => {
            const width = event.target.value
              ? Number(event.target.value)
              : undefined;
            commit(width, parsed.height);
          }}
          placeholder="Width"
          className={fieldClassName}
          aria-label="Print width in inches"
        />
      </div>
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">in</span>
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">×</span>
      <div className="min-w-0 flex-1">
        <Input
          type="number"
          min={0}
          step={0.1}
          inputMode="decimal"
          value={parsed.height ?? ""}
          onChange={(event) => {
            const height = event.target.value
              ? Number(event.target.value)
              : undefined;
            commit(parsed.width, height);
          }}
          placeholder="Height"
          className={fieldClassName}
          aria-label="Print height in inches"
        />
      </div>
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">in</span>
    </div>
  );
}

function isDtfDecoration(decoration: DecorationType): boolean {
  return decoration === "dtf";
}

function isScreenPrintDecoration(decoration: DecorationType): boolean {
  return decoration === "screen_print";
}

function MockupFilePicker({
  order,
  imprint,
  jobId,
  onLinkFile,
  readOnly,
}: {
  order: Order;
  imprint: JobImprint;
  jobId: string;
  onLinkFile: (fileId: string | null) => void;
  readOnly?: boolean;
}) {
  const attachableFiles = useMemo(
    () =>
      (order.files ?? []).filter((file) =>
        ARTWORK_ATTACHABLE_KINDS.includes(file.kind)
      ),
    [order.files]
  );

  const linkedFile = attachableFiles.find(
    (file) =>
      file.jobId === jobId &&
      file.imprintId === imprint.id &&
      file.name === imprint.artwork.name
  );

  const selectValue = linkedFile?.id ?? "current";

  if (readOnly) {
    return (
      <div className={cn(dashboardInsetSurfaceClass, "px-3 py-2.5")}>
        <p className="truncate text-sm font-medium text-[#303030]">
          {imprint.artwork.name}
        </p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          v{imprint.artwork.version}
          {imprint.artwork.mockupLabel
            ? ` · ${imprint.artwork.mockupLabel}`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <Select
      value={selectValue}
      onValueChange={(value) => onLinkFile(value === "current" ? null : value)}
    >
      <SelectTrigger className={fieldClassName}>
        <SelectValue placeholder="Choose mockup file" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current">
          Current · {imprint.artwork.name}
        </SelectItem>
        {attachableFiles.map((file) => (
          <SelectItem key={file.id} value={file.id}>
            {file.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LibrarySyncBadge({ designId }: { designId?: string }) {
  if (!designId) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-medium text-[#0d5c2e]">
      <BookMarked className="size-3" />
      In library
    </span>
  );
}

export function ImprintDesignCard({
  order,
  job,
  imprint,
  readOnly = false,
  highlighted = false,
  compact = false,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  readOnly?: boolean;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const {
    updateImprintNotes,
    updateImprintInkColors,
    linkImprintArtworkFromFile,
    uploadArtworkVersion,
    setArtworkStatus,
  } = useSchedule();
  const { settings, isAdmin, updateSettings } = useShopSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [addingCustomInkType, setAddingCustomInkType] = useState(false);
  const [addingCustomDtfImprintArea, setAddingCustomDtfImprintArea] =
    useState(false);

  const inkColors = imprint.inkColors ?? EMPTY_INK_COLORS;
  const serverNotes = imprint.notes ?? EMPTY_NOTES;
  const serverNotesKey = JSON.stringify(serverNotes);
  const [localNotes, setLocalNotes] = useState<ImprintProductionNotes>(
    serverNotes
  );
  const notesRef = useRef(serverNotes);

  useEffect(() => {
    const next = imprint.notes ?? EMPTY_NOTES;
    setLocalNotes((current) =>
      productionNotesEqual(current, next) ? current : { ...next }
    );
    notesRef.current = productionNotesEqual(notesRef.current, next)
      ? notesRef.current
      : { ...next };
  }, [imprint.id, serverNotesKey]);

  const isFinishing =
    job.kind === "finishing" || imprint.decoration === "finishing";
  const isDtf = isDtfDecoration(imprint.decoration);
  const isScreenPrint = isScreenPrintDecoration(imprint.decoration);

  const persistNotes = useCallback(
    (next: ImprintProductionNotes) => {
      void updateImprintNotes(order.id, job.id, imprint.id, next);
    },
    [updateImprintNotes, order.id, job.id, imprint.id]
  );

  const { debounced: debouncedPersistNotes, flush: flushPersistNotes } =
    useDebouncedCallback(persistNotes, 600);

  useEffect(() => () => flushPersistNotes(), [flushPersistNotes]);

  const saveNotes = useCallback(
    (patch: Partial<ImprintProductionNotes>) => {
      setLocalNotes((current) => {
        const next = { ...current, ...patch };
        notesRef.current = next;
        debouncedPersistNotes(next);
        return next;
      });
    },
    [debouncedPersistNotes]
  );

  const notes = localNotes;

  const inkTypeOptions = useMemo(() => {
    const options = getInkTypeOptions(settings.productionDefaults);
    if (
      notes.inkType &&
      !options.some(
        (option) =>
          option.value === notes.inkType || option.label === notes.inkType
      )
    ) {
      return [...options, { value: notes.inkType, label: notes.inkType }];
    }
    return options;
  }, [settings.productionDefaults, notes.inkType]);

  const inkTypeValue = useMemo(() => {
    if (!notes.inkType) return "";
    const match = inkTypeOptions.find(
      (option) =>
        option.value === notes.inkType || option.label === notes.inkType
    );
    return match?.value ?? notes.inkType;
  }, [notes.inkType, inkTypeOptions]);

  const dtfImprintAreaOptions = useMemo(() => {
    const options = getDtfImprintAreaOptions(settings.productionDefaults);
    if (
      notes.dtfImprintAreaId &&
      !options.some((option) => option.value === notes.dtfImprintAreaId)
    ) {
      return [
        ...options,
        {
          value: notes.dtfImprintAreaId,
          label:
            notes.dimensions?.trim() || notes.dtfImprintAreaId,
        },
      ];
    }
    return options;
  }, [
    settings.productionDefaults,
    notes.dtfImprintAreaId,
    notes.dimensions,
  ]);

  const handleAddCustomInkType = useCallback(
    async (label: string) => {
      if (!isAdmin) return null;
      const trimmed = label.trim();
      if (!trimmed) return null;

      const existing = getInkTypeOptions(settings.productionDefaults);
      const match = existing.find(
        (option) => option.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) return match.value;

      const value = slugifyPresetValue(trimmed);
      const nextCustom = [
        ...(settings.productionDefaults.inkTypes ?? []),
        { value, label: trimmed },
      ];

      setAddingCustomInkType(true);
      try {
        await updateSettings({
          productionDefaults: { inkTypes: nextCustom },
        });
        return value;
      } finally {
        setAddingCustomInkType(false);
      }
    },
    [isAdmin, settings.productionDefaults, updateSettings]
  );

  const handleAddCustomDtfImprintArea = useCallback(
    async (label: string) => {
      if (!isAdmin) return null;
      const trimmed = label.trim();
      if (!trimmed) return null;

      const match = trimmed.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
      if (!match) return null;

      const widthIn = Number(match[1]);
      const heightIn = Number(match[2]);
      if (!Number.isFinite(widthIn) || !Number.isFinite(heightIn)) return null;
      if (widthIn <= 0 || heightIn <= 0) return null;

      const roundedWidth = Math.round(widthIn * 10) / 10;
      const roundedHeight = Math.round(heightIn * 10) / 10;
      const displayLabel = `${roundedWidth} × ${roundedHeight}`;
      const id = `dtf-${String(roundedWidth).replace(".", "-")}x${String(roundedHeight).replace(".", "-")}`;

      const existing = getDtfImprintAreaOptions(settings.productionDefaults);
      const found = existing.find(
        (option) => option.value === id || option.label === displayLabel
      );
      if (found) return found.value;

      const nextAreas = [
        ...(settings.productionDefaults.dtfImprintAreas ?? []),
        {
          id,
          label: displayLabel,
          widthIn: roundedWidth,
          heightIn: roundedHeight,
          notes: "",
        },
      ];

      setAddingCustomDtfImprintArea(true);
      try {
        await updateSettings({
          productionDefaults: { dtfImprintAreas: nextAreas },
        });
        return id;
      } finally {
        setAddingCustomDtfImprintArea(false);
      }
    },
    [isAdmin, settings.productionDefaults, updateSettings]
  );

  const dtfImprintAreaLabel = useMemo(() => {
    if (!notes.dtfImprintAreaId) {
      return notes.dimensions?.trim() || "—";
    }
    return (
      dtfImprintAreaOptions.find(
        (option) => option.value === notes.dtfImprintAreaId
      )?.label ?? "—"
    );
  }, [notes.dtfImprintAreaId, notes.dimensions, dtfImprintAreaOptions]);

  const handleDtfImprintAreaChange = useCallback(
    (value: string) => {
      const area = findDtfImprintArea(
        settings.productionDefaults,
        value || undefined
      );
      saveNotes({
        dtfImprintAreaId: value || undefined,
        dimensions: area?.label || undefined,
      });
    },
    [saveNotes, settings.productionDefaults]
  );

  const handleMockupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadHint(null);
    try {
      const { previewUrl, error, compressed } =
        await readImagePreviewDataUrl(file);
      await uploadArtworkVersion(
        order.id,
        job.id,
        imprint.id,
        file.name,
        imprint.label,
        "mockup",
        previewUrl || undefined
      );
      if (error) setUploadHint(error);
      else if (compressed)
        setUploadHint("Mockup saved with compressed preview.");
      else if (previewUrl) setUploadHint("Mockup saved with preview.");
      else setUploadHint("Mockup saved — filename only.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <article
      className={cn(
        dashboardCardClass,
        highlighted && "ring-2 ring-[#2c6ecb]/20"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#303030]">
              {imprint.label}
            </p>
            <DecorationTypePill decoration={imprint.decoration} />
          </div>
          <p className={dashboardTaskDetailClass}>{job.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isFinishing ? (
            <LibrarySyncBadge designId={imprint.libraryDesignId} />
          ) : null}
          {highlighted ? (
            <span className="rounded-md bg-[#2c6ecb] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              This run
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5 p-4 sm:p-5",
          compact ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,300px)_1fr]"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              <FileImage className="size-3.5" />
              Mockup
            </div>
            {!readOnly && !isFinishing ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                  onChange={handleMockupUpload}
                />
                <Button
                  type="button"
                  disabled={uploading}
                  className={cn(dashboardControlClass, "h-8 text-[12px]")}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Upload mockup
                </Button>
              </>
            ) : null}
          </div>

          <MockupPreview
            entry={{ job, imprint }}
            compact={compact}
            pinned={highlighted}
          />

          {!isFinishing && !readOnly ? (
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "space-y-3 px-3 py-3",
                imprint.artwork.status === "approved" &&
                  "border-[#86d4a8]/40 bg-[#fafffe]"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Proof approval
                </p>
                <ArtworkStatusBadge status={imprint.artwork.status} />
              </div>
              <p className={dashboardTaskDetailClass}>
                Mark approved when the customer signs off on this location.
              </p>
              <div className="flex flex-wrap gap-2">
                <ProofActionButton
                  variant="success"
                  className="h-8 flex-1 text-[12px]"
                  disabled={imprint.artwork.status === "approved"}
                  successLabel="Approved"
                  onClick={() =>
                    setArtworkStatus(
                      order.id,
                      job.id,
                      imprint.id,
                      "approved"
                    )
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    {imprint.artwork.status === "approved"
                      ? "Approved"
                      : "Mark approved"}
                  </span>
                </ProofActionButton>
                <ProofActionButton
                  variant="muted"
                  className="h-8 flex-1 text-[12px]"
                  disabled={imprint.artwork.status === "revision_requested"}
                  successLabel="Saved"
                  onClick={() =>
                    setArtworkStatus(
                      order.id,
                      job.id,
                      imprint.id,
                      "revision_requested"
                    )
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RotateCcw className="size-3.5" />
                    Revision
                  </span>
                </ProofActionButton>
              </div>
            </div>
          ) : null}

          {uploadHint ? (
            <p className="text-[11px] text-[#8a8a8a]">{uploadHint}</p>
          ) : (
            <p className="text-[11px] text-[#8a8a8a]">
              PNG or JPG under 600 KB shows an inline preview on the order and
              in customer messages.
            </p>
          )}

          {!isFinishing && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Link from order files
              </Label>
              <MockupFilePicker
                order={order}
                imprint={imprint}
                jobId={job.id}
                readOnly={readOnly}
                onLinkFile={(fileId) =>
                  linkImprintArtworkFromFile(
                    order.id,
                    job.id,
                    imprint.id,
                    fileId
                  )
                }
              />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          {!isFinishing && (
            <div className="grid gap-3 sm:grid-cols-2">
              {!isDtf ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] font-medium text-[#8a8a8a]">
                    Print size
                  </Label>
                  <PrintSizeFields
                    dimensions={notes.dimensions}
                    readOnly={readOnly}
                    onChange={(value) => saveNotes({ dimensions: value })}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  Placement
                </Label>
                {readOnly ? (
                  <p className="text-sm font-medium text-[#303030]">
                    {notes.placement || "—"}
                  </p>
                ) : (
                  <Input
                    value={notes.placement ?? ""}
                    onChange={(event) =>
                      saveNotes({ placement: event.target.value })
                    }
                    placeholder={'3" below collar'}
                    className={fieldClassName}
                  />
                )}
              </div>

              {isDtf ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Imprint area
                    </Label>
                    {readOnly ? (
                      <p className="text-sm font-medium text-[#303030]">
                        {dtfImprintAreaLabel}
                      </p>
                    ) : (
                      <ShopPresetSelect
                        value={notes.dtfImprintAreaId ?? ""}
                        options={dtfImprintAreaOptions}
                        onChange={handleDtfImprintAreaChange}
                        className={fieldClassName}
                        placeholder="Select imprint area"
                        canAddCustom={isAdmin}
                        onAddCustom={handleAddCustomDtfImprintArea}
                        addingCustom={addingCustomDtfImprintArea}
                        addLabel="Add imprint area"
                        addPlaceholder="e.g. 5 × 5"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Print method
                    </Label>
                    <div className={cn(dashboardInsetSurfaceClass, "px-3 py-2")}>
                      <p className="text-sm font-medium text-[#303030]">DTF</p>
                      <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                        Film transfer — set transfer specs below, not screen ink.
                      </p>
                    </div>
                  </div>
                </>
              ) : isScreenPrint ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Ink type
                    </Label>
                    {readOnly ? (
                      <p className="text-sm font-medium text-[#303030]">
                        {inkTypeOptions.find(
                          (option) => option.value === notes.inkType
                        )?.label ??
                          notes.inkType ??
                          "—"}
                      </p>
                    ) : (
                      <ShopPresetSelect
                        value={inkTypeValue}
                        options={inkTypeOptions}
                        onChange={(value) =>
                          saveNotes({ inkType: value || undefined })
                        }
                        className={fieldClassName}
                        placeholder="Select ink"
                        canAddCustom={isAdmin}
                        onAddCustom={handleAddCustomInkType}
                        addingCustom={addingCustomInkType}
                        addLabel="Add ink type"
                        addPlaceholder="e.g. High-opacity plastisol"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Flashes
                    </Label>
                    {readOnly ? (
                      <p className="text-sm font-medium text-[#303030]">
                        {(notes.flashCount ??
                          inkColors.filter((row) => row.isFlash).length) ||
                          "—"}
                      </p>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        value={notes.flashCount ?? ""}
                        onChange={(event) =>
                          saveNotes({
                            flashCount: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                        className={fieldClassName}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  Proof notes
                </Label>
                {readOnly ? (
                  <p className="text-sm leading-relaxed text-[#303030]">
                    {notes.instructions || "—"}
                  </p>
                ) : (
                  <Textarea
                    value={notes.instructions ?? ""}
                    onChange={(event) =>
                      saveNotes({ instructions: event.target.value })
                    }
                    placeholder="Notes for the customer proof or production team"
                    rows={2}
                    className={cn(
                      dashboardControlClass,
                      "min-h-0 resize-none px-3 py-2 text-[13px] shadow-none"
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {!isFinishing && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                {isDtf
                  ? "Transfer specs"
                  : isScreenPrint
                    ? "Ink colors & Pantones"
                    : "Colors & Pantones"}
              </p>
              <ImprintInkColorsEditor
                inkColors={inkColors}
                readOnly={readOnly}
                compact={compact}
                decoration={imprint.decoration}
                inputClassName={fieldClassName}
                onPersist={(next) =>
                  updateImprintInkColors(order.id, job.id, imprint.id, next)
                }
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
