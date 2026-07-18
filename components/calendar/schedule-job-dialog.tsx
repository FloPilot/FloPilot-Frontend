"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarCheck2, ChevronRight, Layers3, Loader2 } from "lucide-react";
import type { Machine, ScheduleBlock } from "@/types";
import { useSchedule } from "@/components/providers/schedule-provider";
import { OrderStatusBadge } from "@/components/status-badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { schedulableJobKey } from "@/lib/job-imprints";
import { formatOrderDisplayLine, formatOrderRef, formatOrderNumberWithLabel } from "@/lib/order-display";
import { isWillCallOrder } from "@/lib/order-shipping";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  getCustomerAccent,
  getCustomerInitials,
} from "@/lib/production-customer-colors";
import { decorationLabel } from "@/lib/format";
import {
  clampBlockToMachineHours,
  formatOperatingHoursSummary,
  getMachineOperatingHours,
} from "@/lib/machine-hours";
import { FlowStepList } from "@/components/calendar/order-production-flow";
import { getSchedulableJobs } from "@/lib/production-schedule";
import { findScheduleBlockForStep } from "@/lib/order-production";
import { getOrdersBlockedFromSchedulingQueue } from "@/lib/event-basket";
import {
  analyzeOrderProductionFlow,
  canScheduleFlowStep,
} from "@/lib/production-flow";
import { applyCalendarEventProductionStatus } from "@/lib/calendar-event-status";
import {
  CALENDAR_EVENT_STATUS_OPTIONS,
  resolveScheduleBlockProductionStatus,
  type ScheduleBlockProductionStatus,
} from "@/lib/schedule-block-display";
import { formatDate } from "@/lib/format";
import { formatEventXOfY } from "@/lib/terminology";
import { machineColorStyles } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";

type ScheduleForm = {
  jobKey: string;
  machineId: string;
  date: string;
  startTime: string;
  durationHours: number;
  notes: string;
  customLabel: string;
};

const defaultForm: ScheduleForm = {
  jobKey: "",
  machineId: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "08:00",
  durationHours: 4,
  notes: "",
  customLabel: "",
};

/** Round up to the next half-hour so newly scheduled events aren't already over. */
function nextScheduleStartTime(from = new Date()): string {
  const next = new Date(from);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  if (minutes === 0) {
    // already on the hour
  } else if (minutes <= 30) {
    next.setMinutes(30);
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  }
  return format(next, "HH:mm");
}

function defaultScheduleForm(
  overrides: Partial<ScheduleForm> = {}
): ScheduleForm {
  const date = overrides.date ?? format(new Date(), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const startTime =
    overrides.startTime ??
    (date === today ? nextScheduleStartTime() : "08:00");

  return {
    ...defaultForm,
    ...overrides,
    date,
    startTime,
  };
}

interface ScheduleJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillMachineId?: string;
  prefillDate?: string;
  prefillJobKey?: string;
  filterOrderId?: string;
  editingBlock?: ScheduleBlock;
}

