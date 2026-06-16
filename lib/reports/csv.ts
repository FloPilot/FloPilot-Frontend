import type { ReportResult } from "@/lib/reports/types";

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function reportToCsv(result: ReportResult): string {
  const header = result.columns.map((col) => escapeCsvCell(col.label)).join(",");
  const body = result.rows
    .map((row) =>
      result.columns
        .map((col) => escapeCsvCell(row[col.key] ?? ""))
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadReportCsv(result: ReportResult): void {
  const csv = reportToCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename.endsWith(".csv")
    ? result.filename
    : `${result.filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
