"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Receipt,
  Search,
} from "lucide-react";
import { DocumentsEmptyState, DocumentsShell } from "@/components/documents/documents-shell";
import { DocumentsTable } from "@/components/documents/documents-table";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  computeDocumentsOverviewStats,
  collectEstimateDocuments,
  collectInvoiceDocuments,
  sortEstimateDocuments,
  sortInvoiceDocuments,
} from "@/lib/document-queues";
import { buildOrderFinancialsMap } from "@/lib/order-financial-context";
import { DOCUMENTS_BASE } from "@/lib/order-documents";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  tone?: "neutral" | "attention" | "success" | "warning";
}) {
  const tones = {
    neutral: "border-[#e3e3e3] hover:border-[#c9cccf]",
    attention: "border-[#c4d7f2] bg-[#fafcff] hover:border-[#2c6ecb]/40",
    warning: "border-[#f0d9a8] bg-[#fffbf2] hover:border-[#e0b65c]",
    success: "border-[#cfe0d4] bg-[#f8fcf9] hover:border-[#86d4a8]",
  };

  return (
    <Link
      href={href}
      className={cn(
        dashboardInsetSurfaceClass,
        "group flex flex-col gap-2 rounded-xl border p-4 transition-[border-color,box-shadow] hover:shadow-sm",
        tones[tone]
      )}
    >
      <p className={dashboardKpiTitleClass}>{label}</p>
      <p className={cn(dashboardValueClass, "text-[28px] leading-none")}>
        {value}
      </p>
      <p className={cn("mt-1", dashboardTaskDetailClass)}>{detail}</p>
      <span
        className={cn(
          dashboardControlClass,
          "mt-2 h-8 w-fit gap-1.5 text-xs font-semibold group-hover:border-[#c9cccf]"
        )}
      >
        View
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function DocumentsOverview() {
  const { orders, getCustomerById } = useSchedule();
  const { settings } = useShopSettings();
  const [query, setQuery] = useState("");

  const financials = useMemo(
    () =>
      buildOrderFinancialsMap(orders, {
        taxRate: settings.taxRate,
        pricingMatrix: settings.pricingMatrix,
        pricingRateSheets: settings.pricingRateSheets,
        getCustomer: getCustomerById,
      }),
    [orders, settings.taxRate, settings.pricingMatrix, settings.pricingRateSheets, getCustomerById]
  );

  const totalsByOrderId = useMemo(() => {
    const map = new Map<string, { total: number; balance: number }>();
    for (const [id, entry] of financials) {
      map.set(id, { total: entry.total, balance: entry.balance });
    }
    return map;
  }, [financials]);

  const stats = useMemo(
    () => computeDocumentsOverviewStats(orders, totalsByOrderId),
    [orders, totalsByOrderId]
  );

  const recentEstimates = useMemo(
    () => sortEstimateDocuments(collectEstimateDocuments(orders)).slice(0, 6),
    [orders]
  );
  const recentInvoices = useMemo(
    () => sortInvoiceDocuments(collectInvoiceDocuments(orders)).slice(0, 6),
    [orders]
  );

  const filteredRecent = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return {
        estimates: recentEstimates,
        invoices: recentInvoices,
      };
    }
    const match = (order: (typeof recentEstimates)[number]) => {
      const haystack = [
        order.number,
        order.customLabel,
        order.company,
        order.customerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    };
    return {
      estimates: recentEstimates.filter(match),
      invoices: recentInvoices.filter(match),
    };
  }, [query, recentEstimates, recentInvoices]);

  const needsAttention =
    stats.estimatesPending +
    stats.estimatesSent +
    stats.estimatesRevision +
    stats.invoicesReady +
    stats.invoicesUnpaid +
    stats.invoicesPartial;

  return (
    <DocumentsShell
      activeSlug="overview"
      title="Documents overview"
      description="Estimates and invoices in one place — see what’s waiting on the customer, ready to bill, or still unpaid."
      toolbar={
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recent documents…"
            className={cn(
              dashboardControlClass,
              "h-8 w-full pl-8 pr-3 text-xs font-normal shadow-none"
            )}
          />
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estimates awaiting reply"
          value={stats.estimatesSent + stats.estimatesRevision}
          detail={
            stats.estimatesRevision > 0
              ? `${stats.estimatesRevision} need revision`
              : "Sent to customers"
          }
          href={`${DOCUMENTS_BASE}/estimates?filter=sent`}
          tone={
            stats.estimatesSent + stats.estimatesRevision > 0
              ? "attention"
              : "success"
          }
        />
        <StatCard
          label="Estimates to prepare"
          value={stats.estimatesPending}
          detail="Drafts not sent yet"
          href={`${DOCUMENTS_BASE}/estimates?filter=pending`}
          tone={stats.estimatesPending > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Ready to invoice"
          value={stats.invoicesReady}
          detail="Produced and ready to bill"
          href={`${DOCUMENTS_BASE}/invoices?filter=ready`}
          tone={stats.invoicesReady > 0 ? "attention" : "success"}
        />
        <StatCard
          label="Unpaid balance"
          value={formatCurrency(stats.unpaidInvoiceBalance)}
          detail={
            stats.invoicesUnpaid + stats.invoicesPartial > 0
              ? `${stats.invoicesUnpaid + stats.invoicesPartial} open invoices`
              : "All caught up"
          }
          href={`${DOCUMENTS_BASE}/invoices?filter=unpaid`}
          tone={
            stats.unpaidInvoiceBalance > 0 ? "warning" : "success"
          }
        />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={`${DOCUMENTS_BASE}/estimates`}
          className={cn(
            dashboardInsetSurfaceClass,
            "group flex items-start gap-3 rounded-xl border border-[#e3e3e3] p-4 transition-colors hover:border-[#c9cccf]"
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#2c6ecb]">
            <FileText className="size-4.5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#303030]">Estimates</p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {stats.totalEstimates === 0
                ? "No open estimates"
                : `${stats.totalEstimates} open · ${formatCurrency(stats.openEstimateValue)} in flight`}
            </p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href={`${DOCUMENTS_BASE}/invoices`}
          className={cn(
            dashboardInsetSurfaceClass,
            "group flex items-start gap-3 rounded-xl border border-[#e3e3e3] p-4 transition-colors hover:border-[#c9cccf]"
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#2c6ecb]">
            <Receipt className="size-4.5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#303030]">Invoices</p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {stats.totalInvoices === 0
                ? "No invoices yet"
                : `${stats.invoicesPaid} paid · ${stats.invoicesUnpaid + stats.invoicesPartial} open`}
            </p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {needsAttention === 0 &&
      filteredRecent.estimates.length === 0 &&
      filteredRecent.invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-[12px] font-semibold text-[#0d5c2e]">
            <CheckCircle2 className="size-3.5" />
            All clear
          </span>
          <p className="text-sm font-semibold text-[#303030]">
            Nothing waiting on estimates or invoices
          </p>
          <p className={dashboardTaskDetailClass}>
            New documents show up here as orders move through quoting and billing.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[#303030]">
                Recent estimates
              </h3>
              <Link
                href={`${DOCUMENTS_BASE}/estimates`}
                className="text-[12px] font-semibold text-[#2c6ecb] hover:underline"
              >
                View all
              </Link>
            </div>
            {filteredRecent.estimates.length === 0 ? (
              <DocumentsEmptyState
                title="No matching estimates"
                description="Try a different search, or open the full estimates list."
              />
            ) : (
              <DocumentsTable
                mode="estimates"
                orders={filteredRecent.estimates}
                financials={financials}
              />
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[#303030]">
                Recent invoices
              </h3>
              <Link
                href={`${DOCUMENTS_BASE}/invoices`}
                className="text-[12px] font-semibold text-[#2c6ecb] hover:underline"
              >
                View all
              </Link>
            </div>
            {filteredRecent.invoices.length === 0 ? (
              <DocumentsEmptyState
                title="No matching invoices"
                description="Try a different search, or open the full invoices list."
              />
            ) : (
              <DocumentsTable
                mode="invoices"
                orders={filteredRecent.invoices}
                financials={financials}
              />
            )}
          </section>
        </div>
      )}
    </DocumentsShell>
  );
}
