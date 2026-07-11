"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Shirt,
  Trash2,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readImagePreviewDataUrl } from "@/lib/artwork-preview";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import {
  artworkHasProofImages,
  getProofSlides,
  MAX_PROOF_SLIDES,
} from "@/lib/proof-slides";
import type { ArtworkFile, Job, JobImprint, ProofSlide } from "@/types";
import { cn } from "@/lib/utils";

function SortableProofSlideRow({
  slide,
  index,
  active,
  saving,
  onSelect,
  onRemove,
  canRemove,
}: {
  slide: ProofSlide;
  index: number;
  active: boolean;
  saving: boolean;
  onSelect: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id, disabled: saving });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[32px_24px_minmax(0,1fr)_36px] items-center gap-x-3 px-3 py-2.5",
        active && "bg-[#f4f7fd]/70",
        isDragging &&
          "relative z-10 bg-white shadow-[0_10px_28px_rgba(26,26,26,0.12)] ring-1 ring-[#c9d7ef]"
      )}
    >
      <button
        type="button"
        className={cn(
          dashboardControlClass,
          "h-8 w-8 shrink-0 justify-center self-center p-0 text-[#616161] cursor-grab touch-none active:cursor-grabbing hover:text-[#303030]",
          isDragging && "cursor-grabbing",
          saving && "pointer-events-none opacity-50"
        )}
        aria-label={`Drag image ${index + 1}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-3.5" strokeWidth={1.75} />
      </button>

      <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-center gap-3 text-left"
        aria-label={`Preview image ${index + 1}`}
      >
        <span
          className={cn(
            "relative size-12 shrink-0 overflow-hidden rounded-md border bg-white",
            active
              ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
              : "border-[#e3e3e3]"
          )}
        >
          {slide.previewUrl ? (
            <img
              src={slide.previewUrl}
              alt={slide.label || `Image ${index + 1}`}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-[10px] text-[#8a8a8a]">
              {index + 1}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-[#303030]">
            {slide.label?.trim() || `Image ${index + 1}`}
          </span>
          <span className="block text-[11px] text-[#8a8a8a]">
            {active ? "Showing above" : "Click to preview"}
          </span>
        </span>
      </button>

      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 justify-center p-0 text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#b42318]"
          disabled={saving}
          onClick={onRemove}
          aria-label={`Remove image ${index + 1}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : (
        <span className="size-8" />
      )}
    </div>
  );
}

