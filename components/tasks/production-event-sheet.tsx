"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { EventReadinessPanel } from "@/components/orders/event-readiness-panel";
import { FlowStepList } from "@/components/calendar/order-production-flow";
import { useSchedule } from "@/components/providers/schedule-provider";
import { RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderDetailTab } from "@/lib/order-detail-tabs";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDate } from "@/lib/format";
import { getDueDateUrgency } from "@/lib/order-health";
import { analyzeOrderProductionFlow } from "@/lib/production-flow";
import {
  resolveProductionEvent,
  WORKFLOW_STATUS_OPTIONS,
} from "@/lib/production-event-status";
import type {
  ProductionEventWorkflow,
  ProductionEventWorkflowStatus,
} from "@/types";
import { cn } from "@/lib/utils";

const WORKFLOW_BADGE: Record<
  ProductionEventWorkflowStatus,
  { label: string; className: string }
> = {
  needs_attention: {
    label: "Needs attention",
    className: "bg-[#ebf4ff] text-[#2c6ecb]",
  },
  in_progress: {
    label: "In progress",
    className: "bg-[#ebf4ff] text-[#2c6ecb]",
  },
  blocked: {
    label: "Blocked",
    className: "bg-[#fff5ea] text-[#b98900]",
  },
  completed: {
    label: "Completed",
    className: "bg-[#e3f1df] text-[#108043]",
  },
};

