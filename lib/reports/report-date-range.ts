import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

export type ReportDatePreset =
  | "all_time"
  | "last_7_days"
  | "last_30_days"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export type ReportDateRange = {
  preset: ReportDatePreset;
  start: string | null;
  end: string | null;
};

export const REPORT_DATE_PRESETS: {
  value: ReportDatePreset;
  label: string;
}[] = [
  { value: "all_time", label: "All time" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

export function defaultReportDateRange(): ReportDateRange {
  return { preset: "all_time", start: null, end: null };
}

export function resolveReportDateRange(range: ReportDateRange): {
  start: Date | null;
  end: Date | null;
} {
  const now = new Date();

  switch (range.preset) {
    case "all_time":
      return { start: null, end: null };
    case "last_7_days":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "last_30_days":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "this_week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case "custom":
      return {
        start: range.start ? startOfDay(parseISO(range.start)) : null,
        end: range.end ? endOfDay(parseISO(range.end)) : null,
      };
    default:
      return { start: null, end: null };
  }
}

export function formatReportDateRangeLabel(range: ReportDateRange): string {
  const { start, end } = resolveReportDateRange(range);
  if (!start || !end) {
    return REPORT_DATE_PRESETS.find((entry) => entry.value === range.preset)
      ?.label ?? "All time";
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function isDateInReportRange(
  value: string | undefined | null,
  range: ReportDateRange
): boolean {
  if (!value) return true;
  const { start, end } = resolveReportDateRange(range);
  if (!start || !end) return true;

  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return true;

  return isWithinInterval(date, { start, end });
}
