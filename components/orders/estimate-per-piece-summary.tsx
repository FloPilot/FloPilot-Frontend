"use client";

import { formatCurrency } from "@/lib/format";
import type { EstimatePerPieceCosts } from "@/lib/order-estimate";
import { cn } from "@/lib/utils";

export function EstimatePerPieceSummary({
  costs,
  className,
}: {
  costs: EstimatePerPieceCosts;
  className?: string;
}) {
  const rows = [
    {
      label: "Garments",
      value: costs.garmentsPerPiece,
      muted: costs.garmentsPerPiece <= 0,
    },
    {
      label: "Decoration",
      value: costs.decorationPerPiece,
      muted: costs.decorationPerPiece <= 0,
    },
    {
      label: "Fees",
      value: costs.feesPerPiece,
      muted: costs.feesPerPiece <= 0,
    },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-3.5 py-3 sm:px-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Per piece cost
          </p>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            All-in across {costs.pieceCount.toLocaleString()}{" "}
            {costs.pieceCount === 1 ? "garment" : "garments"} on this estimate.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[1.35rem] font-semibold tabular-nums tracking-tight text-[#303030]">
            {formatCurrency(costs.subtotalPerPiece)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
            before tax · {formatCurrency(costs.totalPerPiece)} with tax
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-[#ebebeb] sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 bg-[#fafafa] px-3.5 py-2.5 sm:block sm:px-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              {row.label}
            </p>
            <p
              className={cn(
                "text-[13px] font-semibold tabular-nums sm:mt-1",
                row.muted ? "text-[#8a8a8a]" : "text-[#303030]"
              )}
            >
              {row.muted ? "—" : `${formatCurrency(row.value)} / pc`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
