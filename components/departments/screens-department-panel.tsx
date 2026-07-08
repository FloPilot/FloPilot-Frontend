"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, Layers } from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  DepartmentOrderLink,
  DepartmentQueueCard,
  PrepDueDateField,
  PrepScheduleLabels,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { collectScreenQueue } from "@/lib/department-queues";
import { mergeOrderMaterials } from "@/lib/order-materials";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ScreensDepartmentPanel() {
  const {
    orders,
    scheduleBlocks,
    getCustomerById,
    updateOrderMaterials,
  } = useSchedule();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scheduleOrderId, setScheduleOrderId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const entries = useMemo(
    () => collectScreenQueue(orders, scheduleBlocks),
    [orders, scheduleBlocks]
  );

  const saveScreenLine = async (
    orderId: string,
    updater: (lines: ReturnType<typeof mergeOrderMaterials>["lines"]) => ReturnType<typeof mergeOrderMaterials>["lines"]
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
      description="Orders with screen printing that still need screens burned. Target about five days before the earliest scheduled run — adjust the date if your shop needs more lead time."
    >
      {entries.length === 0 ? (
        <DepartmentEmptyState
          icon={Layers}
          title="No screens waiting"
          description="When screen-print orders are approved and screens aren't marked ready, they'll show up here."
        />
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const customer = getCustomerById(entry.order.customerId);
            const saving = savingId === entry.order.id;
            const done = entry.screenLine.status === "received";

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
                  <DepartmentCardTitle>
                    Burn screens
                    {entry.screenPrintCount > 1
                      ? ` · ${entry.screenPrintCount} locations`
                      : ""}
                  </DepartmentCardTitle>
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
                    <p className="text-[12px] text-[#616161]">
                      In hands {formatDate(entry.order.inHandsDate)}
                      {entry.screenLine.status === "partial"
                        ? " · Partially complete"
                        : null}
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
                    <button
                      type="button"
                      className={cn(dashboardControlClass, "h-8 gap-1.5 px-3 text-xs font-semibold")}
                      onClick={() => {
                        setScheduleOrderId(entry.order.id);
                        setScheduleOpen(true);
                      }}
                    >
                      <CalendarPlus className="size-3.5" />
                      Schedule
                    </button>
                    <Link
                      href={`/app/orders/${entry.order.id}?tab=materials`}
                      className={cn(dashboardControlClass, "h-8 px-3 text-xs font-semibold")}
                    >
                      Separations
                    </Link>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        filterOrderId={scheduleOrderId ?? undefined}
      />
    </DepartmentsShell>
  );
}
