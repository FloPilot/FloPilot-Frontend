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
  filterInvoiceDocuments,
  sortInvoiceDocuments,
  type DocumentInvoiceFilter,
} from "@/lib/document-queues";
import { getOrderPaymentStatus } from "@/lib/order-payment";
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

const FILTERS: { value: DocumentInvoiceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

function parseFilter(value: string | null): DocumentInvoiceFilter {
  if (
    value === "ready" ||
    value === "sent" ||
    value === "unpaid" ||
    value === "partial" ||
    value === "paid" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

export function DocumentsInvoicesPanel() {
  const searchParams = useSearchParams();
  const { orders, customers, getCustomerById } = useSchedule();
  const { settings } = useShopSettings();
  const [filter, setFilter] = useState<DocumentInvoiceFilter>(
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
    let list = sortInvoiceDocuments(filterInvoiceDocuments(orders, filter));
    list = applyDocumentAdvancedFilters(list, advancedFilters);
    return list.filter((order) => documentMatchesSearch(order, query));
  }, [orders, filter, query, advancedFilters]);

  const financials = useMemo(
    () => buildOrderFinancialsMap(filtered, financialContext),
    [filtered, financialContext]
  );

  const summary = useMemo(() => {
    const unpaid = filterInvoiceDocuments(orders, "unpaid");
    const partial = filterInvoiceDocuments(orders, "partial");
    const open = [...unpaid, ...partial];
    const money = buildOrderFinancialsMap(open, financialContext);
    let unpaidBalance = 0;
    for (const order of open) {
      unpaidBalance += money.get(order.id)?.balance ?? order.balance;
    }

    return {
      counts: {
        all: filterInvoiceDocuments(orders, "all").length,
        ready: filterInvoiceDocuments(orders, "ready").length,
        sent: filterInvoiceDocuments(orders, "sent").length,
        unpaid: unpaid.length,
        partial: partial.length,
        paid: filterInvoiceDocuments(orders, "paid").length,
      },
      unpaidBalance,
    };
  }, [orders, financialContext]);

  const statement = useMemo(() => {
    let openCount = 0;
    let outstanding = 0;
    for (const order of filtered) {
      const payment = getOrderPaymentStatus(order);
      if (payment !== "invoiced" && payment !== "partial") continue;
      openCount += 1;
      outstanding += financials.get(order.id)?.balance ?? order.balance ?? 0;
    }
    return { openCount, outstanding };
  }, [filtered, financials]);

  const hasAdvanced = advancedFilters.length > 0;
  const hasSearch = query.trim().length > 0;
  const showStatement = hasAdvanced || hasSearch;

  return (
    <DocumentsShell
      activeSlug="invoices"
      title="Invoices"
      description="Ready to bill, sent to customers, and payment status across open invoices."
      toolbar={
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invoices…"
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
          <p className={dashboardKpiTitleClass}>Ready to invoice</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {summary.counts.ready}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            Produced goods recorded
          </p>
        </div>
        <div className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#e3e3e3] p-4")}>
          <p className={dashboardKpiTitleClass}>Open invoices</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {summary.counts.unpaid + summary.counts.partial}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            Unpaid or partially paid
          </p>
        </div>
        <div className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#e3e3e3] p-4")}>
          <p className={dashboardKpiTitleClass}>Outstanding balance</p>
          <p className={cn(dashboardValueClass, "mt-1 text-[24px]")}>
            {formatCurrency(summary.unpaidBalance)}
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-start gap-2 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
        <span className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Filters
        </span>
        <DocumentFilterBuilder
          scope="invoices"
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

      {showStatement && filtered.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d6e4ff] bg-[#f7faff] px-3 py-2.5 text-[12px] text-[#616161]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
              Statement view
            </p>
            <p className="mt-0.5">
              Showing{" "}
              <span className="font-semibold tabular-nums text-[#303030]">
                {filtered.length}
              </span>{" "}
              invoice{filtered.length === 1 ? "" : "s"}
              {statement.openCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold tabular-nums text-[#303030]">
                    {statement.openCount}
                  </span>{" "}
                  still open
                </>
              ) : null}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Outstanding
            </p>
            <p className="text-[15px] font-semibold tabular-nums text-[#303030]">
              {formatCurrency(statement.outstanding)}
            </p>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <DocumentsEmptyState
          title="No invoices here"
          description={
            hasAdvanced || hasSearch
              ? "Nothing matched your search or filters. Try a different customer, end business, or due date."
              : "Invoices appear here once an order is ready to bill or has been sent."
          }
        />
      ) : (
        <DocumentsTable
          mode="invoices"
          orders={filtered}
          financials={financials}
        />
      )}
    </DocumentsShell>
  );
}
