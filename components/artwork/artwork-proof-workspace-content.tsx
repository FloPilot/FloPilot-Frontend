"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGuardedRouter } from "@/hooks/use-guarded-router";
import { ArrowLeft, ExternalLink, LayoutList } from "lucide-react";
import { ArtworkProofDetail } from "@/components/artwork/artwork-proof-detail";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ProofOrderSummaryPanel } from "@/components/orders/artwork/proof-order-summary-panel";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { resolveArtworkRevisionNotes } from "@/lib/artwork-routes";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  artworkQueueEntryKey,
  collectArtworkQueue,
  getArtworkEntryContext,
} from "@/lib/artwork-queue";
import {
  rollupArtworkStatus,
  sharedArtAssigneeId,
} from "@/lib/artwork-status";
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
import { resolveArtworkDisplayName } from "@/lib/proof-slides";
import { cn } from "@/lib/utils";

export type ArtworkProofWorkspaceContentProps = {
  orderId: string;
  backHref: string;
  backLabel: string;
  buildProofHref: (orderId: string, jobId?: string, imprintId?: string) => string;
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
  const router = useGuardedRouter();
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
  const showingSummary = !selectedJobId || !selectedImprintId;

  const selectedEntry = useMemo(() => {
    if (!selectedJobId || !selectedImprintId) return null;
    return (
      orderEntries.find(
        (entry) =>
          entry.jobId === selectedJobId && entry.imprintId === selectedImprintId
      ) ?? null
    );
  }, [orderEntries, selectedJobId, selectedImprintId]);

  const proofSteps = useMemo(() => {
    if (!order) return [];
    return orderEntries
      .map((entry) => {
        const { job, imprint } = getArtworkEntryContext(orders, entry);
        if (!job || !imprint) return null;
        return { job, imprint };
      })
      .filter((step): step is { job: NonNullable<typeof step>["job"]; imprint: NonNullable<typeof step>["imprint"] } =>
        Boolean(step)
      );
  }, [order, orderEntries, orders]);

  const summaryStatus = useMemo(
    () =>
      rollupArtworkStatus(
        proofSteps.map((step) => step.imprint.artwork.status)
      ),
    [proofSteps]
  );

  const summaryArtist = useMemo(() => {
    const sharedId = sharedArtAssigneeId(
      proofSteps.map((step) => step.imprint.artwork)
    );
    if (!sharedId) return null;
    return (
      proofSteps
        .find((step) => step.imprint.artwork.artAssigneeId === sharedId)
        ?.imprint.artwork.artAssigneeName?.trim() || null
    );
  }, [proofSteps]);

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

  const headerTitle = showingSummary
    ? "Artwork summary"
    : selectedEntry?.imprintLabel ?? "Artwork";

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
              {headerTitle}
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {formatOrderDisplayLine(order)} ·{" "}
              {customer?.company || order.company} · In hands{" "}
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
              {formatOrderDisplayLine(order)} artwork workspace
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
                <li>
                  <button
                    type="button"
                    onClick={() => router.push(buildProofHref(orderId))}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      showingSummary
                        ? "border-[#2c6ecb] bg-[#f0f5ff]"
                        : "border-transparent hover:border-[#ebebeb] hover:bg-[#fafafa]"
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p
                        className={cn(
                          "inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold",
                          showingSummary ? "text-[#2c6ecb]" : "text-[#303030]"
                        )}
                      >
                        <LayoutList className="size-3.5 shrink-0" />
                        <span className="truncate">Summary</span>
                      </p>
                      {summaryStatus ? (
                        <ArtworkStatusBadge status={summaryStatus} size="sm" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[#616161]">
                      {summaryArtist
                        ? `Artist · ${summaryArtist}`
                        : "Send all proofs back to the team"}
                    </p>
                  </button>
                </li>

                <li
                  aria-hidden
                  className="mx-1 border-t border-[#ebebeb] pt-1"
                />

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
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#303030]">
                              {entry.imprintLabel}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                              {entry.jobName}
                            </p>
                          </div>
                          <ArtworkStatusBadge
                            status={entry.artwork.status}
                            size="sm"
                          />
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
            "flex h-[min(72vh,820px)] max-h-[calc(100dvh-13rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-[#ebebeb]"
          )}
        >
          {showingSummary ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[15px] font-semibold text-[#303030]">
                    Order summary
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    Finish locations, then send everything back to the team at
                    once
                  </p>
                </div>
                {summaryStatus ? (
                  <ArtworkStatusBadge status={summaryStatus} />
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ProofOrderSummaryPanel
                  order={order}
                  proofSteps={proofSteps}
                  mode="art_department"
                  onSelectProof={(jobId, imprintId) =>
                    router.push(buildProofHref(orderId, jobId, imprintId))
                  }
                />
              </div>
            </>
          ) : selectedEntry ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[15px] font-semibold text-[#303030]">
                    {selectedEntry.imprintLabel}
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {selectedEntry.jobName} ·{" "}
                    {resolveArtworkDisplayName(selectedEntry.artwork)}
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
