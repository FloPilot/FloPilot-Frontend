"use client";

import type { ReportResult } from "@/lib/reports/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ReportPreviewTable({
  result,
  limit = 5,
  compact = false,
  emptyMessage = "No rows match this report.",
}: {
  result: ReportResult | null;
  limit?: number;
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (!result) return null;

  if (result.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#e3e3e3] px-3 py-4 text-xs text-[#616161]">
        {emptyMessage}
      </p>
    );
  }

  const rows = result.rows.slice(0, limit);

  return (
    <div className="overflow-x-auto rounded-lg border border-[#ebebeb]">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  compact ? "h-8 px-2 text-[11px]" : "text-[#616161]",
                  column.align === "right" && "text-right"
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {result.columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    "max-w-[160px] truncate whitespace-nowrap",
                    compact ? "px-2 py-1.5 text-[11px]" : "text-[#303030]",
                    column.align === "right" && "text-right tabular-nums"
                  )}
                >
                  {row[column.key] ?? ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {result.rows.length > limit && (
        <p className="border-t border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[11px] text-[#616161]">
          + {(result.rows.length - limit).toLocaleString()} more rows
        </p>
      )}
    </div>
  );
}
