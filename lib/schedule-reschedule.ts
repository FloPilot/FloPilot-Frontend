import {
  addDays,
  differenceInMilliseconds,
  format,
  isSameDay,
  parseISO,
  set,
  startOfDay,
} from "date-fns";
import { clampBlockToMachineHours } from "@/lib/machine-hours";
import type { Machine, ScheduleBlock } from "@/types";

export {
  blockTimelinePosition,
  getTimelineLayout,
  rescheduleBlockOnTimeline,
  snapTopPx,
  topPxToDate,
} from "@/lib/machine-hours";

export function isBlockInWeek(block: ScheduleBlock, weekStart: Date): boolean {
  const start = startOfDay(parseISO(block.startAt));
  const weekEnd = addDays(startOfDay(weekStart), 7);
  return start >= startOfDay(weekStart) && start < weekEnd;
}

export { formatTimelineHour } from "@/lib/machine-hours";

export function scheduleBlocksOverlap(
  a: ScheduleBlock,
  b: ScheduleBlock
): boolean {
  const aStart = parseISO(a.startAt);
  const bStart = parseISO(b.startAt);
  if (!isSameDay(aStart, bStart)) return false;
  const aEnd = parseISO(a.endAt).getTime();
  const bEnd = parseISO(b.endAt).getTime();
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

/** Block ids that share time with another job on the same machine day */
export function getOverlappingBlockIds(blocks: ScheduleBlock[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (scheduleBlocksOverlap(blocks[i], blocks[j])) {
        ids.add(blocks[i].id);
        ids.add(blocks[j].id);
      }
    }
  }
  return ids;
}

export function getCalendarCellDropId(machineId: string, day: Date): string {
  return `${machineId}|${format(day, "yyyy-MM-dd")}`;
}

export function parseCalendarCellDropId(
  id: string | number
): { machineId: string; day: Date } | null {
  const raw = String(id);
  const pipe = raw.indexOf("|");
  if (pipe < 0) return null;
  const machineId = raw.slice(0, pipe);
  const dateStr = raw.slice(pipe + 1);
  const day = startOfDay(parseISO(dateStr));
  if (Number.isNaN(day.getTime())) return null;
  return { machineId, day };
}

/** Move a block to another day (and optionally machine), keeping start time and duration */
export function rescheduleBlockToCell(
  block: ScheduleBlock,
  targetDay: Date,
  targetMachineId: string,
  machine?: Machine
): Omit<ScheduleBlock, "id"> | null {
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const durationMs = differenceInMilliseconds(end, start);

  const newStart = set(startOfDay(targetDay), {
    hours: start.getHours(),
    minutes: start.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
  const newEnd = new Date(newStart.getTime() + durationMs);

  const { id: _id, ...rest } = block;
  const base = {
    ...rest,
    machineId: targetMachineId,
    startAt: newStart.toISOString(),
    endAt: newEnd.toISOString(),
  };

  if (!machine) return base;

  const clamped = clampBlockToMachineHours(
    machine,
    targetDay,
    base.startAt,
    base.endAt
  );
  if (!clamped) return null;
  return { ...base, ...clamped };
}

/** Move a block to another machine, keeping the same day/time when hours allow */
export function moveBlockToMachine(
  block: ScheduleBlock,
  targetMachine: Machine
): Omit<ScheduleBlock, "id"> | null {
  if (block.machineId === targetMachine.id) return null;

  const day = startOfDay(parseISO(block.startAt));
  const clamped = clampBlockToMachineHours(
    targetMachine,
    day,
    block.startAt,
    block.endAt
  );
  if (!clamped) return null;

  const { id: _id, ...rest } = block;
  return {
    ...rest,
    machineId: targetMachine.id,
    ...clamped,
  };
}

export function isSameCalendarCell(
  block: ScheduleBlock,
  machineId: string,
  day: Date
): boolean {
  return (
    block.machineId === machineId && isSameDay(parseISO(block.startAt), day)
  );
}