export function ProductionEventSheet({
  orderId,
  jobId,
  imprintId,
  open,
  onOpenChange,
  onSchedule,
  onOpenFiles,
  onOpenTab,
}: {
  orderId: string | null;
  jobId: string | null;
  imprintId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: () => void;
  onOpenFiles?: (jobId: string, imprintId: string) => void;
  onOpenTab?: (tab: OrderDetailTab) => void;
}) {
  const {
    orders,
    scheduleBlocks,
    jobRuns,
    updateProductionEventWorkflow,
    removeProductionJob,
  } = useSchedule();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProductionEventWorkflow>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }, [open]);

  const order = useMemo(
    () => (orderId ? orders.find((entry) => entry.id === orderId) : undefined),
    [orderId, orders]
  );

  const job = useMemo(
    () => order?.jobs.find((entry) => entry.id === jobId),
    [order, jobId]
  );

  const imprint = useMemo(
    () => job?.imprints.find((entry) => entry.id === imprintId),
    [job, imprintId]
  );

  const resolved = useMemo(() => {
    if (!order || !job || !imprint) return null;
    return resolveProductionEvent({
      order,
      job,
      imprint,
      scheduleBlocks,
      jobRuns,
    });
  }, [order, job, imprint, scheduleBlocks, jobRuns]);

  const flowSteps = useMemo(
    () => (order ? analyzeOrderProductionFlow(order, scheduleBlocks) : []),
    [order, scheduleBlocks]
  );

  useEffect(() => {
    if (!imprint) return;
    setDraft({
      status: imprint.workflow?.status,
      assignee: imprint.workflow?.assignee ?? "",
      blockedReason: imprint.workflow?.blockedReason ?? "",
      onHold: imprint.workflow?.onHold ?? false,
    });
  }, [imprint, open]);

  if (!order || !job || !imprint || !resolved) return null;

  const dueMeta = getDueDateUrgency(order);
  const displayStatus = draft.status ?? resolved.status;

  const saveWorkflow = async (patch: ProductionEventWorkflow) => {
    if (!orderId || !jobId || !imprintId) return;
    setSaving(true);
    try {
      await updateProductionEventWorkflow(orderId, jobId, imprintId, patch);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: ProductionEventWorkflowStatus) => {
    const next = { ...draft, status };
    setDraft(next);
    await saveWorkflow({ status });
  };

  const handleAssigneeBlur = async () => {
    await saveWorkflow({
      assignee: draft.assignee?.trim() || undefined,
    });
  };

  const handleHoldToggle = async () => {
    const onHold = !draft.onHold;
    const next = { ...draft, onHold };
    setDraft(next);
    await saveWorkflow({ onHold });
  };

  const handleBlockedReasonBlur = async () => {
    await saveWorkflow({
      blockedReason: draft.blockedReason?.trim() || undefined,
      status: draft.status ?? "blocked",
    });
  };

  const handleDelete = async () => {
    if (!orderId || !jobId) return;
    setDeleting(true);
    try {
      await removeProductionJob(orderId, jobId);
      onOpenChange(false);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const showArtworkBanner =
    imprint.artwork.name !== "n/a" && imprint.decoration !== "finishing";

  const closeAndOpenTab = (tab: OrderDetailTab) => {
    onOpenChange(false);
    if (onOpenTab) {
      onOpenTab(tab);
      return;
    }
    window.location.assign(`/app/orders/${order.id}?tab=${tab}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,840px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg border-[#e3e3e3] p-0 shadow-xl sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="text-lg font-bold tracking-tight text-[#303030]">
              {imprint.label}
            </DialogTitle>
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                WORKFLOW_BADGE[displayStatus].className
              )}
            >
              {WORKFLOW_BADGE[displayStatus].label}
            </span>
            {order.rush ? <RushBadge /> : null}
            {saving ? (
              <Loader2 className="size-4 animate-spin text-[#616161]" />
            ) : null}
          </div>
          <DialogDescription className="mt-1 text-[13px] text-[#616161]">
            {order.number} · {decorationLabel(imprint.decoration)}
            {job.name !== imprint.label ? ` · ${job.name}` : ""}
          </DialogDescription>
          <p className="mt-2 text-[13px] font-medium text-[#303030]">
            {resolved.phase}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f6f6f7] px-5 py-4">
          {showArtworkBanner ? (
            <MockupPreview entry={{ job, imprint }} banner />
          ) : null}

          <div className={cn(dashboardCardClass, "px-4 py-3")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              In hands
            </p>
            <p
              className={cn(
                "mt-1.5 text-sm font-semibold",
                dueMeta.status === "critical" && "text-[#d82c0d]",
                dueMeta.status === "warning" && "text-amber-900",
                dueMeta.status !== "critical" &&
                  dueMeta.status !== "warning" &&
                  "text-[#303030]"
              )}
            >
              {formatDate(order.inHandsDate)}
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {dueMeta.label}
            </p>
          </div>

          <div className={cn(dashboardCardClass, "overflow-hidden")}>
            <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
              <p className="text-sm font-semibold text-[#303030]">
                Order readiness
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                Same checkpoints as the Events table — actions update the order
                and this event&apos;s status.
              </p>
            </div>
            <div className="space-y-2 p-3">
              <EventReadinessPanel
                order={order}
                job={job}
                imprint={imprint}
                resolved={resolved}
                onOpenTab={closeAndOpenTab}
                onSchedule={onSchedule}
                onClose={() => onOpenChange(false)}
              />
            </div>
          </div>

          <div className={cn(dashboardCardClass, "overflow-hidden")}>
            <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
              <p className="text-sm font-semibold text-[#303030]">
                Event workflow
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                Where this decoration sits in your shop workflow
              </p>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {WORKFLOW_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={cn(
                    "rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-3 text-left shadow-[0_1px_0_rgba(26,26,26,0.04)] transition-colors",
                    displayStatus === option.value &&
                      "border-[#2c6ecb] bg-[#f0f5ff]"
                  )}
                >
                  <p className="text-sm font-semibold text-[#303030]">
                    {option.label}
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {option.hint}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className={cn(dashboardCardClass, "px-4 py-4")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="event-assignee" className="text-[#303030]">
                  Assigned to
                </Label>
                <Input
                  id="event-assignee"
                  value={draft.assignee ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                  onBlur={handleAssigneeBlur}
                  placeholder="Who is running proof or setup?"
                  className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] bg-white"
                />
              </div>
              <div>
                <Label className="text-[#303030]">Hold</Label>
                <button
                  type="button"
                  onClick={handleHoldToggle}
                  className={cn(
                    dashboardControlClass,
                    "mt-1.5 h-10 w-full justify-center text-sm font-semibold",
                    draft.onHold && "border-[#f0d9b8] bg-[#fff8f0] text-[#b98900]"
                  )}
                >
                  {draft.onHold ? "On hold — tap to release" : "Put on hold"}
                </button>
                {draft.onHold || displayStatus === "blocked" ? (
                  <Input
                    value={draft.blockedReason ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        blockedReason: event.target.value,
                      }))
                    }
                    onBlur={handleBlockedReasonBlur}
                    placeholder="Why is this blocked?"
                    className="mt-2 h-10 rounded-lg border-[#e3e3e3] bg-white"
                  />
                ) : null}
              </div>
            </div>
          </div>

          {flowSteps.length > 1 ? (
            <div className={cn(dashboardCardClass, "px-4 py-4")}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#616161]">
                Order production flow
              </p>
              <FlowStepList steps={flowSteps} />
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
          {confirmingDelete ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-[13px] font-medium text-[#303030]">
                Delete this event? This can&apos;t be undone.
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={deleting}
                className="h-9 rounded-lg"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deleting}
                className="h-9 rounded-lg bg-[#c0392b] px-4 text-sm font-semibold text-white hover:bg-[#a93226]"
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete event
              </Button>
            </div>
          ) : (
            <>
              <Button
                className="h-9 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary/90"
                onClick={onSchedule}
              >
                <CalendarPlus className="size-4" />
                {resolved.scheduleBlock ? "Reschedule" : "Schedule"}
              </Button>
              {onOpenFiles && imprint.decoration !== "finishing" ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(dashboardControlClass, "h-9 px-3 text-sm")}
                  onClick={() => onOpenFiles(job.id, imprint.id)}
                >
                  Files
                </Button>
              ) : null}
              {resolved.scheduleBlock ? (
                <span
                  className={cn(
                    dashboardControlClass,
                    "h-10 gap-1.5 px-3 text-xs text-[#616161]"
                  )}
                >
                  <CalendarClock className="size-3.5" />
                  {resolved.phase.startsWith("Scheduled")
                    ? resolved.phase.replace("Scheduled · ", "")
                    : "On calendar"}
                </span>
              ) : null}
              <Button
                variant="outline"
                className={cn(dashboardControlClass, "h-10 px-4 text-sm")}
                nativeButton={false}
                render={<Link href={`/app/orders/${order.id}`} />}
              >
                <ExternalLink className="size-3.5" />
                Open order
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label="Delete event"
                className="ml-auto h-9 rounded-lg px-3 text-sm text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#c0392b]"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
