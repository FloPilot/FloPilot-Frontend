"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Send,
} from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { decorationLabel, formatDateTime } from "@/lib/format";
import {
  getArtworkEntryContext,
  getRelatedArtworkFiles,
  type ArtworkQueueEntry,
} from "@/lib/artwork-queue";
import { ORDER_FILE_KIND_LABELS } from "@/lib/order-files";
import type { ArtworkFile } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: ArtworkFile["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
];

export function ArtworkDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ArtworkQueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { orders, setArtworkStatus, sendProofToCustomer } = useSchedule();

  const liveEntry = useMemo(() => {
    if (!entry) return null;
    const { imprint } = getArtworkEntryContext(orders, entry);
    if (!imprint) return entry;
    return { ...entry, artwork: imprint.artwork };
  }, [orders, entry]);

  if (!liveEntry) return null;

  const { order, job, imprint } = getArtworkEntryContext(orders, liveEntry);
  const relatedFiles = getRelatedArtworkFiles(order, liveEntry);
  const additionalFiles = relatedFiles.filter(
    (file) => file.id !== liveEntry.artwork.id
  );
  const notes = imprint?.notes;
  const hasSpecs =
    notes?.dimensions ||
    notes?.placement ||
    notes?.colors ||
    notes?.instructions;

  const handleStatusChange = (status: ArtworkFile["status"]) => {
    setArtworkStatus(
      liveEntry.orderId,
      liveEntry.jobId,
      liveEntry.imprintId,
      status
    );
  };

  const handleSendProof = () => {
    sendProofToCustomer(
      liveEntry.orderId,
      liveEntry.jobId,
      liveEntry.imprintId
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(92vh,820px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0",
          "sm:h-[min(90vh,780px)] sm:max-w-[min(96vw,68rem)] sm:w-[min(96vw,68rem)]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-brand-ink sm:text-xl">
                {liveEntry.imprintLabel}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-brand-muted">
                <Link
                  href={`/app/orders/${liveEntry.orderId}`}
                  className="font-medium text-brand-ink hover:text-brand-primary"
                  onClick={() => onOpenChange(false)}
                >
                  {liveEntry.orderNumber}
                </Link>
                {" · "}
                {liveEntry.company || liveEntry.customerName}
                {job ? ` · ${job.name}` : ""}
              </DialogDescription>
            </div>
            <ArtworkStatusBadge status={liveEntry.artwork.status} />
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Preview panel */}
          <div className="flex min-h-0 flex-col border-b border-border bg-brand-surface/20 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {job && imprint ? (
              <div className="flex min-h-[220px] flex-1 flex-col lg:min-h-0">
                <MockupPreview entry={{ job, imprint }} fill />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 p-8 text-sm text-brand-muted">
                Preview unavailable
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <section className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Review actions
                  </p>
                  <Select
                    value={liveEntry.artwork.status}
                    onValueChange={(value) => {
                      if (!value) return;
                      handleStatusChange(value as ArtworkFile["status"]);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full max-w-[220px] rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={handleSendProof}
                    disabled={liveEntry.artwork.status === "approved"}
                  >
                    <Send className="size-3.5" />
                    Send proof
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => handleStatusChange("approved")}
                    disabled={liveEntry.artwork.status === "approved"}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => handleStatusChange("revision_requested")}
                    disabled={liveEntry.artwork.status === "approved"}
                  >
                    <RotateCcw className="size-3.5" />
                    Request revision
                  </Button>
                </div>
              </section>

              {hasSpecs && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Production specs
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {notes?.dimensions && (
                      <div className="rounded-lg border border-border/60 bg-white px-3 py-2.5">
                        <dt className="text-xs text-brand-muted">Print size</dt>
                        <dd className="mt-0.5 font-medium text-brand-ink">
                          {notes.dimensions}
                        </dd>
                      </div>
                    )}
                    {notes?.placement && (
                      <div className="rounded-lg border border-border/60 bg-white px-3 py-2.5">
                        <dt className="text-xs text-brand-muted">Placement</dt>
                        <dd className="mt-0.5 font-medium text-brand-ink">
                          {notes.placement}
                        </dd>
                      </div>
                    )}
                    {notes?.colors && (
                      <div className="rounded-lg border border-border/60 bg-white px-3 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-brand-muted">Colors</dt>
                        <dd className="mt-0.5 font-medium text-brand-ink">
                          {notes.colors}
                        </dd>
                      </div>
                    )}
                    {notes?.instructions && (
                      <div className="rounded-lg border border-border/60 bg-white px-3 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-brand-muted">Notes</dt>
                        <dd className="mt-0.5 font-medium leading-relaxed text-brand-ink">
                          {notes.instructions}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Files
                </h3>
                <div className="overflow-hidden rounded-xl border border-border/70 bg-white divide-y divide-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {liveEntry.artwork.name}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        Current · v{liveEntry.artwork.version}
                        {imprint
                          ? ` · ${decorationLabel(imprint.decoration)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-brand-muted">
                      {formatDateTime(liveEntry.artwork.uploadedAt)}
                    </span>
                  </div>

                  {additionalFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4",
                        file.archived && "bg-muted/30"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-brand-ink">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-brand-muted">
                          {ORDER_FILE_KIND_LABELS[file.kind]}
                          {file.version ? ` · v${file.version}` : ""}
                          {file.archived ? " · Previous version" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-brand-muted">
                        {formatDateTime(file.uploadedAt)}
                      </span>
                    </div>
                  ))}

                  {additionalFiles.length === 0 && (
                    <div className="px-4 py-5 text-center text-sm text-brand-muted">
                      No other files for this location.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="rounded-full"
            nativeButton={false}
            render={
              <Link href={`/app/orders/${liveEntry.orderId}?tab=design`} />
            }
          >
            Open in order
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
