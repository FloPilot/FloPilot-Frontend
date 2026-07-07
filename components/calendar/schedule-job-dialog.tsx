"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarCheck2, ChevronRight, Loader2 } from "lucide-react";
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

    setForm({
      ...defaultForm,
      jobKey: singleScopedJobKey,
      machineId: prefillMachineId ?? firstActiveMachineId ?? "",
      date: prefillDate ?? defaultForm.date,
    });
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
    ? `${selectedJob.orderNumber} — ${selectedJob.imprintLabel} · ${decorationLabel(selectedJob.decoration)}`
    : null;

  const selectedOrder = selectedJob
    ? orders.find((order) => order.id === selectedJob.orderId)
    : undefined;

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
        await addScheduleBlock(block);
      }
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
  };

  const accent = selectedJob
    ? getCustomerAccent(selectedOrder?.customerId, selectedJob.orderId)
    : null;
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]";

  // Nothing left to schedule (new event flow) — surface why instead of a blank picker.
  const showEmptyState = !editingBlock && schedulableJobOptions.length === 0;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-lg border-[#e3e3e3] p-0",
          showEmptyState && blockedQueueOrders.length > 0
            ? "sm:max-w-2xl"
            : "sm:max-w-xl"
        )}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4">
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
            <DialogDescription className={dashboardTaskDetailClass}>
              {editingBlock
                ? "Update the event name, production status, machine, and time."
                : "Pick a machine and time for this production event. You can schedule events in any order."}
            </DialogDescription>
          </DialogHeader>

          {showEmptyState ? (
            <>
              <div className="bg-white px-5 py-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-[#e8f5ee] text-[#0d5c2e]">
                    <CalendarCheck2 className="size-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-3.5 text-[15px] font-semibold text-[#303030]">
                    {blockedQueueOrders.length > 0
                      ? "Nothing ready to schedule"
                      : "All caught up"}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#616161]">
                    {blockedQueueOrders.length > 0
                      ? "These orders are in the queue but waiting on approvals or materials. Open one to see what it needs."
                      : "Every event that's ready is already on the calendar. New events show up here as orders are approved and move into production."}
                  </p>
                </div>

                {blockedQueueOrders.length > 0 && (
                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "mt-5 overflow-hidden text-left"
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
                              aria-label={`Open order ${order.number}`}
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
                                  {order.number}
                                </p>
                                <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                                  {order.company}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <OrderStatusBadge
                                  status={order.status}
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

              <div className="flex justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
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
          <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-white px-5 py-5">
            {!flowGate.ok && (
              <div className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3 text-[13px] text-[#8a6116]">
                {flowGate.reason}
              </div>
            )}

            {(editingBlock || selectedJob) && (
              <div className="space-y-1.5">
                <Label htmlFor="sched-custom-label" className={labelClass}>
                  Custom event name
                </Label>
                <Input
                  id="sched-custom-label"
                  value={form.customLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customLabel: e.target.value }))
                  }
                  placeholder='e.g. LEGENDS SPIRIT OF DRIVING FLC'
                  className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                />
                <p className="text-[12px] text-[#616161]">
                  Shows on the calendar as{" "}
                  <span className="font-medium text-[#303030]">
                    {selectedJob?.orderNumber ?? editingBlock?.orderNumber}
                    {form.customLabel.trim()
                      ? ` — ${form.customLabel.trim()}`
                      : ""}
                  </span>
                </p>
              </div>
            )}

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

            <div className="space-y-1.5">
              <Label className={labelClass}>Imprint location to schedule</Label>
              <Select
                value={form.jobKey}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, jobKey: v ?? "" }))
                }
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
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
                        {job.orderNumber} — {job.imprintLabel} ·{" "}
                        {decorationLabel(job.decoration)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && selectedOrder && accent && (
              <div
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start gap-3 bg-[#fafafa] px-4 py-3"
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
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[13px] font-semibold text-[#303030]">
                    {selectedJob.orderNumber}
                    <span className="ml-1.5 font-normal text-[#616161]">
                      {selectedJob.customerName}
                    </span>
                  </p>
                  <p className="text-[12px] text-[#616161]">
                    {selectedJob.jobName} ·{" "}
                    {selectedJob.pieceCount.toLocaleString()} pcs · Client ETA{" "}
                    {formatDate(selectedOrder.inHandsDate)}
                    {selectedOrder.rush ? " · Rush" : ""}
                  </p>
                  {selectedFlowStep && selectedFlowStep.flowTotal > 1 && (
                    <p className="text-[12px] font-medium text-[#2c6ecb]">
                      {formatEventXOfY(
                        selectedFlowStep.flowIndex,
                        selectedFlowStep.flowTotal
                      )}{" "}
                      in production flow
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedOrder && orderFlow.length > 1 && (
              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5">
                  <p className={labelClass}>Production order</p>
                </div>
                <div className="px-4 py-3">
                  <FlowStepList steps={orderFlow} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={labelClass}>Machine</Label>
              <Select
                value={form.machineId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, machineId: v ?? "" }))
                }
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full justify-between")}
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
                            "size-2.5 rounded-full shrink-0",
                            machineColorStyles[machine.color].dot
                          )}
                        />
                        {machine.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeMachines.length === 0 && (
                <p className="text-[12px] text-[#8f1f1f]">
                  No active machines. Add or activate a machine first.
                </p>
              )}
              {selectedMachine && (
                <p className="text-[12px] text-[#616161]">
                  Operating hours: {formatOperatingHoursSummary(selectedMachine)}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
                    Suggest from capacity ({selectedMachine.capacityPerHour}/hr)
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
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

          <div className="flex flex-row items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
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
