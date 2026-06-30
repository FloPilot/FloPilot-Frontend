import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import type { Order, ScheduleBlock } from "@/types";

const APPROVAL_STATUSES = ["quote_sent", "awaiting_approval"] as const;

export type DashboardTrendPoint = {
  date: Date;
  label: string;
  orders: number;
  revenue: number;
};

export type DashboardKpiSnapshot = {
  pipelineValue: number;
  activeOrders: number;
  dueThisWeek: number;
  revenueInPeriod: number;
  ordersInPeriod: number;
  avgOrderValue: number;
  activeCustomersInPeriod: number;
  orderTrend: DashboardTrendPoint[];
  revenueTrend: number[];
  ordersTrend: number[];
  pipelineTrend: number[];
  dueTrend: number[];
  floorTrend: number[];
  approvalTrend: number[];
  revenueChangePct: number | null;
  ordersChangePct: number | null;
  pipelineChangePct: number | null;
  dueChangePct: number | null;
  floorChangePct: number | null;
  approvalChangePct: number | null;
  avgOrderValueTrend: number[];
  avgOrderValueChangePct: number | null;
  readyToShipTrend: number[];
  readyToShipChangePct: number | null;
};

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function trendPercentChange(values: number[]): number | null {
  if (values.length < 2) return 0;
  const midpoint = Math.floor(values.length / 2);
  const recent = values.slice(midpoint);
  const prior = values.slice(0, midpoint);
  const recentSum = recent.reduce((sum, value) => sum + value, 0);
  const priorSum = prior.reduce((sum, value) => sum + value, 0);
  return percentChange(recentSum, priorSum);
}

function buildDueWorkloadTrend(orders: Order[], days = 14): number[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((day) =>
    orders.filter((order) => {
      if (["shipped", "completed"].includes(order.status)) return false;
      try {
        const due = startOfDay(parseISO(order.inHandsDate));
        return isSameDay(due, day) || due < day;
      } catch {
        return false;
      }
    }).length
  );
}

function buildFloorActivityTrend(
  scheduleBlocks: ScheduleBlock[],
  days = 14
): number[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((day) =>
    scheduleBlocks.filter((block) => {
      try {
        return isSameDay(startOfDay(parseISO(block.startAt)), day);
      } catch {
        return false;
      }
    }).length
  );
}

function buildReadyToShipTrend(orders: Order[], days = 14): number[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((day) =>
    orders.filter((order) => {
      if (order.status !== "ready_to_ship") return false;
      try {
        return startOfDay(parseISO(order.createdAt)) <= day;
      } catch {
        return false;
      }
    }).length
  );
}

function buildApprovalPipelineTrend(orders: Order[], days = 14): number[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((day) =>
    orders.filter((order) => {
      if (
        !APPROVAL_STATUSES.includes(
          order.status as (typeof APPROVAL_STATUSES)[number]
        )
      ) {
        return false;
      }
      try {
        return startOfDay(parseISO(order.createdAt)) <= day;
      } catch {
        return false;
      }
    }).length
  );
}

export function buildDashboardTrends(
  orders: Order[],
  days = 14
): DashboardTrendPoint[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((day) => {
    const dayOrders = orders.filter((order) => {
      try {
        return startOfDay(parseISO(order.createdAt)).getTime() === day.getTime();
      } catch {
        return false;
      }
    });

    return {
      date: day,
      label: format(day, "MMM d"),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, order) => sum + (order.total || 0), 0),
    };
  });
}

