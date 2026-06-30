import { format, isSameDay, parseISO, set, startOfDay } from "date-fns";
import type { Machine, MachineOperatingHours, ScheduleBlock } from "@/types";

export const TIMELINE_SLOT_MINUTES = 30;
export const TIMELINE_ROW_HEIGHT_PX = 28;

export const WEEKDAY_LABELS = [
  { value: 0, label: "Sun", short: "S" },
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
] as const;

export const DEFAULT_OPERATING_HOURS: MachineOperatingHours = {
  openTime: "07:00",
  closeTime: "18:00",
  daysOpen: [1, 2, 3, 4, 5],
};

export function getMachineOperatingHours(
  machine: Machine
): MachineOperatingHours {
  return machine.operatingHours ?? DEFAULT_OPERATING_HOURS;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isMachineOpenOnDay(machine: Machine, day: Date): boolean {
  const hours = getMachineOperatingHours(machine);
  return hours.daysOpen.includes(day.getDay());
}

export function getDayOperatingWindow(machine: Machine, day: Date) {
  if (!isMachineOpenOnDay(machine, day)) return null;
  const hours = getMachineOperatingHours(machine);
  const openMin = parseTimeToMinutes(hours.openTime);
  const closeMin = parseTimeToMinutes(hours.closeTime);
  if (closeMin <= openMin) return null;
  return { openMin, closeMin, openTime: hours.openTime, closeTime: hours.closeTime };
}

export function getMachineTimelineDisplayRange(machine: Machine) {
  const hours = getMachineOperatingHours(machine);
  const openMin = parseTimeToMinutes(hours.openTime);
  const closeMin = parseTimeToMinutes(hours.closeTime);
  const displayStartHour = Math.max(0, Math.floor(openMin / 60) - 1);
  const displayEndHour = Math.min(24, Math.ceil(closeMin / 60) + 1);
  return {
    displayStartHour,
    displayEndHour,
    openMin,
    closeMin,
  };
}

export function getTimelineLayout(machine: Machine) {
  const { displayStartHour, displayEndHour } =
    getMachineTimelineDisplayRange(machine);
  const slotsPerHour = 60 / TIMELINE_SLOT_MINUTES;
  const slotCount = (displayEndHour - displayStartHour) * slotsPerHour;
  const totalHeightPx = slotCount * TIMELINE_ROW_HEIGHT_PX;
  return {
    displayStartHour,
    displayEndHour,
    slotCount,
    totalHeightPx,
    slotsPerHour,
  };
}

export function formatTimelineHour(hour: number): string {
  const d = set(startOfDay(new Date()), { hours: hour, minutes: 0 });
  return format(d, "h a");
}

function formatTime12h(time: string): string {
  const min = parseTimeToMinutes(time);
  const d = set(startOfDay(new Date()), {
    hours: Math.floor(min / 60),
    minutes: min % 60,
  });
  return format(d, "h:mm a");
}

export function formatOperatingHoursSummary(machine: Machine): string {
  const hours = getMachineOperatingHours(machine);
  const dayLabels = WEEKDAY_LABELS.filter((d) =>
    hours.daysOpen.includes(d.value)
  ).map((d) => d.label);
  const open = formatTime12h(hours.openTime);
  const close = formatTime12h(hours.closeTime);
  const days =
    dayLabels.length === 7
      ? "Every day"
      : dayLabels.length === 5 &&
          hours.daysOpen.every((d) => d >= 1 && d <= 5)
        ? "Mon–Fri"
        : dayLabels.join(", ");
  return `${open} – ${close} · ${days}`;
}

export function blockTimelinePosition(block: ScheduleBlock, machine: Machine) {
  const { displayStartHour } = getMachineTimelineDisplayRange(machine);
  const dayStartMin = displayStartHour * 60;
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const topMin = Math.max(0, startMin - dayStartMin);
  const durationMin = Math.max(TIMELINE_SLOT_MINUTES, endMin - startMin);
  const pxPerMin = TIMELINE_ROW_HEIGHT_PX / TIMELINE_SLOT_MINUTES;
  return {
    topPx: topMin * pxPerMin,
    heightPx: durationMin * pxPerMin,
  };
}

export function snapTopPx(
  topPx: number,
  blockHeightPx: number,
  machine: Machine
): number {
  const { totalHeightPx } = getTimelineLayout(machine);
  const slotPx = TIMELINE_ROW_HEIGHT_PX;
  const snapped = Math.round(topPx / slotPx) * slotPx;
  return Math.max(0, Math.min(snapped, totalHeightPx - blockHeightPx));
}

export function topPxToDate(day: Date, topPx: number, machine: Machine): Date {
  const { displayStartHour } = getMachineTimelineDisplayRange(machine);
  const pxPerMin = TIMELINE_ROW_HEIGHT_PX / TIMELINE_SLOT_MINUTES;
  const minutesFromDisplayStart =
    Math.round(topPx / pxPerMin / TIMELINE_SLOT_MINUTES) * TIMELINE_SLOT_MINUTES;
  const totalMin = displayStartHour * 60 + minutesFromDisplayStart;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return set(startOfDay(day), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export function clampScheduleToOperatingHours(
  machine: Machine,
  day: Date,
  start: Date,
  end: Date
): { start: Date; end: Date; valid: boolean } {
  const window = getDayOperatingWindow(machine, day);
  if (!window) {
    return { start, end, valid: false };
  }

  const dayStart = startOfDay(day);
  const openAt = set(dayStart, {
    hours: Math.floor(window.openMin / 60),
    minutes: window.openMin % 60,
    seconds: 0,
    milliseconds: 0,
  });
  const closeAt = set(dayStart, {
    hours: Math.floor(window.closeMin / 60),
    minutes: window.closeMin % 60,
    seconds: 0,
    milliseconds: 0,
  });

  const durationMs = Math.max(0, end.getTime() - start.getTime());
  let newStart = start;
  if (newStart < openAt) newStart = openAt;
  if (newStart >= closeAt) {
    return { start, end, valid: false };
  }

  let newEnd = new Date(newStart.getTime() + durationMs);
  if (newEnd > closeAt) newEnd = closeAt;
  if (newEnd <= newStart) {
    return { start, end, valid: false };
  }

  return { start: newStart, end: newEnd, valid: true };
}

export function rescheduleBlockOnTimeline(
  block: ScheduleBlock,
  targetDay: Date,
  topPx: number,
  machine: Machine
): Omit<ScheduleBlock, "id"> | null {
  const { heightPx } = blockTimelinePosition(block, machine);
  const snappedTop = snapTopPx(topPx, heightPx, machine);
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const durationMs = end.getTime() - start.getTime();
  const proposedStart = topPxToDate(targetDay, snappedTop, machine);
  const proposedEnd = new Date(proposedStart.getTime() + durationMs);

  const clamped = clampScheduleToOperatingHours(
    machine,
    targetDay,
    proposedStart,
    proposedEnd
  );
  if (!clamped.valid) return null;

  const { id: _id, ...rest } = block;
  return {
    ...rest,
    machineId: machine.id,
    startAt: clamped.start.toISOString(),
    endAt: clamped.end.toISOString(),
  };
}

/**
 * Resize a block by dragging its bottom edge. Keeps the start fixed, snaps the
 * new duration to the slot grid, and clamps the end to the machine's close time.
 */
export function resizeBlockOnTimeline(
  block: ScheduleBlock,
  newHeightPx: number,
  machine: Machine
): Omit<ScheduleBlock, "id"> | null {
  const pxPerMin = TIMELINE_ROW_HEIGHT_PX / TIMELINE_SLOT_MINUTES;
  const rawMin = newHeightPx / pxPerMin;
  const snappedMin = Math.max(
    TIMELINE_SLOT_MINUTES,
    Math.round(rawMin / TIMELINE_SLOT_MINUTES) * TIMELINE_SLOT_MINUTES
  );

  const start = parseISO(block.startAt);
  const day = startOfDay(start);
  let end = new Date(start.getTime() + snappedMin * 60 * 1000);

  const window = getDayOperatingWindow(machine, day);
  if (window) {
    const closeAt = set(day, {
      hours: Math.floor(window.closeMin / 60),
      minutes: window.closeMin % 60,
      seconds: 0,
      milliseconds: 0,
    });
    if (end > closeAt) end = closeAt;
  }

  if (end.getTime() - start.getTime() < TIMELINE_SLOT_MINUTES * 60 * 1000) {
    return null;
  }

  const { id: _id, ...rest } = block;
  return {
    ...rest,
    endAt: end.toISOString(),
  };
}

export function getUnavailableRegionsPx(machine: Machine, day: Date) {
  const layout = getTimelineLayout(machine);
  const window = getDayOperatingWindow(machine, day);
  if (!window) {
    return [{ topPx: 0, heightPx: layout.totalHeightPx, closed: true as const }];
  }

  const { displayStartHour, totalHeightPx } = layout;
  const displayStartMin = displayStartHour * 60;
  const pxPerMin = TIMELINE_ROW_HEIGHT_PX / TIMELINE_SLOT_MINUTES;
  const regions: { topPx: number; heightPx: number; closed?: boolean }[] = [];

  const openTop = (window.openMin - displayStartMin) * pxPerMin;
  const closeTop = (window.closeMin - displayStartMin) * pxPerMin;

  if (openTop > 0) {
    regions.push({ topPx: 0, heightPx: openTop });
  }
  if (closeTop < totalHeightPx) {
    regions.push({ topPx: closeTop, heightPx: totalHeightPx - closeTop });
  }

  return regions;
}

export function clampBlockToMachineHours(
  machine: Machine,
  day: Date,
  startAt: string,
  endAt: string
): { startAt: string; endAt: string } | null {
  const clamped = clampScheduleToOperatingHours(
    machine,
    day,
    parseISO(startAt),
    parseISO(endAt)
  );
  if (!clamped.valid) return null;
  return {
    startAt: clamped.start.toISOString(),
    endAt: clamped.end.toISOString(),
  };
}

/** True when any part of the block falls outside the machine's hours for that day */
export function isBlockOutsideOperatingHours(
  machine: Machine,
  block: ScheduleBlock
): boolean {
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const day = startOfDay(start);

  if (!isSameDay(start, end)) return true;

  const window = getDayOperatingWindow(machine, day);
  if (!window) return true;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return startMin < window.openMin || endMin > window.closeMin;
}

export function getOutsideHoursBlockIds(
  machine: Machine,
  blocks: ScheduleBlock[]
): Set<string> {
  const ids = new Set<string>();
  for (const block of blocks) {
    if (isBlockOutsideOperatingHours(machine, block)) {
      ids.add(block.id);
    }
  }
  return ids;
}
