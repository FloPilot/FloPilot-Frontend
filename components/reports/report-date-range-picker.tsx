"use client";

import type { ReportDateRange } from "@/lib/reports/report-date-range";
import {
  formatReportDateRangeLabel,
  REPORT_DATE_PRESETS,
} from "@/lib/reports/report-date-range";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function ReportDateRangePicker({
  value,
  onChange,
  className,
}: {
  value: ReportDateRange;
  onChange: (next: ReportDateRange) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={value.preset}
        onValueChange={(preset) =>
          onChange({
            preset: preset as ReportDateRange["preset"],
            start: preset === "custom" ? value.start : null,
            end: preset === "custom" ? value.end : null,
          })
        }
      >
        <SelectTrigger className={cn(dashboardControlClass, "h-9 w-[160px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPORT_DATE_PRESETS.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "custom" && (
        <>
          <Input
            type="date"
            value={value.start ?? ""}
            onChange={(event) =>
              onChange({ ...value, start: event.target.value || null })
            }
            className="h-9 w-[140px] border-[#e3e3e3] bg-white"
          />
          <span className="text-xs text-[#616161]">to</span>
          <Input
            type="date"
            value={value.end ?? ""}
            onChange={(event) =>
              onChange({ ...value, end: event.target.value || null })
            }
            className="h-9 w-[140px] border-[#e3e3e3] bg-white"
          />
        </>
      )}

      {value.preset !== "all_time" && (
        <span className="hidden text-xs text-[#616161] sm:inline">
          {formatReportDateRangeLabel(value)}
        </span>
      )}
    </div>
  );
}
