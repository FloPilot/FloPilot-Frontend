"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Info,
  MessageSquarePlus,
  Pause,
  Play,
  XCircle,
} from "lucide-react";
import { StationRunStatusBadge } from "@/components/station/station-run-status-badge";
import { StationImprintDesignSummary } from "@/components/station/station-imprint-design-summary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Job, JobImprint, Order, ScheduleBlock, StationJobRun } from "@/types";
import { formatJobBarcode, formatRunElapsed } from "@/lib/station-runs";
import { machineColorStyles } from "@/lib/machine-styles";
import {
  dashboardCardClass,
  dashboardControlClass,
} from "@/lib/dashboard-styles";
import type { MachineCalendarColor } from "@/types";
import { cn } from "@/lib/utils";

export function StationActiveJobPanel({
  block,
  run,
  color,
  order,
  job,
  imprint,
  onOpenOrder,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onAddNote,
}: {
  block: ScheduleBlock;
  run: StationJobRun;
  color: MachineCalendarColor;
  order?: Order;
  job?: Job;
  imprint?: JobImprint;
  onOpenOrder: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onAddNote: (content: string) => void;
}) {
  const styles = machineColorStyles[color];
  const [noteDraft, setNoteDraft] = useState("");
  const [, setTick] = useState(0);

  useEffect(() => {
    if (run.status !== "running" || !run.startedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [run.status, run.startedAt]);

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    onAddNote(noteDraft);
    setNoteDraft("");
  };

  return (
    <section className={dashboardCardClass}>
      <div className={cn("h-2 w-full", styles.cap)} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Active event
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#303030]">
                {block.orderNumber}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-[#616161] hover:bg-[#f4f7fd] hover:text-[#2c6ecb]"
                onClick={onOpenOrder}
                aria-label={`View ${block.orderNumber} event details`}
              >
                <Info className="size-4" />
              </Button>
            </div>
            <p className="text-[#616161]">{block.customerName}</p>
          </div>
          <StationRunStatusBadge status={run.status} />
        </div>

        <button
          type="button"
          onClick={onOpenOrder}
          className="mt-3 w-full rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 text-left transition-colors hover:bg-[#f1f1f1]"
        >
          <p className="font-medium text-[#303030]">{block.imprintLabel}</p>
          <p className="text-sm text-[#616161]">{block.jobName}</p>
        </button>

        {order && job && imprint && (
          <StationImprintDesignSummary
            order={order}
            job={job}
            imprint={imprint}
            orderHref={`/app/orders/${order.id}?tab=proof`}
          />
        )}

        {run.status === "running" && run.startedAt && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#c4d7f2] bg-[#f4f7fd] px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#2c6ecb]">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-none tabular-nums text-[#2c6ecb]">
                {formatRunElapsed(run.startedAt)}
              </p>
              <p className="mt-1 text-xs text-[#616161]">
                Running since {format(parseISO(run.startedAt), "h:mm a")}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          {run.status === "paused" && run.startedAt && (
            <span className="flex items-center gap-2 font-medium text-[#303030]">
              <Clock className="size-4 text-[#8a6116]" />
              Started {format(parseISO(run.startedAt), "h:mm a")}
              {run.pausedAt && (
                <span className="font-normal text-[#8a6116]">
                  · Paused at {format(parseISO(run.pausedAt), "h:mm a")}
                </span>
              )}
            </span>
          )}
          <span className="rounded-md bg-[#f1f1f1] px-2 py-1 font-mono text-xs text-[#616161]">
            {formatJobBarcode(block.id)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {run.status === "running" && (
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              onClick={onPause}
            >
              <Pause className="size-3.5" />
              Pause
            </Button>
          )}
          {run.status === "paused" && (
            <Button
              type="button"
              className="h-9 rounded-lg bg-[#2c6ecb] px-3 text-[13px] font-medium text-white hover:bg-[#2c6ecb]/90"
              onClick={onResume}
            >
              <Play className="size-3.5" />
              Resume
            </Button>
          )}
          <Button
            type="button"
            className="h-9 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700"
            onClick={onFinish}
          >
            <CheckCircle2 className="size-3.5" />
            Mark finished
          </Button>
          <Button
            type="button"
            className={cn(
              dashboardControlClass,
              "h-9 border-red-200 text-red-700 hover:bg-red-50"
            )}
            onClick={onCancel}
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        </div>

        <div className="mt-6 border-t border-[#ebebeb] pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#303030]">
            <MessageSquarePlus className="size-4" />
            Floor notes
          </h3>
          <p className="mb-3 mt-1 text-xs text-[#616161]">
            Visible to supervisors on the order.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. Waiting on ink mix from office…"
              rows={2}
              className="min-h-[72px] flex-1 resize-none rounded-lg border-[#e3e3e3] focus-visible:border-[#2c6ecb]"
            />
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9 shrink-0")}
              disabled={!noteDraft.trim()}
              onClick={handleAddNote}
            >
              Add note
            </Button>
          </div>

          {run.notes.length > 0 && (
            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {[...run.notes].reverse().map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5 text-sm"
                >
                  <div className="mb-1 flex justify-between gap-2 text-xs text-[#616161]">
                    <span className="font-medium text-[#303030]">
                      {note.author}
                    </span>
                    <span>{format(parseISO(note.timestamp), "h:mm a")}</span>
                  </div>
                  <p className="leading-relaxed text-[#303030]">{note.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function StationActiveJobEmpty() {
  return (
    <section className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-12 text-center">
      <p className="mx-auto max-w-md text-sm leading-relaxed text-[#616161]">
        No active event on this machine. Scan a barcode from the queue below to
        start the timer.
      </p>
    </section>
  );
}
