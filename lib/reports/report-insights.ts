import { startOfDay, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { sumActiveOrdersOpenBalance } from "@/lib/customer-list-summary";
import { resolveOrderFinancialsInContext } from "@/lib/order-financial-context";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { getRunForBlock } from "@/lib/station-runs";

export type ReportInsight = {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive" | "warning" | "critical";
  reportId?: string;
};

export function buildReportInsights(data: ShopReportData): ReportInsight[] {
  const insights: ReportInsight[] = [];
  const today = startOfDay(new Date());

  const openBalance = data.financials
    ? sumActiveOrdersOpenBalance(data.orders, data.financials)
    : data.orders.reduce((sum, order) => sum + (order.balance ?? 0), 0);

  const activeOrders = data.orders.filter(
    (order) => order.status !== "completed" && order.status !== "shipped"
  );

  const pastDue = data.orders.filter((order) => {
    if (order.status === "completed" || order.status === "shipped") return false;
    return parseISO(order.inHandsDate) < today;
  });

  const rushOrders = activeOrders.filter((order) => order.rush);
  const unscheduledBlocks = data.scheduleBlocks.length;
  const runningRuns = data.jobRuns.filter(
    (run) => run.status === "running" || run.status === "paused"
  ).length;
  const finishedRuns = data.jobRuns.filter(
    (run) => run.status === "finished"
  ).length;

  let totalRevenue = 0;
  for (const order of data.orders) {
    const fin = data.financials
      ? resolveOrderFinancialsInContext(order, data.financials)
      : { total: order.total ?? 0 };
    totalRevenue += fin.total;
  }

  const lowStock = data.inventory.filter(
    (item) => item.onHand <= item.reorderAt
  ).length;

  const machineUtilization = data.machines.map((machine) => {
    const blocks = data.scheduleBlocks.filter(
      (block) => block.machineId === machine.id
    );
    return { name: machine.name, blocks: blocks.length };
  });
  const busiestMachine = machineUtilization.sort(
    (a, b) => b.blocks - a.blocks
  )[0];

  insights.push({
    id: "revenue",
    title: "Total revenue",
    value: formatCurrency(totalRevenue),
    detail: `Across ${data.orders.length} orders in your shop data`,
    tone: "positive",
    reportId: "revenue-by-order",
  });

  insights.push({
    id: "open-balance",
    title: "Open balance",
    value: formatCurrency(openBalance),
    detail:
      openBalance > 0
        ? "Outstanding across active orders"
        : "No outstanding balances",
    tone: openBalance > 5000 ? "warning" : "neutral",
    reportId: "customers-open-balances",
  });

  if (pastDue.length > 0) {
    insights.push({
      id: "past-due",
      title: "Past due orders",
      value: String(pastDue.length),
      detail: "Orders past their in-hands date",
      tone: "critical",
      reportId: "past-due-orders",
    });
  }

  if (rushOrders.length > 0) {
    insights.push({
      id: "rush",
      title: "Rush orders",
      value: String(rushOrders.length),
      detail: "Active rush-flagged orders",
      tone: "warning",
      reportId: "rush-orders",
    });
  }

  insights.push({
    id: "floor",
    title: "Floor activity",
    value: `${runningRuns} running`,
    detail: `${finishedRuns} completed runs · ${unscheduledBlocks} scheduled blocks`,
    tone: runningRuns > 0 ? "positive" : "neutral",
    reportId: "floor-job-runs",
  });

  if (busiestMachine && busiestMachine.blocks > 0) {
    insights.push({
      id: "machine",
      title: "Busiest machine",
      value: busiestMachine.name,
      detail: `${busiestMachine.blocks} scheduled blocks`,
      tone: "neutral",
      reportId: "machine-productivity",
    });
  }

  if (data.teamMembers.length > 0) {
    insights.push({
      id: "team",
      title: "Team size",
      value: String(data.teamMembers.length),
      detail: "Active team members in your shop",
      tone: "neutral",
      reportId: "employee-productivity",
    });
  }

  if (lowStock > 0) {
    insights.push({
      id: "inventory",
      title: "Low stock",
      value: String(lowStock),
      detail: "SKUs at or below reorder point",
      tone: "warning",
      reportId: "low-stock",
    });
  }

  const completedOnFloor = data.scheduleBlocks.filter((block) => {
    const run = getRunForBlock(data.jobRuns, block.id);
    return run?.status === "finished";
  }).length;

  if (data.scheduleBlocks.length > 0) {
    const pct = Math.round(
      (completedOnFloor / data.scheduleBlocks.length) * 100
    );
    insights.push({
      id: "schedule-completion",
      title: "Schedule completion",
      value: `${pct}%`,
      detail: `${completedOnFloor} of ${data.scheduleBlocks.length} blocks finished on the floor`,
      tone: pct >= 70 ? "positive" : "neutral",
      reportId: "schedule-detail",
    });
  }

  return insights;
}
