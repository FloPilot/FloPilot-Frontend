"use client";

import {
  Activity,
  Award,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import type { ProductionDashboardMetrics } from "@/lib/dashboard-production";
import {
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const KPI_STYLE = {
  active: {
    icon: Activity,
    surface: "bg-[#f0f5ff]",
    border: "border-[#c5d9f8]",
    iconWrap: "bg-[#ebf4ff]",
    iconColor: "text-[#2c6ecb]",
    label: "Active orders",
    hint: "In production or on the calendar",
  },
  completed: {
    icon: Award,
    surface: "bg-[#f1f8f0]",
    border: "border-[#b8ddb0]",
    iconWrap: "bg-[#e3f1df]",
    iconColor: "text-[#108043]",
    label: "Completed orders",
    hint: "Shipped or done this month",
  },
  turnaround: {
    icon: Clock3,
    surface: "bg-[#f6f6f7]",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#616161]",
    label: "Avg turnaround",
    hint: "Order received to complete",
  },
  onTime: {
    icon: CheckCircle2,
    surface: "bg-[#f1f8f0]",
    border: "border-[#b8ddb0]",
    iconWrap: "bg-[#e3f1df]",
    iconColor: "text-[#108043]",
    label: "On-time rate",
    hint: "Completed by in-hands date",
  },
} as const;

function ProductionKpiCard({
  styleKey,
  value,
  hint,
}: {
  styleKey: keyof typeof KPI_STYLE;
  value: string;
  hint?: string;
}) {
  const style = KPI_STYLE[styleKey];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        dashboardKpiCardClass,
        "min-h-[128px] border",
        style.surface,
        style.border
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            style.iconWrap
          )}
        >
          <Icon className={cn("size-3.5", style.iconColor)} strokeWidth={1.75} />
        </div>
        <p className={dashboardKpiTitleClass}>{style.label}</p>
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5")}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">
        {hint ?? style.hint}
      </p>
    </div>
  );
}

export function DashboardProductionKpiRow({
  metrics,
}: {
  metrics: ProductionDashboardMetrics;
}) {
  const turnaround =
    metrics.avgTurnaroundDays === null
      ? "—"
      : `${metrics.avgTurnaroundDays.toFixed(1)} days`;

  const onTime =
    metrics.onTimeRatePct === null ? "—" : `${metrics.onTimeRatePct}%`;

  const activeHint =
    metrics.runningNow > 0
      ? `${metrics.upcomingEvents} event${metrics.upcomingEvents !== 1 ? "s" : ""} on calendar · ${metrics.runningNow} running`
      : metrics.upcomingEvents > 0
        ? `${metrics.upcomingEvents} production event${metrics.upcomingEvents !== 1 ? "s" : ""} on the calendar`
        : metrics.scheduledToday > 0
          ? `${metrics.scheduledToday} event${metrics.scheduledToday !== 1 ? "s" : ""} scheduled today`
          : KPI_STYLE.active.hint;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ProductionKpiCard
        styleKey="active"
        value={String(metrics.activeOrders)}
        hint={activeHint}
      />
      <ProductionKpiCard
        styleKey="completed"
        value={String(metrics.completedThisMonth)}
      />
      <ProductionKpiCard styleKey="turnaround" value={turnaround} />
      <ProductionKpiCard styleKey="onTime" value={onTime} />
    </div>
  );
}
