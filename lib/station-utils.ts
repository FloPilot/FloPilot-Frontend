import {
  addDays,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import type { ScheduleBlock } from "@/types";

export function getBlocksForMachine(
  blocks: ScheduleBlock[],
  machineId: string
): ScheduleBlock[] {
  return [...blocks]
    .filter((b) => b.machineId === machineId)
    .sort(
      (a, b) =>
        parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
    );
}

export function groupBlocksByDay(blocks: ScheduleBlock[]) {
  const groups: { date: Date; label: string; blocks: ScheduleBlock[] }[] = [];
  const today = startOfDay(new Date());

  for (const block of blocks) {
    const date = startOfDay(parseISO(block.startAt));
    const existing = groups.find((g) => isSameDay(g.date, date));
    if (existing) {
      existing.blocks.push(block);
    } else {
      groups.push({
        date,
        label: isSameDay(date, today)
          ? "Today"
          : isSameDay(date, addDays(today, 1))
            ? "Tomorrow"
            : format(date, "EEEE, MMM d"),
        blocks: [block],
      });
    }
  }

  return groups;
}

export function getUpcomingBlocks(blocks: ScheduleBlock[], machineId: string) {
  const now = new Date();
  return getBlocksForMachine(blocks, machineId).filter((b) =>
    isAfter(parseISO(b.endAt), now)
  );
}

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  mechanical: "Mechanical / press issue",
  ink_supply: "Ink or supplies",
  screens: "Screens / artwork setup",
  electrical: "Electrical / power",
  other: "Other",
};
