import { format, parseISO } from "date-fns";
import { formatCurrency, formatDate, decorationLabel } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { getRunForBlock } from "@/lib/station-runs";
import { STATION_RUN_STATUS_LABELS } from "@/lib/station-runs";
import {
  buildResult,
  formatDurationMinutes,
  orderStatusLabel,
  runDurationMinutes,
} from "@/lib/reports/report-utils";
import type { ReportDefinition } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { getOrderProductionSteps } from "@/lib/order-production";

const machineProductivityReport: ReportDefinition<ShopReportData> = {
  id: "machine-productivity",
  title: "Machine productivity",
  description:
    "Scheduled hours, completed runs, pieces produced, and average run time per machine.",
  category: "Production",
  contexts: ["reports_hub"],
  run: ({ machines, scheduleBlocks, jobRuns, orders }) => {
    const orderMap = new Map(orders.map((order) => [order.id, order]));

    const rows = machines.map((machine) => {
      const blocks = scheduleBlocks.filter(
        (block) => block.machineId === machine.id
      );
      let scheduledMinutes = 0;
      let completedRuns = 0;
      let runningRuns = 0;
      let totalPieces = 0;
      let totalRunMinutes = 0;
      let runCountWithDuration = 0;

      for (const block of blocks) {
        const start = parseISO(block.startAt);
        const end = parseISO(block.endAt);
        scheduledMinutes += Math.max(
          0,
          (end.getTime() - start.getTime()) / 60000
        );
        totalPieces += block.pieceCount ?? 0;

        const run = getRunForBlock(jobRuns, block.id);
        if (run?.status === "finished") completedRuns++;
        if (run?.status === "running" || run?.status === "paused") {
          runningRuns++;
        }
        const duration = runDurationMinutes(run?.startedAt, run?.finishedAt);
        if (duration !== null) {
          totalRunMinutes += duration;
          runCountWithDuration++;
        }
      }

      const avgRunMinutes =
        runCountWithDuration > 0
          ? totalRunMinutes / runCountWithDuration
          : 0;
      const scheduledHours = scheduledMinutes / 60;
      const piecesPerHour =
        scheduledHours > 0 ? Math.round(totalPieces / scheduledHours) : 0;

      return {
        machine: machine.name,
        type: machine.type,
        active: machine.active ? "Yes" : "No",
        capacityPerHour: machine.capacityPerHour,
        scheduledBlocks: blocks.length,
        scheduledHours: scheduledHours.toFixed(1),
        completedRuns,
        runningNow: runningRuns,
        piecesScheduled: totalPieces,
        piecesPerHour,
        avgRunTime: formatDurationMinutes(avgRunMinutes),
        statusMessage: machine.statusMessage ?? "",
      };
    });

    return buildResult(
      machineProductivityReport,
      [
        { key: "machine", label: "Machine" },
        { key: "type", label: "Type" },
        { key: "active", label: "Active" },
        { key: "capacityPerHour", label: "Capacity/hr", align: "right" },
        { key: "scheduledBlocks", label: "Scheduled blocks", align: "right" },
        { key: "scheduledHours", label: "Scheduled hours", align: "right" },
        { key: "completedRuns", label: "Completed runs", align: "right" },
        { key: "runningNow", label: "Running now", align: "right" },
        { key: "piecesScheduled", label: "Pieces scheduled", align: "right" },
        { key: "piecesPerHour", label: "Pieces/hr (scheduled)", align: "right" },
        { key: "avgRunTime", label: "Avg run time" },
        { key: "statusMessage", label: "Status" },
      ],
      rows.sort((a, b) => a.machine.localeCompare(b.machine)),
      "machine-productivity"
    );
  },
};

const scheduleDetailReport: ReportDefinition<ShopReportData> = {
  id: "schedule-detail",
  title: "Production schedule",
  description:
    "Every calendar block with machine, order, decoration, pieces, and run status.",
  category: "Production",
  contexts: ["reports_hub"],
  run: ({ machines, scheduleBlocks, jobRuns, orders }) => {
    const machineMap = new Map(machines.map((m) => [m.id, m.name]));

    const rows = scheduleBlocks.map((block) => {
      const run = getRunForBlock(jobRuns, block.id);
      const order = orders.find((entry) => entry.id === block.orderId);
      const job = order?.jobs.find((entry) => entry.id === block.jobId);
      const imprint = job?.imprints.find((entry) => entry.id === block.imprintId);

      return {
        machine: machineMap.get(block.machineId) ?? block.machineId,
        orderNumber: block.customLabel
          ? `${block.orderNumber} — ${block.customLabel}`
          : block.orderNumber,
        customer: block.customerName,
        event: block.imprintLabel,
        decoration: imprint ? decorationLabel(imprint.decoration) : "",
        pieces: block.pieceCount ?? 0,
        start: format(parseISO(block.startAt), "MMM d, yyyy h:mm a"),
        end: format(parseISO(block.endAt), "MMM d, yyyy h:mm a"),
        runStatus: run ? STATION_RUN_STATUS_LABELS[run.status] : "Not started",
        assignee: imprint?.workflow?.assignee ?? "",
        orderStatus: order ? orderStatusLabel(order.status) : "",
      };
    });

    return buildResult(
      scheduleDetailReport,
      [
        { key: "machine", label: "Machine" },
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "event", label: "Event" },
        { key: "decoration", label: "Decoration" },
        { key: "pieces", label: "Pieces", align: "right" },
        { key: "start", label: "Start" },
        { key: "end", label: "End" },
        { key: "runStatus", label: "Run status" },
        { key: "assignee", label: "Assignee" },
        { key: "orderStatus", label: "Order status" },
      ],
      rows.sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
      "schedule-detail"
    );
  },
};

