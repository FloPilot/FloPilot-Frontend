"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  DepartmentOrderLink,
  DepartmentQueueCard,
  PrepDueDateField,
  PrepScheduleLabels,
  ProductionFilesNotice,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { collectScreenQueue } from "@/lib/department-queues";
import { mergeOrderMaterials } from "@/lib/order-materials";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ScreensDepartmentPanel() {
  const { orders, scheduleBlocks, getCustomerById, updateOrderMaterials } =
    useSchedule();
  const [savingId, setSavingId] = useState<string | null>(null);

  const entries = useMemo(
    () => collectScreenQueue(orders, scheduleBlocks),
    [orders, scheduleBlocks]
  );

  const saveScreenLine = async (
    orderId: string,
    updater: (
      lines: ReturnType<typeof mergeOrderMaterials>["lines"]
    ) => ReturnType<typeof mergeOrderMaterials>["lines"]
  ) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setSavingId(orderId);
    try {
      const materials = mergeOrderMaterials(order);
      await updateOrderMaterials(orderId, {
        ...materials,
        lines: updater(materials.lines),
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DepartmentsShell
      activeSlug="screens"
      title="Screen burn queue"
      description="Scheduled screen-print orders that still need screens burned. Work appears here after events are on the calendar — target about five days before the run."
    >
      {entries.length === 0 ? (
        <DepartmentEmptyState
          icon={Layers}
          title="No screens waiting"
          description="After you schedule screen-print events on the calendar, prep work shows up here with a target date for burning screens."
        />
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const customer = getCustomerById(entry.order.customerId);
            const saving = savingId === entry.order.id;
            const done = entry.screenLine.status === "received";
            const waitingOnFiles = !entry.hasProductionFiles;

            return (
              <DepartmentQueueCard
                key={entry.order.id}
                customerId={entry.order.customerId}
                company={customer?.company ?? entry.order.company}
                logoUrl={customer?.logoUrl}
                accentColorKey={customer?.accentColorKey}
                fallbackKey={entry.order.id}
                rush={entry.order.rush}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <DepartmentCardTitle>
                      {waitingOnFiles
                        ? "Waiting on production files"
                        : "Burn screens"}
                      {entry.screenPrintCount > 1
                        ? ` · ${entry.screenPrintCount} locations`
                        : ""}
                    </DepartmentCardTitle>
                    {departmentStatusPill(
                      waitingOnFiles
                        ? "Blocked"
                        : done
                          ? "Ready"
                          : entry.screenLine.status === "partial"
                            ? "In progress"
                            : "Not started",
                      waitingOnFiles
                        ? "warning"
                        : done
                          ? "success"
                          : entry.screenLine.status === "partial"
                            ? "warning"
                            : "neutral"
                    )}
                  </div>
                }
                subtitle={
                  <DepartmentOrderLink
                    orderId={entry.order.id}
                    orderNumber={entry.order.number}
                    customLabel={entry.order.customLabel}
                  />
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
                        void saveScreenLine(entry.order.id, (lines) =>
                          lines.map((line) =>
                            line.id === entry.screenLine.id
                              ? { ...line, prepDueAt: value }
                              : line
                          )
                        );
                      }}
                    />
                    <DepartmentMarkDoneButton
                      done={done}
                      saving={saving}
                      disabled={waitingOnFiles}
                      doneLabel="Screens burned"
                      undoLabel="Not ready"
                      onClick={() => {
                        void saveScreenLine(entry.order.id, (lines) =>
                          lines.map((line) =>
                            line.id === entry.screenLine.id
                              ? {
                                  ...line,
                                  expectedQty: 1,
                                  receivedQty: done ? 0 : 1,
                                  status: done
                                    ? ("waiting" as const)
                                    : ("received" as const),
                                }
                              : line
                          )
                        );
                      }}
                    />
                    <Link
                      href={`/app/orders/${entry.order.id}?tab=materials`}
                      className={cn(
                        dashboardControlClass,
                        "h-8 px-3 text-xs font-semibold",
                        waitingOnFiles
                          ? "border-[#f0c674] bg-[#fff8eb] text-[#6b4f12] hover:border-[#e8b84d]"
                          : undefined
                      )}
                    >
                      {waitingOnFiles ? "Upload files" : "Separations"}
                    </Link>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </DepartmentsShell>
  );
}
