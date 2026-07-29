"use client";

import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { EVENT_STATUS_COLUMNS } from "@/lib/event-status-checkpoints";
import type { OrderRequestDetail, OrderRequestEvent } from "@/lib/order-requests";
import type { DecorationType } from "@/types";
import { cn } from "@/lib/utils";

function PendingBadge() {
  return (
    <span
      title="Pending until this request is converted to an order"
      className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[#616161]"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      Pending
    </span>
  );
}

function NotApplicableMark() {
  return <span className="inline-flex text-[11px] text-[#c9c9c9]">—</span>;
}

function isColumnApplicable(
  columnKey: string,
  decorationType: string
): boolean {
  const decoration = (decorationType || "").toLowerCase();
  if (
    columnKey === "ink" ||
    columnKey === "screen_files" ||
    columnKey === "screens"
  ) {
    return decoration === "screen_print";
  }
  if (columnKey === "dtf_transfers") {
    return decoration === "dtf";
  }
  if (columnKey === "prep") {
    // Orders hide Setup for screen print (covered by screen columns).
    return decoration !== "screen_print";
  }
  return true;
}

function blanksColumnLabel(blankSource: OrderRequestDetail["blankSource"]) {
  return blankSource === "customer_supplies" ? "Garments" : "Blanks";
}

export function OrderRequestEventsTab({
  request,
}: {
  request: Pick<OrderRequestDetail, "events" | "blankSource">;
}) {
  const events = request.events || [];

  const columnHeaders = EVENT_STATUS_COLUMNS.map((column) => ({
    key: column.key,
    label:
      column.key === "blanks"
        ? blanksColumnLabel(request.blankSource)
        : typeof column.label === "string"
          ? column.label
          : column.key,
  }));

  if (events.length === 0) {
    return (
      <section
        className={cn(dashboardCardClass, "px-4 py-12 text-center sm:px-5")}
      >
        <p className={dashboardTaskDetailClass}>
          No decorations on this request yet.
        </p>
      </section>
    );
  }

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <div>
          <h2 className={dashboardTaskTitleClass}>Events</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {events.length} decoration{events.length !== 1 ? "s" : ""} on this
            request — checkpoints stay pending until convert
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-[#ebebeb]">
        <Table className="min-w-[960px] w-full">
          <TableHeader>
            <TableRow className="border-[#ebebeb] bg-[#fafafa] hover:bg-[#fafafa]">
              <TableHead className="sticky left-0 z-10 h-9 min-w-[180px] bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
                Decoration
              </TableHead>
              {columnHeaders.map((column) => (
                <TableHead
                  key={column.key}
                  className="h-9 min-w-[108px] text-[12px] font-medium text-[#616161]"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event: OrderRequestEvent) => (
              <TableRow
                key={event.id}
                className="group border-[#ebebeb] hover:bg-[#f6f6f7]"
              >
                <TableCell className="sticky left-0 z-10 bg-white py-2.5 pl-4 transition-colors group-hover:bg-[#f6f6f7] sm:pl-5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[13px] font-semibold text-[#303030]">
                      {event.name || event.locationLabel || "Decoration"}
                    </p>
                    <DecorationTypePill
                      decoration={
                        (event.decorationType ||
                          "screen_print") as DecorationType
                      }
                    />
                  </div>
                </TableCell>
                {columnHeaders.map((column) => (
                  <TableCell key={column.key} className="py-2.5">
                    {isColumnApplicable(column.key, event.decorationType) ? (
                      <PendingBadge />
                    ) : (
                      <NotApplicableMark />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
