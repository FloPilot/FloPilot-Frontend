"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ChevronRight,
  DollarSign,
  Download,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerBrandMarkFromRecord } from "@/components/customers/customer-brand-mark";
import { ReportsLauncher } from "@/components/reports/reports-launcher";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildCustomerListSummaries,
  computeCustomerListKpis,
  filterCustomersByQuickFilter,
  filterCustomersByState,
  getCustomerStateOptions,
  searchCustomers,
  sortCustomers,
  type CustomerListSort,
  type CustomerQuickFilter,
} from "@/lib/customer-list-summary";
import { formatCustomerFullName, type NewCustomerInput } from "@/lib/customers";
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
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { downloadReportCsv } from "@/lib/reports/csv";
import { getReportsForContext, runReport } from "@/lib/reports/customer-reports";
import { cn } from "@/lib/utils";

const QUICK_FILTERS: {
  value: CustomerQuickFilter;
  label: string;
  kpiKey?: keyof ReturnType<typeof computeCustomerListKpis>;
}[] = [
  { value: "all", label: "All customers" },
  { value: "active", label: "Active", kpiKey: "active" },
  { value: "open_balance", label: "Open balance", kpiKey: "openBalance" },
  { value: "new", label: "New", kpiKey: "newThisMonth" },
  { value: "no_orders", label: "No orders", kpiKey: "noOrders" },
];

const KPI_CONFIG: {
  key: keyof ReturnType<typeof computeCustomerListKpis>;
  label: string;
  hint: string;
  icon: LucideIcon;
  surface: string;
  border: string;
  iconWrap: string;
  iconColor: string;
  valueColor: string;
  format?: (value: number) => string;
}[] = [
  {
    key: "showing",
    label: "Customers",
    hint: "Accounts in your shop",
    icon: Users,
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  },
  {
    key: "active",
    label: "Active",
    hint: "With open orders in progress",
    icon: Sparkles,
    surface: "bg-[#f4f7fd]",
    border: "border-[#c4d7f2]",
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#2c6ecb]",
  },
  {
    key: "openBalance",
    label: "Open balance",
    hint: "Customers with money owed",
    icon: Wallet,
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  },
  {
    key: "newThisMonth",
    label: "New",
    hint: "Added in the last 30 days",
    icon: UserPlus,
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
  {
    key: "totalLifetimeValue",
    label: "Lifetime value",
    hint: "Total revenue across customers",
    icon: DollarSign,
    surface: "bg-[#f3f0ff]",
    border: "border-[#d4c9f7]",
    iconWrap: "bg-[#ebe6ff]",
    iconColor: "text-[#6d5bd0]",
    valueColor: "text-[#6d5bd0]",
    format: (value) => formatCompactCurrency(value),
  },
];

const SORT_OPTIONS: { value: CustomerListSort; label: string }[] = [
  { value: "company", label: "Company A–Z" },
  { value: "ltv_desc", label: "Lifetime value" },
  { value: "orders_desc", label: "Most orders" },
  { value: "balance_desc", label: "Open balance" },
  { value: "newest", label: "Newest first" },
];

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
        dashboardControlClass,
        "h-8 px-2.5 text-[12px]",
        active && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
      )}
    >
      {children}
    </button>
  );
}

