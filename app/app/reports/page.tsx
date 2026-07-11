"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { CustomReportBuilderDialog } from "@/components/reports/custom-report-builder-dialog";
import { ReportAiFloatingWidget } from "@/components/reports/report-ai-floating-widget";
import { ReportDateRangePicker } from "@/components/reports/report-date-range-picker";
import { ReportDialog } from "@/components/reports/report-dialog";
import { ReportInsightsRow } from "@/components/reports/report-insights-row";
import { ModuleGate } from "@/components/settings/module-gate";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShopReportData } from "@/hooks/use-shop-report-data";
import { filterShopDataByDateRange } from "@/lib/reports/filter-shop-data";
import { runCustomReport } from "@/lib/reports/custom-report-builder";
import {
  deleteCustomReport,
  loadSavedCustomReports,
} from "@/lib/reports/custom-report-storage";
import type { SavedCustomReport } from "@/lib/reports/custom-report-builder";
import { REPORT_DATA_SOURCES } from "@/lib/reports/custom-report-builder";
import { downloadReportCsv } from "@/lib/reports/csv";
import { formatCurrency } from "@/lib/format";
import { sumActiveOrdersOpenBalance } from "@/lib/customer-list-summary";
import { buildReportInsights } from "@/lib/reports/report-insights";
import {
  defaultReportDateRange,
  formatReportDateRangeLabel,
} from "@/lib/reports/report-date-range";
import type { ReportDateRange } from "@/lib/reports/report-date-range";
import {
  getReportById,
  getReportsForContext,
  groupReportsByCategory,
  runReport,
  searchReports,
} from "@/lib/reports/registry";
import type { ReportDefinition } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
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

type CategoryTone = "blue" | "amber" | "green" | "violet" | "neutral" | "purple";

const FEATURED_REPORT_IDS = [
  "machine-productivity",
  "employee-productivity",
  "revenue-by-order",
  "sales-by-customer",
  "schedule-detail",
  "rush-orders",
];

