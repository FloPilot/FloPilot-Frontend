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
          "flex h-[min(88vh,820px)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0",
          "sm:max-w-6xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle className="text-lg font-semibold">
            {selectedReport ? selectedReport.title : "Reports"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {selectedReport
              ? selectedReport.description
              : `Choose a report for ${contextLabel}. Preview the data here, then export to CSV.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
          <aside
            className={cn(
              "min-h-0 border-b bg-muted/20 md:border-b-0 md:border-r",
              showPreview ? "hidden md:flex md:flex-col" : "flex flex-col"
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Available reports
              </p>
              <div className="space-y-5">
                {groupedReports.map(([category, categoryReports]) => {
                  const Icon = CATEGORY_ICONS[category] ?? BarChart3;
                  return (
                    <div key={category}>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
                              "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                              selectedReportId === report.id
                                ? "border-brand-primary/30 bg-brand-primary/5 shadow-sm"
                                : "border-transparent bg-white hover:border-border hover:bg-white"
                            )}
                          >
                            <p className="text-sm font-medium leading-snug">
                              {report.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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
                <div className="rounded-2xl bg-muted/60 p-4 text-muted-foreground">
                  <BarChart3 className="size-8" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Select a report to preview
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Pick a report from the list on the left. You will see a
                  preview here before exporting to CSV.
                </p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3 md:px-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full -ml-2 md:hidden"
                    onClick={() => setSelectedReportId(null)}
                  >
                    <ArrowLeft className="size-4" />
                    All reports
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
                      {result!.rows.length}
                    </span>{" "}
                    {result!.rows.length === 1 ? "row" : "rows"}
                    {hasMoreRows &&
                      ` · showing first ${PREVIEW_ROW_LIMIT} in preview`}
                  </p>
                  {result!.rows.length === 0 && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      No matching data
                    </span>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  {result!.rows.length === 0 ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-sm text-muted-foreground">
                      Nothing to export for this report right now.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_hsl(var(--border))]">
                        <TableRow>
                          {result!.columns.map((column) => (
                            <TableHead
                              key={column.key}
                              className={cn(
                                "whitespace-nowrap bg-white",
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
                                  "max-w-[280px] truncate whitespace-nowrap",
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

        <DialogFooter className="!mx-0 !mb-0 shrink-0 flex-row items-center justify-between gap-4 border-t bg-muted/30 px-6 py-4">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Exports open in Excel, Google Sheets, or your accounting tools.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button
              className="rounded-full"
              disabled={!result || result.rows.length === 0}
              onClick={() => result && downloadReportCsv(result)}
            >
              <Download className="size-4" />
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
