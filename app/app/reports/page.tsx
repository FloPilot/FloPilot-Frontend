"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Users } from "lucide-react";
import { ReportDialog } from "@/components/reports/report-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { StaffHeader } from "@/components/layout/staff-header";
import { ModuleGate } from "@/components/settings/module-gate";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getReportsForContext,
  runReport,
  type CustomersListReportData,
} from "@/lib/reports/customer-reports";
import { downloadReportCsv } from "@/lib/reports/csv";

const FEATURED_REPORT_IDS = [
  "complete-customer-export",
  "customer-profiles-export",
  "all-customer-orders",
];

export default function ReportsPage() {
  return (
    <ModuleGate moduleKey="reports">
      <ReportsPageContent />
    </ModuleGate>
  );
}

function ReportsPageContent() {
  const { customers, orders, shopDataLoading, shopDataError } = useSchedule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    "complete-customer-export"
  );

  const reportData: CustomersListReportData = useMemo(
    () => ({ customers, orders }),
    [customers, orders]
  );

  const reports = useMemo(() => getReportsForContext("reports_hub"), []);

  const featuredReports = useMemo(
    () =>
      FEATURED_REPORT_IDS.map((id) => reports.find((report) => report.id === id))
        .filter((report): report is NonNullable<typeof report> => Boolean(report)),
    [reports]
  );

  const openReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setDialogOpen(true);
  };

  const quickExport = (reportId: string) => {
    const report = reports.find((item) => item.id === reportId);
    if (!report) return;
    const result = runReport(report, reportData);
    if (result.rows.length > 0) {
      downloadReportCsv(result);
    }
  };

  return (
    <>
      <StaffHeader
        title="Reports"
        description="Export customer and order data for your shop"
        action={
          <Button
            className="rounded-full"
            onClick={() => openReport("complete-customer-export")}
            disabled={shopDataLoading || customers.length === 0}
          >
            <Download className="size-4" />
            Export all customers
          </Button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {shopDataError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {shopDataError}
          </p>
        )}

        {shopDataLoading ? (
          <AppLoadingScreen label="Loading shop data for reports…" />
        ) : (
          <p className="text-sm text-brand-muted">
            {customers.length} customer{customers.length !== 1 ? "s" : ""} ·{" "}
            {orders.length} order{orders.length !== 1 ? "s" : ""} in your shop
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featuredReports.map((report) => {
            const Icon =
              report.category === "Export" ? FileSpreadsheet : BarChart3;
            const previewCount = runReport(report, reportData).rows.length;

            return (
              <Card
                key={report.id}
                className="border-border/60 shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full shrink-0"
                      disabled={previewCount === 0 || shopDataLoading}
                      onClick={() => quickExport(report.id)}
                    >
                      <Download className="size-4" />
                      Export
                    </Button>
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-brand-muted tabular-nums">
                    {previewCount} {previewCount === 1 ? "row" : "rows"} ready
                    to export
                  </p>
                  <Button
                    variant="outline"
                    className="w-full bg-white rounded-full"
                    disabled={shopDataLoading}
                    onClick={() => openReport(report.id)}
                  >
                    Preview report
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-primary" />
              <CardTitle className="text-base">All customer reports</CardTitle>
            </div>
            <CardDescription>
              Browse every export — directory, balances, order history, line
              items, and production events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="rounded-full"
              variant="outline"
              disabled={shopDataLoading}
              onClick={() => {
                setSelectedReportId(null);
                setDialogOpen(true);
              }}
            >
              <BarChart3 className="size-4" />
              Open report library
            </Button>
          </CardContent>
        </Card>
      </main>

      <ReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contextLabel="your shop"
        reports={reports}
        data={reportData}
        initialReportId={selectedReportId}
      />
    </>
  );
}
