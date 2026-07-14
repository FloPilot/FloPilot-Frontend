import { format, parseISO } from "date-fns";
import { formatCurrency, formatDate, decorationLabel } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { orderStatusLabel } from "@/lib/reports/report-utils";
import type { ReportColumn, ReportResult } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { getRunForBlock, STATION_RUN_STATUS_LABELS } from "@/lib/station-runs";
import { slugifyFilename, reportTimestamp } from "@/lib/reports/format";
import {
  flattenShipmentsFromOrders,
  flattenTasksFromOrders,
} from "@/lib/reports/filter-shop-data";

export type ReportDataSourceId =
  | "orders"
  | "line_items"
  | "customers"
  | "production_events"
  | "schedule_blocks"
  | "job_runs"
  | "machines"
  | "team_members"
  | "inventory"
  | "purchase_orders"
  | "tasks"
  | "shipments"
  | "machine_issues";

export type ReportFieldType = "text" | "number" | "date" | "currency" | "boolean";

export type ReportFieldDef = {
  key: string;
  label: string;
  type: ReportFieldType;
};

export type ReportDataSourceDef = {
  id: ReportDataSourceId;
  label: string;
  description: string;
  fields: ReportFieldDef[];
};

export type CustomReportFilter = {
  field: string;
  operator: "equals" | "contains" | "gte" | "lte";
  value: string;
};

export type SavedCustomReport = {
  id: string;
  title: string;
  description: string;
  sourceId: ReportDataSourceId;
  columns: string[];
  filters: CustomReportFilter[];
  createdAt: string;
  updatedAt: string;
};

