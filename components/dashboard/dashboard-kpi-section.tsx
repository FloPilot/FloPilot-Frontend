"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Cog,
  DollarSign,
  FileCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
} from "lucide-react";
import { DashboardSparkline } from "@/components/dashboard/dashboard-sparkline";
import type { DashboardLiveStats } from "@/lib/dashboard-insights";
import type { DashboardKpiSnapshot } from "@/lib/dashboard-charts";
import {
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type IconTone =
  | "slate"
  | "blue"
  | "violet"
  | "emerald"
  | "sky"
  | "amber"
  | "orange"
  | "rose"
  | "green";

const iconToneClass: Record<IconTone, string> = {
  slate: "bg-[#f1f1f1] text-[#616161]",
  blue: "bg-[#ebf4ff] text-[#2c6ecb]",
  violet: "bg-[#f3f0ff] text-[#6d5bd0]",
  emerald: "bg-[#e3f1df] text-[#108043]",
  sky: "bg-[#e8f4fd] text-[#008060]",
  amber: "bg-[#fff5ea] text-[#b98900]",
  orange: "bg-[#fff1e3] text-[#c05717]",
  rose: "bg-[#fcebec] text-[#d82c0d]",
  green: "bg-[#e3f1df] text-[#108043]",
};

function TrendPill({
  value,
  invert = false,
}: {
  value: number | null;
  invert?: boolean;
}) {
  const normalized = value ?? 0;

  if (normalized === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-sm bg-[#f1f1f1] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#616161]">
        <ArrowRight className="size-3" strokeWidth={2.5} />
        0%
      </span>
    );
  }

  const increased = normalized > 0;
  const favorable = invert ? !increased : increased;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        favorable
          ? "bg-[#e3f1df] text-[#108043]"
          : "bg-[#f1f1f1] text-[#616161]"
      )}
    >
      {increased ? (
        <ArrowUpRight className="size-3" strokeWidth={2.5} />
      ) : (
        <ArrowDownRight className="size-3" strokeWidth={2.5} />
      )}
      {Math.abs(normalized)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone,
  trend,
  invertTrend = false,
  sparkline,
  badge,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: IconTone;
  trend?: number | null;
  invertTrend?: boolean;
  sparkline?: number[];
  badge?: string;
}) {
  const sparklineValues =
    sparkline && sparkline.length > 0
      ? sparkline
      : Array.from({ length: 14 }, () => 0);

  return (
    <Link href={href} className={cn(dashboardKpiCardClass, "group block")}>
      <div
        className="pointer-events-none absolute right-3 top-3 flex w-14 flex-col items-end gap-0.5"
        aria-hidden
      >
        <div className="flex h-5 items-center justify-end">
          <TrendPill value={trend ?? 0} invert={invertTrend} />
        </div>
        <div className="flex h-4 items-end justify-end">
          <DashboardSparkline values={sparklineValues} width={52} height={16} />
        </div>
      </div>

      <div className="relative pr-16">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconToneClass[tone]
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
          </div>
          <p className={dashboardKpiTitleClass}>{label}</p>
          {badge ? (
            <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              {badge}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            dashboardValueClass,
            "mt-2.5 group-hover:text-brand-primary"
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-[#616161]">{detail}</p>
      </div>
    </Link>
  );
}

export function DashboardKpiSection({
  stats,
  snapshot,
  periodLabel,
}: {
  stats: DashboardLiveStats;
  snapshot: DashboardKpiSnapshot;
  periodLabel: string;
}) {
  const dueUrgent = stats.dueToday + stats.overdue;
  const floorTotal = stats.runningNow + stats.inProductionOrders;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Revenue"
        value={formatCompactCurrency(snapshot.revenueInPeriod)}
        detail={`${periodLabel} · vs prior period`}
        href="/app/reports"
        icon={DollarSign}
        tone="emerald"
        trend={snapshot.revenueChangePct}
        sparkline={snapshot.revenueTrend}
      />
      <KpiCard
        label="Orders"
        value={formatCompactNumber(snapshot.ordersInPeriod)}
        detail={
          snapshot.ordersInPeriod > 0
            ? `${periodLabel} · ${snapshot.activeCustomersInPeriod} customer${snapshot.activeCustomersInPeriod !== 1 ? "s" : ""} · ${stats.activeOrders} active`
            : `No orders in ${periodLabel.toLowerCase()}`
        }
        href="/app/orders"
        icon={ShoppingCart}
        tone="blue"
        trend={snapshot.ordersChangePct}
        sparkline={snapshot.ordersTrend}
      />
      <KpiCard
        label="Pipeline value"
        value={formatCompactCurrency(snapshot.pipelineValue)}
        detail={`${stats.openPipeline} open quote${stats.openPipeline !== 1 ? "s" : ""} & orders`}
        href="/app/orders"
        icon={Target}
        tone="violet"
        trend={snapshot.pipelineChangePct}
        sparkline={snapshot.pipelineTrend}
      />
      <KpiCard
        label="Avg order value"
        value={
          snapshot.avgOrderValue > 0
            ? formatCurrency(snapshot.avgOrderValue)
            : "$0"
        }
        detail={
          snapshot.ordersInPeriod > 0
            ? `Across ${snapshot.ordersInPeriod} order${snapshot.ordersInPeriod !== 1 ? "s" : ""}`
            : "No orders in selected period"
        }
        href="/app/reports"
        icon={TrendingUp}
        tone="sky"
        trend={snapshot.avgOrderValueChangePct}
        sparkline={snapshot.avgOrderValueTrend}
      />
      <KpiCard
        label="Due · overdue"
        value={formatCompactNumber(dueUrgent)}
        detail={
          stats.overdue > 0
            ? `${stats.dueToday} due today · ${stats.overdue} overdue`
            : stats.dueToday > 0
              ? `${stats.dueToday} due today`
              : "All orders on schedule"
        }
        href="/app/orders"
        icon={Clock3}
        tone={stats.overdue > 0 ? "rose" : "amber"}
        trend={snapshot.dueChangePct}
        invertTrend
        sparkline={snapshot.dueTrend}
      />
      <KpiCard
        label="On the floor"
        value={formatCompactNumber(floorTotal)}
        detail={
          stats.runningNow > 0
            ? `${stats.runningNow} running · ${stats.scheduledToday} scheduled today`
            : stats.scheduledToday > 0
              ? `${stats.scheduledToday} scheduled today`
              : "Nothing on the floor right now"
        }
        href="/app/calendar"
        icon={Cog}
        tone="orange"
        trend={snapshot.floorChangePct}
        sparkline={snapshot.floorTrend}
      />
      <KpiCard
        label="Awaiting approval"
        value={formatCompactNumber(stats.awaitingApproval)}
        detail={
          stats.staleAwaitingApproval > 0
            ? `${stats.staleAwaitingApproval} waiting 48h+ · follow up`
            : stats.awaitingApproval > 0
              ? "Quotes & approvals pending"
              : "No pending approvals"
        }
        href="/app/orders"
        icon={FileCheck}
        tone="amber"
        trend={snapshot.approvalChangePct}
        invertTrend
        sparkline={snapshot.approvalTrend}
        badge={stats.staleAwaitingApproval > 0 ? "Follow up" : undefined}
      />
      <KpiCard
        label="Ready to ship"
        value={formatCompactNumber(stats.readyToShip)}
        detail={
          stats.readyToShip > 0
            ? "Packed and ready for delivery"
            : stats.rushOrders > 0
              ? `${stats.rushOrders} rush order${stats.rushOrders !== 1 ? "s" : ""} in progress`
              : "No orders ready to ship"
        }
        href="/app/orders"
        icon={Truck}
        tone="green"
        trend={snapshot.readyToShipChangePct}
        sparkline={snapshot.readyToShipTrend}
      />
    </section>
  );
}
