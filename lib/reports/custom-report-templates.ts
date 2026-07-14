import type {
  ReportDataSourceId,
  SavedCustomReport,
} from "@/lib/reports/custom-report-builder";
import { createCustomReportId } from "@/lib/reports/custom-report-builder";

export type CustomReportTemplate = {
  id: string;
  title: string;
  description: string;
  sourceId: ReportDataSourceId;
  columns: string[];
  filters: SavedCustomReport["filters"];
};

export const CUSTOM_REPORT_TEMPLATES: CustomReportTemplate[] = [
  {
    id: "tpl-rush-orders",
    title: "Rush orders",
    description: "All rush-flagged orders with totals and in-hands dates.",
    sourceId: "orders",
    columns: [
      "orderNumber",
      "customer",
      "status",
      "inHandsDate",
      "rush",
      "total",
      "balance",
    ],
    filters: [{ field: "rush", operator: "equals", value: "Yes" }],
  },
  {
    id: "tpl-open-balances",
    title: "Orders with balance",
    description: "Orders that still have an outstanding balance.",
    sourceId: "orders",
    columns: ["orderNumber", "customer", "status", "total", "paid", "balance"],
    filters: [{ field: "balance", operator: "gte", value: "1" }],
  },
  {
    id: "tpl-low-stock",
    title: "Low stock SKUs",
    description: "Inventory at or below reorder point.",
    sourceId: "inventory",
    columns: ["name", "sku", "warehouse", "onHand", "reorderAt"],
    filters: [],
  },
  {
    id: "tpl-running-floor",
    title: "Active floor runs",
    description: "Job runs currently running or paused on the floor.",
    sourceId: "job_runs",
    columns: ["machine", "orderNumber", "status", "startedAt", "notes"],
    filters: [{ field: "status", operator: "contains", value: "Running" }],
  },
  {
    id: "tpl-open-tasks",
    title: "Open shop tasks",
    description: "Tasks not yet marked done, with assignee and due date.",
    sourceId: "tasks",
    columns: [
      "title",
      "assignee",
      "status",
      "dueDate",
      "orderNumber",
      "customer",
    ],
    filters: [{ field: "status", operator: "contains", value: "pending" }],
  },
  {
    id: "tpl-production-events",
    title: "Production events",
    description: "Every decoration event with assignee and workflow status.",
    sourceId: "production_events",
    columns: [
      "orderNumber",
      "customer",
      "event",
      "decoration",
      "assignee",
      "workflowStatus",
    ],
    filters: [],
  },
];

export function templateToSavedReport(
  template: CustomReportTemplate
): SavedCustomReport {
  const now = new Date().toISOString();
  return {
    id: createCustomReportId(),
    title: template.title,
    description: template.description,
    sourceId: template.sourceId,
    columns: template.columns,
    filters: template.filters,
    createdAt: now,
    updatedAt: now,
  };
}
