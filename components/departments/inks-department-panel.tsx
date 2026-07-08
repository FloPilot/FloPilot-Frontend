"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, Droplets } from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { schedulableJobKey } from "@/lib/job-imprints";
import { inkColorStableId } from "@/lib/imprint-design";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  DepartmentOrderLink,
  DepartmentQueueCard,
  PrepDueDateField,
  PrepScheduleLabels,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { collectInkQueue } from "@/lib/department-queues";
import {
  inkPrepLineMarkAll,
  inkPrepLineFromColorToggle,
} from "@/lib/ink-prep";
import { mergeOrderMaterials } from "@/lib/order-materials";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InksDepartmentPanel() {
  const {
    orders,
    scheduleBlocks,
    getCustomerById,
    updateOrderMaterials,
  } = useSchedule();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scheduleKey, setScheduleKey] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const entries = useMemo(
    () => collectInkQueue(orders, scheduleBlocks),
    [orders, scheduleBlocks]
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

  return (
    <DepartmentsShell
      activeSlug="inks"
      title="Ink prep queue"
      description="Mix and stage ink for each screen-print location. Mark colors as you go — the floor sees the same status on the order."
    >
      {entries.length === 0 ? (
        <DepartmentEmptyState
          icon={Droplets}
          title="Ink prep is caught up"
          description="Locations with ink colors to mix appear here after proofs are approved."
        />
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const customer = getCustomerById(entry.order.customerId);
            const saving = savingId === `${entry.order.id}-${entry.line.id}`;
            const done = entry.line.status === "received";
            const { prepped, total } = entry.progress;

            return (
              <DepartmentQueueCard
                key={entry.line.id}
                customerId={entry.order.customerId}
                company={customer?.company ?? entry.order.company}
                logoUrl={customer?.logoUrl}
                accentColorKey={customer?.accentColorKey}
                fallbackKey={entry.order.id}
                rush={entry.order.rush}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <DepartmentCardTitle>{entry.imprintLabel}</DepartmentCardTitle>
                    {departmentStatusPill(
                      done
                        ? "Ready"
                        : prepped > 0
                          ? `${prepped}/${total} colors`
                          : "Not started",
                      done ? "success" : prepped > 0 ? "warning" : "neutral"
                    )}
                  </div>
                }
                subtitle={
                  <>
                    <DepartmentOrderLink
                      orderId={entry.order.id}
                      orderNumber={entry.order.number}
                    />
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
                    {entry.inkColors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.inkColors.map((color, index) => {
                          const colorId = inkColorStableId(color, index);
                          const isPrepped = (
                            entry.line.preppedInkColorIds ?? []
                          ).includes(colorId);
                          return (
                            <button
                              key={colorId}
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                void saveInkLine(
                                  entry.order.id,
                                  entry.line.id,
                                  (line, imprint) =>
                                    inkPrepLineFromColorToggle(
                                      line,
                                      imprint,
                                      colorId,
                                      !isPrepped
                                    )
                                );
                              }}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                isPrepped
                                  ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                                  : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9cccf]"
                              )}
                            >
                              {color.pmsCode || color.name || `Color ${index + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#8a8a8a]">
                        No ink colors defined yet — add them on the order.
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
                      className={cn(dashboardControlClass, "h-8 gap-1.5 px-3 text-xs font-semibold")}
                      onClick={() => {
                        setScheduleKey(
                          schedulableJobKey(
                            entry.order.id,
                            entry.line.jobId!,
                            entry.line.imprintId!
                          )
                        );
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
                      Order
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
        prefillJobKey={scheduleKey ?? undefined}
        filterOrderId={
          scheduleKey ? scheduleKey.split("::")[0] : undefined
        }
      />
    </DepartmentsShell>
  );
}
