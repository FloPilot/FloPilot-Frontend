"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckpointStatusBadge,
  findCheckpoint,
} from "@/components/orders/order-checkpoint-pills";
import { OrderStatusBadge, RushBadge, EstimateStatusBadge } from "@/components/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { resolveOrderEstimateStatus } from "@/lib/order-estimate-status";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { getOrderDecorationSummary } from "@/lib/order-decoration-summary";
import type { OrderFinancials } from "@/lib/order-financial-context";
import type { OrderListScope } from "@/lib/order-list-filters";
import {
  getOrdersListColumnDef,
  resolveOrdersListColumnLabel,
  type OrdersListColumnId,
} from "@/lib/order-list-columns";
import type { OrderListSummary } from "@/lib/order-list-summary";
import type { Customer, Order } from "@/types";
import { cn } from "@/lib/utils";

function orderPieceCount(order: Order): number {
  return order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((rowSum, row) => rowSum + (row.quantity || 0), 0),
    0
  );
}

function stickyOffset(
  columnId: OrdersListColumnId,
  columns: OrdersListColumnId[]
): string | undefined {
  if (columnId === "order") return "0";
  if (
    columnId === "customer" &&
    columns[0] === "order" &&
    columns[1] === "customer"
  ) {
    return "132px";
  }
  return undefined;
}

function OrderJobTypeCell({ order }: { order: Order }) {
  const { labels } = getOrderDecorationSummary(order);

  if (labels.length === 0) {
    return <span className="text-[13px] text-[#8a8a8a]">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-white px-2 py-0.5 text-[11px] font-medium text-[#303030]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function OrdersListCell({
  columnId,
  order,
  summary,
  checkpoints,
  financials,
  scope,
  customer,
}: {
  columnId: OrdersListColumnId;
  order: Order;
  summary?: OrderListSummary;
  checkpoints: OrderListSummary["checkpoints"];
  financials: OrderFinancials;
  scope: OrderListScope;
  customer?: Customer;
}) {
  switch (columnId) {
    case "order":
      return (
        <div className="flex min-w-[120px] items-center gap-2">
          <span className="text-[13px] font-semibold text-[#303030]">
            {formatOrderDisplayLine(order)}
          </span>
          {order.rush ? <RushBadge /> : null}
          {summary?.dueDays !== null &&
          summary?.dueDays !== undefined &&
          summary.dueDays < 0 ? (
            <p className="mt-0.5 w-full text-[11px] font-medium text-[#8f1f1f]">
              {Math.abs(summary.dueDays)}d overdue
            </p>
          ) : null}
        </div>
      );
    case "customer":
      return (
        <div className="min-w-[140px] max-w-[220px]">
          <p className="truncate text-[13px] font-medium text-[#303030]">
            {order.company}
          </p>
          <p className="truncate text-[12px] text-[#616161]">
            {order.customerName}
          </p>
        </div>
      );
    case "sales_rep":
      return (
        <span className="truncate text-[13px] text-[#303030]">
          {order.salesRepName?.trim() || "—"}
        </span>
      );
    case "in_hands":
      return (
        <span className="text-[13px] text-[#303030]">
          {formatDate(order.inHandsDate)}
        </span>
      );
    case "created":
      return (
        <span className="text-[13px] text-[#303030]">
          {formatDate(order.createdAt)}
        </span>
      );
    case "total":
      return (
        <div>
          <p className="text-[13px] font-medium tabular-nums text-[#303030]">
            {formatCurrency(financials.total)}
          </p>
          {financials.balance > 0 ? (
            <p className="text-[11px] tabular-nums text-[#8a8a8a]">
              {formatCurrency(financials.balance)} due
            </p>
          ) : null}
        </div>
      );
    case "balance":
      return (
        <span className="text-[13px] font-medium tabular-nums text-[#303030]">
          {financials.balance > 0 ? formatCurrency(financials.balance) : "—"}
        </span>
      );
    case "paid":
      return (
        <span className="text-[13px] tabular-nums text-[#303030]">
          {formatCurrency(financials.paid)}
        </span>
      );
    case "subtotal":
      return (
        <span className="text-[13px] tabular-nums text-[#303030]">
          {formatCurrency(financials.subtotal)}
        </span>
      );
    case "tax":
      return (
        <span className="text-[13px] tabular-nums text-[#303030]">
          {formatCurrency(financials.tax)}
        </span>
      );
    case "piece_count":
      return (
        <span className="text-[13px] tabular-nums text-[#303030]">
          {orderPieceCount(order).toLocaleString()}
        </span>
      );
    case "rush":
      return (
        <span className="text-[13px] text-[#303030]">
          {order.rush ? "Yes" : "—"}
        </span>
      );
    case "decoration":
      return (
        <span className="text-[13px] text-[#303030]">
          {getOrderDecorationSummary(order).label || "—"}
        </span>
      );
    case "contact_email":
      return (
        <span className="block max-w-[200px] truncate text-[13px] text-[#303030]">
          {customer?.email || "—"}
        </span>
      );
    case "proofs":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "artwork")}
          compact
        />
      );
    case "ink":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "ink")}
          compact
        />
      );
    case "screen_files":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "screen_files")}
          compact
        />
      );
    case "screens":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "screens")}
          compact
        />
      );
    case "blanks":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "blanks")}
          compact
        />
      );
    case "dtf":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "dtf_transfers")}
          compact
        />
      );
    case "goods_source":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "blank_source")}
          compact
        />
      );
    case "scheduled":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "scheduled")}
          compact
        />
      );
    case "production":
      return (
        <CheckpointStatusBadge
          checkpoint={findCheckpoint(checkpoints, "floor")}
          compact
        />
      );
    case "order_status":
      return (
        <OrderStatusBadge
          status={order.status}
          className="text-[11px] font-medium"
        />
      );
    case "estimate_status":
      return (
        <EstimateStatusBadge
          status={resolveOrderEstimateStatus(order)}
          className="text-[11px] font-medium"
        />
      );
    case "job_type":
      return <OrderJobTypeCell order={order} />;
    default:
      return <span className="text-[13px] text-[#8a8a8a]">—</span>;
  }
}

