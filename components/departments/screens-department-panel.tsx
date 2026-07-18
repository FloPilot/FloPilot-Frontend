"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Layers, Layers3 } from "lucide-react";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  DepartmentQueueCard,
  PrepDueDateField,
  PrepScheduleLabels,
  ProductionFilesNotice,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { ProductionRunGroup } from "@/components/production-run-group";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  clusterScreenQueueEntries,
  collectScreenQueue,
  type ScreenQueueEntry,
} from "@/lib/department-queues";
import { departmentScreensHref } from "@/lib/departments";
import {
  mergeOrderMaterials,
  withScreenSetupBurnStatus,
} from "@/lib/order-materials";
import { productionRunMemberOrderIds } from "@/lib/order-production-run";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type ScreenFilter = "pending" | "completed" | "all";

const FILTERS: { value: ScreenFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

export function ScreensDepartmentPanel() {
  const router = useRouter();
  const { orders, scheduleBlocks, getCustomerById, updateOrderMaterials } =
    useSchedule();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ScreenFilter>("pending");

  const entries = useMemo(
    () =>
      collectScreenQueue(orders, scheduleBlocks, { includeCompleted: true }),
    [orders, scheduleBlocks]
  );

  const pendingEntries = useMemo(
    () => entries.filter((entry) => entry.screenLine.status !== "received"),
    [entries]
  );
  const completedEntries = useMemo(
    () => entries.filter((entry) => entry.screenLine.status === "received"),
    [entries]
  );

  const filtered = useMemo(() => {
    if (filter === "pending") return pendingEntries;
    if (filter === "completed") return completedEntries;
    return entries;
  }, [completedEntries, entries, filter, pendingEntries]);

  const clusters = useMemo(
    () => clusterScreenQueueEntries(filtered),
    [filtered]
  );

  const saveScreenPrepDue = async (orderId: string, prepDueAt: string) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setSavingId(orderId);
    try {
      const materials = mergeOrderMaterials(order);
      await updateOrderMaterials(orderId, {
        ...materials,
        lines: materials.lines.map((line) =>
          line.kind === "screen_setup" ? { ...line, prepDueAt } : line
        ),
      });
    } finally {
      setSavingId(null);
    }
  };

  const setScreenBurnForRun = async (sourceOrder: Order, burned: boolean) => {
    const memberIds = productionRunMemberOrderIds(sourceOrder);
    setSavingId(sourceOrder.id);
    try {
      await Promise.all(
        memberIds.map(async (memberId) => {
          const memberOrder =
            orders.find((entry) => entry.id === memberId) ??
            (memberId === sourceOrder.id ? sourceOrder : null);
          if (!memberOrder) return;
          const materials = mergeOrderMaterials(memberOrder);
          await updateOrderMaterials(
            memberOrder.id,
            withScreenSetupBurnStatus(materials, burned)
          );
        })
      );
    } finally {
      setSavingId(null);
    }
  };

  const renderCard = (entry: ScreenQueueEntry, runOrderCount?: number) => {
    const customer = getCustomerById(entry.order.customerId);
    const saving = savingId === entry.order.id;
    const done = entry.screenLine.status === "received";
    const waitingOnFiles = !entry.hasProductionFiles;
    const detailHref = departmentScreensHref(entry.order.id);

    return (
      <DepartmentQueueCard
        key={entry.order.id}
        customerId={entry.order.customerId}
        company={customer?.company ?? entry.order.company}
        logoUrl={customer?.logoUrl}
        accentColorKey={customer?.accentColorKey}
        fallbackKey={entry.order.id}
        rush={Boolean(entry.scheduleHint) && entry.order.rush}
        onClick={() => router.push(detailHref)}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <DepartmentCardTitle>
              {done
                ? "Screens burned"
                : waitingOnFiles
                  ? "Waiting on production files"
                  : "Burn screens"}
              {entry.screenPrintCount > 1
                ? ` · ${entry.screenPrintCount} locations`
                : ""}
            </DepartmentCardTitle>
            {departmentStatusPill(
              waitingOnFiles && !done
                ? "Not Ready"
                : done
                  ? "Completed"
                  : entry.screenLine.status === "partial"
                    ? "In progress"
                    : "Pending",
              waitingOnFiles && !done
                ? "warning"
                : done
                  ? "success"
                  : entry.screenLine.status === "partial"
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
          <span className="text-[13px] font-semibold text-[#303030]">
            {formatOrderDisplayLine(entry.order)}
          </span>
        }
        meta={
          <div className="space-y-2">
            <PrepScheduleLabels
              scheduleHint={entry.scheduleHint}
              prepDueAt={entry.prepDueAt}
              complete={done}
            />
            <ProductionFilesNotice
              ready={entry.hasProductionFiles}
              fileCount={entry.productionFileCount}
            />
            {runOrderCount && runOrderCount > 1 ? (
              <p className="text-[11px] text-[#5f7aa3]">
                Screens are shared across this run — marking one ready marks
                all.
              </p>
            ) : null}
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
                void saveScreenPrepDue(entry.order.id, value);
              }}
            />
            <DepartmentMarkDoneButton
              done={done}
              saving={saving}
              disabled={waitingOnFiles && !done}
              doneLabel="Screens burned"
              undoLabel="Not ready"
              onClick={() => {
                void setScreenBurnForRun(entry.order, !done);
              }}
            />
            <button
              type="button"
              onClick={() => router.push(detailHref)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                waitingOnFiles && !done
                  ? "border-[#f0c674] bg-[#fff8eb] text-[#6b4f12] hover:border-[#e8b84d]"
                  : undefined
              )}
            >
              {waitingOnFiles && !done ? "Open" : "Open files"}
            </button>
          </>
        }
      />
    );
  };

  return (
    <DepartmentsShell
      activeSlug="screens"
      title="Screen burn queue"
      description="Screen-print work with uploaded production files or a scheduled run. Click a job to download files and mark screens burned."
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
          icon={Layers}
          title={
            filter === "completed"
              ? "No completed screens yet"
              : filter === "all"
                ? "No screen jobs yet"
                : "No screens waiting"
          }
          description={
            filter === "completed"
              ? "Burned screens will show up here after you mark them complete."
              : filter === "all"
                ? "Upload separation or TIFF files, or schedule a screen-print event, to add screen work here."
                : "Upload separation or TIFF files, or schedule a screen-print event, to add unfinished screen work to this queue."
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
