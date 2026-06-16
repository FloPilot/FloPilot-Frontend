"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Machine, ScheduleBlock } from "@/types";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
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
import { decorationLabel } from "@/lib/format";
import {
  clampBlockToMachineHours,
  formatOperatingHoursSummary,
  getMachineOperatingHours,
} from "@/lib/machine-hours";
import { FlowStepList } from "@/components/calendar/order-production-flow";
import { getSchedulableJobs } from "@/lib/production-schedule";
import {
  analyzeOrderProductionFlow,
  canScheduleFlowStep,
  validateFlowScheduleTiming,
} from "@/lib/production-flow";
import { machineColorStyles } from "@/lib/machine-styles";
import { formatDate } from "@/lib/format";
import { formatEventXOfY } from "@/lib/terminology";
import { cn } from "@/lib/utils";

type ScheduleForm = {
  jobKey: string;
  machineId: string;
  date: string;
  startTime: string;
  durationHours: number;
  notes: string;
};

const defaultForm: ScheduleForm = {
  jobKey: "",
  machineId: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "08:00",
  durationHours: 4,
  notes: "",
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
    orders,
    scheduleBlocks,
    addScheduleBlock,
    updateScheduleBlock,
    removeScheduleBlock,
  } = useSchedule();
  const orderScopeId = editingBlock?.orderId ?? filterOrderId;

  const schedulableJobs = useMemo(
    () => getSchedulableJobs(orders, { includeOrderId: orderScopeId }),
    [orders, orderScopeId]
  );
  const filteredSchedulableJobs = useMemo(() => {
    if (!orderScopeId) return schedulableJobs;
    return schedulableJobs.filter((job) => job.orderId === orderScopeId);
  }, [schedulableJobs, orderScopeId]);

  const activeMachines = useMemo(
    () => machines.filter((machine) => machine.active),
    [machines]
  );
  const firstActiveMachineId = activeMachines[0]?.id;
  const singleScopedJobKey = useMemo(() => {
    if (prefillJobKey) return prefillJobKey;
    if (orderScopeId && filteredSchedulableJobs.length === 1) {
      const job = filteredSchedulableJobs[0];
      return schedulableJobKey(job.orderId, job.jobId, job.imprintId);
    }
    return "";
  }, [prefillJobKey, orderScopeId, filteredSchedulableJobs]);

  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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
      });
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
  ]);

  const selectedJob = filteredSchedulableJobs.find(
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
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
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

      const timingCheck = validateFlowScheduleTiming(
        selectedOrder,
        selectedJob.jobId,
        selectedJob.imprintId,
        block.startAt,
        scheduleBlocks
      );
      if (!timingCheck.ok) {
        setScheduleError(timingCheck.reason);
        return;
      }
    }

    if (editingBlock) {
      updateScheduleBlock(editingBlock.id, block);
    } else {
      addScheduleBlock(block);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingBlock) {
      removeScheduleBlock(editingBlock.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border">
            <DialogTitle className="text-sm font-bold tracking-widest uppercase text-brand-ink">
              {editingBlock ? "Edit Schedule" : "Schedule Event"}
            </DialogTitle>
            <DialogDescription className="text-brand-muted pb-4">
              Assign a production event to a machine. Only active machines can be
              scheduled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6 max-h-[70vh] overflow-y-auto">
            {!flowGate.ok && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {flowGate.reason}
              </div>
            )}

            {selectedOrder && orderFlow.length > 1 && (
              <div className="rounded-xl border border-border/70 bg-brand-surface/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted mb-2">
                  Production order
                </p>
                <FlowStepList steps={orderFlow} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Imprint location to schedule</Label>
              <Select
                value={form.jobKey}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, jobKey: v ?? "" }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  {selectedJobLabel ? (
                    <span className="truncate">{selectedJobLabel}</span>
                  ) : (
                    <SelectValue placeholder="Select an order / event" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {filteredSchedulableJobs.map((job) => (
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
              {selectedJob && selectedOrder && (
                <div className="text-xs text-brand-muted space-y-1">
                  <p>
                    {selectedJob.jobName} · {selectedJob.customerName} ·{" "}
                    {selectedJob.pieceCount.toLocaleString()} pcs
                  </p>
                  <p>
                    Client ETA {formatDate(selectedOrder.inHandsDate)}
                    {selectedOrder.rush ? " · Rush" : " · Standard"}
                    {" · "}Submitted {formatDate(selectedOrder.createdAt)}
                  </p>
                  {selectedFlowStep && selectedFlowStep.flowTotal > 1 && (
                    <p className="text-brand-primary font-medium">
                      {formatEventXOfY(
                        selectedFlowStep.flowIndex,
                        selectedFlowStep.flowTotal
                      )}{" "}
                      in production flow
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Machine</Label>
              <Select
                value={form.machineId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, machineId: v ?? "" }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
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
                <p className="text-xs text-destructive">
                  No active machines. Add or activate a machine first.
                </p>
              )}
              {selectedMachine && (
                <p className="text-xs text-brand-muted">
                  Operating hours: {formatOperatingHoursSummary(selectedMachine)}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="sched-date">Date</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-start">Start</Label>
                <Input
                  id="sched-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-duration">Duration (hrs)</Label>
                <div className="flex gap-2">
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
                    className="h-11 rounded-xl"
                  />
                </div>
                {selectedMachine?.capacityPerHour ? (
                  <button
                    type="button"
                    onClick={suggestDuration}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Suggest from capacity ({selectedMachine.capacityPerHour}/hr)
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-notes">Notes (optional)</Label>
              <Textarea
                id="sched-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="rounded-xl resize-none"
                placeholder="Shift notes, colors, setup..."
              />
            </div>

            {scheduleError && (
              <p className="text-sm text-destructive px-6 -mt-2">{scheduleError}</p>
            )}
          </div>

          <div className="flex flex-row items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-5">
            {editingBlock ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-full h-11"
                onClick={handleDelete}
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-6 h-11 bg-white"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.jobKey || !form.machineId || !flowGate.ok}
                className="rounded-full px-8 h-11 font-semibold"
              >
                {editingBlock ? "Update" : "Schedule"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
