import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileImage,
  Palette,
  PlayCircle,
} from "lucide-react";
import type { OrderHealthMetrics, HealthStatus } from "@/lib/order-health";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  HealthStatus,
  { dot: string; bg: string; text: string }
> = {
  good: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-200/80",
    text: "text-emerald-900",
  },
  warning: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 border-amber-200/80",
    text: "text-amber-950",
  },
  critical: {
    dot: "bg-red-500",
    bg: "bg-red-50 border-red-200/80",
    text: "text-red-950",
  },
  neutral: {
    dot: "bg-slate-400",
    bg: "bg-muted/40 border-border",
    text: "text-muted-foreground",
  },
};

const METRIC_ICONS = {
  artwork: Palette,
  production: CheckCircle2,
  schedule: Calendar,
  currentJob: PlayCircle,
  payment: CreditCard,
  shipDate: Clock,
} as const;

const CURRENT_JOB_IN_PROGRESS_STYLES = {
  dot: "bg-amber-500",
  bg: "bg-amber-50 border-amber-300/90 ring-1 ring-amber-200/60",
  text: "text-amber-950",
};

const CURRENT_JOB_COMPLETE_STYLES = {
  dot: "bg-emerald-500",
  bg: "bg-emerald-50 border-emerald-300/90 ring-1 ring-emerald-200/60",
  text: "text-emerald-900",
};

function HealthCell({
  metricKey,
  metric,
}: {
  metricKey: keyof OrderHealthMetrics;
  metric: OrderHealthMetrics[keyof OrderHealthMetrics];
}) {
  const styles =
    metricKey === "currentJob" && metric.status === "good"
      ? CURRENT_JOB_COMPLETE_STYLES
      : metricKey === "currentJob" && metric.status === "warning"
        ? CURRENT_JOB_IN_PROGRESS_STYLES
        : STATUS_STYLES[metric.status];
  const Icon = METRIC_ICONS[metricKey];

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5 min-w-0",
        styles.bg
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("size-3.5 shrink-0", styles.text)} />
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", styles.text)}>
          {metric.label}
        </span>
        <span className={cn("size-1.5 rounded-full ml-auto shrink-0", styles.dot)} />
      </div>
      <p className={cn("text-sm font-semibold truncate", styles.text)}>
        {metric.value}
      </p>
      {metric.detail && (
        <p className={cn("text-[11px] mt-0.5 truncate opacity-80", styles.text)}>
          {metric.detail}
        </p>
      )}
    </div>
  );
}

export function OrderHealthStrip({ health }: { health: OrderHealthMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {(Object.keys(health) as (keyof OrderHealthMetrics)[]).map((key) => (
        <HealthCell key={key} metricKey={key} metric={health[key]} />
      ))}
    </div>
  );
}

export function OrderDueBanner({
  label,
  status,
  inHandsFormatted,
}: {
  label: string;
  status: HealthStatus;
  inHandsFormatted: string;
}) {
  if (status === "good") return null;

  const styles = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 mb-6",
        styles.bg
      )}
    >
      <FileImage className={cn("size-4 shrink-0", styles.text)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", styles.text)}>{label}</p>
        <p className={cn("text-xs opacity-80", styles.text)}>
          In-hands {inHandsFormatted}
        </p>
      </div>
    </div>
  );
}