export const REPORT_DATA_SOURCES: ReportDataSourceDef[] = [
  {
    id: "orders",
    label: "Orders",
    description: "One row per order with status, dates, and totals.",
    fields: [
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "createdAt", label: "Created", type: "date" },
      { key: "inHandsDate", label: "In-hands", type: "date" },
      { key: "rush", label: "Rush", type: "boolean" },
      { key: "total", label: "Total", type: "currency" },
      { key: "paid", label: "Paid", type: "currency" },
      { key: "balance", label: "Balance", type: "currency" },
      { key: "eventCount", label: "Events", type: "number" },
    ],
  },
  {
    id: "line_items",
    label: "Line items",
    description: "One row per garment line with sizes and quantities.",
    fields: [
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "product", label: "Product", type: "text" },
      { key: "brand", label: "Brand", type: "text" },
      { key: "color", label: "Color", type: "text" },
      { key: "sizes", label: "Sizes", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unitCost", label: "Unit cost", type: "currency" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer directory with contact info and lifetime stats.",
    fields: [
      { key: "company", label: "Company", type: "text" },
      { key: "name", label: "Contact", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State", type: "text" },
      { key: "totalOrders", label: "Total orders", type: "number" },
      { key: "lifetimeValue", label: "Lifetime value", type: "currency" },
    ],
  },
  {
    id: "production_events",
    label: "Production events",
    description: "Decoration events with workflow and assignment data.",
    fields: [
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "event", label: "Event", type: "text" },
      { key: "decoration", label: "Decoration", type: "text" },
      { key: "assignee", label: "Assignee", type: "text" },
      { key: "workflowStatus", label: "Workflow status", type: "text" },
      { key: "inHandsDate", label: "In-hands", type: "date" },
      { key: "rush", label: "Rush", type: "boolean" },
    ],
  },
  {
    id: "schedule_blocks",
    label: "Schedule blocks",
    description: "Calendar blocks with machine and timing.",
    fields: [
      { key: "machine", label: "Machine", type: "text" },
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "event", label: "Event", type: "text" },
      { key: "pieces", label: "Pieces", type: "number" },
      { key: "startAt", label: "Start", type: "date" },
      { key: "endAt", label: "End", type: "date" },
    ],
  },
  {
    id: "job_runs",
    label: "Job runs",
    description: "Floor run status and timing.",
    fields: [
      { key: "machine", label: "Machine", type: "text" },
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "startedAt", label: "Started", type: "date" },
      { key: "finishedAt", label: "Finished", type: "date" },
      { key: "notes", label: "Notes count", type: "number" },
    ],
  },
  {
    id: "machines",
    label: "Machines",
    description: "Equipment list with capacity and status.",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "active", label: "Active", type: "boolean" },
      { key: "capacityPerHour", label: "Capacity/hr", type: "number" },
      { key: "statusMessage", label: "Status", type: "text" },
    ],
  },
  {
    id: "team_members",
    label: "Team members",
    description: "Staff roster with roles.",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "status", label: "Status", type: "text" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock levels and reorder points.",
    fields: [
      { key: "name", label: "Item", type: "text" },
      { key: "sku", label: "SKU", type: "text" },
      { key: "warehouse", label: "Warehouse", type: "text" },
      { key: "onHand", label: "On hand", type: "number" },
      { key: "reorderAt", label: "Reorder at", type: "number" },
    ],
  },
  {
    id: "purchase_orders",
    label: "Purchase orders",
    description: "PO headers with vendor and totals.",
    fields: [
      { key: "number", label: "PO #", type: "text" },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "total", label: "Total", type: "currency" },
      { key: "orderedAt", label: "Ordered", type: "date" },
    ],
  },
  {
    id: "tasks",
    label: "Shop tasks",
    description: "Tasks with assignee, department, and due dates.",
    fields: [
      { key: "title", label: "Task", type: "text" },
      { key: "assignee", label: "Assignee", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
    ],
  },
  {
    id: "shipments",
    label: "Shipments",
    description: "Shipments and pickups with tracking and status.",
    fields: [
      { key: "orderNumber", label: "Order #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "method", label: "Method", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "destination", label: "Destination", type: "text" },
      { key: "tracking", label: "Tracking", type: "text" },
    ],
  },
  {
    id: "machine_issues",
    label: "Machine issues",
    description: "Floor issue reports by machine.",
    fields: [
      { key: "machine", label: "Machine", type: "text" },
      { key: "issueType", label: "Type", type: "text" },
      { key: "message", label: "Message", type: "text" },
      { key: "reportedAt", label: "Reported", type: "date" },
      { key: "tookOffline", label: "Took offline", type: "boolean" },
    ],
  },
];

function flattenOrders(data: ShopReportData): Record<string, string | number>[] {
  return data.orders.map((order) => ({
    orderNumber: formatOrderDisplayLine(order),
    customer: order.customerName,
    status: orderStatusLabel(order.status),
    type: order.type,
    createdAt: formatDate(order.createdAt),
    inHandsDate: formatDate(order.inHandsDate),
    rush: order.rush ? "Yes" : "No",
    total: order.total ?? 0,
    paid: order.paid ?? 0,
    balance: order.balance ?? 0,
    eventCount: order.jobs.reduce(
      (sum, job) => sum + job.imprints.length,
      0
    ),
  }));
}

function flattenLineItems(data: ShopReportData): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  for (const order of data.orders) {
    for (const item of order.lineItems) {
      rows.push({
        orderNumber: formatOrderDisplayLine(order),
        customer: order.customerName,
        product: item.productName,
        brand: item.brand,
        color: item.color,
        sizes: item.sizes.map((row) => `${row.size}:${row.quantity}`).join(", "),
        quantity: item.sizes.reduce((sum, row) => sum + row.quantity, 0),
        unitCost: item.unitCost ?? 0,
      });
    }
  }
  return rows;
}

function flattenCustomers(data: ShopReportData): Record<string, string | number>[] {
  return data.customers.map((customer) => ({
    company: customer.company,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    state: customer.state,
    totalOrders: customer.totalOrders,
    lifetimeValue: customer.lifetimeValue,
  }));
}

