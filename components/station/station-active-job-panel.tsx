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
    <section className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <div className={cn("h-2 w-full", styles.cap)} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Active event
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg font-semibold text-brand-ink">
                {block.orderNumber}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10"
                onClick={onOpenOrder}
                aria-label={`View ${block.orderNumber} event details`}
              >
                <Info className="size-4" />
              </Button>
            </div>
            <p className="text-brand-muted">{block.customerName}</p>
          </div>
          <StationRunStatusBadge status={run.status} />
        </div>

        <button
          type="button"
          onClick={onOpenOrder}
          className="mt-3 text-left w-full rounded-xl border border-border/60 bg-brand-surface/30 px-3.5 py-3 hover:bg-brand-surface/60 transition-colors"
        >
          <p className="font-medium text-brand-ink">{block.imprintLabel}</p>
          <p className="text-sm text-brand-muted">{block.jobName}</p>
        </button>

        {order && job && imprint && (
          <StationImprintDesignSummary
            order={order}
            job={job}
            imprint={imprint}
            orderHref={`/app/orders/${order.id}?tab=design`}
          />
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {run.startedAt && (
            <span className="flex items-center gap-2 text-brand-ink font-medium">
              <Clock className="size-4 text-brand-primary" />
              Started {format(parseISO(run.startedAt), "h:mm a")}
              {run.status === "running" && (
                <span className="text-brand-muted font-normal">
                  · {formatRunElapsed(run.startedAt)} elapsed
                </span>
              )}
              {run.status === "paused" && run.pausedAt && (
                <span className="text-amber-800 font-normal">
                  · Paused at {format(parseISO(run.pausedAt), "h:mm a")}
                </span>
              )}
            </span>
          )}
          <span className="font-mono text-xs text-brand-muted bg-muted/50 px-2 py-1 rounded-md">
            {formatJobBarcode(block.id)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {run.status === "running" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-9"
              onClick={onPause}
            >
              <Pause className="size-3.5" />
              Pause
            </Button>
          )}
          {run.status === "paused" && (
            <Button
              size="sm"
              className="rounded-full h-9"
              onClick={onResume}
            >
              <Play className="size-3.5" />
              Resume
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full h-9 bg-emerald-600 hover:bg-emerald-700"
            onClick={onFinish}
          >
            <CheckCircle2 className="size-3.5" />
            Mark finished
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 text-red-700 border-red-200 hover:bg-red-50"
            onClick={onCancel}
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        </div>

        <div className="mt-6 border-t border-border/60 pt-5">
          <h3 className="text-sm font-semibold text-brand-ink flex items-center gap-2">
            <MessageSquarePlus className="size-4" />
            Floor notes
          </h3>
          <p className="text-xs text-brand-muted mt-1 mb-3">
            Visible to supervisors on the order.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. Waiting on ink mix from office…"
              rows={2}
              className="rounded-xl resize-none flex-1 min-h-[72px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-9 shrink-0"
              disabled={!noteDraft.trim()}
              onClick={handleAddNote}
            >
              Add note
            </Button>
          </div>

          {run.notes.length > 0 && (
            <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {[...run.notes].reverse().map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl bg-brand-surface/60 border border-border/60 px-3 py-2.5 text-sm"
                >
                  <div className="flex justify-between gap-2 text-xs text-brand-muted mb-1">
                    <span className="font-medium text-brand-ink">{note.author}</span>
                    <span>{format(parseISO(note.timestamp), "h:mm a")}</span>
                  </div>
                  <p className="text-brand-ink leading-relaxed">{note.content}</p>
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
    <section className="rounded-2xl border border-dashed border-border/70 bg-white px-6 py-12 text-center">
      <p className="text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
        No active event on this machine. Scan a barcode from the queue below to
        start the timer.
      </p>
    </section>
  );
}
