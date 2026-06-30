import { parseISO, subDays, startOfDay } from "date-fns";
import type { Customer, Order } from "@/types";
import { formatCustomerFullName } from "@/lib/customers";
import { resolveOrderFinancials } from "@/lib/order-estimate";
import { isArchivedOrder } from "@/lib/order-archive";
import { isActiveOrder } from "@/lib/order-list-filters";
import type { PricingMatrix } from "@/lib/shop-settings";

export type CustomerListFinancialContext = {
  taxRate: number;
  pricingMatrix?: PricingMatrix;
};

function resolveOrderBalance(
  order: Order,
  context: CustomerListFinancialContext
): number {
  return resolveOrderFinancials(
    order,
    context.taxRate,
    context.pricingMatrix
  ).balance;
}

export function sumActiveOrdersOpenBalance(
  orders: Order[],
  financials: CustomerListFinancialContext
): number {
  return orders
    .filter((order) => !isArchivedOrder(order))
    .reduce((sum, order) => sum + resolveOrderBalance(order, financials), 0);
}

function resolveOrderTotal(
  order: Order,
  context: CustomerListFinancialContext
): number {
  return resolveOrderFinancials(
    order,
    context.taxRate,
    context.pricingMatrix
  ).total;
}

function isOpenCustomerOrder(order: Order): boolean {
  return !isArchivedOrder(order) && isActiveOrder(order);
}

export type CustomerQuickFilter =
  | "all"
  | "active"
  | "open_balance"
  | "new"
  | "no_orders";

export type CustomerListSort =
  | "company"
  | "ltv_desc"
  | "orders_desc"
  | "newest"
  | "balance_desc";

export type CustomerListSummary = {
  customerId: string;
  openOrderCount: number;
  openBalance: number;
  lifetimeValue: number;
  activeOrders: number;
  lastOrderDate: string | null;
  lastOrderNumber: string | null;
  isNew: boolean;
};

export function buildCustomerListSummaries(
  customers: Customer[],
  orders: Order[],
  financials: CustomerListFinancialContext = { taxRate: 0.08 }
): Map<string, CustomerListSummary> {
  const map = new Map<string, CustomerListSummary>();
  const thirtyDaysAgo = subDays(startOfDay(new Date()), 30);

  for (const customer of customers) {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const openOrders = customerOrders.filter((o) => !isArchivedOrder(o));
    const openBalance = openOrders.reduce(
      (sum, order) => sum + resolveOrderBalance(order, financials),
      0
    );
    const lifetimeValue = openOrders.reduce(
      (sum, order) => sum + resolveOrderTotal(order, financials),
      0
    );
    const activeOrders = openOrders.filter(isOpenCustomerOrder).length;

    const sorted = [...openOrders].sort(
      (a, b) =>
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
    );
    const last = sorted[0];

    let isNew = false;
    if (customer.customerSince) {
      try {
        isNew = parseISO(customer.customerSince) >= thirtyDaysAgo;
      } catch {
        isNew = false;
      }
    }

    map.set(customer.id, {
      customerId: customer.id,
      openOrderCount: openOrders.length,
      openBalance,
      lifetimeValue,
      activeOrders,
      lastOrderDate: last?.createdAt ?? null,
      lastOrderNumber: last?.number ?? null,
      isNew,
    });
  }

  return map;
}

export function computeCustomerListKpis(
  customers: Customer[],
  summaries: Map<string, CustomerListSummary>
) {
  let active = 0;
  let openBalance = 0;
  let newThisMonth = 0;
  let noOrders = 0;
  let totalLifetimeValue = 0;

  for (const customer of customers) {
    const summary = summaries.get(customer.id);
    if (!summary) continue;
    if (summary.activeOrders > 0) active += 1;
    if (summary.openBalance > 0) openBalance += 1;
    if (summary.isNew) newThisMonth += 1;
    if (summary.openOrderCount === 0) noOrders += 1;
    totalLifetimeValue += summary.lifetimeValue;
  }

  return {
    showing: customers.length,
    active,
    openBalance,
    newThisMonth,
    noOrders,
    totalLifetimeValue,
  };
}

export function filterCustomersByQuickFilter(
  customers: Customer[],
  summaries: Map<string, CustomerListSummary>,
  filter: CustomerQuickFilter
): Customer[] {
  if (filter === "all") return customers;

  return customers.filter((customer) => {
    const summary = summaries.get(customer.id);
    if (!summary) return false;

    switch (filter) {
      case "active":
        return summary.activeOrders > 0;
      case "open_balance":
        return summary.openBalance > 0;
      case "new":
        return summary.isNew;
      case "no_orders":
        return summary.openOrderCount === 0;
      default:
        return true;
    }
  });
}

export function searchCustomers(
  customers: Customer[],
  query: string
): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  return customers.filter((customer) => {
    const haystack = [
      customer.company,
      customer.name,
      customer.firstName ?? "",
      customer.lastName ?? "",
      formatCustomerFullName(customer),
      customer.email,
      customer.phone,
      customer.city,
      customer.state,
      customer.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function filterCustomersByState(
  customers: Customer[],
  state: string
): Customer[] {
  if (!state || state === "all") return customers;
  return customers.filter((customer) => customer.state === state);
}

export function sortCustomers(
  customers: Customer[],
  summaries: Map<string, CustomerListSummary>,
  sort: CustomerListSort
): Customer[] {
  const list = [...customers];

  switch (sort) {
    case "ltv_desc":
      return list.sort(
        (a, b) =>
          (summaries.get(b.id)?.lifetimeValue ?? 0) -
          (summaries.get(a.id)?.lifetimeValue ?? 0)
      );
    case "orders_desc":
      return list.sort(
        (a, b) =>
          (summaries.get(b.id)?.openOrderCount ?? 0) -
          (summaries.get(a.id)?.openOrderCount ?? 0)
      );
    case "balance_desc":
      return list.sort(
        (a, b) =>
          (summaries.get(b.id)?.openBalance ?? 0) -
          (summaries.get(a.id)?.openBalance ?? 0)
      );
    case "newest":
      return list.sort((a, b) => {
        const aDate = a.customerSince ?? "";
        const bDate = b.customerSince ?? "";
        return bDate.localeCompare(aDate);
      });
    default:
      return list.sort((a, b) => a.company.localeCompare(b.company));
  }
}

export function getCustomerStateOptions(customers: Customer[]) {
  const states = new Set(customers.map((customer) => customer.state).filter(Boolean));
  return Array.from(states).sort((a, b) => a.localeCompare(b));
}

export function customerInitials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}