const floorJobRunsReport: ReportDefinition<ShopReportData> = {
  id: "floor-job-runs",
  title: "Floor job runs",
  description:
    "Run history with start/finish times, duration, and notes count per scheduled block.",
  category: "Production",
  contexts: ["reports_hub"],
  run: ({ machines, scheduleBlocks, jobRuns }) => {
    const blockMap = new Map(scheduleBlocks.map((b) => [b.id, b]));
    const machineMap = new Map(machines.map((m) => [m.id, m.name]));

    const rows = jobRuns.map((run) => {
      const block = blockMap.get(run.scheduleBlockId);
      const duration = runDurationMinutes(run.startedAt, run.finishedAt);

      return {
        machine: machineMap.get(run.machineId) ?? run.machineId,
        orderNumber: block?.orderNumber ?? "",
        event: block?.imprintLabel ?? "",
        customer: block?.customerName ?? "",
        status: STATION_RUN_STATUS_LABELS[run.status],
        startedAt: run.startedAt
          ? format(parseISO(run.startedAt), "MMM d, yyyy h:mm a")
          : "",
        finishedAt: run.finishedAt
          ? format(parseISO(run.finishedAt), "MMM d, yyyy h:mm a")
          : "",
        duration: duration !== null ? formatDurationMinutes(duration) : "",
        notes: run.notes.length,
        pieces: block?.pieceCount ?? 0,
      };
    });

    return buildResult(
      floorJobRunsReport,
      [
        { key: "machine", label: "Machine" },
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "event", label: "Event" },
        { key: "status", label: "Status" },
        { key: "startedAt", label: "Started" },
        { key: "finishedAt", label: "Finished" },
        { key: "duration", label: "Duration" },
        { key: "pieces", label: "Pieces", align: "right" },
        { key: "notes", label: "Notes", align: "right" },
      ],
      rows,
      "floor-job-runs"
    );
  },
};

const employeeProductivityReport: ReportDefinition<ShopReportData> = {
  id: "employee-productivity",
  title: "Employee productivity",
  description:
    "Assignments, completed events, floor notes, and open tasks per team member.",
  category: "Team",
  contexts: ["reports_hub"],
  run: ({ orders, jobRuns, scheduleBlocks, teamMembers }) => {
    const blockMap = new Map(scheduleBlocks.map((b) => [b.id, b]));
    const stats = new Map<
      string,
      {
        assignedEvents: number;
        completedEvents: number;
        floorNotes: number;
        openTasks: number;
        doneTasks: number;
      }
    >();

    const ensure = (name: string) => {
      if (!stats.has(name)) {
        stats.set(name, {
          assignedEvents: 0,
          completedEvents: 0,
          floorNotes: 0,
          openTasks: 0,
          doneTasks: 0,
        });
      }
      return stats.get(name)!;
    };

    for (const order of orders) {
      for (const job of order.jobs) {
        for (const imprint of job.imprints) {
          const assignee = imprint.workflow?.assignee?.trim();
          if (!assignee) continue;
          const entry = ensure(assignee);
          entry.assignedEvents++;
          if (imprint.workflow?.status === "completed") {
            entry.completedEvents++;
          }
        }
        for (const task of job.tasks) {
          const assignee = task.assignee?.trim();
          if (!assignee) continue;
          const entry = ensure(assignee);
          if (task.status === "done") entry.doneTasks++;
          else entry.openTasks++;
        }
      }
    }

    for (const run of jobRuns) {
      for (const note of run.notes) {
        const author = note.author?.trim();
        if (!author) continue;
        ensure(author).floorNotes++;
      }
    }

    const memberNames = new Set(teamMembers.map((m) => m.name));
    for (const name of stats.keys()) memberNames.add(name);

    const rows = [...memberNames].map((name) => {
      const entry = stats.get(name) ?? {
        assignedEvents: 0,
        completedEvents: 0,
        floorNotes: 0,
        openTasks: 0,
        doneTasks: 0,
      };
      const member = teamMembers.find((m) => m.name === name);

      return {
        name,
        role: member?.role ?? "",
        email: member?.email ?? "",
        assignedEvents: entry.assignedEvents,
        completedEvents: entry.completedEvents,
        openTasks: entry.openTasks,
        doneTasks: entry.doneTasks,
        floorNotes: entry.floorNotes,
        activeRuns: jobRuns.filter(
          (run) =>
            (run.status === "running" || run.status === "paused") &&
            run.notes.some((note) => note.author === name)
        ).length,
      };
    });

    return buildResult(
      employeeProductivityReport,
      [
        { key: "name", label: "Team member" },
        { key: "role", label: "Role" },
        { key: "email", label: "Email" },
        { key: "assignedEvents", label: "Assigned events", align: "right" },
        { key: "completedEvents", label: "Completed events", align: "right" },
        { key: "openTasks", label: "Open tasks", align: "right" },
        { key: "doneTasks", label: "Done tasks", align: "right" },
        { key: "floorNotes", label: "Floor notes", align: "right" },
        { key: "activeRuns", label: "Active runs (noted)", align: "right" },
      ],
      rows.sort((a, b) => b.assignedEvents - a.assignedEvents),
      "employee-productivity"
    );
  },
};

