"use client";

import { useMemo } from "react";
import { FileImage, Layers } from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import { useSchedule } from "@/components/providers/schedule-provider";
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
import { ARTWORK_ATTACHABLE_KINDS } from "@/lib/create-order";
import { decorationLabel } from "@/lib/format";
import { INK_TYPE_OPTIONS } from "@/lib/imprint-design";
import type { Job, JobImprint, Order } from "@/types";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-10 rounded-xl border-border/80 bg-white shadow-none";

function ArtworkFilePicker({
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
      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
        <p className="text-sm font-medium truncate">{imprint.artwork.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
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
      onValueChange={(value) =>
        onLinkFile(value === "current" ? null : value)
      }
    >
      <SelectTrigger className={cn(fieldClassName, "w-full")}>
        <SelectValue placeholder="Choose artwork file" />
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
  } = useSchedule();

  const inkColors = imprint.inkColors ?? [];
  const notes = imprint.notes ?? {};
  const isFinishing =
    job.kind === "finishing" || imprint.decoration === "finishing";

  const saveNotes = (patch: typeof notes) => {
    updateImprintNotes(order.id, job.id, imprint.id, {
      ...notes,
      ...patch,
    });
  };

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white overflow-hidden",
        highlighted
          ? "border-primary/30 ring-2 ring-primary/10"
          : "border-border/70 shadow-sm"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div>
          <p className="font-semibold text-foreground">{imprint.label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {job.name} · {decorationLabel(imprint.decoration)}
          </p>
        </div>
        {highlighted && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            This run
          </span>
        )}
      </div>

      <div
        className={cn(
          "grid gap-5 p-4 sm:p-5",
          compact ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,280px)_1fr]"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileImage className="size-3.5" />
            Artwork
          </div>
          <MockupPreview
            entry={{ job, imprint }}
            compact={compact}
            pinned={highlighted}
          />
          {!isFinishing && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Link from order files
              </Label>
              <ArtworkFilePicker
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

        <div className="space-y-5 min-w-0">
          {!isFinishing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Print size
                </Label>
                {readOnly ? (
                  <p className="text-sm font-medium">
                    {notes.dimensions || "—"}
                  </p>
                ) : (
                  <Input
                    value={notes.dimensions ?? ""}
                    onChange={(event) =>
                      saveNotes({ dimensions: event.target.value })
                    }
                    placeholder={'3" W × 2.7" T'}
                    className={fieldClassName}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Placement
                </Label>
                {readOnly ? (
                  <p className="text-sm font-medium">
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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Ink type
                </Label>
                {readOnly ? (
                  <p className="text-sm font-medium">
                    {notes.inkType || "—"}
                  </p>
                ) : (
                  <Select
                    value={notes.inkType ?? ""}
                    onValueChange={(value) =>
                      saveNotes({ inkType: value || undefined })
                    }
                  >
                    <SelectTrigger className={cn(fieldClassName, "w-full")}>
                      <SelectValue placeholder="Select ink" />
                    </SelectTrigger>
                    <SelectContent>
                      {INK_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Colors</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">
                      {(notes.colorCount ??
                        inkColors.filter((row) => !row.isFlash).length) ||
                        "—"}
                    </p>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={notes.colorCount ?? ""}
                      onChange={(event) =>
                        saveNotes({
                          colorCount: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                      className={fieldClassName}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Flashes
                  </Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Production notes
                </Label>
                {readOnly ? (
                  <p className="text-sm leading-relaxed">
                    {notes.instructions || "—"}
                  </p>
                ) : (
                  <Textarea
                    value={notes.instructions ?? ""}
                    onChange={(event) =>
                      saveNotes({ instructions: event.target.value })
                    }
                    placeholder="Match Pantone from prior order, vault screens, etc."
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {!isFinishing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="size-3.5" />
                Ink colors & Pantones
              </div>
              <ImprintInkColorsEditor
                inkColors={inkColors}
                readOnly={readOnly}
                compact={compact}
                onChange={(next) =>
                  updateImprintInkColors(
                    order.id,
                    job.id,
                    imprint.id,
                    next
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
