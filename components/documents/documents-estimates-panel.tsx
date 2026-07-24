"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { DocumentFilterBuilder } from "@/components/documents/document-filter-builder";
import {
  DocumentsEmptyState,
  DocumentsShell,
} from "@/components/documents/documents-shell";
import { DocumentsTable } from "@/components/documents/documents-table";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  applyDocumentAdvancedFilters,
  documentMatchesSearch,
  type DocumentAdvancedFilter,
} from "@/lib/document-filters";
import {
  filterEstimateDocuments,
  sortEstimateDocuments,
  type DocumentEstimateFilter,
} from "@/lib/document-queues";
import { buildOrderFinancialsMap } from "@/lib/order-financial-context";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS: { value: DocumentEstimateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "revision", label: "Revision" },
  { value: "approved", label: "Approved" },
];

function parseFilter(value: string | null): DocumentEstimateFilter {
  if (
    value === "pending" ||
    value === "sent" ||
    value === "revision" ||
    value === "approved" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

export function DocumentsEstimatesPanel() {
  const searchParams = useSearchParams();
  const { orders, customers, getCustomerById } = useSchedule();
  const { settings } = useShopSettings();
  const [filter, setFilter] = useState<DocumentEstimateFilter>(
    parseFilter(searchParams.get("filter"))
  );
  const [query, setQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<
    DocumentAdvancedFilter[]
  >([]);

  const financialContext = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      getCustomer: getCustomerById,
    }),
    [settings.taxRate, settings.pricingMatrix, settings.pricingRateSheets, getCustomerById]
  );

  const filtered = useMemo(() => {
    let list = sortEstimateDocuments(filterEstimateDocuments(orders, filter));
    list = applyDocumentAdvancedFilters(list, advancedFilters);
    return list.filter((order) => documentMatchesSearch(order, query));
  }, [orders, filter, query, advancedFilters]);

  const financials = useMemo(
    () => buildOrderFinancialsMap(filtered, financialContext),
    [filtered, financialContext]
  );

  const summary = useMemo(() => {
    const all = filterEstimateDocuments(orders, "all");
    const pending = filterEstimateDocuments(orders, "pending");
    const sent = filterEstimateDocuments(orders, "sent");
    const revision = filterEstimateDocuments(orders, "revision");
    const approved = filterEstimateDocuments(orders, "approved");
    const inFlight = [...pending, ...sent, ...revision];
    const money = buildOrderFinancialsMap(inFlight, financialContext);
    let openValue = 0;
    for (const order of inFlight) {
      openValue += money.get(order.id)?.total ?? order.total;
    }
    return {
      counts: {
        all: all.length,
        pending: pending.length,
        sent: sent.length,
        revision: revision.length,
        approved: approved.length,
      },
      openValue,
    };
  }, [orders, financialContext]);

  const filteredValue = useMemo(() => {
    let total = 0;
    for (const order of filtered) {
      total += financials.get(order.id)?.total ?? order.total;
    }
    return total;
  }, [filtered, financials]);

  const hasAdvanced = advancedFilters.length > 0;
  const hasSearch = query.trim().length > 0;

  return (
    <DocumentsShell
      activeSlug="estimates"
      title="Estimates"
      description="Quotes waiting to send, out for customer review, revisions, and recently approved."
      toolbar={
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search estimates…"
            className={cn(
              dashboardControlClass,
              "h-8 w-full pl-8 pr-3 text-xs font-normal shadow-none"
            )}
          />
        </div>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#e3e3e3] p-4")}>
          <p className={dashboardKpiTitleClass}>Open estimates</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {summary.counts.all}
          </p>
        </div>
        <div className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#e3e3e3] p-4")}>
          <p className={dashboardKpiTitleClass}>Awaiting customer</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {summary.counts.sent + summary.counts.revision}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {summary.counts.revision > 0
              ? `${summary.counts.revision} revision requested`
              : "Sent for approval"}
          </p>
        </div>
        <div className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#e3e3e3] p-4")}>
          <p className={dashboardKpiTitleClass}>Value in flight</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {formatCurrency(summary.openValue)}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            Pending + sent estimates
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-start gap-2 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
        <span className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Filters
        </span>
        <DocumentFilterBuilder
          scope="estimates"
          customers={customers}
          orders={orders}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
        />
        {hasAdvanced ? (
          <button
            type="button"
            onClick={() => setAdvancedFilters([])}
            className="ml-auto pt-1.5 text-[11px] font-semibold text-[#616161] hover:text-[#303030]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((entry) => {
          const active = filter === entry.value;
          const count = summary.counts[entry.value];
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                active
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              {entry.label}
              <span
                className={cn(
                  "ml-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[#2c6ecb] text-white"
                    : "bg-[#e3e3e3] text-[#303030]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {(hasAdvanced || hasSearch) && filtered.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[12px] text-[#616161]">
          <p>
            Showing{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {filtered.length}
            </span>{" "}
            estimate{filtered.length === 1 ? "" : "s"}
          </p>
          <p>
            Filtered value{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {formatCurrency(filteredValue)}
            </span>
          </p>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <DocumentsEmptyState
          title="No estimates here"
          description={
            hasAdvanced || hasSearch
              ? "Nothing matched your search or filters. Try clearing a filter or broadening the date."
              : "When orders have estimates to send or approve, they’ll show up in this list."
          }
        />
      ) : (
        <DocumentsTable
          mode="estimates"
          orders={filtered}
          financials={financials}
        />
      )}
    </DocumentsShell>
  );
}
