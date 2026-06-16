import { addDays, differenceInMinutes, format, parseISO } from "date-fns";
import {
  getDayOperatingWindow,
  getOutsideHoursBlockIds,
  isMachineOpenOnDay,
} from "@/lib/machine-hours";
import {
  getOverlappingBlockIds,
  isBlockInWeek,
} from "@/lib/schedule-reschedule";
import type { Machine, ScheduleBlock } from "@/types";

export function getMachineWeekBlocks(
  blocks: ScheduleBlock[],
  machineId: string,
  weekStart: Date
): ScheduleBlock[] {
  return blocks.filter(
    (b) => b.machineId === machineId && isBlockInWeek(b, weekStart)
  );
}

export function computeMachineWeekKpis(
  machine: Machine,
  blocks: ScheduleBlock[],
  weekStart: Date
) {
  const weekBlocks = getMachineWeekBlocks(blocks, machine.id, weekStart);
  const now = new Date();

  const bookedMinutes = weekBlocks.reduce(
    (sum, block) =>
      sum +
      Math.max(
        0,
        differenceInMinutes(parseISO(block.endAt), parseISO(block.startAt))
      ),
    0
  );

  let availableMinutes = 0;
  let openDays = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (!isMachineOpenOnDay(machine, day)) continue;
    openDays += 1;
    const window = getDayOperatingWindow(machine, day);
    if (window) availableMinutes += window.closeMin - window.openMin;
  }

  const overlapIds = getOverlappingBlockIds(weekBlocks);
  const outsideIds = getOutsideHoursBlockIds(machine, weekBlocks);
  const conflictIds = new Set<string>([...overlapIds, ...outsideIds]);

  const upcoming = weekBlocks
    .filter((block) => parseISO(block.endAt) > now)
    .sort(
      (a, b) =>
        parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
    );

  const nextBlock = upcoming[0];
  const todayBlocks = weekBlocks.filter((block) => {
    const start = parseISO(block.startAt);
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  });

  return {
    jobCount: weekBlocks.length,
    todayCount: todayBlocks.length,
    bookedHours: Math.round((bookedMinutes / 60) * 10) / 10,
    availableHours: Math.round((availableMinutes / 60) * 10) / 10,
    utilization:
      availableMinutes > 0
        ? Math.round((bookedMinutes / availableMinutes) * 100)
        : 0,
    conflictCount: conflictIds.size,
    openDays,
    nextJobLabel: nextBlock
      ? `${nextBlock.orderNumber} · ${format(parseISO(nextBlock.startAt), "EEE h:mm a")}`
      : null,
  };
}

export function computeShopWeekKpis(
  machines: Machine[],
  blocks: ScheduleBlock[],
  weekStart: Date
) {
  const activeMachines = machines.filter((m) => m.active);
  const perMachine = machines.map((machine) =>
    computeMachineWeekKpis(machine, blocks, weekStart)
  );

  const totalJobs = perMachine.reduce((sum, k) => sum + k.jobCount, 0);
  const jobsToday = perMachine.reduce((sum, k) => sum + k.todayCount, 0);
  const totalConflicts = perMachine.reduce((sum, k) => sum + k.conflictCount, 0);
  const machinesWithJobs = perMachine.filter((k) => k.jobCount > 0).length;
  const avgUtilization =
    perMachine.length > 0
      ? Math.round(
          perMachine.reduce((sum, k) => sum + k.utilization, 0) /
            perMachine.length
        )
      : 0;

  return {
    totalJobs,
    jobsToday,
    totalConflicts,
    machinesWithJobs,
    activeMachineCount: activeMachines.length,
    totalMachineCount: machines.length,
    avgUtilization,
    perMachine: Object.fromEntries(
      machines.map((m, i) => [m.id, perMachine[i]])
    ) as Record<string, ReturnType<typeof computeMachineWeekKpis>>,
  };
}
