"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Archive,
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
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDateTime } from "@/lib/format";
import {
  getArtworkEntryContext,
  getRelatedArtworkFiles,
  type ArtworkQueueEntry,
} from "@/lib/artwork-queue";
import {
  getCustomerAccent,
  getCustomerInitials,
} from "@/lib/production-customer-colors";
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
  const accent = getCustomerAccent(liveEntry.customerId, liveEntry.orderId);
  const initials = getCustomerInitials(
    liveEntry.company || liveEntry.customerName
  );
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
          "flex h-[min(92vh,820px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-lg p-0",
          "sm:h-[min(90vh,780px)] sm:max-w-[min(96vw,68rem)] sm:w-[min(96vw,68rem)]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-bold leading-none text-white",
                  accent.cap
                )}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-[#303030] sm:text-xl">
                  {liveEntry.imprintLabel}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#616161]">
                  <Link
                    href={`/app/orders/${liveEntry.orderId}`}
                    className="font-medium text-[#303030] hover:text-[#2c6ecb]"
                    onClick={() => onOpenChange(false)}
                  >
                    {liveEntry.orderNumber}
                  </Link>
                  {" · "}
                  {liveEntry.company || liveEntry.customerName}
                  {job ? ` · ${job.name}` : ""}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {liveEntry.archived ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                  <Archive className="size-3" />
                  Archived
                </span>
              ) : null}
              <ArtworkStatusBadge status={liveEntry.artwork.status} />
            </div>
          </div>
        </DialogHeader>

        {liveEntry.archived ? (
          <div className="flex shrink-0 items-start gap-2.5 border-b border-[#ebebeb] bg-[#f6f6f7] px-5 py-2.5 text-sm sm:px-6">
            <Archive className="mt-0.5 size-4 shrink-0 text-[#616161]" />
            <p className="text-[#616161]">
              This order is archived, so its artwork is read-only here. Restore
              the order to make changes.
            </p>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Preview panel */}
          <div className="flex min-h-0 flex-col border-b border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {job && imprint ? (
              <div className="flex min-h-[220px] flex-1 flex-col lg:min-h-0">
                <MockupPreview entry={{ job, imprint }} fill />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-white/60 p-8 text-sm text-[#616161]">
                Preview unavailable
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <section className="rounded-lg border border-[#e3e3e3] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                    Review actions
                  </p>
                  <Select
                    value={liveEntry.artwork.status}
                    onValueChange={(value) => {
                      if (!value) return;
                      handleStatusChange(value as ArtworkFile["status"]);
                    }}
                    disabled={liveEntry.archived}
                  >
                    <SelectTrigger
                      className={cn(
                        dashboardControlClass,
                        "h-9 w-full max-w-[220px]"
                      )}
                    >
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
                    className={cn(dashboardPrimaryButtonClass, "h-9")}
                    onClick={handleSendProof}
                    disabled={
                      liveEntry.archived ||
                      liveEntry.artwork.status === "approved"
                    }
                  >
                    <Send className="size-3.5" />
                    Send proof
                  </Button>
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-9")}
                    onClick={() => handleStatusChange("approved")}
                    disabled={
                      liveEntry.archived ||
                      liveEntry.artwork.status === "approved"
                    }
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-9")}
                    onClick={() => handleStatusChange("revision_requested")}
                    disabled={
                      liveEntry.archived ||
                      liveEntry.artwork.status === "approved"
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    Request revision
                  </Button>
                </div>
              </section>

              {hasSpecs && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#616161]">
                    Production specs
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {notes?.dimensions && (
                      <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                        <dt className="text-xs text-[#616161]">Print size</dt>
                        <dd className="mt-0.5 font-medium text-[#303030]">
                          {notes.dimensions}
                        </dd>
                      </div>
                    )}
                    {notes?.placement && (
                      <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                        <dt className="text-xs text-[#616161]">Placement</dt>
                        <dd className="mt-0.5 font-medium text-[#303030]">
                          {notes.placement}
                        </dd>
                      </div>
                    )}
                    {notes?.colors && (
                      <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-[#616161]">Colors</dt>
                        <dd className="mt-0.5 font-medium text-[#303030]">
                          {notes.colors}
                        </dd>
                      </div>
                    )}
                    {notes?.instructions && (
                      <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-[#616161]">Notes</dt>
                        <dd className="mt-0.5 font-medium leading-relaxed text-[#303030]">
                          {notes.instructions}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#616161]">
                  Files
                </h3>
                <div className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#303030]">
                        {liveEntry.artwork.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#616161]">
                        Current · v{liveEntry.artwork.version}
                        {imprint
                          ? ` · ${decorationLabel(imprint.decoration)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#616161]">
                      {formatDateTime(liveEntry.artwork.uploadedAt)}
                    </span>
                  </div>

                  {additionalFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4",
                        file.archived && "bg-[#f6f6f7]"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#303030]">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#616161]">
                          {ORDER_FILE_KIND_LABELS[file.kind]}
                          {file.version ? ` · v${file.version}` : ""}
                          {file.archived ? " · Previous version" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#616161]">
                        {formatDateTime(file.uploadedAt)}
                      </span>
                    </div>
                  ))}

                  {additionalFiles.length === 0 && (
                    <div className="px-4 py-5 text-center text-sm text-[#616161]">
                      No other files for this location.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9")}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            nativeButton={false}
            render={
              <Link href={`/app/orders/${liveEntry.orderId}?tab=proof`} />
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
