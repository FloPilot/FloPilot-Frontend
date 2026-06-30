"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  Cog,
  Package,
  Plus,
  Truck,
  X,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardLiveStats } from "@/lib/dashboard-insights";
import {
  DASHBOARD_DATE_RANGES,
  DASHBOARD_OPTIONAL_FILTERS,
  getAvailableOptionalFilters,
  type DashboardDateRangeKey,
  type DashboardFilters,
  type DashboardOptionalFilterKey,
} from "@/lib/dashboard-filters";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type AlertChip = {
  id: string;
  label: string;
  href: string;
  icon: typeof Zap;
  tone: "primary" | "default" | "warning" | "critical";
};

function FilterSelect({
  icon: Icon,
  value,
  placeholder,
  onValueChange,
  onRemove,
  children,
}: {
  icon: typeof CalendarDays;
  value: string;
  placeholder: string;
  onValueChange: (value: string | null) => void;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            dashboardControlClass,
            "w-auto min-w-[148px] data-[size=default]:h-9",
            onRemove && "rounded-r-none border-r-0 pr-2"
          )}
        >
          <Icon className="size-4 shrink-0 text-[#616161]" strokeWidth={1.75} />
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[200px] rounded-lg">
          {children}
        </SelectContent>
      </Select>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            dashboardControlClass,
            "h-9 rounded-l-none border-l-0 px-2 text-[#616161] hover:text-[#303030]"
          )}
          aria-label="Remove filter"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function buildAlertChips(stats: DashboardLiveStats): AlertChip[] {
  const chips: AlertChip[] = [];
  const dueUrgent = stats.dueToday + stats.overdue;

  if (dueUrgent > 0) {
    chips.push({
      id: "due",
      label: `${dueUrgent} order${dueUrgent !== 1 ? "s" : ""} due or overdue`,
      href: "/app/orders",
      icon: Clock3,
      tone: "primary",
    });
  }

  if (stats.rushOrders > 0) {
    chips.push({
      id: "rush",
      label: `${stats.rushOrders} rush order${stats.rushOrders !== 1 ? "s" : ""}`,
      href: "/app/orders",
      icon: Zap,
      tone: "critical",
    });
  }

  if (stats.toSchedule > 0) {
    chips.push({
      id: "schedule",
      label: `${stats.toSchedule} to schedule`,
      href: "/app/calendar",
      icon: AlertTriangle,
      tone: "warning",
    });
  }

  if (stats.lowStockItems > 0) {
    chips.push({
      id: "inventory",
      label: `${stats.lowStockItems} low stock`,
      href: "/app/inventory",
      icon: Package,
      tone: "warning",
    });
  }

  if (stats.readyToShip > 0) {
    chips.push({
      id: "ship",
      label: `${stats.readyToShip} ready to ship`,
      href: "/app/orders",
      icon: Truck,
      tone: "default",
    });
  }

  return chips;
}

function removeOptionalFilter(
  filters: DashboardFilters,
  key: DashboardOptionalFilterKey
): DashboardFilters {
  const next: DashboardFilters = {
    ...filters,
    activeOptionalFilters: filters.activeOptionalFilters.filter(
      (filter) => filter !== key
    ),
  };

  if (key === "customer") {
    next.customerId = null;
  }

  return next;
}

function addOptionalFilter(
  filters: DashboardFilters,
  key: DashboardOptionalFilterKey
): DashboardFilters {
  if (filters.activeOptionalFilters.includes(key)) return filters;
  return {
    ...filters,
    activeOptionalFilters: [...filters.activeOptionalFilters, key],
  };
}

export function DashboardToolbar({
  stats,
  filters,
  machineOptions,
  customerOptions,
  onFiltersChange,
}: {
  stats: DashboardLiveStats;
  filters: DashboardFilters;
  machineOptions: { id: string; label: string }[];
  customerOptions: { id: string; label: string; orderCount: number }[];
  onFiltersChange: (filters: DashboardFilters) => void;
}) {
  const chips = buildAlertChips(stats);
  const availableOptionalFilters = getAvailableOptionalFilters(filters);
  const showCustomerFilter = filters.activeOptionalFilters.includes("customer");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Link
              key={chip.id}
              href={chip.href}
              className={cn(
                dashboardControlClass,
                chip.tone === "critical" &&
                  "border-red-200/80 bg-red-50/95 text-red-900 hover:bg-red-50",
                chip.tone === "warning" &&
                  "border-amber-200/80 bg-amber-50/95 text-amber-950 hover:bg-amber-50"
              )}
            >
              <Icon className="size-4 text-[#616161]" strokeWidth={1.75} />
              {chip.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <FilterSelect
          icon={CalendarDays}
          value={filters.dateRangeKey}
          placeholder="Date range"
          onValueChange={(value) => {
            if (!value) return;
            onFiltersChange({
              ...filters,
              dateRangeKey: value as DashboardDateRangeKey,
            });
          }}
        >
          {DASHBOARD_DATE_RANGES.map((range) => (
            <SelectItem key={range.key} value={range.key}>
              {range.label}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          icon={Cog}
          value={filters.machineId ?? "all"}
          placeholder="All machines"
          onValueChange={(value) => {
            if (!value) return;
            onFiltersChange({
              ...filters,
              machineId: value === "all" ? null : value,
            });
          }}
        >
          <SelectItem value="all">All machines</SelectItem>
          {machineOptions.map((machine) => (
            <SelectItem key={machine.id} value={machine.id}>
              {machine.label}
            </SelectItem>
          ))}
        </FilterSelect>

        {showCustomerFilter ? (
          <FilterSelect
            icon={Building2}
            value={filters.customerId ?? "all"}
            placeholder="All customers"
            onValueChange={(value) => {
              if (!value) return;
              onFiltersChange({
                ...filters,
                customerId: value === "all" ? null : value,
              });
            }}
            onRemove={() =>
              onFiltersChange(removeOptionalFilter(filters, "customer"))
            }
          >
            <SelectItem value="all">All customers</SelectItem>
            {customerOptions.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.label}
                {customer.orderCount > 0 ? ` (${customer.orderCount})` : ""}
              </SelectItem>
            ))}
          </FilterSelect>
        ) : null}

        {availableOptionalFilters.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                dashboardControlClass,
                "size-9 justify-center px-0"
              )}
              aria-label="Add filter"
            >
              <Plus className="size-4 text-[#616161]" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {availableOptionalFilters.map((key) => {
                const option = DASHBOARD_OPTIONAL_FILTERS.find(
                  (filter) => filter.key === key
                );
                if (!option) return null;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      onFiltersChange(addOptionalFilter(filters, key))
                    }
                  >
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
