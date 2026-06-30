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
import {
  dashboardCardClass,
  dashboardControlClass,
} from "@/lib/dashboard-styles";
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
        dashboardCardClass,
        "group flex flex-col transition-[border-color,box-shadow] hover:border-[#c9cccf]",
        !machine.active && "opacity-90"
      )}
    >
      <div className={cn("h-2 w-full shrink-0", styles.cap)} aria-hidden />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-snug text-[#303030]">
              {machine.name}
            </h3>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              {RESOURCE_TYPE_LABELS[machine.type]}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1 rounded-md",
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

        <div className="mt-4 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                Calendar
              </p>
              <p className="mt-0.5 inline-flex items-center gap-2 text-sm font-medium capitalize text-[#303030]">
                <span
                  className={cn("size-2.5 rounded-full shrink-0", styles.dot)}
                />
                {machine.color}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                Scheduled
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-[#303030]">
                {scheduledCount} event{scheduledCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-[#616161]">Capacity</dt>
            <dd className="mt-0.5 font-medium text-[#303030]">
              {machine.capacityPerHour > 0
                ? `${machine.capacityPerHour} / hr`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#616161]">Status</dt>
            <dd className="mt-0.5 font-medium text-[#303030]">
              {machine.active ? "Scheduling enabled" : "Scheduling paused"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="flex items-center gap-1 text-xs text-[#616161]">
              <Clock className="size-3" />
              Operating hours
            </dt>
            <dd className="mt-0.5 text-sm font-medium leading-snug text-[#303030]">
              {formatOperatingHoursSummary(machine)}
            </dd>
          </div>
        </dl>

        {machine.notes && (
          <p className="mt-3 line-clamp-2 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] px-3 py-2.5 text-xs leading-relaxed text-[#616161]">
            {machine.notes}
          </p>
        )}

        {!machine.active && machine.statusMessage && (
          <p className="mt-3 line-clamp-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
            {machine.statusMessage}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9 flex-1")}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            className={cn(
              dashboardControlClass,
              "h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
            )}
            onClick={onDelete}
            aria-label={`Delete ${machine.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <Link
          href={`/app/machines/${machine.id}`}
          className="mt-4 flex items-center justify-between border-t border-[#ebebeb] pt-3 text-[13px] font-medium text-[#2c6ecb] transition-colors hover:text-[#2c6ecb]/80"
        >
          Open station
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
