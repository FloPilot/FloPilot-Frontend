import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Factory,
  LayoutDashboard,
  Plus,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-config";
import { formatCustomerFullName } from "@/lib/customers";
import type { Customer, Machine, Order, ScheduleBlock, Task } from "@/types";
import { excludeArchivedOrders } from "@/lib/order-archive";
import { orderStatusLabel } from "@/lib/order-status";
import { documentTypeLabel } from "@/lib/reports/format";
import { formatCurrency } from "@/lib/format";
import {
  formatOrderDisplayLine,
  formatOrderRef,
  formatScheduleBlockDisplayLine,
} from "@/lib/order-display";

export type SearchCategory =
  | "all"
  | "orders"
  | "customers"
  | "tasks"
  | "pages"
  | "machines"
  | "actions";

export type StaffSearchResult = {
  id: string;
  category: Exclude<SearchCategory, "all">;
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  action?: "new-order" | "new-customer";
  icon?: LucideIcon;
  /** Original query term when selecting a recent search row */
  recentQuery?: string;
};

export type ActiveSearchFilter = Exclude<SearchCategory, "all">;

export const FILTER_CHIPS: { id: ActiveSearchFilter; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
  { id: "tasks", label: "Tasks" },
  { id: "pages", label: "Pages" },
  { id: "machines", label: "Machines" },
  { id: "actions", label: "Actions" },
];

export const RESULT_PREVIEW_LIMIT = 8;

const RECENT_SEARCHES_KEY = "flopilot:staff-search-recent";
const MAX_RECENT = 8;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return;
  const existing = readRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );
  window.localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify([trimmed, ...existing].slice(0, MAX_RECENT))
  );
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
}

function matchesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function flattenNavPages(items: NavItem[]): StaffSearchResult[] {
  const pages: StaffSearchResult[] = [];

  for (const item of items) {
    pages.push({
      id: `page-${item.href}`,
      category: "pages",
      title: item.label,
      subtitle: "Go to page",
      href: item.href,
      icon: item.icon,
    });

    for (const child of item.children ?? []) {
      pages.push({
        id: `page-${child.href}`,
        category: "pages",
        title: child.label,
        subtitle: item.label,
        href: child.href,
        icon: child.icon ?? item.icon,
      });
    }
  }

  return pages;
}

const QUICK_ACTIONS: StaffSearchResult[] = [
  {
    id: "action-new-order",
    category: "actions",
    title: "Create new order",
    subtitle: "Start a quote or sales order",
    action: "new-order",
    icon: Plus,
  },
  {
    id: "action-new-customer",
    category: "actions",
    title: "Add customer",
    subtitle: "Create a new customer account",
    action: "new-customer",
    icon: UserPlus,
  },
  {
    id: "action-dashboard",
    category: "actions",
    title: "Open dashboard",
    subtitle: "Shop overview and KPIs",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "action-orders",
    category: "actions",
    title: "View all orders",
    subtitle: "Quotes, sales orders, and invoices",
    href: "/app/orders",
    icon: ClipboardList,
  },
  {
    id: "action-customers",
    category: "actions",
    title: "View all customers",
    subtitle: "Accounts and order history",
    href: "/app/customers",
    icon: Users,
  },
];

