"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ArtworkProofDetail } from "@/components/artwork/artwork-proof-detail";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { resolveArtworkRevisionNotes } from "@/lib/artwork-routes";
import {
  artworkQueueEntryKey,
  collectArtworkQueue,
} from "@/lib/artwork-queue";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import {
  getCustomerAccent,
  getCustomerInitials,
} from "@/lib/production-customer-colors";
import { latestRevisionNote } from "@/lib/revision-notes";
import { cn } from "@/lib/utils";

export type ArtworkProofWorkspaceContentProps = {
  orderId: string;
  backHref: string;
  backLabel: string;
  buildProofHref: (orderId: string, jobId: string, imprintId: string) => string;
  /** Compact layout for embedding inside Departments shell */
  embedded?: boolean;
};

export function ArtworkProofWorkspaceContent({
  orderId,
  backHref,
  backLabel,
  buildProofHref,
  embedded = false,
}: ArtworkProofWorkspaceContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orders, getCustomerById } = useSchedule();

  const order = orders.find((entry) => entry.id === orderId);
  const orderEntries = useMemo(
    () =>
      collectArtworkQueue(orders).filter((entry) => entry.orderId === orderId),
    [orders, orderId]
  );

  const selectedJobId = searchParams.get("job");
  const selectedImprintId = searchParams.get("imprint");

  const selectedEntry = useMemo(() => {
    if (selectedJobId && selectedImprintId) {
      const match = orderEntries.find(
        (entry) =>
          entry.jobId === selectedJobId && entry.imprintId === selectedImprintId
      );
      if (match) return match;
    }
    return orderEntries[0] ?? null;
  }, [orderEntries, selectedJobId, selectedImprintId]);

  const customer = order ? getCustomerById(order.customerId) : undefined;
  const accent = getCustomerAccent(
    order?.customerId,
    orderId,
    customer?.accentColorKey
  );
  const initials = getCustomerInitials(
    customer?.company || order?.company || order?.customerName || "?"
  );

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-sm font-medium text-[#303030]">Order not found</p>
        <Button
          className={dashboardControlClass}
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          {backLabel}
        </Button>
      </div>
    );
  }

  const header = embedded ? (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#616161] hover:text-[#303030]"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
              accent.cap
            )}
          >
            {initials}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-[#303030]">
              {selectedEntry?.imprintLabel ?? "Artwork"}
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {order.number} · {customer?.company || order.company} · In hands{" "}
              {formatDate(order.inHandsDate)}
            </p>
          </div>
        </div>
      </div>
      <Button
        className={cn(dashboardControlClass, "h-9 shrink-0")}
        nativeButton={false}
        render={<Link href={`/app/orders/${order.id}?tab=proof`} />}
      >
        Open order
        <ExternalLink className="size-3.5" />
      </Button>
    </div>
  ) : (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#616161] hover:text-[#303030]"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
              accent.cap
            )}
          >
            {initials}
          </span>
          <div>
            <h1 className={dashboardSectionTitleClass}>
              {order.number} artwork workspace
            </h1>
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {customer?.company || order.company} · {order.customerName} · In
              hands {formatDate(order.inHandsDate)}
            </p>
          </div>
        </div>
      </div>
      <Button
        className={cn(dashboardControlClass, "h-9 shrink-0")}
        nativeButton={false}
        render={<Link href={`/app/orders/${order.id}?tab=proof`} />}
      >
        Open order
        <ExternalLink className="size-3.5" />
      </Button>
    </div>
  );

  return (
    <>
      {header}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside
          className={cn(
            embedded ? dashboardInsetSurfaceClass : dashboardCardClass,
            "overflow-hidden rounded-xl border border-[#ebebeb]"
          )}
        >
          <div className="border-b border-[#ebebeb] px-4 py-3">
            <p className="text-sm font-semibold text-[#303030]">
              Locations on order
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {orderEntries.length} proof
              {orderEntries.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="max-h-[min(65vh,680px)] overflow-y-auto p-2">
            {orderEntries.length === 0 ? (
              <p className={cn("px-2 py-6 text-center", dashboardTaskDetailClass)}>
                No artwork locations on this order.
              </p>
            ) : (
              <ul className="space-y-1">
                {orderEntries.map((entry) => {
                  const active =
                    selectedEntry &&
                    artworkQueueEntryKey(entry) ===
                      artworkQueueEntryKey(selectedEntry);
                  const latestNote = latestRevisionNote(
                    resolveArtworkRevisionNotes(order, entry)
                  );

                  return (
                    <li key={artworkQueueEntryKey(entry)}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            buildProofHref(
                              orderId,
                              entry.jobId,
                              entry.imprintId
                            )
                          )
                        }
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-[#2c6ecb] bg-[#f0f5ff]"
                            : "border-transparent hover:border-[#ebebeb] hover:bg-[#fafafa]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#303030]">
                              {entry.imprintLabel}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#616161]">
                              {entry.jobName}
                            </p>
                          </div>
                          <ArtworkStatusBadge status={entry.artwork.status} />
                        </div>
                        {latestNote ? (
                          <p className="mt-2 line-clamp-2 text-[11px] italic text-[#616161]">
                            “{latestNote.content}”
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            embedded ? dashboardInsetSurfaceClass : dashboardCardClass,
            "flex min-h-[min(68vh,760px)] flex-col overflow-hidden rounded-xl border border-[#ebebeb]"
          )}
        >
          {selectedEntry ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[15px] font-semibold text-[#303030]">
                    {selectedEntry.imprintLabel}
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {selectedEntry.jobName} · {selectedEntry.artwork.name}
                  </p>
                </div>
                <ArtworkStatusBadge status={selectedEntry.artwork.status} />
              </div>
              <ArtworkProofDetail entry={selectedEntry} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <p className={dashboardTaskDetailClass}>
                Select a decoration location to review proofs and notes.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
