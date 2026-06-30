"use client";

import { useId, useMemo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { buildAreaPath } from "@/lib/dashboard-charts";
import type { DashboardTrendPoint } from "@/lib/dashboard-charts";
import {
  dashboardValueClass,
  SHOPIFY_CHART_BLUE,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function ChartTrendBadge({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;

  const positive = value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        positive ? "text-[#108043]" : "text-[#616161]"
      )}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
      ) : (
        <ArrowDownRight className="size-3.5" strokeWidth={2.25} />
      )}
      {Math.abs(value)}%
    </span>
  );
}

export function DashboardAreaChart({
  points,
  valueKey,
  formatValue,
  height = 180,
  changePct,
}: {
  points: DashboardTrendPoint[];
  valueKey: "orders" | "revenue";
  formatValue: (value: number) => string;
  height?: number;
  changePct?: number | null;
}) {
  const gradientId = useId().replace(/:/g, "");
  const width = 560;
  const values = points.map((point) => point[valueKey]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...values, 0);

  const { line, area } = useMemo(
    () => buildAreaPath(values, width, height),
    [values, height]
  );

  const yAxisLabels = useMemo(() => {
    if (peak === 0) return [0];
    const mid = peak / 2;
    return [peak, mid, 0];
  }, [peak]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-baseline gap-2">
        <p className={dashboardValueClass}>{formatValue(total)}</p>
        {changePct !== undefined && <ChartTrendBadge value={changePct} />}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SHOPIFY_CHART_BLUE} stopOpacity="0.2" />
              <stop
                offset="100%"
                stopColor={SHOPIFY_CHART_BLUE}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {yAxisLabels.map((label, index) => {
            const y =
              8 +
              ((height - 16) / Math.max(yAxisLabels.length - 1, 1)) * index;
            return (
              <line
                key={label}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                stroke="#ebebeb"
                strokeWidth="1"
              />
            );
          })}

          {area && (
            <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          )}
          {line && (
            <path
              d={line}
              fill="none"
              stroke={SHOPIFY_CHART_BLUE}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <div className="mt-2.5 flex justify-between text-[11px] text-[#616161]">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
