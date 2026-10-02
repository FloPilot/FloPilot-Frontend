"use client";

import { Loader2 } from "lucide-react";
import {
  formatJobBlankAssignmentSummary,
  lineItemDisplayLabel,
} from "@/lib/job-line-items";
import { lineItemPieceCount } from "@/lib/line-items";
import { dashboardTaskDetailClass } from "@/lib/dashboard-styles";
import type { Job, Order } from "@/types";
import { cn } from "@/lib/utils";

export function EventBlankAssignment({
  order,
  job,
  selectedIds,
  onToggle,
  onSelectAll,
  saving = false,
  disabled = false,
}: {
  order: Order;
  job: Job;
  selectedIds: string[];
  onToggle: (lineItemId: string) => void;
  onSelectAll: () => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  const blanks = order.lineItems ?? [];
  if (blanks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-5 text-center">
        <p className="text-[13px] font-medium text-[#303030]">
          No blanks on this order yet
        </p>
        <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
          Add blanks on Materials, then assign which styles this decoration runs
          on — for example adult and youth fronts together, or separate backs.
        </p>
      </div>
    );
  }

  const allSelected =
    blanks.length > 0 && blanks.every((item) => selectedIds.includes(item.id));
  const previewJob: Job = { ...job, lineItemIds: selectedIds };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#303030]">
            Blanks for this design
          </p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Choose which garments get this decoration. Shared fronts can include
            every blank; youth and adult backs can be split for correct matrix
            pricing.
          </p>
        </div>
        {saving ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#616161]">
            <Loader2 className="size-3.5 animate-spin" />
            Saving…
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2">
        <p className="text-[12px] font-medium text-[#616161]">
          {formatJobBlankAssignmentSummary(order, previewJob)}
        </p>
        <button
          type="button"
          disabled={disabled || saving || allSelected}
          onClick={onSelectAll}
          className="text-[12px] font-semibold text-[#303030] hover:underline disabled:opacity-40"
        >
          Select all
        </button>
      </div>

      <div className="space-y-2">
        {blanks.map((item) => {
          const checked = selectedIds.includes(item.id);
          const pieces = lineItemPieceCount(item);
          return (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                checked
                  ? "border-[#d4d4d4] bg-white shadow-[0_1px_0_rgba(26,26,26,0.04)]"
                  : "border-transparent bg-[#fafafa] hover:border-[#e3e3e3]",
                (disabled || saving) && "pointer-events-none opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || saving}
                onChange={() => onToggle(item.id)}
                className="size-4 rounded border-[#c9c9c9] text-[#303030]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#303030]">
                  {lineItemDisplayLabel(item)}
                </span>
                <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                  {pieces} pc{pieces === 1 ? "" : "s"}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