function searchOrders(orders: Order[], query: string, limit = 20): StaffSearchResult[] {
  return [...excludeArchivedOrders(orders)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((order) => {
      const haystack = [
        order.number,
        order.customLabel ?? "",
        formatOrderDisplayLine(order),
        order.customerName,
        order.company,
        order.status,
        orderStatusLabel(order.status),
        documentTypeLabel(order.type),
        order.jobs.map((job) => job.name).join(" "),
        order.lineItems.map((item) => item.productName).join(" "),
      ].join(" ");
      return matchesQuery(haystack, query);
    })
    .slice(0, limit)
    .map((order) => ({
      id: `order-${order.id}`,
      category: "orders" as const,
      title: formatOrderDisplayLine(order),
      subtitle: `${order.company} · ${formatCurrency(order.total)}`,
      badge: orderStatusLabel(order.status),
      href: `/app/orders/${order.id}`,
      icon: ClipboardList,
    }));
}

function searchCustomers(
  customers: Customer[],
  query: string,
  limit = 20
): StaffSearchResult[] {
  return [...customers]
    .sort((a, b) =>
      (a.company || a.name).localeCompare(b.company || b.name, undefined, {
        sensitivity: "base",
      })
    )
    .filter((customer) => {
      const haystack = [
        customer.company,
        customer.name,
        customer.firstName ?? "",
        customer.lastName ?? "",
        customer.email,
        customer.phone,
        customer.city,
        customer.state,
      ].join(" ");
      return matchesQuery(haystack, query);
    })
    .slice(0, limit)
    .map((customer) => {
      const contact = formatCustomerFullName(customer);
      const meta = [customer.email, customer.phone].filter(Boolean).join(" · ");

      return {
        id: `customer-${customer.id}`,
        category: "customers" as const,
        title: contact || customer.company,
        subtitle: meta || customer.company,
        href: `/app/customers/${customer.id}`,
        icon: Users,
      };
    });
}

function searchPages(pages: StaffSearchResult[], query: string) {
  return pages
    .filter((page) => matchesQuery(`${page.title} ${page.subtitle ?? ""}`, query))
    .slice(0, 8);
}

function searchMachines(
  machines: Machine[],
  query: string,
  limit = 20
): StaffSearchResult[] {
  return [...machines]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((machine) => matchesQuery(`${machine.name} ${machine.type}`, query))
    .slice(0, limit)
    .map((machine) => ({
      id: `machine-${machine.id}`,
      category: "machines" as const,
      title: machine.name,
      subtitle: machine.active ? "Active station" : "Offline",
      href: `/app/machines/${machine.id}`,
      icon: Wrench,
    }));
}

function searchTasks(tasks: Task[], query: string, limit = 20): StaffSearchResult[] {
  return [...tasks]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .filter((task) => {
      const haystack = [
        task.title,
        task.department,
        task.assignee,
        task.orderNumber,
        task.orderCustomLabel ?? "",
        task.customerName,
        task.status,
      ].join(" ");
      return matchesQuery(haystack, query);
    })
    .slice(0, limit)
    .map((task) => ({
      id: `task-${task.id}-${task.orderId}`,
      category: "tasks" as const,
      title: task.title,
      subtitle: `${formatOrderRef(task)} · ${task.customerName}`,
      badge: task.status.replace(/_/g, " "),
      href: `/app/orders/${task.orderId}`,
      icon: Factory,
    }));
}

function searchScheduleBlocks(
  blocks: ScheduleBlock[],
  machines: Machine[],
  query: string,
  limit = 12
): StaffSearchResult[] {
  const machineNames = new Map(machines.map((m) => [m.id, m.name]));

  return [...blocks]
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    .filter((block) => {
      const haystack = [
        block.orderNumber,
        block.customerName,
        block.jobName,
        block.imprintLabel,
        machineNames.get(block.machineId) || "",
      ].join(" ");
      return matchesQuery(haystack, query);
    })
    .slice(0, limit)
    .map((block) => ({
      id: `sched-${block.id}`,
      category: "tasks" as const,
      title: `${formatScheduleBlockDisplayLine(block)} · ${block.imprintLabel}`,
      subtitle: `${machineNames.get(block.machineId) || "Station"} · ${block.jobName}`,
      href: "/app/calendar",
      icon: Factory,
    }));
}

function buildAttentionResults(orders: Order[]): StaffSearchResult[] {
  const attention: StaffSearchResult[] = [];

  for (const order of excludeArchivedOrders(orders)) {
    if (order.status === "awaiting_approval") {
      attention.push({
        id: `attention-approval-${order.id}`,
        category: "orders",
        title: `${formatOrderDisplayLine(order)} needs approval`,
        subtitle: order.company,
        badge: "Awaiting approval",
        href: `/app/orders/${order.id}`,
        icon: ClipboardList,
      });
    } else if (order.rush) {
      attention.push({
        id: `attention-rush-${order.id}`,
        category: "orders",
        title: `Rush · ${formatOrderDisplayLine(order)}`,
        subtitle: order.company,
        badge: "Rush",
        href: `/app/orders/${order.id}`,
        icon: ClipboardList,
      });
    }
  }

  return attention.slice(0, 4);
}

function searchActions(query: string) {
  return QUICK_ACTIONS.filter((action) =>
    matchesQuery(`${action.title} ${action.subtitle ?? ""}`, query)
  );
}

export function buildStaffSearchResults({
  query,
  category,
  orders,
  customers,
  machines,
  navPages,
  recentOrders,
  productionTasks = [],
  scheduleBlocks = [],
}: {
  query: string;
  category: SearchCategory;
  orders: Order[];
  customers: Customer[];
  machines: Machine[];
  navPages: StaffSearchResult[];
  recentOrders: Order[];
  productionTasks?: Task[];
  scheduleBlocks?: ScheduleBlock[];
}): StaffSearchResult[] {
  const trimmed = query.trim();

  if (!trimmed) {
    if (category === "orders") return searchOrders(orders, "", 20);
    if (category === "customers") return searchCustomers(customers, "", 20);
    if (category === "tasks") return searchTasks(productionTasks, "", 20);
    if (category === "pages") return navPages.slice(0, 20);
    if (category === "machines") return searchMachines(machines, "", 20);
    if (category === "actions") return QUICK_ACTIONS;

    return [
      ...buildAttentionResults(orders),
      ...recentOrders.slice(0, 3).map((order) => ({
        id: `suggested-order-${order.id}`,
        category: "orders" as const,
        title: formatOrderDisplayLine(order),
        subtitle: `${order.company} · ${orderStatusLabel(order.status)}`,
        href: `/app/orders/${order.id}`,
        icon: ClipboardList,
      })),
      ...QUICK_ACTIONS.slice(0, 2),
    ];
  }

  const orderResults = searchOrders(orders, trimmed);
  const customerResults = searchCustomers(customers, trimmed);
  const taskResults = searchTasks(productionTasks, trimmed);
  const scheduleResults = searchScheduleBlocks(
    scheduleBlocks,
    machines,
    trimmed
  );
  const pageResults = searchPages(navPages, trimmed);
  const machineResults = searchMachines(machines, trimmed);
  const actionResults = searchActions(trimmed);

  if (category === "orders") return orderResults;
  if (category === "customers") return customerResults;
  if (category === "tasks") {
    const combinedTasks = [...taskResults];
    for (const block of scheduleResults) {
      if (!combinedTasks.some((item) => item.id === block.id)) {
        combinedTasks.push(block);
      }
    }
    return combinedTasks.slice(0, 20);
  }
  if (category === "pages") return pageResults;
  if (category === "machines") return machineResults;
  if (category === "actions") return actionResults;

  const combined = [
    ...orderResults.slice(0, 4),
    ...customerResults.slice(0, 3),
    ...taskResults.slice(0, 3),
    ...scheduleResults.slice(0, 2),
    ...pageResults.slice(0, 2),
    ...machineResults.slice(0, 2),
    ...actionResults.slice(0, 2),
  ];

  const seen = new Set<string>();
  return combined.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function flattenNavPagesForSearch(items: NavItem[]) {
  return flattenNavPages(items);
}

export function recentSearchResults(queries: string[]): StaffSearchResult[] {
  return queries.map((query, index) => ({
    id: `recent-${index}-${query}`,
    category: "actions",
    title: query,
    subtitle: "Recent search",
    recentQuery: query,
    icon: ClipboardList,
  }));
}

export const CATEGORY_SECTION_LABELS: Record<
  Exclude<SearchCategory, "all">,
  string
> = {
  orders: "Orders",
  customers: "Customers",
  tasks: "Tasks",
  pages: "Pages",
  machines: "Machines",
  actions: "Actions",
};