export function ScheduleJobDialog({
  open,
  onOpenChange,
  prefillMachineId,
  prefillDate,
  prefillJobKey,
  filterOrderId,
  editingBlock,
}: ScheduleJobDialogProps) {
  const {
    machines,
    activeOrders: orders,
    activeScheduleBlocks: scheduleBlocks,
    jobRuns,
    addScheduleBlock,
    updateScheduleBlock,
    removeScheduleBlock,
    getJobRun,
    updateProductionEventWorkflow,
    startJobRun,
    resumeJobRun,
    finishJobRun,
  } = useSchedule();
  const router = useRouter();
  const orderScopeId = editingBlock?.orderId ?? filterOrderId;

  const openOrder = (orderId: string) => {
    onOpenChange(false);
    router.push(`/app/orders/${orderId}`);
  };

  const schedulableJobs = useMemo(
    () => getSchedulableJobs(orders, { includeOrderId: orderScopeId }),
    [orders, orderScopeId]
  );
  const filteredSchedulableJobs = useMemo(() => {
    if (!orderScopeId) return schedulableJobs;
    return schedulableJobs.filter((job) => job.orderId === orderScopeId);
  }, [schedulableJobs, orderScopeId]);

  const editingJobKey = editingBlock
    ? schedulableJobKey(
        editingBlock.orderId,
        editingBlock.jobId,
        editingBlock.imprintId
      )
    : null;

  // Only surface events that still need a calendar slot — anything already
  // scheduled stays out of the picker (except the event being edited).
  const schedulableJobOptions = useMemo(
    () =>
      filteredSchedulableJobs.filter((job) => {
        const key = schedulableJobKey(job.orderId, job.jobId, job.imprintId);
        if (editingJobKey && key === editingJobKey) return true;
        return !findScheduleBlockForStep(
          scheduleBlocks,
          job.orderId,
          job.jobId,
          job.imprintId
        );
      }),
    [filteredSchedulableJobs, scheduleBlocks, editingJobKey]
  );

  const activeMachines = useMemo(
    () => machines.filter((machine) => machine.active),
    [machines]
  );
  const firstActiveMachineId = activeMachines[0]?.id;
  const singleScopedJobKey = useMemo(() => {
    if (prefillJobKey) return prefillJobKey;
    if (orderScopeId && schedulableJobOptions.length === 1) {
      const job = schedulableJobOptions[0];
      return schedulableJobKey(job.orderId, job.jobId, job.imprintId);
    }
    return "";
  }, [prefillJobKey, orderScopeId, schedulableJobOptions]);

  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [scheduleRunTogether, setScheduleRunTogether] = useState(true);
  const [productionStatus, setProductionStatus] =
    useState<ScheduleBlockProductionStatus>("scheduled");

  useEffect(() => {
    if (!open) return;
    setScheduleError(null);

    if (editingBlock) {
      const start = parseISO(editingBlock.startAt);
      const end = parseISO(editingBlock.endAt);
      const durationMs = end.getTime() - start.getTime();
      setForm({
        jobKey: schedulableJobKey(
          editingBlock.orderId,
          editingBlock.jobId,
          editingBlock.imprintId
        ),
        machineId: editingBlock.machineId,
        date: format(start, "yyyy-MM-dd"),
        startTime: format(start, "HH:mm"),
        durationHours: Math.max(1, Math.round(durationMs / (1000 * 60 * 60))),
        notes: editingBlock.notes ?? "",
        customLabel: editingBlock.customLabel ?? "",
      });
      setProductionStatus(
        resolveScheduleBlockProductionStatus(editingBlock, jobRuns, orders)
      );
      return;
    }

    setForm(
      defaultScheduleForm({
        jobKey: singleScopedJobKey,
        machineId: prefillMachineId ?? firstActiveMachineId ?? "",
        date: prefillDate ?? format(new Date(), "yyyy-MM-dd"),
      })
    );
  }, [
    open,
    editingBlock?.id,
    prefillMachineId,
    prefillDate,
    singleScopedJobKey,
    firstActiveMachineId,
    jobRuns,
    orders,
  ]);

  const selectedJob = schedulableJobOptions.find(
    (j) =>
      schedulableJobKey(j.orderId, j.jobId, j.imprintId) === form.jobKey
  );

  const selectedMachine = machines.find((m) => m.id === form.machineId);

  const selectedJobLabel = selectedJob
    ? `${formatOrderRef(selectedJob)} — ${selectedJob.imprintLabel} · ${decorationLabel(selectedJob.decoration)}`
    : null;

  const selectedOrder = selectedJob
    ? orders.find((order) => order.id === selectedJob.orderId)
    : undefined;

  const linkedRunJobs = useMemo(() => {
    if (!selectedJob || !selectedOrder?.productionRun || editingBlock) return [];
    const memberIds = new Set(
      selectedOrder.productionRun.members.map((member) => member.orderId)
    );
    const normalizedLabel = selectedJob.imprintLabel.trim().toLowerCase();
    return schedulableJobs.filter((job) => {
      if (job.orderId === selectedJob.orderId || !memberIds.has(job.orderId)) {
        return false;
      }
      if (
        job.decoration !== selectedJob.decoration ||
        job.imprintLabel.trim().toLowerCase() !== normalizedLabel
      ) {
        return false;
      }
      if (
        findScheduleBlockForStep(
          scheduleBlocks,
          job.orderId,
          job.jobId,
          job.imprintId
        )
      ) {
        return false;
      }
      const linkedOrder = orders.find((order) => order.id === job.orderId);
      return Boolean(
        linkedOrder &&
          canScheduleFlowStep(
            linkedOrder,
            job.jobId,
            job.imprintId,
            scheduleBlocks
          ).ok
      );
    });
  }, [
    selectedJob,
    selectedOrder,
    editingBlock,
    schedulableJobs,
    scheduleBlocks,
    orders,
  ]);

  const orderFlow = useMemo(() => {
    if (!selectedOrder) return [];
    return analyzeOrderProductionFlow(selectedOrder, scheduleBlocks);
  }, [selectedOrder, scheduleBlocks]);

  const selectedFlowStep = orderFlow.find(
    (step) =>
      selectedJob &&
      step.jobId === selectedJob.jobId &&
      step.imprintId === selectedJob.imprintId
  );

  const flowGate = useMemo(() => {
    if (!selectedOrder || !selectedJob || editingBlock) return { ok: true as const };
    return canScheduleFlowStep(
      selectedOrder,
      selectedJob.jobId,
      selectedJob.imprintId,
      scheduleBlocks
    );
  }, [selectedOrder, selectedJob, scheduleBlocks, editingBlock]);

  useEffect(() => {
    if (!open || !editingBlock) return;
    setProductionStatus(
      resolveScheduleBlockProductionStatus(editingBlock, jobRuns, orders)
    );
  }, [open, editingBlock, jobRuns, orders]);

  useEffect(() => {
    if (!open || editingBlock) return;
    const orderId = selectedJob?.orderId ?? orderScopeId;
    if (!orderId) return;
    const order = orders.find((entry) => entry.id === orderId);
    const label = order?.customLabel?.trim();
    if (!label) return;

    setForm((current) => {
      if (current.customLabel.trim()) return current;
      return { ...current, customLabel: label };
    });
  }, [open, editingBlock, selectedJob?.orderId, orderScopeId, orders]);

  useEffect(() => {
    if (!open || !selectedMachine) return;
    const hours = getMachineOperatingHours(selectedMachine);
    setForm((f) => ({
      ...f,
      startTime: f.startTime || hours.openTime,
    }));
  }, [open, selectedMachine?.id]);

  const suggestDuration = () => {
    if (!selectedJob || !selectedMachine?.capacityPerHour) return;
    const hours = Math.max(
      1,
      Math.ceil(selectedJob.pieceCount / selectedMachine.capacityPerHour)
    );
    setForm((f) => ({ ...f, durationHours: hours }));
  };

  const buildBlock = (): Omit<ScheduleBlock, "id"> | null => {
    if (!selectedJob || !form.machineId || !selectedMachine) return null;
    const startAt = `${form.date}T${form.startTime}:00`;
    const start = parseISO(startAt);
    const end = new Date(start.getTime() + form.durationHours * 60 * 60 * 1000);
    const day = parseISO(form.date);

    const clamped = clampBlockToMachineHours(
      selectedMachine,
      day,
      start.toISOString(),
      end.toISOString()
    );
    if (!clamped) return null;

    return {
      machineId: form.machineId,
      orderId: selectedJob.orderId,
      jobId: selectedJob.jobId,
      jobName: selectedJob.jobName,
      imprintId: selectedJob.imprintId,
      imprintLabel: selectedJob.imprintLabel,
      orderNumber: selectedJob.orderNumber,
      customerName: selectedJob.customerName,
      startAt: clamped.startAt,
      endAt: clamped.endAt,
      pieceCount: selectedJob.pieceCount,
      notes: form.notes || undefined,
      customLabel: form.customLabel.trim() || undefined,
      productionRunId: selectedOrder?.productionRun?.id,
      productionRunOrderCount: selectedOrder?.productionRun?.members.length,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    const block = buildBlock();
    if (!block) {
      setScheduleError(
        selectedMachine
          ? `This time is outside ${selectedMachine.name}'s operating hours (${formatOperatingHoursSummary(selectedMachine)}).`
          : "Could not schedule at this time."
      );
      return;
    }

    if (!editingBlock && selectedOrder && selectedJob) {
      const sequenceCheck = canScheduleFlowStep(
        selectedOrder,
        selectedJob.jobId,
        selectedJob.imprintId,
        scheduleBlocks
      );
      if (!sequenceCheck.ok) {
        setScheduleError(sequenceCheck.reason);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingBlock) {
        await updateScheduleBlock(editingBlock.id, block);
      } else {
        const blocks = [block];
        if (scheduleRunTogether && linkedRunJobs.length > 0 && selectedMachine) {
          let cursor = parseISO(block.endAt);
          for (const linkedJob of linkedRunJobs) {
            const durationHours = selectedMachine.capacityPerHour
              ? Math.max(
                  1,
                  Math.ceil(
                    linkedJob.pieceCount / selectedMachine.capacityPerHour
                  )
                )
              : form.durationHours;
            const end = new Date(
              cursor.getTime() + durationHours * 60 * 60 * 1000
            );
            const clamped = clampBlockToMachineHours(
              selectedMachine,
              parseISO(form.date),
              cursor.toISOString(),
              end.toISOString()
            );
            if (!clamped || parseISO(clamped.startAt).getTime() !== cursor.getTime()) {
              throw new Error(
                `The full multi-job run does not fit in ${selectedMachine.name}'s operating hours. Choose an earlier start or shorter duration.`
              );
            }
            const linkedOrder = orders.find(
              (order) => order.id === linkedJob.orderId
            );
            blocks.push({
              machineId: form.machineId,
              orderId: linkedJob.orderId,
              jobId: linkedJob.jobId,
              jobName: linkedJob.jobName,
              imprintId: linkedJob.imprintId,
              imprintLabel: linkedJob.imprintLabel,
              orderNumber: linkedJob.orderNumber,
              customerName: linkedJob.customerName,
              startAt: clamped.startAt,
              endAt: clamped.endAt,
              pieceCount: linkedJob.pieceCount,
              notes: form.notes || undefined,
              customLabel: linkedOrder?.customLabel?.trim() || undefined,
              productionRunId: selectedOrder?.productionRun?.id,
              productionRunOrderCount:
                selectedOrder?.productionRun?.members.length,
            });
            cursor = parseISO(clamped.endAt);
          }
        }
        for (const nextBlock of blocks) {
          await addScheduleBlock(nextBlock);
        }
      }
      // Close before clearing submitting so the empty-queue state never paints.
      onOpenChange(false);
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Could not save this schedule."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBlock) return;

    setSubmitting(true);
    try {
      await removeScheduleBlock(editingBlock.id);
      onOpenChange(false);
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Could not remove this schedule."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductionStatusChange = async (
    status: ScheduleBlockProductionStatus
  ) => {
    if (!editingBlock || status === productionStatus) return;

    setStatusSaving(true);
    setScheduleError(null);
    try {
      await applyCalendarEventProductionStatus({
        block: editingBlock,
        status,
        getJobRun,
        updateProductionEventWorkflow,
        startJobRun,
        resumeJobRun,
        finishJobRun,
      });
      setProductionStatus(status);
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Could not update event status."
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const statusBadgeClass: Record<ScheduleBlockProductionStatus, string> = {
    scheduled: "bg-[#ebf4ff] text-[#2c6ecb]",
    in_progress: "bg-[#fff5ea] text-[#b98900]",
    completed: "bg-[#e3f1df] text-[#108043]",
    blocked: "bg-[#fff1f1] text-[#b42318]",
  };

  const accent = selectedJob
    ? getCustomerAccent(selectedOrder?.customerId, selectedJob.orderId)
    : null;
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]";

  // Nothing left to schedule (new event flow) — surface why instead of a blank picker.
  // Skip while submitting: addScheduleBlock updates blocks then awaits a refresh, which
  // would otherwise flash this empty modal before we close the dialog.
  const showEmptyState =
    open &&
    !editingBlock &&
    !submitting &&
    schedulableJobOptions.length === 0;
  const blockedQueueOrders = useMemo(() => {
    if (orderScopeId) return [];
    const seen = new Set<string>();
    return getOrdersBlockedFromSchedulingQueue(orders, scheduleBlocks).filter(
      ({ order }) => {
        if (seen.has(order.id)) return false;
        seen.add(order.id);
        return true;
      }
    );
  }, [orders, scheduleBlocks, orderScopeId]);

  const hasMultiJobRun =
    !editingBlock &&
    Boolean(selectedOrder?.productionRun) &&
    linkedRunJobs.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,920px)] w-full flex-col gap-0 overflow-hidden rounded-xl border-[#e3e3e3] p-0",
          showEmptyState && blockedQueueOrders.length > 0
            ? "sm:max-w-3xl"
            : hasMultiJobRun
              ? "sm:max-w-3xl"
              : "sm:max-w-2xl"
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-6 py-5 pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className={dashboardTaskTitleClass}>
                {editingBlock ? "Event details" : "Schedule on calendar"}
              </DialogTitle>
              {editingBlock ? (
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    statusBadgeClass[productionStatus]
                  )}
                >
                  {CALENDAR_EVENT_STATUS_OPTIONS.find(
                    (option) => option.value === productionStatus
                  )?.label ?? productionStatus}
                </span>
              ) : null}
              {statusSaving ? (
                <Loader2 className="size-4 animate-spin text-[#616161]" />
              ) : null}
            </div>
            <DialogDescription className={cn(dashboardTaskDetailClass, "mt-1.5")}>
              {editingBlock
                ? "Update the event name, production status, machine, and time."
                : "Pick a machine and time for this production event. You can schedule events in any order."}
            </DialogDescription>
          </DialogHeader>

          {showEmptyState ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-8">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-[#e8f5ee] text-[#0d5c2e]">
                    <CalendarCheck2 className="size-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-3.5 text-[15px] font-semibold text-[#303030]">
                    {blockedQueueOrders.length > 0
                      ? "Nothing ready to schedule"
                      : "All caught up"}
                  </h3>
                  <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[#616161]">
                    {blockedQueueOrders.length > 0
                      ? "These orders are in the queue but still waiting on customer approvals. Open one to see what it needs."
                      : "Every event that's ready is already on the calendar. New events show up here once the customer approves the estimate and proofs."}
                  </p>
                </div>

                {blockedQueueOrders.length > 0 && (
                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "mt-6 overflow-hidden text-left"
                    )}
                  >
                    <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5">
                      <p className="text-[12px] font-semibold text-[#303030]">
                        In the queue
                        <span className="ml-1.5 font-normal text-[#616161]">
                          · {blockedQueueOrders.length} waiting
                        </span>
                      </p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead className="sticky top-0 z-10 border-b border-[#ebebeb] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          <tr>
                            <th className="px-4 py-2 font-medium">Order</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Waiting on</th>
                            <th className="w-8 px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebebeb]">
                          {blockedQueueOrders.map(({ order, reason }) => (
                            <tr
                              key={order.id}
                              role="link"
                              tabIndex={0}
                              aria-label={`Open order ${formatOrderDisplayLine(order)}`}
                              onClick={() => openOrder(order.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openOrder(order.id);
                                }
                              }}
                              className="group cursor-pointer transition-colors hover:bg-[#fafafa] focus-visible:bg-[#fafafa] focus-visible:outline-none"
                            >
                              <td className="px-4 py-2.5 align-top">
                                <p className="font-semibold text-[#303030] group-hover:text-[#2c6ecb]">
                                  {formatOrderDisplayLine(order)}
                                </p>
                                <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                                  {order.company}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <OrderStatusBadge
                                  status={order.status}
                                  willCall={isWillCallOrder(
                                    order.shipping,
                                    order.shipments ?? []
                                  )}
                                  className="text-[11px] font-medium"
                                />
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] leading-snug text-[#616161]">
                                {reason}
                              </td>
                              <td className="px-3 py-2.5 align-middle text-right">
                                <ChevronRight className="ml-auto size-4 text-[#c9cccf] transition-colors group-hover:text-[#616161]" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-end border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4">
                <button
                  type="button"
                  className={dashboardPrimaryButtonClass}
                  onClick={() => onOpenChange(false)}
                >
                  Got it
                </button>
              </div>
            </>
          ) : (
            <>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white px-6 py-6">
            {!flowGate.ok && (
              <div className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3 text-[13px] text-[#8a6116]">
                {flowGate.reason}
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              {(editingBlock || selectedJob) && (
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="sched-custom-label" className={labelClass}>
                    Custom event name
                  </Label>
                  <Input
                    id="sched-custom-label"
                    value={form.customLabel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customLabel: e.target.value }))
                    }
                    placeholder="e.g. CUSTOM NAME"
                    className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                  />
                  <p className="text-[12px] leading-relaxed text-[#616161]">
                    Shows on the calendar as{" "}
                    <span className="font-medium text-[#303030]">
                      {selectedJob
                        ? formatOrderRef(selectedJob)
                        : editingBlock
                          ? formatOrderNumberWithLabel(
                              editingBlock.orderNumber,
                              editingBlock.customLabel
                            )
                          : ""}
                      {form.customLabel.trim()
                        ? ` — ${form.customLabel.trim()}`
                        : ""}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-2 lg:col-span-2">
                <Label className={labelClass}>Imprint location to schedule</Label>
                <Select
                  value={form.jobKey}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, jobKey: v ?? "" }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      dashboardControlClass,
                      "h-10 w-full justify-between"
                    )}
                  >
                    {selectedJobLabel ? (
                      <span className="truncate">{selectedJobLabel}</span>
                    ) : (
                      <SelectValue placeholder="Select an order / event" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {schedulableJobOptions.map((job) => (
                      <SelectItem
                        key={schedulableJobKey(
                          job.orderId,
                          job.jobId,
                          job.imprintId
                        )}
                        value={schedulableJobKey(
                          job.orderId,
                          job.jobId,
                          job.imprintId
                        )}
                      >
                        {formatOrderRef(job)} — {job.imprintLabel} ·{" "}
                        {decorationLabel(job.decoration)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingBlock && (
              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5">
                  <p className={labelClass}>Production status</p>
                </div>
                <div className="grid gap-2 p-3 sm:grid-cols-3">
                  {CALENDAR_EVENT_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={statusSaving || submitting}
                      onClick={() => void handleProductionStatusChange(option.value)}
                      className={cn(
                        "rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        productionStatus === option.value &&
                          "border-[#2c6ecb] bg-[#f0f5ff]"
                      )}
                    >
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#616161]">
                        {option.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedJob && selectedOrder && accent) || hasMultiJobRun ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedJob && selectedOrder && accent ? (
                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "flex items-start gap-3 bg-[#fafafa] px-4 py-3.5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border text-[12px] font-semibold tabular-nums",
                        accent.bg,
                        accent.border,
                        accent.text
                      )}
                      title={selectedJob.customerName}
                    >
                      {getCustomerInitials(selectedJob.customerName)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {formatOrderRef(selectedJob)}
                        <span className="ml-1.5 font-normal text-[#616161]">
                          {selectedJob.customerName}
                        </span>
                      </p>
                      <p className="text-[12px] leading-relaxed text-[#616161]">
                        {selectedJob.jobName} ·{" "}
                        {selectedJob.pieceCount.toLocaleString()} pcs · Client
                        ETA {formatDate(selectedOrder.inHandsDate)}
                        {selectedOrder.rush ? " · Rush" : ""}
                      </p>
                      {selectedFlowStep && selectedFlowStep.flowTotal > 1 ? (
                        <p className="text-[12px] font-medium text-[#2c6ecb]">
                          {formatEventXOfY(
                            selectedFlowStep.flowIndex,
                            selectedFlowStep.flowTotal
                          )}{" "}
                          in production flow
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {hasMultiJobRun ? (
                  <button
                    type="button"
                    onClick={() => setScheduleRunTogether((current) => !current)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                      scheduleRunTogether
                        ? "border-[#9fc7ad] bg-[#f4faf6]"
                        : "border-[#e3e3e3] bg-white hover:bg-[#fafafa]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-[11px]",
                        scheduleRunTogether
                          ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                          : "border-[#cfcfcf]"
                      )}
                    >
                      {scheduleRunTogether ? "✓" : ""}
                    </span>
                    <Layers3 className="mt-0.5 size-4 shrink-0 text-[#2d6a4f]" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#303030]">
                        Schedule matching run events back-to-back
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-[#616161]">
                        Also schedule {linkedRunJobs.length} matching{" "}
                        {selectedJob?.imprintLabel} event
                        {linkedRunJobs.length === 1 ? "" : "s"} from this
                        multi-job run on the same machine, right after this
                        event.
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {selectedOrder && orderFlow.length > 1 && (
              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5">
                  <p className={labelClass}>Production order</p>
                </div>
                <div className="px-4 py-3.5">
                  <FlowStepList steps={orderFlow} />
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
              <div className="space-y-2">
                <Label className={labelClass}>Machine</Label>
                <Select
                  value={form.machineId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, machineId: v ?? "" }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      dashboardControlClass,
                      "h-10 w-full justify-between"
                    )}
                  >
                    {selectedMachine ? (
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
                            machineColorStyles[selectedMachine.color].dot
                          )}
                        />
                        <span className="truncate">{selectedMachine.name}</span>
                      </span>
                    ) : (
                      <SelectValue placeholder="Select machine" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {activeMachines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 shrink-0 rounded-full",
                              machineColorStyles[machine.color].dot
                            )}
                          />
                          {machine.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeMachines.length === 0 ? (
                  <p className="text-[12px] text-[#8f1f1f]">
                    No active machines. Add or activate a machine first.
                  </p>
                ) : null}
                {selectedMachine ? (
                  <p className="text-[12px] leading-relaxed text-[#616161]">
                    Operating hours:{" "}
                    {formatOperatingHoursSummary(selectedMachine)}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="sched-date" className={labelClass}>
                    Date
                  </Label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sched-start" className={labelClass}>
                    Start
                  </Label>
                  <Input
                    id="sched-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sched-duration" className={labelClass}>
                    Duration (hrs)
                  </Label>
                  <Input
                    id="sched-duration"
                    type="number"
                    min={1}
                    max={24}
                    value={form.durationHours}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationHours: Number(e.target.value) || 1,
                      }))
                    }
                    className="h-10 rounded-lg border-[#e3e3e3] text-[13px] tabular-nums"
                  />
                  {selectedMachine?.capacityPerHour ? (
                    <button
                      type="button"
                      onClick={suggestDuration}
                      className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
                    >
                      Suggest from capacity ({selectedMachine.capacityPerHour}
                      /hr)
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-notes" className={labelClass}>
                Notes (optional)
              </Label>
              <Textarea
                id="sched-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="resize-none rounded-lg border-[#e3e3e3] text-[13px]"
                placeholder="Shift notes, colors, setup..."
              />
            </div>

            {scheduleError && (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {scheduleError}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4">
            {editingBlock ? (
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-lg border border-[#f5b5b5] bg-white px-4 text-[13px] font-medium text-[#8f1f1f] transition-colors hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleDelete()}
                disabled={submitting}
              >
                Remove
              </button>
            ) : (
              <span />
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className={dashboardControlClass}
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting || !form.jobKey || !form.machineId || !flowGate.ok
                }
                className={cn(
                  dashboardPrimaryButtonClass,
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {submitting
                  ? editingBlock
                    ? "Updating…"
                    : "Scheduling…"
                  : editingBlock
                    ? "Update"
                    : scheduleRunTogether && linkedRunJobs.length > 0
                      ? `Schedule ${linkedRunJobs.length + 1} events`
                      : "Schedule"}
              </button>
            </div>
          </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
