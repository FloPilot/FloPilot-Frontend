import { format, isAfter, parseISO, startOfDay } from "date-fns";
import type { ScheduleBlock, StationJobRun, StationJobRunStatus } from "@/types";
import { getBlocksForMachine } from "@/lib/station-utils";

export const STATION_RUN_STATUS_LABELS: Record<StationJobRunStatus, string> = {
  upcoming: "Upcoming",
  running: "Running",
  paused: "Paused",
  finished: "Finished",
  cancelled: "Cancelled",
};

export function formatJobBarcode(scheduleBlockId: string): string {
  return `PF:${scheduleBlockId}`;
}

/** Normalize scanner input to a schedule block id or order number token */
export function parseJobBarcodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.toUpperCase().startsWith("PF:")) {
    return trimmed.slice(3).trim();
  }
  return trimmed;
}

export function buildInitialJobRuns(blocks: ScheduleBlock[]): StationJobRun[] {
  return blocks.map((block) => ({
    id: `run-${block.id}`,
    scheduleBlockId: block.id,
    machineId: block.machineId,
    status: "upcoming" as const,
    notes: [],
  }));
}

export function createDemoActiveRun(
  runs: StationJobRun[],
  scheduleBlockId: string
): StationJobRun[] {
  const startedAt = new Date();
  startedAt.setHours(startedAt.getHours() - 1);

  return runs.map((run) => {
    if (run.scheduleBlockId !== scheduleBlockId) return run;
    return {
      ...run,
      status: "running",
      startedAt: startedAt.toISOString(),
      notes: [
        {
          id: "note-demo-1",
          author: "Mike T.",
          content: "Screens registered — running first color now.",
          timestamp: startedAt.toISOString(),
        },
        {
          id: "note-demo-2",
          author: "Mike T.",
          content: "Flash looks good. Waiting on second color ink.",
          timestamp: new Date(startedAt.getTime() + 25 * 60 * 1000).toISOString(),
        },
      ],
    };
  });
}

export function getRunForBlock(
  runs: StationJobRun[],
  scheduleBlockId: string
): StationJobRun | undefined {
  return runs.find((r) => r.scheduleBlockId === scheduleBlockId);
}

export function getActiveRunForMachine(
  runs: StationJobRun[],
  machineId: string
): StationJobRun | undefined {
  return runs.find(
    (r) =>
      r.machineId === machineId &&
      (r.status === "running" || r.status === "paused")
  );
}

export function getUpcomingRunsForMachine(
  blocks: ScheduleBlock[],
  runs: StationJobRun[],
  machineId: string
): { block: ScheduleBlock; run: StationJobRun }[] {
  const now = new Date();
  const machineBlocks = getBlocksForMachine(blocks, machineId);

  return machineBlocks
    .map((block) => {
      const run = getRunForBlock(runs, block.id);
      if (!run || run.status !== "upcoming") return null;
      if (!isAfter(parseISO(block.endAt), now)) return null;
      return { block, run };
    })
    .filter((x): x is { block: ScheduleBlock; run: StationJobRun } => x != null);
}

export function findBlockByBarcodeOnMachine(
  blocks: ScheduleBlock[],
  machineId: string,
  scanned: string
): ScheduleBlock | undefined {
  const token = parseJobBarcodeInput(scanned);
  if (!token) return undefined;

  const onMachine = blocks.filter((b) => b.machineId === machineId);

  const byId = onMachine.find(
    (b) => b.id === token || b.id.toLowerCase() === token.toLowerCase()
  );
  if (byId) return byId;

  const byOrder = onMachine.filter(
    (b) =>
      b.orderNumber.toLowerCase() === token.toLowerCase() ||
      b.orderNumber.replace(/-/g, "").toLowerCase() ===
        token.replace(/-/g, "").toLowerCase()
  );
  if (byOrder.length === 1) return byOrder[0];

  return undefined;
}

export function formatRunElapsed(startedAt: string, pausedAt?: string): string {
  const start = parseISO(startedAt);
  const end = pausedAt ? parseISO(pausedAt) : new Date();
  const ms = Math.max(0, end.getTime() - start.getTime());
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function groupUpcomingByDay(
  items: { block: ScheduleBlock; run: StationJobRun }[]
) {
  const groups: {
    date: Date;
    label: string;
    items: { block: ScheduleBlock; run: StationJobRun }[];
  }[] = [];
  const today = startOfDay(new Date());

  for (const item of items) {
    const date = startOfDay(parseISO(item.block.startAt));
    const existing = groups.find((g) => g.date.getTime() === date.getTime());
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({
        date,
        label:
          date.getTime() === today.getTime()
            ? "Today"
            : format(date, "EEEE, MMM d"),
        items: [item],
      });
    }
  }

  return groups;
}
