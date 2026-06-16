"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import {
  machineColorStyles,
  RESOURCE_TYPE_LABELS,
} from "@/lib/machine-styles";
import type { Machine } from "@/types";
import { cn } from "@/lib/utils";

export function MachineSettingsCard({
  machine,
  scheduledCount,
  onEdit,
  onDelete,
}: {
  machine: Machine;
  scheduledCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const styles = machineColorStyles[machine.color];

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-all hover:border-brand-primary/25 hover:shadow-md",
        !machine.active && "opacity-90"
      )}
    >
      <div className={cn("h-2 w-full shrink-0", styles.cap)} aria-hidden />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-brand-ink truncate leading-snug">
              {machine.name}
            </h3>
            <p className="text-sm text-brand-muted mt-0.5">
              {RESOURCE_TYPE_LABELS[machine.type]}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 rounded-full gap-1",
              machine.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            )}
          >
            {machine.active ? (
              <>
                <CheckCircle2 className="size-3" />
                Active
              </>
            ) : (
              <>
                <AlertTriangle className="size-3" />
                Inactive
              </>
            )}
          </Badge>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-brand-surface/30 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                Calendar
              </p>
              <p className="text-sm font-medium text-brand-ink mt-0.5 inline-flex items-center gap-2 capitalize">
                <span
                  className={cn("size-2.5 rounded-full shrink-0", styles.dot)}
                />
                {machine.color}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                Scheduled
              </p>
              <p className="text-sm font-medium text-brand-ink mt-0.5 tabular-nums">
                {scheduledCount} event{scheduledCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-brand-muted">Capacity</dt>
            <dd className="font-medium text-brand-ink mt-0.5">
              {machine.capacityPerHour > 0
                ? `${machine.capacityPerHour} / hr`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-muted">Status</dt>
            <dd className="font-medium text-brand-ink mt-0.5">
              {machine.active ? "Scheduling enabled" : "Scheduling paused"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="flex items-center gap-1 text-xs text-brand-muted">
              <Clock className="size-3" />
              Operating hours
            </dt>
            <dd className="font-medium text-brand-ink mt-0.5 text-sm leading-snug">
              {formatOperatingHoursSummary(machine)}
            </dd>
          </div>
        </dl>

        {machine.notes && (
          <p className="mt-3 text-xs text-brand-muted leading-relaxed line-clamp-2 rounded-xl bg-muted/20 px-3 py-2.5 border border-border/50">
            {machine.notes}
          </p>
        )}

        {!machine.active && machine.statusMessage && (
          <p className="mt-3 text-xs text-amber-900 leading-relaxed line-clamp-2 rounded-xl bg-amber-50 px-3 py-2.5 border border-amber-100">
            {machine.statusMessage}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 rounded-full h-9 bg-white"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-9 w-9 p-0 text-destructive hover:bg-destructive/10 border-border/70"
            onClick={onDelete}
            aria-label={`Delete ${machine.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <Link
          href={`/app/machines/${machine.id}`}
          className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary/80"
        >
          Open station
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
