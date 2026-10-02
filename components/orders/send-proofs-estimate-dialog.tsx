"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertCircle,
  ChevronRight,
  FileText,
  GripVertical,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { SendCustomerEmailCompose } from "@/components/orders/send-customer-email-compose";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import { imprintDisplayName } from "@/lib/imprint-display";
import { getOrderTechPackFiles } from "@/lib/order-files";
import { getProofSlides } from "@/lib/proof-slides";
import type { JobImprint, Order, OrderFile } from "@/types";
import { cn } from "@/lib/utils";

type ProofItem = {
  id: string;
  jobId: string;
  imprintId: string;
  label: string;
  decoration: JobImprint["decoration"];
  thumbUrl?: string;
  selected: boolean;
};

type TechPackItem = {
  id: string;
  fileId: string;
  label: string;
  thumbUrl?: string;
  selected: boolean;
};

type DialogStep = "document" | "compose";

function collectProofItems(order: Order): ProofItem[] {
  const items: ProofItem[] = [];
  for (const job of order.jobs || []) {
    if (job.kind === "finishing") continue;
    for (const imprint of job.imprints || []) {
      const art = imprint.artwork;
      if (!art || art.name === "n/a") continue;
      const slides = getProofSlides(art);
      items.push({
        id: `${job.id}:${imprint.id}`,
        jobId: job.id,
        imprintId: imprint.id,
        label: imprintDisplayName(imprint),
        decoration: imprint.decoration,
        thumbUrl: slides[0]?.previewUrl || art.previewUrl,
        selected: false,
      });
    }
  }
  return items;
}

function collectTechPackItems(order: Order): TechPackItem[] {
  return getOrderTechPackFiles(order).map((file: OrderFile) => ({
    id: file.id,
    fileId: file.id,
    label: file.name || "Tech pack",
    thumbUrl: file.previewUrl,
    selected: true,
  }));
}

