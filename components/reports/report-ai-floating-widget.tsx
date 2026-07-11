"use client";

import { Sparkles, X } from "lucide-react";
import { ReportAiPanel } from "@/components/reports/report-ai-panel";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import type { SavedCustomReport } from "@/lib/reports/custom-report-builder";
import type { ReportDateRange } from "@/lib/reports/report-date-range";
import {
  dashboardCardClass,
  dashboardElevatedShadow,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function ReportAiFloatingWidget({
  data,
  dateRange,
  getIdToken,
  tenantId,
  onOpenReport,
  onCustomReportSaved,
  open,
  onOpenChange,
}: {
  data: ShopReportData;
  dateRange: ReportDateRange;
  getIdToken: () => Promise<string | null>;
  tenantId: string;
  onOpenReport?: (reportId: string) => void;
  onCustomReportSaved?: (reports: SavedCustomReport[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={cn(
            "fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full border border-brand-primary bg-brand-primary text-white transition-transform hover:scale-[1.03] active:scale-[0.98]",
            dashboardElevatedShadow
          )}
          aria-label="Open insights assistant"
        >
          <Sparkles className="size-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden",
            dashboardCardClass,
            "h-[min(680px,calc(100vh-2.5rem))] max-h-[calc(100vh-2.5rem)]"
          )}
          role="dialog"
          aria-label="Insights assistant"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-[#616161] transition-colors hover:bg-[#f1f1f1]"
            aria-label="Close insights assistant"
          >
            <X className="size-4" />
          </button>

          <ReportAiPanel
            data={data}
            dateRange={dateRange}
            getIdToken={getIdToken}
            tenantId={tenantId}
            onOpenReport={onOpenReport}
            onCustomReportSaved={onCustomReportSaved}
            compactHeader
            className="h-full"
          />
        </div>
      )}
    </>
  );
}
