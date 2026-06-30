"use client";

import { useId, useMemo } from "react";
import { buildSparklinePaths } from "@/lib/dashboard-charts";
import {
  SHOPIFY_CHART_BLUE,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function DashboardSparkline({
  values,
  width = 96,
  height = 36,
  className,
  fullWidth = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  fullWidth?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const { line, area } = useMemo(
    () => buildSparklinePaths(values, width, height),
    [values, width, height]
  );

  if (!line) return null;

  const compact = height <= 18;

  return (
    <svg
      width={fullWidth ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fullWidth ? "none" : undefined}
      className={cn(fullWidth ? "w-full" : "shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SHOPIFY_CHART_BLUE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={SHOPIFY_CHART_BLUE} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradientId})`} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={SHOPIFY_CHART_BLUE}
        strokeWidth={compact ? 1.25 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