function SortableAttachRow({
  id,
  selected,
  label,
  subtitle,
  thumbUrl,
  onToggle,
}: {
  id: string;
  selected: boolean;
  label: string;
  subtitle: string;
  thumbUrl?: string;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2",
        selected
          ? "border-[#c4d7f2] bg-[#f8faff]"
          : "border-[#ebebeb] opacity-70",
        isDragging && "z-10 shadow-md ring-1 ring-[#2c6ecb]/25"
      )}
    >
      <button
        type="button"
        className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#8a8a8a] hover:bg-[#f4f7fd] hover:text-[#303030] active:cursor-grabbing"
        aria-label={`Reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(id)}
          className="size-4 shrink-0 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
        />
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#fafafa]">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-3.5 text-[#c9c9c9]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#303030]">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
            {subtitle}
          </p>
        </div>
      </label>
    </div>
  );
}

function base64ToBlobUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

export function SendProofsEstimateDialog({
  order,
  open,
  onOpenChange,
  onSent,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: (message: string) => void;
}) {
  const { previewOrderDocument, getCustomerById } = useSchedule();
  const customer = getCustomerById(order.customerId);
  const [step, setStep] = useState<DialogStep>("document");
  const [proofs, setProofs] = useState<ProofItem[]>(() =>
    collectProofItems(order)
  );
  const [techPacks, setTechPacks] = useState<TechPackItem[]>(() =>
    collectTechPackItems(order)
  );
  const [estimateNotes, setEstimateNotes] = useState("");
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("estimate.pdf");
  const urlRef = useRef<string | null>(null);
  const notesDebounceRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!open) return;
    setStep("document");
    setProofs(collectProofItems(order));
    setTechPacks(collectTechPackItems(order));
    setEstimateNotes("");
    setPreviewStatus("idle");
    setPreviewError(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setBlobUrl(null);
  }, [open, order]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
    };
  }, []);

  const selectedProofs = useMemo(
    () => proofs.filter((item) => item.selected),
    [proofs]
  );
  const selectedTechPacks = useMemo(
    () => techPacks.filter((item) => item.selected),
    [techPacks]
  );

  const selectionSummary = [
    "Estimate",
    selectedProofs.length > 0
      ? `${selectedProofs.length} proof${selectedProofs.length === 1 ? "" : "s"}`
      : null,
    selectedTechPacks.length > 0
      ? `${selectedTechPacks.length} tech pack${
          selectedTechPacks.length === 1 ? "" : "s"
        }`
      : null,
    estimateNotes.trim() ? "Notes" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const selectionPayload = () => ({
    includeEstimate: true as const,
    proofs: selectedProofs.map((item) => ({
      jobId: item.jobId,
      imprintId: item.imprintId,
    })),
    techPacks: selectedTechPacks.map((item) => ({ fileId: item.fileId })),
    estimateNotes: estimateNotes.trim() || null,
  });

  const invalidatePreview = () => {
    setPreviewStatus("idle");
    setPreviewError(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setBlobUrl(null);
  };

  const handleToggleProof = (id: string) => {
    setProofs((current) =>
      current.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
    invalidatePreview();
  };

  const handleToggleTechPack = (id: string) => {
    setTechPacks((current) =>
      current.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
    invalidatePreview();
  };

  const handleProofDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setProofs((current) => {
      const oldIndex = current.findIndex((item) => item.id === String(active.id));
      const newIndex = current.findIndex((item) => item.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
    invalidatePreview();
  };

  const handleTechPackDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTechPacks((current) => {
      const oldIndex = current.findIndex((item) => item.id === String(active.id));
      const newIndex = current.findIndex((item) => item.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
    invalidatePreview();
  };

  const handleGeneratePreview = async () => {
    setPreviewStatus("loading");
    setPreviewError(null);
    try {
      const result = await previewOrderDocument(
        order.id,
        "all",
        selectionPayload()
      );
      const url = base64ToBlobUrl(result.pdfBase64);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setBlobUrl(url);
      setFilename(result.filename || "estimate.pdf");
      setPreviewStatus("ready");
    } catch (err) {
      setPreviewStatus("error");
      setPreviewError(
        err instanceof Error ? err.message : "Could not generate the preview."
      );
    }
  };

  const handleNotesChange = (value: string) => {
    setEstimateNotes(value);
    if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = window.setTimeout(() => {
      invalidatePreview();
    }, 400);
  };

  const handleSent = (message: string) => {
    onSent?.(message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,860px)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 pr-12">
          <DialogTitle className="text-[17px] font-semibold text-[#303030]">
            Send estimate
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            {step === "document"
              ? "Add customer notes, optionally attach proofs and tech packs, preview the PDF, then compose the email."
              : "Pick recipients, edit the message, preview the branded email, then send."}
          </DialogDescription>
        </DialogHeader>

        {step === "compose" && customer ? (
          <SendCustomerEmailCompose
            customer={customer}
            orderId={order.id}
            variant="estimate"
            documentSelection={selectionPayload()}
            onBack={() => setStep("document")}
            onSent={handleSent}
            onCancel={() => onOpenChange(false)}
          />
        ) : step === "compose" && !customer ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <AlertCircle className="size-6 text-[#d72c0d]" />
            <p className="text-[13px] font-medium text-[#303030]">
              Customer not found
            </p>
            <p className="text-[12px] text-[#8a8a8a]">
              This order&apos;s customer could not be loaded. Go back and try
              again.
            </p>
            <Button
              type="button"
              className={cn(dashboardControlClass, "mt-2 h-9")}
              onClick={() => setStep("document")}
            >
              Back
            </Button>
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col border-b border-[#ebebeb] lg:border-b-0 lg:border-r">
                <div className="shrink-0 border-b border-[#ebebeb] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Estimate package
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    {selectionSummary}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  <div className="flex items-center gap-2.5 rounded-lg border border-[#c4d7f2] bg-[#f8faff] px-3 py-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d7e3f4] bg-white">
                      <FileText className="size-4 text-[#2c6ecb]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#303030]">
                        Estimate PDF
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                        Always included · pricing breakdown
                      </span>
                    </span>
                  </div>

                  <div className="space-y-2 rounded-lg border border-[#ebebeb] bg-white p-3">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Customer notes
                    </Label>
                    <Textarea
                      value={estimateNotes}
                      onChange={(event) =>
                        handleNotesChange(event.target.value)
                      }
                      className="min-h-[88px] resize-none border-[#e3e3e3] text-[13px] shadow-none focus-visible:border-[#c4d7f2] focus-visible:ring-[#2c6ecb]/20"
                    />
                    <p className="text-[11px] text-[#8a8a8a]">
                      Printed at the bottom of the estimate PDF.
                    </p>
                  </div>

                  {techPacks.length > 0 ? (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Tech packs · drag to reorder
                      </p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleTechPackDragEnd}
                      >
                        <SortableContext
                          items={techPacks.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {techPacks.map((item) => (
                              <SortableAttachRow
                                key={item.id}
                                id={item.id}
                                selected={item.selected}
                                label={item.label}
                                subtitle="Tech pack / summary proof"
                                thumbUrl={item.thumbUrl}
                                onToggle={handleToggleTechPack}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  ) : null}

                  {proofs.length > 0 ? (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Attach proofs · drag to reorder
                      </p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleProofDragEnd}
                      >
                        <SortableContext
                          items={proofs.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {proofs.map((item) => (
                              <SortableAttachRow
                                key={item.id}
                                id={item.id}
                                selected={item.selected}
                                label={item.label}
                                subtitle={`${decorationLabel(item.decoration)} · Proof`}
                                thumbUrl={item.thumbUrl}
                                onToggle={handleToggleProof}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-5 text-center text-[12px] text-[#8a8a8a]">
                      No proof images on this order. The estimate PDF will send
                      on its own
                      {techPacks.length > 0 ? " with selected tech packs" : ""}.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-[#f6f6f7]">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#ebebeb] bg-white px-4 py-3">
                  <p className="text-[12px] font-medium text-[#616161]">
                    PDF preview
                  </p>
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    disabled={previewStatus === "loading"}
                    onClick={() => void handleGeneratePreview()}
                  >
                    {previewStatus === "loading" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                    {previewStatus === "loading"
                      ? "Generating…"
                      : previewStatus === "ready"
                        ? "Refresh preview"
                        : "Generate PDF preview"}
                  </Button>
                </div>

                <div className="relative min-h-[280px] flex-1 overflow-hidden">
                  {previewStatus === "ready" && blobUrl ? (
                    <iframe
                      src={blobUrl}
                      title="Estimate preview"
                      className="h-full w-full border-0 bg-white"
                    />
                  ) : previewStatus === "error" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                      <AlertCircle className="size-6 text-[#d72c0d]" />
                      <p className="text-[13px] font-medium text-[#303030]">
                        Couldn’t build the preview
                      </p>
                      <p className="text-[12px] text-[#8a8a8a]">{previewError}</p>
                    </div>
                  ) : previewStatus === "loading" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                      <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
                      <p className="text-[12px] text-[#8a8a8a]">
                        Generating preview…
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                      <FileText className="size-6 text-[#c9c9c9]" />
                      <p className="text-[13px] font-medium text-[#303030]">
                        Preview not generated yet
                      </p>
                      <p className="max-w-sm text-[12px] text-[#8a8a8a]">
                        Generate the estimate PDF after setting notes and
                        attachments.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] text-[#8a8a8a]">
                  {previewStatus === "ready"
                    ? filename
                    : "Generate a PDF preview before continuing."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-9")}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  disabled={previewStatus !== "ready"}
                  onClick={() => setStep("compose")}
                >
                  Continue
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
