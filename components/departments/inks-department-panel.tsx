"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Droplets, Layers3 } from "lucide-react";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  DepartmentQueueCard,
  PrepDueDateField,
  PrepScheduleLabels,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { ProductionRunGroup } from "@/components/production-run-group";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  clusterInkQueueEntries,
  collectInkQueue,
  type InkQueueEntry,
} from "@/lib/department-queues";
import { departmentInksHref } from "@/lib/departments";
import { inkPrepLineMarkAll } from "@/lib/ink-prep";
import { mergeOrderMaterials } from "@/lib/order-materials";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import { inkColorStableId } from "@/lib/imprint-design";

type InkFilter = "pending" | "completed" | "all";

const FILTERS: { value: InkFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

export function InksDepartmentPanel() {
  const router = useRouter();
  const {
    orders,
    scheduleBlocks,
    getCustomerById,
    updateOrderMaterials,
  } = useSchedule();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InkFilter>("pending");

  const entries = useMemo(
    () => collectInkQueue(orders, scheduleBlocks, { includeCompleted: true }),
    [orders, scheduleBlocks]
  );

  const pendingEntries = useMemo(
    () => entries.filter((entry) => entry.line.status !== "received"),
    [entries]
  );
  const completedEntries = useMemo(
    () => entries.filter((entry) => entry.line.status === "received"),
    [entries]
  );

  const filtered = useMemo(() => {
    if (filter === "pending") return pendingEntries;
    if (filter === "completed") return completedEntries;
    return entries;
  }, [completedEntries, entries, filter, pendingEntries]);

  const clusters = useMemo(
    () => clusterInkQueueEntries(filtered),
    [filtered]
  );

  const saveInkLine = async (
    orderId: string,
    lineId: string,
    updater: (
      line: ReturnType<typeof mergeOrderMaterials>["lines"][number],
      imprint: import("@/types").JobImprint
    ) => ReturnType<typeof mergeOrderMaterials>["lines"][number]
  ) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setSavingId(`${orderId}-${lineId}`);
    try {
      const materials = mergeOrderMaterials(order);
      const lines = materials.lines.map((line) => {
        if (line.id !== lineId || !line.jobId || !line.imprintId) return line;
        const job = order.jobs.find((entry) => entry.id === line.jobId);
        const imprint = job?.imprints.find((entry) => entry.id === line.imprintId);
        if (!imprint) return line;
        return updater(line, imprint);
      });
      await updateOrderMaterials(orderId, { ...materials, lines });
    } finally {
      setSavingId(null);
    }
  };

  const renderCard = (entry: InkQueueEntry, runOrderCount?: number) => {
    const customer = getCustomerById(entry.order.customerId);
    const saving = savingId === `${entry.order.id}-${entry.line.id}`;
    const done = entry.line.status === "received";
    const { prepped, total } = entry.progress;
    const detailHref = departmentInksHref(
      entry.order.id,
      entry.line.jobId,
      entry.line.imprintId
    );

    return (
      <DepartmentQueueCard
        key={entry.line.id}
        customerId={entry.order.customerId}
        company={customer?.company ?? entry.order.company}
        logoUrl={customer?.logoUrl}
        accentColorKey={customer?.accentColorKey}
        fallbackKey={entry.order.id}
        rush={Boolean(entry.scheduleHint) && entry.order.rush}
        onClick={() => router.push(detailHref)}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <DepartmentCardTitle>{entry.imprintLabel}</DepartmentCardTitle>
            {departmentStatusPill(
              done
                ? "Completed"
                : !entry.readyForPrep
                  ? "Not Ready"
                  : prepped > 0
                    ? `${prepped}/${total} colors`
                    : "Pending",
              done
                ? "success"
                : !entry.readyForPrep
                  ? "neutral"
                  : prepped > 0
                    ? "warning"
                    : "neutral"
            )}
            {runOrderCount && runOrderCount > 1 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#b8cceb] bg-[#f4f7fd] px-1.5 py-0.5 text-[10px] font-semibold text-[#315f9e]">
                <Layers3 className="size-2.5" />
                Run {runOrderCount}
              </span>
            ) : null}
          </div>
        }
        subtitle={
          <>
            <span className="text-[13px] font-semibold text-[#303030]">
              {formatOrderDisplayLine(entry.order)}
            </span>
            <span className="mx-1 text-[#c9cccf]">·</span>
            {entry.jobName}
          </>
        }
        meta={
          <div className="space-y-2">
            <PrepScheduleLabels
              scheduleHint={entry.scheduleHint}
              prepDueAt={entry.prepDueAt}
              complete={done}
            />
            {entry.readinessReason ? (
              <p className="rounded-lg border border-[#ebebeb] bg-[#f6f6f7] px-3 py-2 text-[12px] text-[#616161]">
                <span className="font-semibold text-[#303030]">
                  Not Ready:
                </span>{" "}
                {entry.readinessReason}
              </p>
            ) : null}
            {entry.inkColors.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entry.inkColors.map((color, index) => {
                  const colorId = inkColorStableId(color, index);
                  const isPrepped = (
                    entry.line.preppedInkColorIds ?? []
                  ).includes(colorId);
                  return (
                    <span
                      key={colorId}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium",
                        isPrepped
                          ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                          : "border-[#e3e3e3] bg-white text-[#616161]"
                      )}
                    >
                      {color.pmsCode || color.name || `Color ${index + 1}`}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[#8a8a8a]">
                No ink colors defined yet — open to add them.
              </p>
            )}
            <p className="text-[12px] text-[#616161]">
              In hands {formatDate(entry.order.inHandsDate)}
            </p>
          </div>
        }
        actions={
          <>
            <PrepDueDateField
              value={entry.prepDueAt}
              disabled={saving}
              onChange={(value) => {
                void saveInkLine(
                  entry.order.id,
                  entry.line.id,
                  (line) => ({ ...line, prepDueAt: value })
                );
              }}
            />
            <DepartmentMarkDoneButton
              done={done}
              saving={saving}
              disabled={!entry.readyForPrep && !done}
              doneLabel="All inks ready"
              undoLabel="Reopen"
              onClick={() => {
                void saveInkLine(
                  entry.order.id,
                  entry.line.id,
                  (line, imprint) =>
                    inkPrepLineMarkAll(line, imprint, !done)
                );
              }}
            />
            <button
              type="button"
              onClick={() => router.push(detailHref)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold"
              )}
            >
              Open
            </button>
          </>
        }
      />
    );
  };

  return (
    <DepartmentsShell
      activeSlug="inks"
      title="Ink prep queue"
      description="Mix and stage ink for screen-print locations. Click a location to open PMS colors, adjust ink, and mark prep complete."
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
            {item.value === "pending" && pendingEntries.length > 0
              ? ` (${pendingEntries.length})`
              : null}
            {item.value === "completed" && completedEntries.length > 0
              ? ` (${completedEntries.length})`
              : null}
            {item.value === "all" && entries.length > 0
              ? ` (${entries.length})`
              : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <DepartmentEmptyState
          icon={Droplets}
          title={
            filter === "completed"
              ? "No completed ink prep yet"
              : filter === "all"
                ? "No ink jobs yet"
                : "Ink prep is caught up"
          }
          description={
            filter === "completed"
              ? "Locations marked ready will show up here."
              : filter === "all"
                ? "Approved screen-print locations with ink colors, or scheduled locations, appear here."
                : "Approved screen-print locations with configured ink colors appear here, along with scheduled locations that still need their prerequisites."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {clusters.map((cluster) => {
            if (cluster.type === "single") {
              const runCount =
                cluster.entry.order.productionRun?.members.length ?? 0;
              return renderCard(
                cluster.entry,
                runCount > 1 ? runCount : undefined
              );
            }

            return (
              <ProductionRunGroup
                key={cluster.runId}
                orderCount={cluster.orderCount}
              >
                {cluster.entries.map((entry) =>
                  renderCard(entry, cluster.orderCount)
                )}
              </ProductionRunGroup>
            );
          })}
        </div>
      )}
    </DepartmentsShell>
  );
}
