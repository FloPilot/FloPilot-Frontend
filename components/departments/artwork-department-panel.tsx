"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileImage, RotateCcw } from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentOrderLink,
  DepartmentQueueCard,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { collectArtworkDepartmentQueue } from "@/lib/department-queues";
import { departmentArtworkProofHref } from "@/lib/departments";
import { decorationLabel, formatDate } from "@/lib/format";
import { latestRevisionNote } from "@/lib/revision-notes";
import { resolveArtworkRevisionNotes } from "@/lib/artwork-routes";
import { dashboardControlClass, dashboardTaskDetailClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ArtworkFilter = "all" | "pending" | "revision_requested";

const FILTERS: { value: ArtworkFilter; label: string }[] = [
  { value: "all", label: "All open" },
  { value: "pending", label: "Pending" },
  { value: "revision_requested", label: "Revision" },
];

export function ArtworkDepartmentPanel() {
  const router = useRouter();
  const { orders, getCustomerById } = useSchedule();
  const [filter, setFilter] = useState<ArtworkFilter>("all");

  const entries = useMemo(
    () => collectArtworkDepartmentQueue(orders),
    [orders]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((entry) => entry.artwork.status === filter);
  }, [entries, filter]);

  const pendingCount = entries.filter((e) => e.artwork.status === "pending").length;
  const revisionCount = entries.filter(
    (e) => e.artwork.status === "revision_requested"
  ).length;

  return (
    <DepartmentsShell
      activeSlug="artwork"
      title="Artwork queue"
      description="Proofs waiting for review or customer revisions — click a location to open the full proof view."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              dashboardControlClass,
              "h-8 px-3 text-xs font-semibold",
              filter === item.value
                ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                : "text-[#303030]"
            )}
          >
            {item.label}
            {item.value === "pending" && pendingCount > 0
              ? ` (${pendingCount})`
              : null}
            {item.value === "revision_requested" && revisionCount > 0
              ? ` (${revisionCount})`
              : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <DepartmentEmptyState
          icon={FileImage}
          title="Art queue is clear"
          description="New proofs appear here when orders need review or the customer requests changes."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => {
            const customer = getCustomerById(entry.customerId);
            const isRevision = entry.artwork.status === "revision_requested";
            const order = orders.find((item) => item.id === entry.orderId);
            const latestNote = latestRevisionNote(
              resolveArtworkRevisionNotes(order, entry)
            );

            return (
              <DepartmentQueueCard
                key={`${entry.orderId}-${entry.imprintId}`}
                customerId={entry.customerId}
                company={customer?.company ?? entry.company}
                logoUrl={customer?.logoUrl}
                accentColorKey={customer?.accentColorKey}
                fallbackKey={entry.orderId}
                onClick={() =>
                  router.push(
                    departmentArtworkProofHref(
                      entry.orderId,
                      entry.jobId,
                      entry.imprintId
                    )
                  )
                }
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <DepartmentCardTitle>{entry.imprintLabel}</DepartmentCardTitle>
                    <ArtworkStatusBadge status={entry.artwork.status} />
                  </div>
                }
                subtitle={
                  <>
                    <DepartmentOrderLink
                      orderId={entry.orderId}
                      orderNumber={entry.orderNumber}
                      customLabel={entry.orderCustomLabel}
                    />
                    <span className="mx-1 text-[#c9cccf]">·</span>
                    {decorationLabel(entry.decoration)} · {entry.jobName}
                  </>
                }
                meta={
                  <p className={dashboardTaskDetailClass}>
                    {isRevision ? (
                      <span className="inline-flex items-center gap-1 text-[#8a6116]">
                        <RotateCcw className="size-3.5" />
                        Customer requested changes
                      </span>
                    ) : (
                      departmentStatusPill("Awaiting proof", "progress")
                    )}
                    {latestNote ? (
                      <>
                        <span className="mx-2 text-[#d4d4d4]">·</span>
                        <span className="line-clamp-1 italic">
                          “{latestNote.content}”
                        </span>
                      </>
                    ) : null}
                    <span className="mx-2 text-[#d4d4d4]">·</span>
                    In hands {formatDate(entry.inHandsDate)}
                  </p>
                }
              />
            );
          })}
        </div>
      )}
    </DepartmentsShell>
  );
}
