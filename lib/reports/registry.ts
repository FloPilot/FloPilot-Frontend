import type { ReportContext, ReportDefinition } from "@/lib/reports/types";
import type { CustomerDetailReportData } from "@/lib/reports/shop-report-data";
import {
  CUSTOMER_DETAIL_REPORTS,
  CUSTOMER_LIST_REPORTS,
} from "@/lib/reports/customer-reports";
import { OPERATIONS_REPORTS } from "@/lib/reports/operations-reports";
import { PRODUCTION_REPORTS } from "@/lib/reports/production-reports";
import { SALES_REPORTS } from "@/lib/reports/sales-reports";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { runShopReport } from "@/lib/reports/report-utils";
import { EXTENDED_REPORTS } from "@/lib/reports/extended-reports";

export const REPORT_CATEGORIES = [
  "Export",
  "Accounts",
  "Billing",
  "Orders",
  "Products",
  "Sales",
  "Production",
  "Team",
  "Inventory",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const ALL_HUB_REPORTS: ReportDefinition<ShopReportData>[] = [
  ...CUSTOMER_LIST_REPORTS,
  ...SALES_REPORTS,
  ...PRODUCTION_REPORTS,
  ...OPERATIONS_REPORTS,
  ...EXTENDED_REPORTS,
];

export function getReportsForContext(
  context: "customers_list" | "reports_hub"
): ReportDefinition<ShopReportData>[];
export function getReportsForContext(
  context: "customer_detail"
): ReportDefinition<CustomerDetailReportData>[];
export function getReportsForContext(context: ReportContext) {
  if (context === "customer_detail") return CUSTOMER_DETAIL_REPORTS;
  if (context === "customers_list") {
    return CUSTOMER_LIST_REPORTS.filter((report) =>
      report.contexts.includes("customers_list")
    );
  }
  return ALL_HUB_REPORTS;
}

export function getReportById(
  id: string
): ReportDefinition<ShopReportData> | undefined {
  return ALL_HUB_REPORTS.find((report) => report.id === id);
}

export function searchReports(
  query: string,
  reports: ReportDefinition<ShopReportData>[] = ALL_HUB_REPORTS
): ReportDefinition<ShopReportData>[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return reports;

  return reports.filter((report) => {
    const haystack = [
      report.title,
      report.description,
      report.category,
      report.id,
    ]
      .join(" ")
      .toLowerCase();
    return normalized.split(/\s+/).every((token) => haystack.includes(token));
  });
}

export function groupReportsByCategory(
  reports: ReportDefinition<ShopReportData>[]
): Map<string, ReportDefinition<ShopReportData>[]> {
  const groups = new Map<string, ReportDefinition<ShopReportData>[]>();
  for (const report of reports) {
    const list = groups.get(report.category) ?? [];
    list.push(report);
    groups.set(report.category, list);
  }
  return groups;
}

export { runShopReport as runReport, CUSTOMER_DETAIL_REPORTS };
