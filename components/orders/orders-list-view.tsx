"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  Download,
  Palette,
  PlayCircle,
  X,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { NewOrderButton } from "@/components/providers/new-order-provider";
import { Button } from "@/components/ui/button";
import {
  filterOrdersWithAdvanced,
  OrderFilterBuilder,
} from "@/components/orders/order-filter-builder";
import { OrdersListViewConfig } from "@/components/orders/orders-list-view-config";
import { OrdersListTable } from "@/components/orders/orders-list-table";
import type { OrderAdvancedFilter } from "@/lib/order-advanced-filters";
import {
  filterOrdersList,
  JOB_TYPE_FILTER_TABS,
  SCOPE_TABS,
  sortOrdersList,
  type OrderJobTypeFilter,
  type OrderListScope,
} from "@/lib/order-list-filters";
import { buildOrderFinancialsMap } from "@/lib/order-financial-context";
import {
  buildOrderListSummaries,
  computeOrdersListKpis,
  filterOrdersByQuickFilter,
  type OrderQuickFilter,
} from "@/lib/order-list-summary";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { downloadReportCsv } from "@/lib/reports/csv";
import { buildOrdersListExport } from "@/lib/reports/order-list-export";
import {
  DEFAULT_ORDERS_LIST_COLUMNS,
  resolveOrdersListColumnsForScope,
  type OrdersListColumnId,
} from "@/lib/order-list-columns";
import { cn } from "@/lib/utils";

const QUICK_FILTERS: {
  value: OrderQuickFilter;
  label: string;
  kpiKey?: keyof ReturnType<typeof computeOrdersListKpis>;
}[] = [
  { value: "all", label: "All orders" },
  { value: "needs_art", label: "Needs art", kpiKey: "needsArt" },
  { value: "needs_schedule", label: "Ready for scheduling", kpiKey: "needsSchedule" },
  { value: "on_floor", label: "On floor", kpiKey: "onFloor" },
  { value: "blocked", label: "Blocked", kpiKey: "blocked" },
];

