import type { Customer, Machine, Order, ScheduleBlock, StationJobRun } from "@/types";
import { excludeArchivedOrders } from "@/lib/order-archive";

export type DashboardDateRangeKey =
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "year"
  | "last_year";

export type DashboardDateRange = {
  key: DashboardDateRangeKey;
  label: string;
  trendDays: number;
};

export const DASHBOARD_DATE_RANGES: DashboardDateRange[] = [
  { key: "7d", label: "Last 7 days", trendDays: 7 },
  { key: "14d", label: "Last 14 days", trendDays: 14 },
  { key: "30d", label: "Last 30 days", trendDays: 30 },
  { key: "90d", label: "Last 90 days", trendDays: 90 },
  { key: "year", label: "This year", trendDays: 365 },
  { key: "last_year", label: "Last year", trendDays: 365 },
];

export type DashboardOptionalFilterKey = "customer";

export type DashboardFilters = {
  dateRangeKey: DashboardDateRangeKey;
  machineId: string | null;
  customerId: string | null;
  activeOptionalFilters: DashboardOptionalFilterKey[];
};

export const DASHBOARD_OPTIONAL_FILTERS: {
  key: DashboardOptionalFilterKey;
  label: string;
}[] = [{ key: "customer", label: "Customer" }];

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  dateRangeKey: "14d",
  machineId: null,
  customerId: null,
  activeOptionalFilters: [],
};

export function getDashboardDateRange(
  key: DashboardDateRangeKey
): DashboardDateRange {
  return (
    DASHBOARD_DATE_RANGES.find((range) => range.key === key) ??
    DASHBOARD_DATE_RANGES[1]
  );
}

export function applyDashboardFilters({
  orders,
  scheduleBlocks,
  jobRuns,
  filters,
}: {
  orders: Order[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  filters: DashboardFilters;
}) {
  let filteredOrders = orders;
  let filteredBlocks = scheduleBlocks;

  if (filters.customerId) {
    filteredOrders = filteredOrders.filter(
      (order) => order.customerId === filters.customerId
    );
    const orderIds = new Set(filteredOrders.map((order) => order.id));
    filteredBlocks = filteredBlocks.filter((block) =>
      orderIds.has(block.orderId)
    );
  }

  if (filters.machineId) {
    filteredBlocks = filteredBlocks.filter(
      (block) => block.machineId === filters.machineId
    );
    const orderIdsFromBlocks = new Set(
      filteredBlocks.map((block) => block.orderId)
    );
    const blockById = new Map(scheduleBlocks.map((block) => [block.id, block]));
    const orderIdsFromRuns = new Set(
      jobRuns
        .filter((run) => run.machineId === filters.machineId)
        .map((run) => blockById.get(run.scheduleBlockId)?.orderId)
        .filter((orderId): orderId is string => Boolean(orderId))
    );
    const relevantOrderIds = new Set([
      ...orderIdsFromBlocks,
      ...orderIdsFromRuns,
    ]);
    filteredOrders = filteredOrders.filter((order) =>
      relevantOrderIds.has(order.id)
    );
  }

  const filteredJobRuns = filters.machineId
    ? jobRuns.filter((run) => run.machineId === filters.machineId)
    : jobRuns;

  return {
    orders: excludeArchivedOrders(filteredOrders),
    scheduleBlocks: filteredBlocks,
    jobRuns: filteredJobRuns,
  };
}

export function buildDashboardCustomerOptions(
  orders: Order[],
  customers: Customer[]
) {
  const counts = new Map<string, number>();
  for (const order of excludeArchivedOrders(orders)) {
    counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
  }

  return customers
    .filter((customer) => counts.has(customer.id))
    .map((customer) => ({
      id: customer.id,
      label: customer.company,
      orderCount: counts.get(customer.id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildDashboardMachineOptions(machines: Machine[]) {
  return machines
    .filter((machine) => machine.active)
    .map((machine) => ({
      id: machine.id,
      label: machine.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function hasActiveDashboardFilters(filters: DashboardFilters) {
  return Boolean(
    filters.machineId ||
      filters.customerId ||
      filters.activeOptionalFilters.length > 0
  );
}

export function getAvailableOptionalFilters(
  filters: DashboardFilters
): DashboardOptionalFilterKey[] {
  return DASHBOARD_OPTIONAL_FILTERS.map((filter) => filter.key).filter(
    (key) => !filters.activeOptionalFilters.includes(key)
  );
}
