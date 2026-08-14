import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Factory,
  FileImage,
  FolderOpen,
  LayoutDashboard,
  Palette,
  Plus,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-config";
import { formatCustomerFullName } from "@/lib/customers";
import type {
  Customer,
  Machine,
  Order,
  SavedDesign,
  ScheduleBlock,
  Task,
} from "@/types";
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
  | "designs"
  | "files"
  | "colors"
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
  { id: "designs", label: "Designs" },
  { id: "files", label: "Files" },
  { id: "colors", label: "Colors / PMS" },
  { id: "tasks", label: "Tasks" },
  { id: "pages", label: "Pages" },
  { id: "machines", label: "Machines" },
  { id: "actions", label: "Actions" },
];

export const RESULT_PREVIEW_LIMIT = 10;

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
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

function flattenNavPages(items: NavItem[]): StaffSearchResult[] {
  const pages: StaffSearchResult[] = [];

  for (const item of items) {
    if (item.comingSoon) continue;

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
  {
    id: "action-design-studio",
    category: "actions",
    title: "Open design studio",
    subtitle: "Designs, mockups, and artwork library",
    href: "/app/design-studio",
    icon: FileImage,
  },
  {
    id: "action-files",
    category: "actions",
    title: "Browse files",
    subtitle: "Artwork and production files",
    href: "/app/files",
    icon: FolderOpen,
  },
];

function orderDecorationHaystack(order: Order): string {
  const parts: string[] = [];

  for (const item of order.lineItems ?? []) {
    parts.push(
      item.productName,
      item.brand,
      item.color,
      item.colorKey ?? "",
      item.productKey ?? "",
      item.supplierPartNumber ?? ""
    );
  }

  for (const job of order.jobs ?? []) {
    parts.push(job.name, job.kind ?? "");
    for (const imprint of job.imprints ?? []) {
      parts.push(
        imprint.label,
        imprint.customLabel ?? "",
        imprint.locationKey ?? "",
        imprint.artwork?.name ?? "",
        imprint.artwork?.mockupLabel ?? "",
        imprint.notes?.colors ?? "",
        imprint.notes?.dimensions ?? "",
        imprint.notes?.instructions ?? "",
        imprint.notes?.placement ?? "",
        imprint.notes?.inkType ?? ""
      );
      for (const ink of imprint.inkColors ?? []) {
        parts.push(ink.name, ink.pmsCode ?? "", ink.transferType ?? "");
      }
      for (const slide of imprint.artwork?.proofSlides ?? []) {
        parts.push(slide.label ?? "");
      }
      for (const version of imprint.artwork?.history ?? []) {
        parts.push(version.name, version.mockupLabel ?? "");
      }
    }
  }

  for (const file of order.files ?? []) {
    parts.push(file.name, file.kind, ...(file.kinds ?? []), file.notes ?? "");
  }

  return parts.filter(Boolean).join(" ");
}

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
        order.salesRepName ?? "",
        order.clientStoreName ?? "",
        orderDecorationHaystack(order),
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

function designHaystack(design: SavedDesign): string {
  const parts: string[] = [
    design.name,
    design.customerName ?? "",
    design.company ?? "",
    design.locationLabel,
    design.locationKey,
    design.decoration,
    design.imprintCustomLabel ?? "",
    design.sourceOrderCustomLabel ?? "",
    design.sourceOrderNumber ?? "",
    design.artwork?.name ?? "",
    design.artwork?.mockupLabel ?? "",
    design.notes?.colors ?? "",
    design.notes?.dimensions ?? "",
    design.notes?.instructions ?? "",
    design.notes?.placement ?? "",
    design.notes?.inkType ?? "",
    ...(design.tags ?? []),
    ...(design.pmsCodes ?? []),
  ];

  for (const ink of design.inkColors ?? []) {
    parts.push(ink.name, ink.pmsCode ?? "", ink.transferType ?? "");
  }

  for (const location of design.locations ?? []) {
    parts.push(location.locationLabel, location.locationKey);
  }

  for (const slide of design.artwork?.proofSlides ?? []) {
    parts.push(slide.label ?? "");
  }

  return parts.filter(Boolean).join(" ");
}

function searchDesigns(
  designs: SavedDesign[],
  query: string,
  limit = 20
): StaffSearchResult[] {
  return [...designs]
    .sort((a, b) =>
      (b.updatedAt || b.createdAt || "").localeCompare(
        a.updatedAt || a.createdAt || ""
      )
    )
    .filter((design) => matchesQuery(designHaystack(design), query))
    .slice(0, limit)
    .map((design) => {
      const pms =
        (design.pmsCodes ?? [])
          .concat(
            (design.inkColors ?? [])
              .map((ink) => ink.pmsCode)
              .filter((code): code is string => Boolean(code))
          )
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || null;
      const meta = [
        design.company || design.customerName,
        design.locationLabel,
        pms ? `PMS ${pms}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        id: `design-${design.id}`,
        category: "designs" as const,
        title: design.name,
        subtitle: meta || "Design library",
        badge: design.decoration?.replace(/_/g, " "),
        href: `/app/designs/${design.id}`,
        icon: FileImage,
      };
    });
}

function searchOrderProofsAndFiles(
  orders: Order[],
  query: string,
  limit = 20
): StaffSearchResult[] {
  const results: StaffSearchResult[] = [];

  for (const order of excludeArchivedOrders(orders)) {
    for (const job of order.jobs ?? []) {
      for (const imprint of job.imprints ?? []) {
        const artwork = imprint.artwork;
        if (!artwork) continue;

        const proofHaystack = [
          artwork.name,
          artwork.mockupLabel ?? "",
          imprint.label,
          imprint.customLabel ?? "",
          ...(artwork.proofSlides ?? []).map((slide) => slide.label ?? ""),
          ...(artwork.history ?? []).flatMap((version) => [
            version.name,
            version.mockupLabel ?? "",
          ]),
        ].join(" ");

        if (matchesQuery(proofHaystack, query)) {
          results.push({
            id: `proof-${order.id}-${job.id}-${imprint.id}`,
            category: "files",
            title: artwork.name || imprint.customLabel || imprint.label,
            subtitle: `${formatOrderDisplayLine(order)} · ${imprint.label}`,
            badge:
              artwork.status === "approved"
                ? "Approved"
                : artwork.status === "revision_requested"
                  ? "Revision"
                  : "Proof",
            href: `/app/artwork/orders/${order.id}`,
            icon: FileImage,
          });
        }
      }
    }

    for (const file of order.files ?? []) {
      const fileHaystack = [
        file.name,
        file.kind,
        ...(file.kinds ?? []),
        file.notes ?? "",
        file.uploadedBy ?? "",
      ].join(" ");
      if (!matchesQuery(fileHaystack, query)) continue;
      results.push({
        id: `file-${order.id}-${file.id}`,
        category: "files",
        title: file.name,
        subtitle: `${formatOrderDisplayLine(order)} · ${String(file.kind).replace(/_/g, " ")}`,
        badge: "File",
        href: `/app/orders/${order.id}`,
        icon: FolderOpen,
      });
    }

    if (results.length >= limit * 2) break;
  }

  return results.slice(0, limit);
}

function searchDesignFiles(
  designs: SavedDesign[],
  query: string,
  limit = 12
): StaffSearchResult[] {
  return designs
    .filter((design) => {
      const haystack = [
        design.artwork?.name ?? "",
        design.artwork?.mockupLabel ?? "",
        ...(design.artwork?.proofSlides ?? []).map((slide) => slide.label ?? ""),
        design.name,
      ].join(" ");
      return matchesQuery(haystack, query);
    })
    .slice(0, limit)
    .map((design) => ({
      id: `design-file-${design.id}`,
      category: "files" as const,
      title: design.artwork?.name || design.name,
      subtitle: `${design.name} · Design library`,
      badge: "Design file",
      href: `/app/designs/${design.id}`,
      icon: FileImage,
    }));
}

function searchColorsAndPms(
  orders: Order[],
  designs: SavedDesign[],
  query: string,
  limit = 20
): StaffSearchResult[] {
  const results: StaffSearchResult[] = [];
  const seen = new Set<string>();

  const pushUnique = (result: StaffSearchResult) => {
    if (seen.has(result.id)) return;
    seen.add(result.id);
    results.push(result);
  };

  for (const order of excludeArchivedOrders(orders)) {
    for (const item of order.lineItems ?? []) {
      const garmentHaystack = [
        item.color,
        item.colorKey ?? "",
        item.brand,
        item.productName,
      ].join(" ");
      if (matchesQuery(garmentHaystack, query)) {
        pushUnique({
          id: `garment-color-${order.id}-${item.id}`,
          category: "colors",
          title: item.color || "Blank color",
          subtitle: `${item.brand} ${item.productName} · ${formatOrderDisplayLine(order)}`,
          badge: "Garment",
          href: `/app/orders/${order.id}`,
          icon: Palette,
        });
      }
    }

    for (const job of order.jobs ?? []) {
      for (const imprint of job.imprints ?? []) {
        for (const ink of imprint.inkColors ?? []) {
          const inkHaystack = [
            ink.name,
            ink.pmsCode ?? "",
            ink.transferType ?? "",
            imprint.label,
          ].join(" ");
          if (!matchesQuery(inkHaystack, query)) continue;
          pushUnique({
            id: `ink-${order.id}-${job.id}-${imprint.id}-${ink.id}`,
            category: "colors",
            title: ink.pmsCode
              ? `PMS ${ink.pmsCode}${ink.name ? ` · ${ink.name}` : ""}`
              : ink.name || "Ink color",
            subtitle: `${formatOrderDisplayLine(order)} · ${imprint.label}`,
            badge: ink.isFlash ? "Flash" : "Ink",
            href: `/app/orders/${order.id}`,
            icon: Palette,
          });
        }

        const notesColors = imprint.notes?.colors?.trim();
        if (notesColors && matchesQuery(notesColors, query)) {
          pushUnique({
            id: `notes-color-${order.id}-${job.id}-${imprint.id}`,
            category: "colors",
            title: notesColors,
            subtitle: `${formatOrderDisplayLine(order)} · ${imprint.label}`,
            badge: "Color note",
            href: `/app/orders/${order.id}`,
            icon: Palette,
          });
        }
      }
    }

    if (results.length >= limit) break;
  }

  for (const design of designs) {
    for (const ink of design.inkColors ?? []) {
      const inkHaystack = [ink.name, ink.pmsCode ?? ""].join(" ");
      if (!matchesQuery(inkHaystack, query)) continue;
      pushUnique({
        id: `design-ink-${design.id}-${ink.id}`,
        category: "colors",
        title: ink.pmsCode
          ? `PMS ${ink.pmsCode}${ink.name ? ` · ${ink.name}` : ""}`
          : ink.name || "Ink color",
        subtitle: `${design.name} · Design library`,
        badge: "Design ink",
        href: `/app/designs/${design.id}`,
        icon: Palette,
      });
    }

    for (const code of design.pmsCodes ?? []) {
      if (!matchesQuery(code, query)) continue;
      pushUnique({
        id: `design-pms-${design.id}-${code}`,
        category: "colors",
        title: `PMS ${code}`,
        subtitle: `${design.name} · Design library`,
        badge: "PMS",
        href: `/app/designs/${design.id}`,
        icon: Palette,
      });
    }
  }

  return results.slice(0, limit);
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
  designs = [],
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
  designs?: SavedDesign[];
}): StaffSearchResult[] {
  const trimmed = query.trim();

  if (!trimmed) {
    if (category === "orders") return searchOrders(orders, "", 20);
    if (category === "customers") return searchCustomers(customers, "", 20);
    if (category === "tasks") return searchTasks(productionTasks, "", 20);
    if (category === "designs") return searchDesigns(designs, "", 20);
    if (category === "files") {
      return [
        ...searchOrderProofsAndFiles(orders, "", 12),
        ...searchDesignFiles(designs, "", 8),
      ].slice(0, 20);
    }
    if (category === "colors") {
      return searchColorsAndPms(orders, designs, "", 20);
    }
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
  const designResults = searchDesigns(designs, trimmed);
  const fileResults = [
    ...searchOrderProofsAndFiles(orders, trimmed),
    ...searchDesignFiles(designs, trimmed),
  ];
  const colorResults = searchColorsAndPms(orders, designs, trimmed);
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
  if (category === "designs") return designResults;
  if (category === "files") return fileResults.slice(0, 20);
  if (category === "colors") return colorResults;
  if (category === "pages") return pageResults;
  if (category === "machines") return machineResults;
  if (category === "actions") return actionResults;

  const combined = [
    ...orderResults.slice(0, 4),
    ...designResults.slice(0, 3),
    ...fileResults.slice(0, 3),
    ...colorResults.slice(0, 3),
    ...customerResults.slice(0, 2),
    ...taskResults.slice(0, 2),
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
  designs: "Designs",
  files: "Files",
  colors: "Colors / PMS",
  pages: "Pages",
  machines: "Machines",
  actions: "Actions",
};