const KPI_CONFIG: {
  key: keyof ReturnType<typeof computeOrdersListKpis>;
  label: string;
  hint: string;
  icon: LucideIcon;
  surface: string;
  border: string;
  iconWrap: string;
  iconColor: string;
  valueColor: string;
}[] = [
  {
    key: "total",
    label: "Showing",
    hint: "Orders in your current view",
    icon: Calendar,
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  },
  {
    key: "needsArt",
    label: "Needs art",
    hint: "Proofs not approved yet",
    icon: Palette,
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  },
  {
    key: "needsSchedule",
    label: "Ready for scheduling",
    hint: "Ready but not on the calendar",
    icon: Calendar,
    surface: "bg-[#f4f7fd]",
    border: "border-[#c4d7f2]",
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#2c6ecb]",
  },
  {
    key: "onFloor",
    label: "On floor",
    hint: "Running on a machine right now",
    icon: PlayCircle,
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
  {
    key: "blocked",
    label: "Blocked",
    hint: "Stopped — needs a decision",
    icon: AlertTriangle,
    surface: "bg-[#fff1f1]",
    border: "border-[#f5b5b5]",
    iconWrap: "bg-[#fde2e2]",
    iconColor: "text-[#8f1f1f]",
    valueColor: "text-[#8f1f1f]",
  },
];

export function OrdersListView() {
  const searchParams = useSearchParams();
  const { settings } = useShopSettings();
  const { orders, customers, scheduleBlocks, jobRuns, shopDataLoading, getCustomerById } =
    useSchedule();
  const initialScope = searchParams.get("scope");
  const [scope, setScope] = useState<OrderListScope>(() => {
    if (
      initialScope === "active" ||
      initialScope === "historical" ||
      initialScope === "archived" ||
      initialScope === "all"
    ) {
      return initialScope;
    }
    return "active";
  });
  const [quickFilter, setQuickFilter] = useState<OrderQuickFilter>("all");
  const [advancedFilters, setAdvancedFilters] = useState<OrderAdvancedFilter[]>(
    []
  );
  const [jobType, setJobType] = useState<OrderJobTypeFilter>("all");
  const [visibleColumns, setVisibleColumns] = useState<OrdersListColumnId[]>(
    DEFAULT_ORDERS_LIST_COLUMNS
  );
  const [columnLabels, setColumnLabels] = useState<
    Partial<Record<OrdersListColumnId, string>>
  >({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const tableColumns = useMemo(
    () => resolveOrdersListColumnsForScope(visibleColumns, scope),
    [visibleColumns, scope]
  );

  useEffect(() => {
    if (
      initialScope === "active" ||
      initialScope === "historical" ||
      initialScope === "archived" ||
      initialScope === "all"
    ) {
      setScope(initialScope);
    }
  }, [initialScope]);

  const scopedOrders = useMemo(() => {
    const scoped = filterOrdersList(orders, { scope, jobType });
    return sortOrdersList(
      filterOrdersWithAdvanced(scoped, advancedFilters),
      scope
    );
  }, [orders, scope, jobType, advancedFilters]);

  const summaries = useMemo(
    () => buildOrderListSummaries(scopedOrders, scheduleBlocks, jobRuns),
    [scopedOrders, scheduleBlocks, jobRuns]
  );

  const filteredOrders = useMemo(
    () => filterOrdersByQuickFilter(scopedOrders, summaries, quickFilter),
    [scopedOrders, summaries, quickFilter]
  );

  const kpis = useMemo(
    () => computeOrdersListKpis(scopedOrders, summaries),
    [scopedOrders, summaries]
  );

  const hasExtraFilters = advancedFilters.length > 0 || jobType !== "all";

  const orderFinancialContext = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      getCustomer: getCustomerById,
    }),
    [settings.taxRate, settings.pricingMatrix, getCustomerById]
  );

  const orderFinancials = useMemo(
    () => buildOrderFinancialsMap(filteredOrders, orderFinancialContext),
    [filteredOrders, orderFinancialContext]
  );

  const handleExport = () => {
    downloadReportCsv(
      buildOrdersListExport(filteredOrders, {
        scope,
        jobType,
        hasAdvancedFilters: advancedFilters.length > 0,
        orderFinancials,
      })
    );
  };

  const attentionCount =
    kpis.needsArt + kpis.needsSchedule + kpis.blocked;

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Orders</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            {scope === "historical"
              ? "Past orders and what was shipped"
              : scope === "archived"
                ? "Archived orders — hidden from active work but still searchable here"
                : attentionCount > 0
                ? `${attentionCount} order${attentionCount !== 1 ? "s" : ""} need attention — art, scheduling, or a blocker`
                : "Every active order at a glance — proofs, ink, screens, blanks, schedule, and floor status"}
          </p>
        </div>
        <NewOrderButton label="New order" className={dashboardPrimaryButtonClass} />
      </div>

      {scope !== "historical" && scope !== "archived" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {KPI_CONFIG.map((config) => {
            const Icon = config.icon;
            const value = kpis[config.key];

            return (
              <button
                key={config.key}
                type="button"
                onClick={() => {
                  if (config.key === "total") {
                    setQuickFilter("all");
                    return;
                  }
                  const filter = QUICK_FILTERS.find(
                    (item) => item.kpiKey === config.key
                  );
                  if (filter) {
                    setQuickFilter((current) =>
                      current === filter.value ? "all" : filter.value
                    );
                  }
                }}
                className={cn(
                  dashboardKpiCardClass,
                  "min-h-[128px] border text-left",
                  config.surface,
                  config.border,
                  config.key !== "total" &&
                    quickFilter ===
                      QUICK_FILTERS.find((item) => item.kpiKey === config.key)
                        ?.value &&
                    "ring-2 ring-[#2c6ecb]/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      config.iconWrap
                    )}
                  >
                    <Icon
                      className={cn("size-3.5", config.iconColor)}
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className={dashboardKpiTitleClass}>{config.label}</p>
                </div>
                <p className={cn(dashboardValueClass, "mt-2.5", config.valueColor)}>
                  {value}
                </p>
                <p className="mt-1.5 text-xs leading-snug text-[#616161]">
                  {config.hint}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#303030]">
              Order list
            </h2>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              {filteredOrders.length} result
              {filteredOrders.length !== 1 ? "s" : ""}
              {quickFilter !== "all"
                ? ` · ${QUICK_FILTERS.find((item) => item.value === quickFilter)?.label}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrdersListViewConfig
              columns={visibleColumns}
              onColumnsChange={setVisibleColumns}
              columnLabels={columnLabels}
              onColumnLabelsChange={setColumnLabels}
              activeViewId={activeViewId}
              onActiveViewChange={setActiveViewId}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(dashboardControlClass, "h-9")}
              disabled={filteredOrders.length === 0}
              onClick={handleExport}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="space-y-0 p-4 sm:p-5">
          <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
            <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
              <div className="flex rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
                {SCOPE_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setScope(tab.value);
                      setQuickFilter("all");
                    }}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                      scope === tab.value
                        ? "bg-white text-[#303030] shadow-sm"
                        : "text-[#616161] hover:text-[#303030]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {scope !== "historical" && scope !== "archived" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_FILTERS.slice(1).map((tab) => (
                    <FilterChip
                      key={tab.value}
                      active={quickFilter === tab.value}
                      onClick={() =>
                        setQuickFilter((current) =>
                          current === tab.value ? "all" : tab.value
                        )
                      }
                    >
                      {tab.label}
                    </FilterChip>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-start gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
              <span className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Filters
              </span>
              <OrderFilterBuilder
                customers={customers}
                filters={advancedFilters}
                onChange={setAdvancedFilters}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Job type
                </span>
                {JOB_TYPE_FILTER_TABS.map((tab) => (
                  <FilterChip
                    key={tab.value}
                    active={jobType === tab.value}
                    onClick={() => setJobType(tab.value)}
                  >
                    {tab.label}
                  </FilterChip>
                ))}
              </div>
              {hasExtraFilters || quickFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setAdvancedFilters([]);
                    setJobType("all");
                    setQuickFilter("all");
                  }}
                  className={cn(
                    dashboardControlClass,
                    "h-8 shrink-0 gap-1.5 px-2.5 text-[12px] text-[#616161] hover:text-[#303030]"
                  )}
                >
                  <X className="size-3.5 shrink-0" strokeWidth={2} />
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <OrdersListTable
            items={filteredOrders}
            summaries={summaries}
            orderFinancials={orderFinancials}
            scope={scope}
            columns={tableColumns}
            columnLabels={columnLabels}
            customersById={customersById}
            emptyMessage={
              shopDataLoading
                ? "Loading orders…"
                : advancedFilters.length > 0 || quickFilter !== "all"
                  ? "No orders match your filters. Try adjusting or clearing them."
                  : scope === "active"
                    ? "No active orders right now. Try Historical or All."
                    : scope === "historical"
                    ? "No historical orders yet."
                    : scope === "archived"
                      ? "No archived orders. Admins can archive an order from its detail page."
                      : "No orders yet."
            }
          />
        </div>
      </section>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
          : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
      )}
    >
      {children}
    </button>
  );
}
