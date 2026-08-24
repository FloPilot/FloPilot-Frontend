import {
  addDays,
  format,
  isSameDay,
  parseISO,
  set,
  startOfDay,
} from "date-fns";
import type { Machine, ScheduleBlock } from "@/types";
import {
  getDayOperatingWindow,
  getMachineOperatingHours,
  isMachineOpenOnDay,
  parseTimeToMinutes,
} from "@/lib/machine-hours";

export type ScheduleWindow = {
  startMin: number;
  endMin: number;
};

export type ScheduleDayLoad = {
  date: Date;
  isOpen: boolean;
  bookedMinutes: number;
  availableMinutes: number;
  capacityMinutes: number;
  utilization: number;
  blocks: ScheduleBlock[];
  firstAvailableStartMin?: number;
};

export type ScheduleRecommendation = {
  date: Date;
  startTime: string;
  endTime: string;
  machineId: string;
  reason: string;
};

function mergeWindows(windows: ScheduleWindow[]): ScheduleWindow[] {
  const sorted = [...windows].sort((a, b) => a.startMin - b.startMin);
  const merged: ScheduleWindow[] = [];

  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (!last || window.startMin > last.endMin) {
      merged.push({ ...window });
    } else {
      last.endMin = Math.max(last.endMin, window.endMin);
    }
  }
  return merged;
}

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function roundUpToHalfHour(minutes: number): number {
  return Math.ceil(minutes / 30) * 30;
}

function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getFreeScheduleWindows(
  machine: Machine,
  day: Date,
  blocks: ScheduleBlock[],
  options?: { excludeBlockId?: string; notBefore?: Date }
): ScheduleWindow[] {
  const operatingWindow = getDayOperatingWindow(machine, day);
  if (!operatingWindow) return [];

  const booked = mergeWindows(
    blocks
      .filter(
        (block) =>
          block.machineId === machine.id &&
          block.id !== options?.excludeBlockId &&
          isSameDay(parseISO(block.startAt), day)
      )
      .map((block) => {
        const start = parseISO(block.startAt);
        const end = parseISO(block.endAt);
        return {
          startMin: Math.max(operatingWindow.openMin, minutesIntoDay(start)),
          endMin: Math.min(operatingWindow.closeMin, minutesIntoDay(end)),
        };
      })
      .filter((window) => window.endMin > window.startMin)
  );

  const notBefore =
    options?.notBefore && isSameDay(options.notBefore, day)
      ? roundUpToHalfHour(minutesIntoDay(options.notBefore))
      : operatingWindow.openMin;
  let cursor = Math.max(operatingWindow.openMin, notBefore);
  const free: ScheduleWindow[] = [];

  for (const window of booked) {
    if (window.startMin > cursor) {
      free.push({ startMin: cursor, endMin: window.startMin });
    }
    cursor = Math.max(cursor, window.endMin);
  }
  if (cursor < operatingWindow.closeMin) {
    free.push({ startMin: cursor, endMin: operatingWindow.closeMin });
  }
  return free.filter((window) => window.endMin > window.startMin);
}

export function getScheduleDayLoad(
  machine: Machine,
  day: Date,
  blocks: ScheduleBlock[],
  options?: { excludeBlockId?: string; requiredMinutes?: number; notBefore?: Date }
): ScheduleDayLoad {
  const operatingWindow = getDayOperatingWindow(machine, day);
  const matchingBlocks = blocks.filter(
    (block) =>
      block.machineId === machine.id &&
      block.id !== options?.excludeBlockId &&
      isSameDay(parseISO(block.startAt), day)
  );
  if (!operatingWindow) {
    return {
      date: day,
      isOpen: false,
      bookedMinutes: 0,
      availableMinutes: 0,
      capacityMinutes: 0,
      utilization: 0,
      blocks: matchingBlocks,
    };
  }

  const free = getFreeScheduleWindows(machine, day, blocks, options);
  const availableMinutes = free.reduce(
    (total, window) => total + window.endMin - window.startMin,
    0
  );
  const capacityMinutes = operatingWindow.closeMin - operatingWindow.openMin;
  const requiredMinutes = options?.requiredMinutes ?? 0;
  const firstAvailableStartMin = free.find(
    (window) => window.endMin - window.startMin >= requiredMinutes
  )?.startMin;

  return {
    date: day,
    isOpen: isMachineOpenOnDay(machine, day),
    bookedMinutes: Math.max(0, capacityMinutes - availableMinutes),
    availableMinutes,
    capacityMinutes,
    utilization:
      capacityMinutes > 0
        ? Math.round(((capacityMinutes - availableMinutes) / capacityMinutes) * 100)
        : 0,
    blocks: matchingBlocks,
    firstAvailableStartMin,
  };
}

export function recommendScheduleSlot(
  machine: Machine | undefined,
  blocks: ScheduleBlock[],
  durationHours: number,
  options?: { from?: Date; excludeBlockId?: string; daysToCheck?: number }
): ScheduleRecommendation | null {
  if (!machine || durationHours <= 0) return null;
  const requiredMinutes = Math.ceil(durationHours * 60);
  const from = options?.from ?? new Date();
  const start = startOfDay(from);
  const daysToCheck = options?.daysToCheck ?? 42;

  for (let offset = 0; offset < daysToCheck; offset += 1) {
    const day = addDays(start, offset);
    const load = getScheduleDayLoad(machine, day, blocks, {
      excludeBlockId: options?.excludeBlockId,
      requiredMinutes,
      notBefore: offset === 0 ? from : undefined,
    });
    if (load.firstAvailableStartMin === undefined) continue;

    const startTime = toTime(load.firstAvailableStartMin);
    const endTime = toTime(load.firstAvailableStartMin + requiredMinutes);
    const dateLabel = format(day, "EEE, MMM d");
    return {
      date: day,
      startTime,
      endTime,
      machineId: machine.id,
      reason:
        load.bookedMinutes === 0
          ? `${dateLabel} is open`
          : `${dateLabel} has room after scheduled work`,
    };
  }
  return null;
}

export function formatScheduleLoad(load: ScheduleDayLoad): string {
  if (!load.isOpen) return "Closed";
  if (load.capacityMinutes <= 0) return "Unavailable";
  const bookedHours = load.bookedMinutes / 60;
  const capacityHours = load.capacityMinutes / 60;
  return `${bookedHours % 1 === 0 ? bookedHours : bookedHours.toFixed(1)}/${capacityHours % 1 === 0 ? capacityHours : capacityHours.toFixed(1)}h booked`;
}

export function getScheduleBlockTimeRange(block: ScheduleBlock): string {
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  return `${format(start, "h:mm a")}–${format(end, "h:mm a")}`;
}

export function getMachineOpenTime(machine: Machine): string {
  return getMachineOperatingHours(machine).openTime;
}

export function getDateAtTime(day: Date, time: string): Date {
  const minutes = parseTimeToMinutes(time);
  return set(startOfDay(day), {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
}