export function OrdersListTable({
  items,
  summaries,
  orderFinancials,
  scope,
  columns,
  columnLabels,
  customersById,
  emptyMessage,
}: {
  items: Order[];
  summaries: Map<string, OrderListSummary>;
  orderFinancials: Map<string, OrderFinancials>;
  scope: OrderListScope;
  columns: OrdersListColumnId[];
  columnLabels?: Partial<Record<OrdersListColumnId, string>>;
  customersById: Map<string, Customer>;
  emptyMessage: string;
}) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-14 text-center text-[13px] text-[#616161]">
        {emptyMessage}
      </div>
    );
  }

  const minWidth = Math.max(720, columns.length * 108);

  return (
    <div className="mt-4 -mx-4 overflow-x-auto border-t border-[#ebebeb] sm:-mx-5">
      <Table className="min-w-full" style={{ minWidth }}>
        <TableHeader>
          <TableRow className="border-[#ebebeb] hover:bg-transparent">
            {columns.map((columnId) => {
              const def = getOrdersListColumnDef(columnId);
              const stickyLeft = stickyOffset(columnId, columns);
              const label = resolveOrdersListColumnLabel(
                columnId,
                columnLabels,
                scope
              );

              return (
                <TableHead
                  key={columnId}
                  className={cn(
                    "h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]",
                    stickyLeft != null &&
                      "sticky z-20 shadow-[1px_0_0_#ebebeb]",
                    columnId === columns[columns.length - 1] && "pr-4 sm:pr-5",
                    columnId === columns[0] && "pl-4 sm:pl-5"
                  )}
                  style={{
                    minWidth: def?.minWidth,
                    ...(stickyLeft != null ? { left: stickyLeft } : {}),
                  }}
                >
                  {label}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((order) => {
            const href = `/app/orders/${order.id}`;
            const summary = summaries.get(order.id);
            const checkpoints = summary?.checkpoints ?? [];
            const financials =
              orderFinancials.get(order.id) ??
              ({
                subtotal: 0,
                tax: 0,
                total: 0,
                paid: 0,
                balance: 0,
              } satisfies OrderFinancials);
            const customer = customersById.get(order.customerId);

            return (
              <TableRow
                key={order.id}
                tabIndex={0}
                role="link"
                aria-label={`View order ${formatOrderDisplayLine(order)}`}
                className={cn(
                  "group cursor-pointer border-[#ebebeb] hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7] focus-visible:outline-none",
                  order.rush &&
                    "bg-[#fffdf5] hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7]"
                )}
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(href);
                  }
                }}
              >
                {columns.map((columnId) => {
                  const def = getOrdersListColumnDef(columnId);
                  const stickyLeft = stickyOffset(columnId, columns);
                  const isOrderCell = columnId === "order";

                  return (
                    <TableCell
                      key={columnId}
                      className={cn(
                        "py-2.5 transition-colors group-hover:bg-[#f6f6f7] group-focus-visible:bg-[#f6f6f7]",
                        stickyLeft != null &&
                          "sticky z-10 bg-white shadow-[1px_0_0_#ebebeb]",
                        order.rush && stickyLeft != null && "bg-[#fffdf5]",
                        columnId === columns[columns.length - 1] &&
                          "pr-4 sm:pr-5",
                        columnId === columns[0] && "pl-4 sm:pl-5"
                      )}
                      style={{
                        minWidth: def?.minWidth,
                        ...(stickyLeft != null ? { left: stickyLeft } : {}),
                      }}
                    >
                      {isOrderCell ? (
                        <div className="flex min-w-[120px] items-center gap-2">
                          <Link
                            href={href}
                            className="text-[13px] font-semibold text-[#303030] hover:text-[#2c6ecb] hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {formatOrderDisplayLine(order)}
                          </Link>
                          {order.rush ? <RushBadge /> : null}
                          {summary?.dueDays !== null &&
                          summary?.dueDays !== undefined &&
                          summary.dueDays < 0 ? (
                            <p className="mt-0.5 w-full text-[11px] font-medium text-[#8f1f1f]">
                              {Math.abs(summary.dueDays)}d overdue
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <OrdersListCell
                          columnId={columnId}
                          order={order}
                          summary={summary}
                          checkpoints={checkpoints}
                          financials={financials}
                          scope={scope}
                          customer={customer}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