const CATEGORY_META: Record<string, { icon: LucideIcon; tone: CategoryTone }> = {
  Export: { icon: FileSpreadsheet, tone: "blue" },
  Accounts: { icon: Users, tone: "neutral" },
  Billing: { icon: FileSpreadsheet, tone: "amber" },
  Orders: { icon: BarChart3, tone: "green" },
  Products: { icon: BarChart3, tone: "violet" },
  Sales: { icon: Wallet, tone: "green" },
  Production: { icon: Wrench, tone: "blue" },
  Team: { icon: Users, tone: "purple" },
  Inventory: { icon: FileSpreadsheet, tone: "amber" },
  Custom: { icon: Sparkles, tone: "purple" },
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
  purple: {
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

const CATEGORY_FILTERS = [
  "All",
  "Sales",
  "Production",
  "Team",
  "Inventory",
  "Accounts",
  "Orders",
  "Custom",
] as const;

export default function ReportsPage() {
  return (
    <ModuleGate moduleKey="reports">
      <ReportsPageContent />
    </ModuleGate>
  );
}

function ReportsPageContent() {
  const { getIdToken, profile } = useAuth();
  const tenantId =
    profile?.type === "staff" ? profile.tenant.id : "";
  const { data: rawData, loading, error } = useShopReportData();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dateRange, setDateRange] = useState<ReportDateRange>(
    defaultReportDateRange()
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof CATEGORY_FILTERS)[number]>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [customReports, setCustomReports] = useState<SavedCustomReport[]>([]);
  const [editingCustom, setEditingCustom] = useState<SavedCustomReport | null>(
    null
  );

  useEffect(() => {
    setCustomReports(loadSavedCustomReports());
  }, []);

  const data = useMemo(
    () => filterShopDataByDateRange(rawData, dateRange),
    [rawData, dateRange]
  );

  const reports = useMemo(() => getReportsForContext("reports_hub"), []);

  const dialogReports = useMemo(() => {
    const customDefs: ReportDefinition<ShopReportData>[] = customReports.map(
      (custom) => ({
        id: custom.id,
        title: custom.title,
        description: custom.description,
        category: "Custom",
        contexts: ["reports_hub"] as const,
        run: (reportData: ShopReportData) => runCustomReport(custom, reportData),
      })
    );
    return [...reports, ...customDefs];
  }, [reports, customReports]);

  const featuredReports = useMemo(
    () =>
      FEATURED_REPORT_IDS.map((id) => getReportById(id)).filter(
        (report): report is ReportDefinition<ShopReportData> => Boolean(report)
      ),
    []
  );

  const insights = useMemo(() => buildReportInsights(data), [data]);

  const openBalance = useMemo(
    () =>
      data.financials
        ? sumActiveOrdersOpenBalance(data.orders, data.financials)
        : data.orders.reduce((sum, order) => sum + (order.balance ?? 0), 0),
    [data]
  );

  const filteredReports = useMemo(() => {
    let list = searchReports(search, reports);
    if (categoryFilter !== "All" && categoryFilter !== "Custom") {
      list = list.filter((report) => report.category === categoryFilter);
    }
    if (categoryFilter === "Custom") {
      list = [];
    }
    return list;
  }, [search, reports, categoryFilter]);

  const grouped = useMemo(
    () => groupReportsByCategory(filteredReports),
    [filteredReports]
  );

  const openReport = (reportId: string | null) => {
    setSelectedReportId(reportId);
    setDialogOpen(true);
  };

  const quickExport = (report: ReportDefinition<ShopReportData>) => {
    const result = runReport(report, data);
    if (result.rows.length > 0) downloadReportCsv(result);
  };

  const quickExportCustom = (custom: SavedCustomReport) => {
    const result = runCustomReport(custom, data);
    if (result.rows.length > 0) downloadReportCsv(result);
  };

  const showCustom =
    categoryFilter === "All" || categoryFilter === "Custom";

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={dashboardSectionTitleClass}>Reports</h1>
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              Run any report across your shop — sales, production, team,
              inventory, and custom exports. Ask the insights assistant for
              answers and one-click reports.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
            <div className="flex flex-wrap gap-2">
              <Button
                className={cn(dashboardControlClass, "h-9 gap-1.5")}
                onClick={() => setAssistantOpen(true)}
              >
                <Sparkles className="size-3.5" />
                Ask assistant
              </Button>
              <Button
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => {
                  setEditingCustom(null);
                  setBuilderOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Custom report
              </Button>
              <Button
                className={cn(dashboardPrimaryButtonClass, "h-9")}
                onClick={() => openReport("machine-productivity")}
              >
                <Download className="size-3.5" />
                Machine productivity
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8f1f1f]">
            {error}
          </p>
        )}

        {dateRange.preset !== "all_time" && (
          <p className="text-xs text-[#616161]">
            Showing data for{" "}
            <span className="font-medium text-[#303030]">
              {formatReportDateRangeLabel(dateRange)}
            </span>
          </p>
        )}

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Data sources"
            value={String(REPORT_DATA_SOURCES.length)}
            hint="Orders, machines, team, tasks & more"
            icon={BarChart3}
          />
          <StatTile
            label="Built-in reports"
            value={String(reports.length)}
            hint="Ready to preview and export"
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
            label="Custom saved"
            value={String(customReports.length)}
            hint="Your saved report templates"
            icon={Sparkles}
            tone="purple"
          />
        </div>

        <ReportInsightsRow
          insights={insights}
          onSelect={(insight) => insight.reportId && openReport(insight.reportId)}
        />

        <div className="min-w-0 space-y-4">
          {/* Library */}
          <section className="min-w-0 space-y-4">
            {/* Featured */}
            {categoryFilter === "All" && !search.trim() && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[#303030]">
                  Popular reports
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredReports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => openReport(report.id)}
                      className={cn(
                        dashboardCardClass,
                        "group p-4 text-left transition-colors hover:border-[#c4d7f2] hover:bg-[#f4f7fd]"
                      )}
                    >
                      <p className="text-[13px] font-semibold text-[#303030] group-hover:text-[#2c6ecb]">
                        {report.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-[#616161]">
                        {report.description}
                      </p>
                      <p className="mt-2 text-[11px] tabular-nums text-[#616161]">
                        {runReport(report, data).rows.length.toLocaleString()}{" "}
                        rows
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Report library
                </h2>
                <p className="mt-0.5 text-sm text-[#616161]">
                  Browse, preview, and export any report.
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reports…"
                  className="h-9 border-[#e3e3e3] bg-white pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    categoryFilter === category
                      ? "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
                      : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c4d7f2]"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Custom reports */}
            {showCustom && customReports.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#303030]">
                  Your custom reports
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {customReports.map((custom) => (
                    <ReportCard
                      key={custom.id}
                      title={custom.title}
                      description={custom.description}
                      category="Custom"
                      rowCount={runCustomReport(custom, data).rows.length}
                      onPreview={() => openReport(custom.id)}
                      onExport={() => quickExportCustom(custom)}
                      onEdit={() => {
                        setEditingCustom(custom);
                        setBuilderOpen(true);
                      }}
                      onDelete={() =>
                        setCustomReports(deleteCustomReport(custom.id))
                      }
                      isCustom
                    />
                  ))}
                </div>
              </div>
            )}

            {showCustom && customReports.length === 0 && categoryFilter === "Custom" && (
              <EmptyCustomReports onCreate={() => setBuilderOpen(true)} />
            )}

            {[...grouped.entries()].map(([category, categoryReports]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-[#303030]">
                  {category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      title={report.title}
                      description={report.description}
                      category={report.category}
                      rowCount={runReport(report, data).rows.length}
                      onPreview={() => openReport(report.id)}
                      onExport={() => quickExport(report)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredReports.length === 0 &&
              categoryFilter !== "Custom" &&
              (categoryFilter !== "All" || customReports.length === 0) && (
                <div
                  className={cn(
                    dashboardCardClass,
                    "flex flex-col items-center px-6 py-12 text-center"
                  )}
                >
                  <p className="text-sm font-medium text-[#303030]">
                    No reports match your search
                  </p>
                  <p className="mt-1 text-sm text-[#616161]">
                    Try a different keyword or create a custom report.
                  </p>
                  <Button
                    className={cn(dashboardControlClass, "mt-4 h-9")}
                    onClick={() => setBuilderOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    Create custom report
                  </Button>
                </div>
              )}
          </section>
        </div>
      </main>

      {tenantId && (
        <ReportAiFloatingWidget
          data={data}
          dateRange={dateRange}
          getIdToken={getIdToken}
          tenantId={tenantId}
          onOpenReport={openReport}
          onCustomReportSaved={setCustomReports}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />
      )}

      <ReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contextLabel="your shop"
        reports={dialogReports}
        data={data}
        initialReportId={selectedReportId}
      />

      <CustomReportBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        data={data}
        initialReport={editingCustom}
        onSaved={setCustomReports}
      />
    </>
  );
}

function EmptyCustomReports({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className={cn(
        dashboardCardClass,
        "flex flex-col items-center border-dashed px-6 py-10 text-center"
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#f7f3fd] text-[#6b3fb5]">
        <Sparkles className="size-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[#303030]">
        No custom reports yet
      </p>
      <p className="mt-1 max-w-sm text-sm text-[#616161]">
        Build a report from any data source — orders, production events,
        inventory, and more. Save it here for one-click export.
      </p>
      <Button
        className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
        onClick={onCreate}
      >
        <Plus className="size-3.5" />
        Create your first report
      </Button>
    </div>
  );
}

function ReportCard({
  title,
  description,
  category,
  rowCount,
  onPreview,
  onExport,
  onEdit,
  onDelete,
  isCustom = false,
}: {
  title: string;
  description: string;
  category: string;
  rowCount: number;
  onPreview: () => void;
  onExport: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.Export;
  const tone = TONE_STYLES[meta.tone];
  const Icon = meta.icon;

  return (
    <div className={cn(dashboardCardClass, "flex flex-col p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone.iconWrap
          )}
        >
          <Icon className={cn("size-3.5", tone.iconColor)} strokeWidth={1.75} />
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
            tone.badge
          )}
        >
          {category}
        </span>
      </div>

      <h3 className="mt-2.5 text-[14px] font-semibold leading-snug text-[#303030]">
        {title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-[12px] leading-relaxed text-[#616161]">
        {description}
      </p>

      <p className="mt-2 text-xs tabular-nums text-[#616161]">
        <span className="font-medium text-[#303030]">
          {rowCount.toLocaleString()}
        </span>{" "}
        {rowCount === 1 ? "row" : "rows"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreview}
          className={cn(
            dashboardControlClass,
            "h-8 flex-1 justify-center text-xs"
          )}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={rowCount === 0}
          className={cn(
            dashboardControlClass,
            "h-8 text-xs",
            rowCount === 0 && "cursor-not-allowed opacity-50"
          )}
        >
          <Download className="size-3.5" />
        </button>
        {isCustom && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={cn(dashboardControlClass, "h-8 text-xs")}
          >
            Edit
          </button>
        )}
        {isCustom && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={cn(dashboardControlClass, "h-8 text-xs text-[#8f1f1f]")}
          >
            Delete
          </button>
        )}
      </div>
    </div>
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
        "relative flex min-h-[120px] flex-col rounded-lg border border-[#e3e3e3] bg-white p-4",
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
      <p className={cn(dashboardValueClass, "mt-2")}>{value}</p>
      <p className="mt-1 text-xs leading-snug text-[#616161]">{hint}</p>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="h-5 w-28 animate-pulse rounded bg-[#ebebeb]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[120px] animate-pulse rounded-lg border border-[#e3e3e3] bg-white"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="h-[480px] animate-pulse rounded-lg border border-[#e3e3e3] bg-white" />
        <div className="h-[480px] animate-pulse rounded-lg border border-[#e3e3e3] bg-white" />
      </div>
    </main>
  );
}
