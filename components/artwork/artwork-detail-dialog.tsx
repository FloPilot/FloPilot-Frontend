"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Archive, ExternalLink, LayoutPanelLeft } from "lucide-react";
import { ArtworkProofDetail } from "@/components/artwork/artwork-proof-detail";
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
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import {
  getArtworkEntryContext,
  type ArtworkQueueEntry,
} from "@/lib/artwork-queue";
import { artworkOrderWorkspaceHref } from "@/lib/artwork-routes";
import { formatOrderRef } from "@/lib/order-display";
import {
  getCustomerAccent,
  getCustomerInitials,
} from "@/lib/production-customer-colors";
import { cn } from "@/lib/utils";

export function ArtworkDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ArtworkQueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { orders } = useSchedule();

  const liveEntry = useMemo(() => {
    if (!entry) return null;
    const { imprint } = getArtworkEntryContext(orders, entry);
    if (!imprint) return entry;
    return { ...entry, artwork: imprint.artwork };
  }, [orders, entry]);

  if (!liveEntry) return null;

  const { job } = getArtworkEntryContext(orders, liveEntry);
  const accent = getCustomerAccent(liveEntry.customerId, liveEntry.orderId);
  const initials = getCustomerInitials(
    liveEntry.company || liveEntry.customerName
  );

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
                    {formatOrderRef(liveEntry)}
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

        <ArtworkProofDetail entry={liveEntry} />

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-6 sm:py-4">
          <p className="text-[12px] text-[#616161]">
            Need all locations and notes? Open the full artwork workspace.
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
                <Link
                  href={artworkOrderWorkspaceHref(
                    liveEntry.orderId,
                    liveEntry.jobId,
                    liveEntry.imprintId
                  )}
                  onClick={() => onOpenChange(false)}
                />
              }
            >
              <LayoutPanelLeft className="size-3.5" />
              Open workspace
            </Button>
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              nativeButton={false}
              render={
                <Link
                  href={`/app/orders/${liveEntry.orderId}?tab=proof`}
                  onClick={() => onOpenChange(false)}
                />
              }
            >
              Order
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
