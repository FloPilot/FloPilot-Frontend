"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Receipt,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ReportDialog } from "@/components/reports/report-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { ModuleGate } from "@/components/settings/module-gate";
import { Button } from "@/components/ui/button";
import {
  getReportsForContext,
  runReport,
  type CustomersListReportData,
} from "@/lib/reports/customer-reports";
import { downloadReportCsv } from "@/lib/reports/csv";
import { formatCurrency } from "@/lib/format";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import { sumActiveOrdersOpenBalance } from "@/lib/customer-list-summary";

type CategoryTone = "blue" | "amber" | "green" | "violet" | "neutral";

const CATEGORY_META: Record<
  string,
  { icon: LucideIcon; tone: CategoryTone }
> = {
  Export: { icon: FileSpreadsheet, tone: "blue" },
  Accounts: { icon: Users, tone: "neutral" },
  Billing: { icon: Receipt, tone: "amber" },
  Orders: { icon: BarChart3, tone: "green" },
  Products: { icon: BarChart3, tone: "violet" },
  Production: { icon: BarChart3, tone: "neutral" },
};

const TONE_STYLES: Record<
  CategoryTone,
  { iconWrap: string; iconColor: string; badge: string }
> = {
  blue: {
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    badge: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
  },
  amber: {
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    badge: "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]",
  },
  green: {
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
  },
  violet: {
    iconWrap: "bg-[#efe7fb]",
    iconColor: "text-[#6b3fb5]",
    badge: "border-[#d5c2f0] bg-[#f7f3fd] text-[#6b3fb5]",
  },
  neutral: {
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    badge: "border-[#e3e3e3] bg-[#fafafa] text-[#616161]",
  },
};

export default function ReportsPage() {
  return (
    <ModuleGate moduleKey="reports">
      <ReportsPageContent />
    </ModuleGate>
  );
}

function ReportsPageContent() {
  const { customers, activeOrders, shopDataLoading, shopDataError, getCustomerById } =
    useSchedule();
  const { settings } = useShopSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    "complete-customer-export"
  );

  const financials = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      getCustomer: getCustomerById,
    }),
    [settings.taxRate, settings.pricingMatrix, getCustomerById]
  );

  const reportData: CustomersListReportData = useMemo(
    () => ({ customers, orders: activeOrders, financials }),
    [customers, activeOrders, financials]
  );

  const reports = useMemo(() => getReportsForContext("reports_hub"), []);

  const openBalance = useMemo(
    () => sumActiveOrdersOpenBalance(activeOrders, financials),
    [activeOrders, financials]
  );

  const openReport = (reportId: string | null) => {
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

  if (shopDataLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={dashboardSectionTitleClass}>Reports</h1>
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              Preview and export customer, billing, and order data — ready for
              Excel, Google Sheets, or your accounting tools.
            </p>
          </div>
          <Button
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            onClick={() => openReport("complete-customer-export")}
            disabled={customers.length === 0}
          >
            <Download className="size-3.5" />
            Export all customers
          </Button>
        </div>

        {shopDataError && (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8f1f1f]">
            {shopDataError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Customers"
            value={customers.length.toLocaleString()}
            hint="In your shop directory"
            icon={Users}
          />
          <StatTile
            label="Orders"
            value={activeOrders.length.toLocaleString()}
            hint="Active orders across customers"
            icon={FileSpreadsheet}
          />
          <StatTile
            label="Open balance"
            value={formatCurrency(openBalance)}
            hint="Outstanding across orders"
            icon={Wallet}
            tone={openBalance > 0 ? "amber" : "neutral"}
          />
          <StatTile
            label="Reports available"
            value={String(reports.length)}
            hint="Exports ready to run"
            icon={BarChart3}
          />
        </div>

        <div>
          <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
            Available reports
          </h2>
          <p className="mt-1 text-sm text-[#616161]">
            Preview any report before exporting, or download the CSV directly.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const meta = CATEGORY_META[report.category] ?? CATEGORY_META.Export;
            const tone = TONE_STYLES[meta.tone];
            const Icon = meta.icon;
            const previewCount = runReport(report, reportData).rows.length;

            return (
              <div
                key={report.id}
                className={cn(dashboardCardClass, "flex flex-col p-5")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      tone.iconWrap
                    )}
                  >
                    <Icon
                      className={cn("size-4", tone.iconColor)}
                      strokeWidth={1.75}
                    />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      tone.badge
                    )}
                  >
                    {report.category}
                  </span>
                </div>

                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#303030]">
                  {report.title}
                </h3>
                <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[#616161]">
                  {report.description}
                </p>

                <p className="mt-3 text-xs tabular-nums text-[#616161]">
                  <span className="font-medium text-[#303030]">
                    {previewCount.toLocaleString()}
                  </span>{" "}
                  {previewCount === 1 ? "row" : "rows"} ready to export
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openReport(report.id)}
                    className={cn(
                      dashboardControlClass,
                      "h-9 flex-1 justify-center"
                    )}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => quickExport(report.id)}
                    disabled={previewCount === 0}
                    className={cn(
                      dashboardControlClass,
                      "h-9",
                      previewCount === 0 && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Download className="size-3.5" />
                    Export
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            dashboardCardClass,
            "flex flex-wrap items-center justify-between gap-3 p-5"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f1f1] text-[#303030]">
              <BarChart3 className="size-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
                Report library
              </h2>
              <p className="mt-0.5 text-[13px] text-[#616161]">
                Browse every export side by side and preview before downloading.
              </p>
            </div>
          </div>
          <Button
            className={cn(dashboardControlClass, "h-9")}
            onClick={() => openReport(null)}
          >
            <BarChart3 className="size-3.5" />
            Open library
          </Button>
        </div>
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

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: CategoryTone;
}) {
  const toneStyles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "relative flex min-h-[128px] flex-col rounded-lg border border-[#e3e3e3] bg-white p-4",
        dashboardElevatedShadow
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            toneStyles.iconWrap
          )}
        >
          <Icon
            className={cn("size-3.5", toneStyles.iconColor)}
            strokeWidth={1.75}
          />
        </div>
        <p className={dashboardKpiTitleClass}>{label}</p>
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5")}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-28 animate-pulse rounded bg-[#ebebeb]" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[#f1f1f1]" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[#ebebeb]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "min-h-[128px] rounded-lg border border-[#e3e3e3] bg-white p-4",
              dashboardElevatedShadow
            )}
          >
            <div className="flex items-center gap-2">
              <div className="size-8 animate-pulse rounded-lg bg-[#f1f1f1]" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-[#f1f1f1]" />
            </div>
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-[#ebebeb]" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#f1f1f1]" />
          </div>
        ))}
      </div>

      <div className="h-5 w-40 animate-pulse rounded bg-[#ebebeb]" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(dashboardCardClass, "flex flex-col p-5")}>
            <div className="flex items-start justify-between">
              <div className="size-9 animate-pulse rounded-lg bg-[#f1f1f1]" />
              <div className="h-5 w-16 animate-pulse rounded-md bg-[#f1f1f1]" />
            </div>
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-[#ebebeb]" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#f1f1f1]" />
            <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-[#f1f1f1]" />
            <div className="mt-4 h-9 w-full animate-pulse rounded-lg bg-[#f1f1f1]" />
          </div>
        ))}
      </div>
    </main>
  );
}
