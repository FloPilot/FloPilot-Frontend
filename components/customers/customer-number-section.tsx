"use client";

import { Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function CustomerNumberSection({
  customerNumber,
  suggestedNumber,
  onGenerate,
  onClear,
  className,
}: {
  customerNumber: string | null | undefined;
  /** Next number preview when generating for a legacy account */
  suggestedNumber: string;
  onGenerate: (next: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  const value = customerNumber?.trim() || "";
  const hasNumber = Boolean(value);

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
          <Hash className="size-4 text-[#2c6ecb]" />
          Customer number
        </h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          Shown as Customer # on estimates. New accounts get one automatically;
          generate one here for older accounts.
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <div
          className={cn(
            dashboardInsetSurfaceClass,
            "flex flex-wrap items-center justify-between gap-3 rounded-lg p-3.5"
          )}
        >
          {hasNumber ? (
            <>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Customer #
                </p>
                <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-[#303030]">
                  {value}
                </p>
              </div>
              {onClear ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(dashboardGhostButtonClass, "h-9")}
                  onClick={onClear}
                >
                  Clear
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#303030]">
                  No customer number yet
                </p>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Next available: #{suggestedNumber}
                </p>
              </div>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9 shrink-0")}
                onClick={() => onGenerate(suggestedNumber)}
              >
                Generate customer number
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