export function CustomersListView() {
  const router = useRouter();
  const {
    customers,
    orders,
    addCustomer,
    shopDataLoading,
    shopDataError,
    refreshShopData,
  } = useSchedule();
  const { settings } = useShopSettings();

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<CustomerQuickFilter>("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sort, setSort] = useState<CustomerListSort>("company");
  const [addOpen, setAddOpen] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);

  const archivedCount = useMemo(
    () => customers.filter((customer) => customer.archived === true).length,
    [customers]
  );

  const baseCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        archivedOnly ? customer.archived === true : customer.archived !== true
      ),
    [customers, archivedOnly]
  );

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.archived !== true),
    [customers]
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setAddOpen(true);
    }
  }, []);

  const summaries = useMemo(
    () =>
      buildCustomerListSummaries(customers, orders, {
        taxRate: settings.taxRate,
        pricingMatrix: settings.pricingMatrix,
      }),
    [customers, orders, settings.taxRate, settings.pricingMatrix]
  );

  const stateOptions = useMemo(
    () => getCustomerStateOptions(customers),
    [customers]
  );

  const scopedCustomers = useMemo(() => {
    const searched = searchCustomers(baseCustomers, search);
    const byState = filterCustomersByState(searched, stateFilter);
    return sortCustomers(byState, summaries, sort);
  }, [baseCustomers, search, stateFilter, sort, summaries]);

  const filteredCustomers = useMemo(
    () =>
      filterCustomersByQuickFilter(scopedCustomers, summaries, quickFilter),
    [scopedCustomers, summaries, quickFilter]
  );

  const kpis = useMemo(
    () => computeCustomerListKpis(activeCustomers, summaries),
    [activeCustomers, summaries]
  );

  const handleCreateCustomer = async (input: NewCustomerInput) => {
    const customer = await addCustomer(input);
    router.push(`/app/customers/${customer.id}?new=1`);
    return customer;
  };

  const handleExport = () => {
    const report = getReportsForContext("customers_list").find(
      (item) => item.id === "customer-directory"
    );
    if (!report) return;
    downloadReportCsv(
      runReport(report, { customers: filteredCustomers, orders })
    );
  };

  const attentionCount = kpis.active + kpis.openBalance;

  return (
    <>
      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={handleCreateCustomer}
      />

      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        {shopDataError ? (
          <div
            className={cn(
              dashboardCardClass,
              "flex items-center justify-between gap-3 border-destructive/30 px-4 py-3 text-sm text-destructive"
            )}
          >
            <span>{shopDataError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 bg-white"
              onClick={() => void refreshShopData()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={dashboardSectionTitleClass}>Customers</h1>
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              {attentionCount > 0
                ? `${attentionCount} account${attentionCount !== 1 ? "s" : ""} need attention — active work or open balances`
                : "Manage accounts, contact details, and order history across your shop"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReportsLauncher
              context="customers_list"
              data={{ customers, orders }}
            />
            <Button
              type="button"
              className={dashboardPrimaryButtonClass}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-3.5" />
              New customer
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {KPI_CONFIG.map((config) => {
            const Icon = config.icon;
            const rawValue = kpis[config.key];
            const value =
              config.format?.(rawValue) ?? String(rawValue);
            const linkedFilter = QUICK_FILTERS.find(
              (item) => item.kpiKey === config.key
            );

            return (
              <button
                key={config.key}
                type="button"
                onClick={() => {
                  if (config.key === "showing") {
                    setQuickFilter("all");
                    return;
                  }
                  if (config.key === "totalLifetimeValue") return;
                  if (linkedFilter) {
                    setQuickFilter((current) =>
                      current === linkedFilter.value
                        ? "all"
                        : linkedFilter.value
                    );
                  }
                }}
                className={cn(
                  dashboardKpiCardClass,
                  "min-h-[128px] border text-left",
                  config.surface,
                  config.border,
                  linkedFilter &&
                    quickFilter === linkedFilter.value &&
                    "ring-2 ring-[#2c6ecb]/30",
                  config.key === "totalLifetimeValue" && "cursor-default"
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
                <p
                  className={cn(
                    dashboardValueClass,
                    "mt-2.5",
                    config.valueColor
                  )}
                >
                  {value}
                </p>
                <p className="mt-1.5 text-xs leading-snug text-[#616161]">
                  {config.hint}
                </p>
              </button>
            );
          })}
        </div>

        <section className={dashboardCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#303030]">
                Customer directory
              </h2>
              <p className="mt-0.5 text-[13px] text-[#616161]">
                {filteredCustomers.length} result
                {filteredCustomers.length !== 1 ? "s" : ""}
                {quickFilter !== "all"
                  ? ` · ${QUICK_FILTERS.find((item) => item.value === quickFilter)?.label}`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(dashboardControlClass, "h-9")}
              disabled={filteredCustomers.length === 0}
              onClick={handleExport}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>

          <div className="space-y-0 p-4 sm:p-5">
            <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-3 py-2.5">
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
                {archivedCount > 0 || archivedOnly ? (
                  <FilterChip
                    active={archivedOnly}
                    onClick={() => setArchivedOnly((current) => !current)}
                  >
                    <Archive className="size-3.5" />
                    Archived
                    <span className="tabular-nums text-[#8a8a8a]">
                      {archivedCount}
                    </span>
                  </FilterChip>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
                <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company, contact, email, city…"
                    className={cn(dashboardControlClass, "h-9 w-full pl-9")}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {stateOptions.length > 0 ? (
                    <Select
                      value={stateFilter}
                      onValueChange={(value) => setStateFilter(value ?? "all")}
                    >
                      <SelectTrigger
                        className={cn(dashboardControlClass, "h-9 w-[130px]")}
                      >
                        <SelectValue placeholder="All states" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states</SelectItem>
                        {stateOptions.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <Select
                    value={sort}
                    onValueChange={(value) =>
                      setSort((value as CustomerListSort) ?? "company")
                    }
                  >
                    <SelectTrigger
                      className={cn(dashboardControlClass, "h-9 w-[170px]")}
                    >
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#ebebeb] hover:bg-transparent">
                      <TableHead className="text-[#616161]">Customer</TableHead>
                      <TableHead className="hidden text-[#616161] md:table-cell">
                        Contact
                      </TableHead>
                      <TableHead className="hidden text-[#616161] lg:table-cell">
                        Location
                      </TableHead>
                      <TableHead className="text-right text-[#616161]">
                        Open orders
                      </TableHead>
                      <TableHead className="hidden text-right text-[#616161] sm:table-cell">
                        Open balance
                      </TableHead>
                      <TableHead className="text-right text-[#616161]">
                        Lifetime value
                      </TableHead>
                      <TableHead className="hidden text-[#616161] xl:table-cell">
                        Last order
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={7}
                          className="py-16 text-center text-[#616161]"
                        >
                          {shopDataLoading ? (
                            "Loading customers…"
                          ) : customers.length === 0 ? (
                            <div className="mx-auto max-w-sm">
                              <p className="text-sm font-medium text-[#303030]">
                                No customers yet
                              </p>
                              <p className="mt-1 text-sm text-[#616161]">
                                Add your first account to start tracking orders
                                and lifetime value.
                              </p>
                              <Button
                                type="button"
                                className="mt-4 rounded-lg"
                                onClick={() => setAddOpen(true)}
                              >
                                <Plus className="size-4" />
                                New customer
                              </Button>
                            </div>
                          ) : (
                            "No customers match your search or filters."
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const href = `/app/customers/${customer.id}`;
                        const summary = summaries.get(customer.id);
                        const openBalance = summary?.openBalance ?? 0;

                        return (
                          <TableRow
                            key={customer.id}
                            tabIndex={0}
                            role="link"
                            aria-label={`View ${customer.company}`}
                            className="group cursor-pointer border-[#ebebeb] transition-colors hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7] focus-visible:outline-none"
                            onClick={() => router.push(href)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(href);
                              }
                            }}
                          >
                            <TableCell className="relative min-w-[220px] pl-3">
                              <div className="flex items-start gap-3">
                                <CustomerBrandMarkFromRecord
                                  customer={customer}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <Link
                                    href={href}
                                    className="font-medium text-[#303030] transition-colors hover:text-[#2c6ecb] hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {customer.company}
                                  </Link>
                                  <p className="mt-0.5 truncate text-xs text-[#616161]">
                                    {formatCustomerFullName(customer)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="space-y-1 text-sm text-[#616161]">
                                <p className="flex items-center gap-1.5">
                                  <Mail className="size-3.5 shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <Phone className="size-3.5 shrink-0" />
                                  {customer.phone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-[#616161] lg:table-cell">
                              {customer.city}, {customer.state}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-[#303030]">
                              {summary?.openOrderCount ?? 0}
                            </TableCell>
                            <TableCell className="hidden text-right sm:table-cell">
                              <span
                                className={cn(
                                  "tabular-nums",
                                  openBalance > 0
                                    ? "font-medium text-[#8a6116]"
                                    : "text-[#616161]"
                                )}
                              >
                                {formatCurrency(openBalance)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center justify-end gap-1.5">
                                <span className="font-medium tabular-nums text-[#303030]">
                                  {formatCurrency(summary?.lifetimeValue ?? 0)}
                                </span>
                                <ChevronRight className="size-4 -translate-x-1 text-brand-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                              </span>
                            </TableCell>
                            <TableCell className="hidden text-[#616161] xl:table-cell">
                              {summary?.lastOrderNumber ? (
                                <div>
                                  <p className="text-sm text-[#303030]">
                                    {summary.lastOrderNumber}
                                  </p>
                                  {summary.lastOrderDate ? (
                                    <p className="text-xs text-[#616161]">
                                      {formatDate(summary.lastOrderDate)}
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-[#8a8a8a]">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