function flattenProductionEvents(
  data: ShopReportData
): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  for (const order of data.orders) {
    for (const job of order.jobs) {
      for (const imprint of job.imprints) {
        rows.push({
          orderNumber: formatOrderDisplayLine(order),
          customer: order.customerName,
          event: imprint.label,
          decoration: decorationLabel(imprint.decoration),
          assignee: imprint.workflow?.assignee ?? "",
          workflowStatus: imprint.workflow?.status ?? "",
          inHandsDate: formatDate(order.inHandsDate),
          rush: order.rush ? "Yes" : "No",
        });
      }
    }
  }
  return rows;
}

function flattenScheduleBlocks(
  data: ShopReportData
): Record<string, string | number>[] {
  const machineMap = new Map(data.machines.map((m) => [m.id, m.name]));
  return data.scheduleBlocks.map((block) => ({
    machine: machineMap.get(block.machineId) ?? block.machineId,
    orderNumber: block.orderNumber,
    customer: block.customerName,
    event: block.imprintLabel,
    pieces: block.pieceCount ?? 0,
    startAt: format(parseISO(block.startAt), "MMM d, yyyy h:mm a"),
    endAt: format(parseISO(block.endAt), "MMM d, yyyy h:mm a"),
  }));
}

function flattenJobRuns(data: ShopReportData): Record<string, string | number>[] {
  const blockMap = new Map(data.scheduleBlocks.map((b) => [b.id, b]));
  const machineMap = new Map(data.machines.map((m) => [m.id, m.name]));

  return data.jobRuns.map((run) => {
    const block = blockMap.get(run.scheduleBlockId);
    return {
      machine: machineMap.get(run.machineId) ?? run.machineId,
      orderNumber: block?.orderNumber ?? "",
      status: STATION_RUN_STATUS_LABELS[run.status],
      startedAt: run.startedAt
        ? format(parseISO(run.startedAt), "MMM d, yyyy h:mm a")
        : "",
      finishedAt: run.finishedAt
        ? format(parseISO(run.finishedAt), "MMM d, yyyy h:mm a")
        : "",
      notes: run.notes.length,
    };
  });
}

function flattenMachines(data: ShopReportData): Record<string, string | number>[] {
  return data.machines.map((machine) => ({
    name: machine.name,
    type: machine.type,
    active: machine.active ? "Yes" : "No",
    capacityPerHour: machine.capacityPerHour,
    statusMessage: machine.statusMessage ?? "",
  }));
}

function flattenTeamMembers(
  data: ShopReportData
): Record<string, string | number>[] {
  return data.teamMembers.map((member) => ({
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status ?? "active",
  }));
}

function flattenInventory(data: ShopReportData): Record<string, string | number>[] {
  return data.inventory.map((item) => ({
    name: item.name,
    sku: item.sku,
    warehouse: item.warehouse,
    onHand: item.onHand,
    reorderAt: item.reorderAt,
  }));
}

function flattenPurchaseOrders(
  data: ShopReportData
): Record<string, string | number>[] {
  return data.purchaseOrders.map((po) => ({
    number: po.number,
    vendor: po.supplier,
    status: po.status,
    total: po.total,
    orderedAt: po.orderedAt ? formatDate(po.orderedAt) : "",
  }));
}

function flattenTasks(data: ShopReportData): Record<string, string | number>[] {
  return flattenTasksFromOrders(data.orders).map((task) => ({
    title: task.title,
    assignee: task.assignee,
    department: task.department,
    status: task.status,
    dueDate: formatDate(task.dueDate),
    orderNumber: task.orderCustomLabel
      ? `${task.orderNumber} — ${task.orderCustomLabel}`
      : task.orderNumber,
    customer: task.customerName,
  }));
}

function flattenShipments(
  data: ShopReportData
): Record<string, string | number>[] {
  return flattenShipmentsFromOrders(data.orders).map((shipment) => ({
    orderNumber: shipment.orderNumber,
    customer: shipment.customerName,
    method: shipment.method,
    status: shipment.status,
    destination: shipment.destination,
    tracking: shipment.trackingNumber ?? "",
  }));
}