export function ProofSlidesViewer({
  artwork,
  imprintLabel,
  jobName,
  className,
  compact,
}: {
  artwork: Pick<
    ArtworkFile,
    "id" | "name" | "version" | "status" | "previewUrl" | "mockupLabel" | "proofSlides"
  > & {
    uploadedAt?: string;
  };
  imprintLabel: string;
  jobName?: string;
  className?: string;
  compact?: boolean;
}) {
  const slides = useMemo(() => getProofSlides(artwork), [artwork]);
  const [activeId, setActiveId] = useState(slides[0]?.id ?? "");

  useEffect(() => {
    if (!slides.some((slide) => slide.id === activeId)) {
      setActiveId(slides[0]?.id ?? "");
    }
  }, [slides, activeId]);

  const activeSlide =
    slides.find((slide) => slide.id === activeId) ?? slides[0] ?? null;
  const activeIndex = slides.findIndex((slide) => slide.id === activeSlide?.id);

  if (!artworkHasProofImages(artwork)) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-10 text-center",
          className
        )}
      >
        <Shirt className="mb-3 size-8 text-[#c9cccf]" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[#303030]">No proof images yet</p>
        <p className="mt-1 text-[13px] text-[#8a8a8a]">
          {imprintLabel}
          {jobName ? ` · ${jobName}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#f6f6f7]">
        {activeSlide?.previewUrl ? (
          <img
            src={activeSlide.previewUrl}
            alt={activeSlide.label || artwork.name}
            className={cn(
              "mx-auto w-full object-contain bg-white",
              compact ? "max-h-[220px]" : "max-h-[320px]"
            )}
          />
        ) : null}
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3e3e3] bg-white/95 text-[#303030] shadow-sm disabled:opacity-40"
              disabled={activeIndex <= 0}
              onClick={() => setActiveId(slides[activeIndex - 1].id)}
              aria-label="Previous image"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3e3e3] bg-white/95 text-[#303030] shadow-sm disabled:opacity-40"
              disabled={activeIndex >= slides.length - 1}
              onClick={() => setActiveId(slides[activeIndex + 1].id)}
              aria-label="Next image"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
              {activeIndex + 1} / {slides.length}
            </span>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveId(slide.id)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white",
                slide.id === activeSlide?.id
                  ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
                  : "border-[#e3e3e3]"
              )}
            >
              {slide.previewUrl ? (
                <img
                  src={slide.previewUrl}
                  alt={slide.label || `Image ${index + 1}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-[10px] text-[#8a8a8a]">
                  {index + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#303030]">
            {activeSlide?.label || artwork.name}
          </p>
          <p className="text-xs text-[#8a8a8a]">
            {imprintLabel} · v{artwork.version}
            {artwork.uploadedAt
              ? ` · ${formatDateTime(artwork.uploadedAt)}`
              : ""}
            {slides.length > 1 ? ` · ${slides.length} images` : ""}
          </p>
        </div>
        <ArtworkStatusBadge status={artwork.status} />
      </div>
    </div>
  );
}

export function ProofSlidesEditor({
  orderId,
  job,
  imprint,
  readOnly,
  compact,
  pinned,
}: {
  orderId: string;
  job: Job;
  imprint: JobImprint;
  readOnly?: boolean;
  compact?: boolean;
  pinned?: boolean;
}) {
  const { addProofSlide, updateProofSlides } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");
  const [labelDraft, setLabelDraft] = useState("");

  const artwork = imprint.artwork;
  const slides = useMemo(() => getProofSlides(artwork), [artwork]);
  const sortableIds = useMemo(() => slides.map((slide) => slide.id), [slides]);

  useEffect(() => {
    const active =
      slides.find((slide) => slide.id === activeId) ?? slides[0] ?? null;
    if (active && active.id !== activeId) setActiveId(active.id);
    setLabelDraft(active?.label ?? "");
  }, [slides, activeId]);

  const activeSlide =
    slides.find((slide) => slide.id === activeId) ?? slides[0] ?? null;
  const activeIndex = slides.findIndex((slide) => slide.id === activeSlide?.id);
  const atLimit = slides.length >= MAX_PROOF_SLIDES;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistOrder = useCallback(
    async (nextSlides: ProofSlide[]) => {
      setSaving(true);
      try {
        await updateProofSlides(orderId, job.id, imprint.id, {
          orderedIds: nextSlides.map((slide) => slide.id),
        });
      } finally {
        setSaving(false);
      }
    },
    [updateProofSlides, orderId, job.id, imprint.id]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || saving) return;

      const oldIndex = slides.findIndex((slide) => slide.id === String(active.id));
      const newIndex = slides.findIndex((slide) => slide.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove(slides, oldIndex, newIndex).map((slide, index) => ({
        ...slide,
        sortOrder: index,
      }));
      void persistOrder(next);
    },
    [slides, saving, persistOrder]
  );

  const handleAddImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadHint(null);
    try {
      let added = 0;
      let lastHint: string | null = null;
      for (const file of files) {
        if (slides.length + added >= MAX_PROOF_SLIDES) break;
        const { previewUrl, error, compressed } =
          await readImagePreviewDataUrl(file);
        await addProofSlide(orderId, job.id, imprint.id, {
          fileName: file.name,
          previewUrl: previewUrl || undefined,
          label: file.name.replace(/\.[^.]+$/, ""),
        });
        added += 1;
        if (error) lastHint = error;
        else if (compressed) lastHint = "Some images were compressed to fit.";
      }
      if (added > 0) {
        setUploadHint(
          lastHint ??
            (added === 1
              ? "Image added to proof."
              : `${added} images added to proof.`)
        );
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = async (slideId: string) => {
    if (slides.length <= 1) return;
    setSaving(true);
    try {
      await updateProofSlides(orderId, job.id, imprint.id, {
        removeIds: [slideId],
      });
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = async () => {
    if (!activeSlide) return;
    const trimmed = labelDraft.trim();
    if ((activeSlide.label ?? "") === trimmed) return;
    setSaving(true);
    try {
      await updateProofSlides(orderId, job.id, imprint.id, {
        slides: [{ id: activeSlide.id, label: trimmed }],
      });
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    return (
      <ProofSlidesViewer
        artwork={artwork}
        imprintLabel={imprint.label}
        jobName={job.name}
        compact={compact}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white",
        pinned
          ? "border-2 border-[#2c6ecb]/40 ring-2 ring-[#2c6ecb]/15"
          : "border-[#e3e3e3]"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-3 py-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Proof images
          </p>
          <p className="text-[12px] text-[#616161]">
            Add a logo, mockup, or reference — drag the handle to reorder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp,.gif"
            multiple
            onChange={(event) => void handleAddImages(event)}
          />
          <Button
            type="button"
            disabled={uploading || atLimit}
            className={cn(dashboardControlClass, "h-8 text-[12px]")}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            Add image
          </Button>
        </div>
      </div>

      {!artworkHasProofImages(artwork) ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
          <Shirt className="mb-3 size-8 text-[#c9cccf]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#303030]">
            No images on this proof yet
          </p>
          <p className="mt-1 max-w-xs text-[13px] text-[#8a8a8a]">
            Upload a mockup, logo, or reference image. You can add up to{" "}
            {MAX_PROOF_SLIDES} images per location.
          </p>
        </div>
      ) : (
        <>
          <div className="relative bg-[#f6f6f7] p-3">
            {activeSlide?.previewUrl ? (
              <img
                src={activeSlide.previewUrl}
                alt={activeSlide.label || artwork.name}
                className={cn(
                  "mx-auto w-full rounded-md bg-white object-contain shadow-sm",
                  compact ? "max-h-[220px]" : "max-h-[320px]"
                )}
              />
            ) : null}
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3e3e3] bg-white text-[#303030] shadow-sm disabled:opacity-40"
                  disabled={activeIndex <= 0 || saving}
                  onClick={() => setActiveId(slides[activeIndex - 1].id)}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="absolute right-5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3e3e3] bg-white text-[#303030] shadow-sm disabled:opacity-40"
                  disabled={activeIndex >= slides.length - 1 || saving}
                  onClick={() => setActiveId(slides[activeIndex + 1].id)}
                >
                  <ChevronRight className="size-4" />
                </button>
                <span className="absolute bottom-5 right-5 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
                  {activeIndex + 1} / {slides.length}
                </span>
              </>
            ) : null}
          </div>

          <div className="space-y-1.5 border-t border-[#ebebeb] px-3 py-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Image label
            </label>
            <Input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => void saveLabel()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveLabel();
                }
              }}
              placeholder='e.g. "Front mockup", "Logo file"'
              className={cn(dashboardControlClass, "h-9 text-[13px]")}
              disabled={saving || !activeSlide}
            />
          </div>

          <div className="border-t border-[#ebebeb]">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Image order
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#8a8a8a]">
                  {slides.length} image{slides.length !== 1 ? "s" : ""} · v
                  {artwork.version}
                  {saving ? " · Saving…" : ""}
                </p>
                <ArtworkStatusBadge status={artwork.status} />
              </div>
            </div>

            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "mx-3 mb-3 overflow-hidden rounded-lg border border-[#ebebeb]"
              )}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-[#f0f0f0] bg-white">
                    {slides.map((slide, index) => (
                      <SortableProofSlideRow
                        key={slide.id}
                        slide={slide}
                        index={index}
                        active={slide.id === activeSlide?.id}
                        saving={saving}
                        onSelect={() => setActiveId(slide.id)}
                        onRemove={() => void handleRemove(slide.id)}
                        canRemove={slides.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </>
      )}

      {uploadHint ? (
        <p className="border-t border-[#ebebeb] px-3 py-2 text-[12px] text-[#616161]">
          {uploadHint}
        </p>
      ) : null}
      {atLimit ? (
        <p className="border-t border-[#ebebeb] px-3 py-2 text-[12px] text-[#8a6116]">
          Maximum of {MAX_PROOF_SLIDES} images per proof.
        </p>
      ) : null}
    </div>
  );
}