export function buildDashboardKpiSnapshot(
  orders: Order[],
  activeOrders: number,
  dueThisWeek: number,
  scheduleBlocks: ScheduleBlock[] = [],
  trendDays = 14
): DashboardKpiSnapshot {
  const now = new Date();
  const today = startOfDay(now);
  const periodStart = subDays(today, trendDays - 1);

  const openOrders = orders.filter(
    (order) => !["shipped", "completed"].includes(order.status)
  );

  const pipelineValue = openOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );

  const revenueInPeriod = orders
    .filter((order) => {
      try {
        const created = startOfDay(parseISO(order.createdAt));
        return created >= periodStart && created <= today;
      } catch {
        return false;
      }
    })
    .reduce((sum, order) => sum + (order.total || 0), 0);

  const periodOrders = orders.filter((order) => {
    try {
      const created = startOfDay(parseISO(order.createdAt));
      return created >= periodStart && created <= today;
    } catch {
      return false;
    }
  });

  const ordersInPeriod = periodOrders.length;
  const avgOrderValue =
    ordersInPeriod > 0 ? revenueInPeriod / ordersInPeriod : 0;
  const activeCustomersInPeriod = new Set(
    periodOrders.map((order) => order.customerId)
  ).size;

  const orderTrend = buildDashboardTrends(orders, trendDays);
  const ordersTrend = orderTrend.map((point) => point.orders);
  const revenueTrend = orderTrend.map((point) => point.revenue);
  const dueTrend = buildDueWorkloadTrend(orders, trendDays);
  const floorTrend = buildFloorActivityTrend(scheduleBlocks, trendDays);
  const approvalTrend = buildApprovalPipelineTrend(orders, trendDays);
  const readyToShipTrend = buildReadyToShipTrend(orders, trendDays);
  const avgOrderValueTrend = orderTrend.map((point) =>
    point.orders > 0 ? point.revenue / point.orders : 0
  );

  const pipelineTrend = orderTrend.map((point) => {
    const dayEnd = point.date;
    return orders
      .filter((order) => {
        try {
          const created = startOfDay(parseISO(order.createdAt));
          return (
            created <= dayEnd &&
            !["shipped", "completed"].includes(order.status)
          );
        } catch {
          return false;
        }
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);
  });

  const midpoint = Math.max(Math.floor(orderTrend.length / 2), 1);
  const recentHalf = orderTrend.slice(-midpoint);
  const priorHalf = orderTrend.slice(0, midpoint);

  const recentOrders = recentHalf.reduce((sum, point) => sum + point.orders, 0);
  const priorOrders = priorHalf.reduce((sum, point) => sum + point.orders, 0);

  const recentRevenue = recentHalf.reduce(
    (sum, point) => sum + point.revenue,
    0
  );
  const priorRevenue = priorHalf.reduce((sum, point) => sum + point.revenue, 0);

  const recentAvgOrderValue =
    recentOrders > 0 ? recentRevenue / recentOrders : 0;
  const priorAvgOrderValue = priorOrders > 0 ? priorRevenue / priorOrders : 0;

  return {
    pipelineValue,
    activeOrders,
    dueThisWeek,
    revenueInPeriod,
    ordersInPeriod,
    avgOrderValue,
    activeCustomersInPeriod,
    orderTrend,
    revenueTrend,
    ordersTrend,
    pipelineTrend,
    dueTrend,
    floorTrend,
    approvalTrend,
    revenueChangePct: percentChange(recentRevenue, priorRevenue),
    ordersChangePct: percentChange(recentOrders, priorOrders),
    pipelineChangePct: trendPercentChange(pipelineTrend),
    dueChangePct: trendPercentChange(dueTrend),
    floorChangePct: trendPercentChange(floorTrend),
    approvalChangePct: trendPercentChange(approvalTrend),
    avgOrderValueTrend,
    avgOrderValueChangePct: percentChange(
      recentAvgOrderValue,
      priorAvgOrderValue
    ),
    readyToShipTrend,
    readyToShipChangePct: trendPercentChange(readyToShipTrend),
  };
}

export function buildSparklinePath(
  values: number[],
  width: number,
  height: number
): string {
  return buildSparklinePaths(values, width, height).line;
}

export function buildSparklinePaths(
  values: number[],
  width: number,
  height: number
): { line: string; area: string } {
  if (values.length === 0) {
    return { line: "", area: "" };
  }

  if (values.every((value) => value === 0)) {
    const y = (height / 2).toFixed(1);
    const line = `M 0,${y} L ${width.toFixed(1)},${y}`;
    return { line, area: "" };
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const padding = 2;
  const chartHeight = height - padding * 2;
  const baseline = height - padding;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  const line = `M ${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ")}`;
  const area = `${line} L ${width.toFixed(1)},${baseline.toFixed(1)} L 0,${baseline.toFixed(1)} Z`;

  return { line, area };
}

export function buildAreaPath(
  values: number[],
  width: number,
  height: number
): { line: string; area: string } {
  if (values.length === 0) {
    return { line: "", area: "" };
  }

  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const padding = 8;
  const chartHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  const line = `M ${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ")}`;
  const area = `${line} L ${width.toFixed(1)},${(height - padding).toFixed(1)} L 0,${(height - padding).toFixed(1)} Z`;

  return { line, area };
}

export function sumOrdersDueThisWeek(orders: Order[]): number {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  return orders.filter((order) => {
    if (["shipped", "completed"].includes(order.status)) return false;
    try {
      const due = startOfDay(parseISO(order.inHandsDate));
      return isWithinInterval(due, { start: today, end: weekEnd });
    } catch {
      return false;
    }
  }).length;
}