function flattenMachineIssues(
  data: ShopReportData
): Record<string, string | number>[] {
  const machineMap = new Map(data.machines.map((m) => [m.id, m.name]));
  return data.issueReports.map((issue) => ({
    machine: machineMap.get(issue.machineId) ?? issue.machineId,
    issueType: issue.issueType,
    message: issue.message,
    reportedAt: format(parseISO(issue.reportedAt), "MMM d, yyyy h:mm a"),
    tookOffline: issue.takeOffline ? "Yes" : "No",
  }));
}

const FLATTENERS: Record<
  ReportDataSourceId,
  (data: ShopReportData) => Record<string, string | number>[]
> = {
  orders: flattenOrders,
  line_items: flattenLineItems,
  customers: flattenCustomers,
  production_events: flattenProductionEvents,
  schedule_blocks: flattenScheduleBlocks,
  job_runs: flattenJobRuns,
  machines: flattenMachines,
  team_members: flattenTeamMembers,
  inventory: flattenInventory,
  purchase_orders: flattenPurchaseOrders,
  tasks: flattenTasks,
  shipments: flattenShipments,
  machine_issues: flattenMachineIssues,
};

function parseComparable(value: string | number): number | string {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed).getTime();
  }
  const numeric = Number(trimmed.replace(/[^0-9.-]/g, ""));
  if (!Number.isNaN(numeric) && trimmed.match(/[0-9]/)) return numeric;
  return trimmed.toLowerCase();
}

function matchesFilter(
  row: Record<string, string | number>,
  filter: CustomReportFilter
): boolean {
  const raw = row[filter.field];
  if (raw === undefined) return false;
  const value = String(raw);
  const needle = filter.value.trim();
  if (!needle) return true;

  switch (filter.operator) {
    case "contains":
      return value.toLowerCase().includes(needle.toLowerCase());
    case "equals":
      return value.toLowerCase() === needle.toLowerCase();
    case "gte":
      return (
        parseComparable(value) >= parseComparable(needle)
      );
    case "lte":
      return (
        parseComparable(value) <= parseComparable(needle)
      );
    default:
      return true;
  }
}

function formatCellValue(
  value: string | number,
  type: ReportFieldType
): string | number {
  if (type === "currency" && typeof value === "number") {
    return formatCurrency(value);
  }
  if (type === "boolean") {
    return value === "Yes" || value === 1 || value === "1" ? "Yes" : "No";
  }
  return value;
}

export function getDataSourceDef(
  sourceId: ReportDataSourceId
): ReportDataSourceDef {
  return REPORT_DATA_SOURCES.find((source) => source.id === sourceId)!;
}

export function runCustomReport(
  config: Pick<SavedCustomReport, "title" | "description" | "sourceId" | "columns" | "filters">,
  data: ShopReportData
): ReportResult {
  const source = getDataSourceDef(config.sourceId);
  const flatten = FLATTENERS[config.sourceId];
  let rows = flatten(data);

  if (config.filters.length > 0) {
    rows = rows.filter((row) =>
      config.filters.every((filter) => matchesFilter(row, filter))
    );
  }

  const selectedFields = config.columns.length
    ? source.fields.filter((field) => config.columns.includes(field.key))
    : source.fields;

  const columns: ReportColumn[] = selectedFields.map((field) => ({
    key: field.key,
    label: field.label,
    align:
      field.type === "number" || field.type === "currency" ? "right" : "left",
  }));

  const formattedRows = rows.map((row) => {
    const next: Record<string, string | number> = {};
    for (const field of selectedFields) {
      next[field.key] = formatCellValue(row[field.key] ?? "", field.type);
    }
    return next;
  });

  return {
    id: `custom-${config.sourceId}`,
    title: config.title,
    description: config.description,
    columns,
    rows: formattedRows,
    filename: `${slugifyFilename(config.title)}-${reportTimestamp()}.csv`,
  };
}

export function createCustomReportId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
