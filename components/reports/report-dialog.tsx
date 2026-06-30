"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileSpreadsheet,
  Receipt,
  Shirt,
  Users,
  Wrench,
} from "lucide-react";
import { downloadReportCsv } from "@/lib/reports/csv";
import { runReport } from "@/lib/reports/customer-reports";
import type { ReportDefinition, ReportResult } from "@/lib/reports/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const PREVIEW_ROW_LIMIT = 25;

const CATEGORY_ICONS: Record<string, typeof BarChart3> = {
  Export: Download,
  Accounts: Users,
  Billing: Receipt,
  Orders: FileSpreadsheet,
  Products: Shirt,
  Production: Wrench,
};

export function ReportDialog<TData>({
  open,
  onOpenChange,
  contextLabel,
  reports,
  data,
  initialReportId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextLabel: string;
  reports: ReportDefinition<TData>[];
  data: TData;
  initialReportId?: string | null;
}) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    initialReportId
  );

  useEffect(() => {
    if (open) {
      setSelectedReportId(initialReportId);
    }
  }, [open, initialReportId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId]
  );

  const result = useMemo<ReportResult | null>(() => {
    if (!selectedReport) return null;
    return runReport(selectedReport, data);
  }, [selectedReport, data]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportDefinition<TData>[]>();
    for (const report of reports) {
      const list = groups.get(report.category) ?? [];
      list.push(report);
      groups.set(report.category, list);
    }
    return [...groups.entries()];
  }, [reports]);

  const previewRows = result?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const hasMoreRows = (result?.rows.length ?? 0) > PREVIEW_ROW_LIMIT;
  const showPreview = Boolean(selectedReport && result);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedReportId(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(88vh,820px)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-6xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 pr-14 text-left">
          <DialogTitle className={dashboardTaskTitleClass}>
            {selectedReport ? selectedReport.title : "Reports"}
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            {selectedReport
              ? selectedReport.description
              : `Choose a report for ${contextLabel}. Preview the data here, then export to CSV.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
          <aside
            className={cn(
              "min-h-0 border-b border-[#ebebeb] bg-[#fafafa] md:border-b-0 md:border-r",
              showPreview ? "hidden md:flex md:flex-col" : "flex flex-col"
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Available reports
              </p>
              <div className="space-y-5">
                {groupedReports.map(([category, categoryReports]) => {
                  const Icon = CATEGORY_ICONS[category] ?? BarChart3;
                  return (
                    <div key={category}>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#616161]">
                        <Icon className="size-3.5 shrink-0" />
                        {category}
                      </p>
                      <div className="space-y-1.5">
                        {categoryReports.map((report) => (
                          <button
                            key={report.id}
                            type="button"
                            onClick={() => setSelectedReportId(report.id)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                              selectedReportId === report.id
                                ? "border-[#2c6ecb] bg-[#f4f7fd]"
                                : "border-transparent bg-white hover:border-[#e3e3e3]"
                            )}
                          >
                            <p className="text-sm font-medium leading-snug text-[#303030]">
                              {report.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                              {report.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-white">
            {!showPreview ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
                <div className="rounded-lg bg-[#f1f1f1] p-4 text-[#616161]">
                  <BarChart3 className="size-8" />
                </div>
                <p className="mt-4 text-sm font-medium text-[#303030]">
                  Select a report to preview
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#616161]">
                  Pick a report from the list on the left. You will see a
                  preview here before exporting to CSV.
                </p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-[#ebebeb] px-4 py-3 md:px-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 rounded-lg text-[#616161] md:hidden"
                    onClick={() => setSelectedReportId(null)}
                  >
                    <ArrowLeft className="size-4" />
                    All reports
                  </Button>
                  <p className="text-sm text-[#616161]">
                    <span className="font-medium tabular-nums text-[#303030]">
                      {result!.rows.length}
                    </span>{" "}
                    {result!.rows.length === 1 ? "row" : "rows"}
                    {hasMoreRows &&
                      ` · showing first ${PREVIEW_ROW_LIMIT} in preview`}
                  </p>
                  {result!.rows.length === 0 && (
                    <span className="rounded-md bg-[#f1f1f1] px-2.5 py-1 text-xs font-medium text-[#616161]">
                      No matching data
                    </span>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  {result!.rows.length === 0 ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-sm text-[#616161]">
                      Nothing to export for this report right now.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#ebebeb]">
                        <TableRow>
                          {result!.columns.map((column) => (
                            <TableHead
                              key={column.key}
                              className={cn(
                                "whitespace-nowrap bg-white text-[#616161]",
                                column.align === "right" && "text-right"
                              )}
                            >
                              {column.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, index) => (
                          <TableRow key={index}>
                            {result!.columns.map((column) => (
                              <TableCell
                                key={column.key}
                                className={cn(
                                  "max-w-[280px] truncate whitespace-nowrap text-[#303030]",
                                  column.align === "right" &&
                                    "text-right tabular-nums"
                                )}
                              >
                                {row[column.key] ?? ""}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <DialogFooter className="!mx-0 !mb-0 shrink-0 flex-row items-center justify-between gap-4 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <p className="hidden text-xs text-[#616161] sm:block">
            Exports open in Excel, Google Sheets, or your accounting tools.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row">
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={!result || result.rows.length === 0}
              onClick={() => result && downloadReportCsv(result)}
            >
              <Download className="size-3.5" />
              Export CSV
              {result && result.rows.length > 0
                ? ` (${result.rows.length})`
                : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
