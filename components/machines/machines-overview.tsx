"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  PlayCircle,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Badge } from "@/components/ui/badge";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import {
  getActiveRunForMachine,
  getUpcomingRunsForMachine,
} from "@/lib/station-runs";
import { cn } from "@/lib/utils";

export function MachinesOverview({
  machineFilter,
}: {
  machineFilter?: string[] | null;
}) {
  const { machines, scheduleBlocks, jobRuns } = useSchedule();

  const sorted = useMemo(
    () => {
      const visible = machineFilter?.length
        ? machines.filter((machine) => machineFilter.includes(machine.id))
        : machines;
      return [...visible].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    },
    [machines, machineFilter]
  );

  const stats = useMemo(() => {
    const visible = machineFilter?.length
      ? machines.filter((machine) => machineFilter.includes(machine.id))
      : machines;
    const online = visible.filter((m) => m.active).length;
    let running = 0;
    let upcomingToday = 0;
    let offlineWithIssue = 0;
    const today = new Date();

    for (const machine of visible) {
      if (getActiveRunForMachine(jobRuns, machine.id)) running += 1;
      if (!machine.active && machine.statusMessage) offlineWithIssue += 1;
      upcomingToday += getUpcomingRunsForMachine(
        scheduleBlocks,
        jobRuns,
        machine.id
      ).filter(({ block }) =>
        isSameDay(parseISO(block.startAt), today)
      ).length;
    }

    return { online, total: visible.length, running, upcomingToday, offlineWithIssue };
  }, [machines, machineFilter, scheduleBlocks, jobRuns]);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Stations online"
          value={`${stats.online}/${stats.total}`}
          tone={stats.online === stats.total ? "good" : "neutral"}
        />
        <StatCard
          label="Events running"
          value={String(stats.running)}
          tone={stats.running > 0 ? "active" : "neutral"}
        />
        <StatCard
          label="Upcoming today"
          value={String(stats.upcomingToday)}
        />
        <StatCard
          label="Needs attention"
          value={String(stats.offlineWithIssue)}
          tone={stats.offlineWithIssue > 0 ? "warning" : "good"}
        />
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-brand-ink">Your stations</h2>
        <p className="text-sm text-brand-muted mt-1">
          Open a station to scan events, manage the active run, and view what&apos;s
          coming up next.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((machine) => {
          const styles = machineColorStyles[machine.color];
          const activeRun = getActiveRunForMachine(jobRuns, machine.id);
          const activeBlock = activeRun
            ? scheduleBlocks.find((b) => b.id === activeRun.scheduleBlockId)
            : undefined;
          const upcoming = getUpcomingRunsForMachine(
            scheduleBlocks,
            jobRuns,
            machine.id
          );
          const nextJob = upcoming[0]?.block;

          return (
            <Link
              key={machine.id}
              href={`/app/machines/${machine.id}`}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:border-brand-primary/25 hover:shadow-md active:scale-[0.995]",
                !machine.active && "opacity-90"
              )}
            >
              <div className={cn("h-5 w-full shrink-0", styles.cap)} />

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-brand-ink truncate group-hover:text-brand-primary transition-colors">
                      {machine.name}
                    </p>
                    <p className="text-sm text-brand-muted mt-0.5">
                      {RESOURCE_TYPE_LABELS[machine.type]}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 rounded-full",
                      machine.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    )}
                  >
                    {machine.active ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        Online
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-3" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>

                {activeBlock ? (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                      <PlayCircle className="size-3.5" />
                      Running now
                    </p>
                    <p className="mt-1 text-sm font-medium text-brand-ink truncate">
                      {activeBlock.jobName}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5 truncate">
                      {activeBlock.orderNumber} · {activeBlock.customerName}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5">
                    <p className="text-xs text-brand-muted">No active event</p>
                    {nextJob ? (
                      <p className="text-sm font-medium text-brand-ink mt-1 truncate">
                        Next: {nextJob.jobName}
                      </p>
                    ) : (
                      <p className="text-sm text-brand-muted mt-1">
                        Queue is clear
                      </p>
                    )}
                  </div>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-brand-muted">Upcoming</dt>
                    <dd className="font-medium mt-0.5">
                      {upcoming.length} event{upcoming.length !== 1 ? "s" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-brand-muted">Next start</dt>
                    <dd className="font-medium mt-0.5 truncate">
                      {nextJob
                        ? format(parseISO(nextJob.startAt), "MMM d · h:mm a")
                        : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="flex items-center gap-1 text-xs text-brand-muted">
                      <Clock className="size-3" />
                      Hours
                    </dt>
                    <dd className="font-medium mt-0.5 text-xs leading-snug text-brand-ink">
                      {formatOperatingHoursSummary(machine)}
                    </dd>
                  </div>
                </dl>

                {!machine.active && machine.statusMessage && (
                  <p className="mt-3 text-xs text-amber-800 line-clamp-2 rounded-lg bg-amber-50 px-2.5 py-2 border border-amber-100">
                    {machine.statusMessage}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-brand-primary">
                  Open station
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-brand-muted">No machines set up yet.</p>
          <Link
            href="/app/machines/settings"
            className="mt-2 inline-block text-sm font-medium text-brand-primary hover:underline"
          >
            Add your first machine in Settings
          </Link>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "warning" | "active" | "neutral";
}) {
  const styles =
    tone === "good"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-950"
      : tone === "warning"
        ? "border-amber-200/80 bg-amber-50 text-amber-950"
        : tone === "active"
          ? "border-violet-200/80 bg-violet-50 text-violet-950"
          : "border-border/60 bg-white text-brand-ink";

  return (
    <div className={cn("rounded-xl border px-4 py-3", styles)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-xl font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
