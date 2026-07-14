import { differenceInMinutes, parseISO } from "date-fns";
import {
  documentTypeLabel,
  orderStatusLabel,
  reportTimestamp,
  slugifyFilename,
} from "@/lib/reports/format";
import type { ReportDefinition, ReportResult } from "@/lib/reports/types";
import type { Order } from "@/types";
import { excludeArchivedOrders } from "@/lib/order-archive";
import type { ShopReportData } from "@/lib/reports/shop-report-data";

export function buildResult(
  definition: Pick<ReportDefinition, "id" | "title" | "description">,
  columns: ReportResult["columns"],
  rows: ReportResult["rows"],
  filenameBase: string
): ReportResult {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    columns,
    rows,
    filename: `${filenameBase}-${reportTimestamp()}.csv`,
  };
}

export function normalizeShopReportData(data: ShopReportData): ShopReportData {
  return {
    ...data,
    orders: excludeArchivedOrders(data.orders),
  };
}

export function runShopReport(
  report: ReportDefinition<ShopReportData>,
  data: ShopReportData
): ReportResult {
  return report.run(normalizeShopReportData(data));
}

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function runDurationMinutes(
  startedAt?: string,
  finishedAt?: string
): number | null {
  if (!startedAt) return null;
  const end = finishedAt ? parseISO(finishedAt) : new Date();
  return Math.max(0, differenceInMinutes(end, parseISO(startedAt)));
}

export function orderDocumentType(order: Order): string {
  return documentTypeLabel(order.type);
}

export { orderStatusLabel, reportTimestamp, slugifyFilename };