const productionEventsReport: ReportDefinition<ShopReportData> = {
  id: "all-production-events",
  title: "All production events",
  description:
    "Every decoration event across orders with schedule and workflow status.",
  category: "Production",
  contexts: ["reports_hub"],
  run: ({ orders, scheduleBlocks, jobRuns }) => {
    const rows: Record<string, string | number>[] = [];

    for (const order of orders) {
      const steps = getOrderProductionSteps(order);
      for (const step of steps) {
        const block = scheduleBlocks.find(
          (entry) =>
            entry.orderId === order.id &&
            entry.jobId === step.job.id &&
            entry.imprintId === step.imprint.id
        );
        const run = block ? getRunForBlock(jobRuns, block.id) : undefined;

        rows.push({
          orderNumber: formatOrderDisplayLine(order),
          customer: order.customerName,
          orderStatus: orderStatusLabel(order.status),
          event: step.imprint.label,
          decoration: decorationLabel(step.imprint.decoration),
          inHands: formatDate(order.inHandsDate),
          rush: order.rush ? "Yes" : "",
          scheduled: block ? "Yes" : "No",
          machine: block?.machineId ?? "",
          runStatus: run ? STATION_RUN_STATUS_LABELS[run.status] : "",
          workflowStatus: step.imprint.workflow?.status ?? "",
          assignee: step.imprint.workflow?.assignee ?? "",
        });
      }
    }

    return buildResult(
      productionEventsReport,
      [
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "orderStatus", label: "Order status" },
        { key: "event", label: "Event" },
        { key: "decoration", label: "Decoration" },
        { key: "inHands", label: "In-hands" },
        { key: "rush", label: "Rush" },
        { key: "scheduled", label: "Scheduled" },
        { key: "runStatus", label: "Run status" },
        { key: "workflowStatus", label: "Workflow" },
        { key: "assignee", label: "Assignee" },
      ],
      rows,
      "all-production-events"
    );
  },
};

const machineIssuesReport: ReportDefinition<ShopReportData> = {
  id: "machine-issues",
  title: "Machine issues",
  description: "Floor issue reports with type, message, and offline status.",
  category: "Production",
  contexts: ["reports_hub"],
  run: ({ machines, issueReports }) => {
    const machineMap = new Map(machines.map((m) => [m.id, m.name]));

    const rows = issueReports.map((issue) => ({
      machine: machineMap.get(issue.machineId) ?? issue.machineId,
      issueType: issue.issueType,
      message: issue.message,
      reportedAt: format(parseISO(issue.reportedAt), "MMM d, yyyy h:mm a"),
      tookOffline: issue.takeOffline ? "Yes" : "No",
    }));

    return buildResult(
      machineIssuesReport,
      [
        { key: "machine", label: "Machine" },
        { key: "issueType", label: "Type" },
        { key: "message", label: "Message" },
        { key: "reportedAt", label: "Reported" },
        { key: "tookOffline", label: "Took offline" },
      ],
      rows.sort(
        (a, b) =>
          new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
      ),
      "machine-issues"
    );
  },
};

export const PRODUCTION_REPORTS: ReportDefinition<ShopReportData>[] = [
  machineProductivityReport,
  employeeProductivityReport,
  scheduleDetailReport,
  floorJobRunsReport,
  productionEventsReport,
  machineIssuesReport,
];
