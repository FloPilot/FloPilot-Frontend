"use client";

import type { ReportInsight } from "@/lib/reports/report-insights";
import { cn } from "@/lib/utils";
import { dashboardCardClass, dashboardKpiTitleClass } from "@/lib/dashboard-styles";

const TONE_STYLES: Record<
  ReportInsight["tone"],
  { wrap: string; value: string }
> = {
  neutral: {
    wrap: "border-[#e3e3e3] bg-white",
    value: "text-[#303030]",
  },
  positive: {
    wrap: "border-[#86d4a8] bg-[#fafffe]",
    value: "text-[#0d5c2e]",
  },
  warning: {
    wrap: "border-[#f0d9a8] bg-[#fff8eb]",
    value: "text-[#8a6116]",
  },
  critical: {
    wrap: "border-[#f5b5b5] bg-[#fff1f1]",
    value: "text-[#8f1f1f]",
  },
};

export function ReportInsightsRow({
  insights,
  onSelect,
}: {
  insights: ReportInsight[];
  onSelect?: (insight: ReportInsight) => void;
}) {
  if (insights.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {insights.slice(0, 8).map((insight) => {
        const tone = TONE_STYLES[insight.tone];
        const clickable = Boolean(onSelect && insight.reportId);

        return (
          <button
            key={insight.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onSelect?.(insight)}
            className={cn(
              dashboardCardClass,
              "p-4 text-left transition-colors",
              tone.wrap,
              clickable && "hover:border-[#c4d7f2] cursor-pointer",
              !clickable && "cursor-default"
            )}
          >
            <p className={dashboardKpiTitleClass}>{insight.title}</p>
            <p className={cn("mt-2 text-xl font-semibold tabular-nums", tone.value)}>
              {insight.value}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-[#616161]">
              {insight.detail}
            </p>
          </button>
        );
      })}
    </div>
  );
}
