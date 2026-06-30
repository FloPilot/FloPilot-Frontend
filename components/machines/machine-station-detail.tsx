"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ListOrdered,
  PlayCircle,
  Settings,
} from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { StationActiveJobPanel } from "@/components/station/station-active-job-panel";
import { StationBarcodeScan } from "@/components/station/station-barcode-scan";
import { ReportIssueDialog } from "@/components/station/report-issue-dialog";
import { StationOrderDialog } from "@/components/station/station-order-dialog";
import { StationQueueDialog } from "@/components/station/station-queue-dialog";
import { StationUpcomingSection } from "@/components/station/station-upcoming-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatJobBarcode,
  formatRunElapsed,
  getActiveRunForMachine,
  getUpcomingRunsForMachine,
} from "@/lib/station-runs";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { ISSUE_TYPE_LABELS } from "@/lib/station-utils";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardKpiTitleClass,
  dashboardPanelHeaderClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import type { ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

export function MachineStationDetail({ machineId }: { machineId: string }) {
  const {
    machines,
    scheduleBlocks,
    issueReports,
    jobRuns,
    getOrderById,
    reportMachineIssue,
    setMachineOnline,
    scanAndStartJob,
    pauseJobRun,
    resumeJobRun,
    finishJobRun,
    cancelJobRun,
    addJobRunNote,
  } = useSchedule();
  const { canWrite } = useStaffAccess();
  const canManageMachines = canWrite("machines");

  const [issueOpen, setIssueOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | undefined>();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | undefined>();

  // Re-render periodically so the live "elapsed" timer stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const openOrder = (orderId: string, block?: ScheduleBlock) => {
    setSelectedOrderId(orderId);
    setSelectedBlock(block);
    setOrderOpen(true);
  };

  const openEditSchedule = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setScheduleOpen(true);
  };

  const machine = machines.find((m) => m.id === machineId);
  const styles = machine ? machineColorStyles[machine.color] : null;

  const activeRun = useMemo(
    () => getActiveRunForMachine(jobRuns, machineId),
    [jobRuns, machineId]
  );

  const activeBlock = useMemo(
    () =>
      activeRun
        ? scheduleBlocks.find((b) => b.id === activeRun.scheduleBlockId)
        : undefined,
    [activeRun, scheduleBlocks]
  );

  const activeOrderContext = useMemo(() => {
    if (!activeBlock) return null;
    const order = getOrderById(activeBlock.orderId);
    const job = order?.jobs.find((entry) => entry.id === activeBlock.jobId);
    const imprint = job?.imprints.find(
      (entry) => entry.id === activeBlock.imprintId
    );
    if (!order || !job || !imprint) return null;
    return { order, job, imprint };
  }, [activeBlock, getOrderById]);

  const upcoming = useMemo(
    () =>
      machine
        ? getUpcomingRunsForMachine(scheduleBlocks, jobRuns, machine.id)
        : [],
    [machine, scheduleBlocks, jobRuns]
  );

  const nextHintBarcode = upcoming[0]
    ? formatJobBarcode(upcoming[0].block.id)
    : formatJobBarcode("sched-m1-02");

  const recentIssues = issueReports
    .filter((r) => r.machineId === machineId)
    .slice(0, 3);

  if (!machine || !styles) {
    return (
      <main className="p-8 text-center">
        <p className="text-[#616161]">Machine not found.</p>
        <Button
          className={cn(dashboardControlClass, "mt-4 h-9")}
          nativeButton={false}
          render={<Link href="/app/machines" />}
        >
          Back to stations
        </Button>
      </main>
    );
  }

  const hasActiveJob = Boolean(activeRun && activeBlock);

  const activeElapsed =
    activeRun?.status === "running" && activeRun.startedAt
      ? formatRunElapsed(activeRun.startedAt)
      : null;

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/app/machines"
            className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-[#616161] transition-colors hover:text-[#303030]"
          >
            <ChevronLeft className="size-3.5" />
            All machines
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={cn("size-3 shrink-0 rounded-full", styles.cap)} />
                <h1 className={dashboardSectionTitleClass}>{machine.name}</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 rounded-md",
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
              <p className={cn("mt-1", dashboardTaskDetailClass)}>
                {RESOURCE_TYPE_LABELS[machine.type]} ·{" "}
                {formatOperatingHoursSummary(machine)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!machine.active && (
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-9")}
                  onClick={() => setMachineOnline(machineId)}
                >
                  <CheckCircle2 className="size-3.5" />
                  Mark online
                </Button>
              )}
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => setIssueOpen(true)}
              >
                <AlertTriangle className="size-3.5" />
                Report issue
              </Button>
              {canManageMachines && (
                <Button
                  type="button"
                  className={cn(
                    dashboardControlClass,
                    "hidden h-9 sm:inline-flex"
                  )}
                  nativeButton={false}
                  render={
                    <Link href={`/app/machines/settings?edit=${machineId}`} />
                  }
                >
                  <Settings className="size-3.5" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        </div>

        {!machine.active && machine.statusMessage && (
          <div className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3.5 sm:px-5">
            <p className="text-sm font-medium text-[#8a6116]">Current issue</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
              {machine.statusMessage}
            </p>
            {machine.statusUpdatedAt && (
              <p className="mt-2 text-xs text-amber-800/70">
                Updated{" "}
                {format(parseISO(machine.statusUpdatedAt), "MMM d · h:mm a")}
              </p>
            )}
          </div>
        )}

        {/* Floor-first: the primary action leads the page */}
        {activeRun && activeBlock ? (
          <StationActiveJobPanel
            block={activeBlock}
            run={activeRun}
            color={machine.color}
            order={activeOrderContext?.order}
            job={activeOrderContext?.job}
            imprint={activeOrderContext?.imprint}
            onOpenOrder={() => openOrder(activeBlock.orderId, activeBlock)}
            onPause={() => pauseJobRun(activeRun.id)}
            onResume={() => resumeJobRun(activeRun.id)}
            onFinish={() => finishJobRun(activeRun.id)}
            onCancel={() => cancelJobRun(activeRun.id)}
            onAddNote={(content) => addJobRunNote(activeRun.id, content)}
          />
        ) : (
          <StationBarcodeScan
            disabled={!machine.active}
            hintBarcode={nextHintBarcode}
            onScan={async (barcode) => {
              const result = await scanAndStartJob(machineId, barcode);
              if (result.ok) return { ok: true };
              return { ok: false, error: result.error };
            }}
          />
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Queue"
            value={String(upcoming.length)}
            hint={
              upcoming.length === 1
                ? "Event waiting · Tap to view"
                : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} waiting · Tap to view`
            }
            icon={ListOrdered}
            onClick={() => setQueueOpen(true)}
          />
          <StatTile
            label="Active run"
            value={activeElapsed ?? (hasActiveJob ? "Paused" : "None")}
            hint={
              hasActiveJob && activeBlock
                ? activeBlock.imprintLabel
                : "Scan a barcode to start"
            }
            icon={PlayCircle}
            accent={hasActiveJob ? "text-[#2c6ecb]" : undefined}
          />
          <StatTile
            label="Hours"
            value={machine.active ? "Open" : "Closed"}
            hint={formatOperatingHoursSummary(machine)}
            icon={Clock}
            accent={machine.active ? "text-emerald-700" : "text-[#8a6116]"}
          />
        </section>

        <StationUpcomingSection
          machine={machine}
          upcoming={upcoming}
          onOpenOrder={openOrder}
          onEditSchedule={openEditSchedule}
        />

        {recentIssues.length > 0 && (
          <section className={dashboardCardClass}>
            <div className={dashboardPanelHeaderClass}>
              <div>
                <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
                  Recent reports
                </h2>
                <p className="mt-0.5 text-xs text-[#616161]">This session</p>
              </div>
            </div>
            <ul className="divide-y divide-[#ebebeb]">
              {recentIssues.map((report) => (
                <li key={report.id} className="px-4 py-3.5 text-sm sm:px-5">
                  <p className="font-medium text-[#303030]">
                    {ISSUE_TYPE_LABELS[report.issueType]}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-[#616161]">
                    {report.message}
                  </p>
                  <p className="mt-1.5 text-xs text-[#616161]">
                    {format(parseISO(report.reportedAt), "MMM d · h:mm a")}
                    {report.takeOffline && " · Took offline"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <StationQueueDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        machine={machine}
        upcoming={upcoming}
        onOpenOrder={openOrder}
        onEditSchedule={openEditSchedule}
      />

      <ReportIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        machineName={machine.name}
        onSubmit={(data) => reportMachineIssue({ machineId, ...data })}
      />

      <StationOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        orderId={selectedOrderId}
        scheduleBlock={selectedBlock}
      />

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        editingBlock={editingBlock}
      />
    </>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex min-h-[112px] flex-col rounded-lg border border-[#e3e3e3] bg-white p-4 text-left transition-[border-color,box-shadow]",
        dashboardElevatedShadow,
        onClick &&
          "cursor-pointer hover:border-[#c9cccf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f1f1]">
          <Icon className="size-3.5 text-[#303030]" strokeWidth={1.75} />
        </div>
        <p className={dashboardKpiTitleClass}>{label}</p>
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5", accent)}>{value}</p>
      <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-[#616161]">
        {hint}
      </p>
    </Wrapper>
  );
}
