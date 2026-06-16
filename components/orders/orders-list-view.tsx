"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  filterOrdersWithAdvanced,
  OrderFilterBuilder,
} from "@/components/orders/order-filter-builder";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderAdvancedFilter } from "@/lib/order-advanced-filters";
import { formatCurrency, formatDate } from "@/lib/format";
import { countOrderScheduleProgress } from "@/lib/event-basket";
import {
  DOCUMENT_TYPE_TABS,
  filterOrdersList,
  SCOPE_TABS,
  sortOrdersList,
  type OrderListScope,
} from "@/lib/order-list-filters";
import { downloadReportCsv } from "@/lib/reports/csv";
import { buildOrdersListExport } from "@/lib/reports/order-list-export";
import type { DocumentType, Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrdersListView() {
  const { orders, customers, shopDataLoading } = useSchedule();
  const [scope, setScope] = useState<OrderListScope>("active");
  const [advancedFilters, setAdvancedFilters] = useState<OrderAdvancedFilter[]>(
    []
  );
  const [documentType, setDocumentType] = useState<DocumentType | "all">("all");

  const filteredOrders = useMemo(() => {
    const scoped = filterOrdersList(orders, { scope, documentType });
    return sortOrdersList(
      filterOrdersWithAdvanced(scoped, advancedFilters),
      scope
    );
  }, [orders, scope, documentType, advancedFilters]);

  const hasExtraFilters =
    advancedFilters.length > 0 || documentType !== "all";

  const handleExport = () => {
    downloadReportCsv(
      buildOrdersListExport(filteredOrders, {
        scope,
        documentType,
        hasAdvancedFilters: advancedFilters.length > 0,
      })
    );
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">All orders</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-brand-muted tabular-nums">
              {filteredOrders.length} result
              {filteredOrders.length !== 1 ? "s" : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg h-8 text-xs"
              disabled={filteredOrders.length === 0}
              onClick={handleExport}
              title={
                filteredOrders.length === 0
                  ? "Nothing to export"
                  : "Export the filtered list to CSV"
              }
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 overflow-visible">
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-visible">
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 border-b border-border/70">
            <div className="flex rounded-lg border border-border bg-muted/25 p-0.5 shrink-0">
              {SCOPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setScope(tab.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    scope === tab.value
                      ? "bg-white text-brand-ink shadow-sm"
                      : "text-brand-muted hover:text-brand-ink"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2 px-3 py-2.5 bg-muted/15 min-h-[44px] overflow-visible">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted pt-1.5 shrink-0">
              Filters
            </span>
            <OrderFilterBuilder
              customers={customers}
              filters={advancedFilters}
              onChange={setAdvancedFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 border-t border-border/70">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted mr-1 shrink-0">
              Type
            </span>
            {DOCUMENT_TYPE_TABS.map((tab) => (
              <FilterPill
                key={tab.value}
                active={documentType === tab.value}
                onClick={() => setDocumentType(tab.value)}
              >
                {tab.label}
              </FilterPill>
            ))}
          </div>
        </div>

        {hasExtraFilters && (
          <button
            type="button"
            onClick={() => {
              setAdvancedFilters([]);
              setDocumentType("all");
            }}
            className="text-xs font-medium text-brand-primary hover:underline"
          >
            Clear filters
          </button>
        )}

        <OrdersTable
          items={filteredOrders}
          scope={scope}
          emptyMessage={
            shopDataLoading
              ? "Loading orders…"
              : advancedFilters.length > 0
              ? "No orders match your filters. Try adjusting or clearing them."
              : scope === "active"
                ? "No active orders right now. Try Historical or All."
                : scope === "historical"
                  ? "No historical orders yet."
                  : "No orders yet."
          }
        />
      </CardContent>
    </Card>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-primary/30 bg-brand-primary/8 text-brand-ink"
          : "border-transparent text-brand-muted hover:bg-muted/50 hover:text-brand-ink"
      )}
    >
      {children}
    </button>
  );
}

function OrdersTable({
  items,
  scope,
  emptyMessage,
}: {
  items: Order[];
  scope: OrderListScope;
  emptyMessage: string;
}) {
  const router = useRouter();
  const { scheduleBlocks } = useSchedule();

  const scheduleProgressByOrderId = useMemo(() => {
    const map = new Map<string, { scheduled: number; total: number }>();
    for (const order of items) {
      map.set(order.id, countOrderScheduleProgress(order, scheduleBlocks));
    }
    return map;
  }, [items, scheduleBlocks]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>
            {scope === "historical" ? "Completed" : "In-hands"}
          </TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((order) => {
          const href = `/app/orders/${order.id}`;

          return (
            <TableRow
              key={order.id}
              tabIndex={0}
              role="link"
              aria-label={`View order ${order.number}`}
              className="group cursor-pointer border-border/70 transition-colors hover:bg-brand-primary/[0.06] active:bg-brand-primary/10 focus-visible:outline-none focus-visible:bg-brand-primary/[0.06] focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-inset"
              onClick={() => router.push(href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(href);
                }
              }}
            >
              <TableCell
                className={cn(
                  "relative pl-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:transition-colors",
                  order.rush
                    ? "before:bg-orange-500"
                    : "before:bg-transparent group-hover:before:bg-brand-primary"
                )}
              >
                <Link
                  href={href}
                  className="font-medium text-brand-ink transition-colors group-hover:text-brand-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  {order.number}
                </Link>
                {order.rush && (
                  <span className="ml-2 inline-flex">
                    <RushBadge />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <p className="font-medium truncate transition-colors group-hover:text-brand-primary">
                    {order.company}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {order.customerName}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <ScheduledEventsCell
                  progress={scheduleProgressByOrderId.get(order.id)}
                />
              </TableCell>
              <TableCell>{formatDate(order.inHandsDate)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums transition-colors group-hover:text-brand-primary">
                {formatCurrency(order.total)}
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center justify-end gap-1.5">
                  <span
                    className={cn(
                      "tabular-nums transition-colors",
                      order.balance > 0
                        ? "text-muted-foreground group-hover:text-brand-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {order.balance > 0 ? formatCurrency(order.balance) : "—"}
                  </span>
                  <ChevronRight className="size-4 text-brand-primary opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ScheduledEventsCell({
  progress,
}: {
  progress?: { scheduled: number; total: number };
}) {
  if (!progress || progress.total === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const { scheduled, total } = progress;
  const complete = scheduled >= total;
  const noneScheduled = scheduled === 0;

  const colorClass = complete
    ? "font-medium text-emerald-700"
    : noneScheduled
      ? "font-medium text-red-700"
      : "font-medium text-amber-700";

  return (
    <span
      className={cn("tabular-nums text-sm", colorClass)}
      title={
        complete
          ? "All production events scheduled"
          : noneScheduled
            ? `No production events scheduled yet (${total} total)`
            : `${scheduled} of ${total} production events scheduled`
      }
    >
      {scheduled} / {total}
    </span>
  );
}
