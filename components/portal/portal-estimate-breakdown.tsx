"use client";

import { Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type {
  OrderRequestEstimateRow,
  OrderRequestEstimateTotals,
} from "@/lib/order-requests";
import { cn } from "@/lib/utils";

type SizeLine = {
  id: string;
  description: string;
  size: string;
  decorationDetail: string;
  qty: number;
  garmentUnit: number | null;
  decorationUnit: number | null;
  amount: number;
};

type FeeLine = {
  id: string;
  description: string;
  detail: string;
  qty: number;
  unitCost: number | null;
  lineTotal: number;
};

function sizeLabel(size: string) {
  const key = String(size || "").trim().toUpperCase();
  const map: Record<string, string> = {
    XS: "Adult XS",
    S: "Adult Small",
    M: "Adult Medium",
    L: "Adult Large",
    XL: "Adult XLarge",
    "2XL": "Adult 2XLarge",
    "3XL": "Adult 3XLarge",
    "4XL": "Adult 4XLarge",
    "5XL": "Adult 5XLarge",
    "6XL": "Adult 6XLarge",
  };
  return map[key] || size;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildDecorationSummary(rows: OrderRequestEstimateRow[]) {
  return rows
    .filter((row) => row.kind === "decoration" && !row.includedInBundle)
    .map((row) =>
      row.description
        .replace(/\s*·\s*/g, ", ")
        .replace(/\bundefined\b/gi, "")
        .replace(/,\s*,/g, ",")
        .replace(/^,\s*|,\s*$/g, "")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
}

function decorationUnitFromEstimate(estimate: OrderRequestEstimateTotals) {
  const decorationRows = (estimate.rows || []).filter(
    (row) =>
      row.kind === "decoration" &&
      !row.includedInBundle &&
      row.unitCost != null &&
      row.unitCost > 0
  );
  if (decorationRows.length === 0) {
    const pieceQty = (estimate.rows || [])
      .filter((row) => row.kind === "garment")
      .reduce((sum, row) => sum + (row.qty || 0), 0);
    if (pieceQty > 0 && estimate.decorationSubtotal > 0) {
      return round2(estimate.decorationSubtotal / pieceQty);
    }
    return null;
  }
  // Blended per-piece decoration (all imprint locations).
  return round2(
    decorationRows.reduce((sum, row) => sum + (row.unitCost || 0), 0)
  );
}

function buildSizeLines(
  estimate: OrderRequestEstimateTotals,
  showGarmentCost: boolean,
  lineItems?: {
    brand?: string;
    productName?: string;
    color?: string;
    sizes?: Record<string, number>;
  }[]
): SizeLine[] {
  const garmentRows = (estimate.rows || []).filter(
    (row) => row.kind === "garment" && (row.qty || 0) > 0
  );
  const decorationUnit = decorationUnitFromEstimate(estimate);
  const decorationDetail =
    buildDecorationSummary(estimate.rows || []) ||
    "Decoration from your rate sheet";

  if (garmentRows.length > 0) {
    return garmentRows.map((row, index) => {
      const garmentUnit = showGarmentCost
        ? row.unitCost == null
          ? 0
          : row.unitCost
        : null;
      const deco = decorationUnit;
      const perPiece = (garmentUnit || 0) + (deco == null ? 0 : deco);
      return {
        id: row.id || `size-${index}`,
        description: row.description,
        size: sizeLabel(row.detail || ""),
        decorationDetail,
        qty: row.qty || 0,
        garmentUnit,
        decorationUnit: deco,
        amount: round2(perPiece * (row.qty || 0)),
      };
    });
  }

  // Customer-supplied blanks: expand sizes from request line items.
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    const lines: SizeLine[] = [];
    lineItems.forEach((item, itemIndex) => {
      const description =
        [item.brand, item.productName, item.color].filter(Boolean).join(" · ") ||
        "Custom garment";
      const sizes = item.sizes || {};
      for (const [size, qtyRaw] of Object.entries(sizes)) {
        const qty = Number(qtyRaw) || 0;
        if (qty <= 0) continue;
        const deco = decorationUnit;
        lines.push({
          id: `supplied-${itemIndex}-${size}`,
          description,
          size: sizeLabel(size),
          decorationDetail,
          qty,
          garmentUnit: null,
          decorationUnit: deco,
          amount: round2((deco || 0) * qty),
        });
      }
    });
    if (lines.length > 0) return lines;
  }

  if (decorationUnit != null && estimate.decorationSubtotal > 0) {
    const qty =
      decorationUnit > 0
        ? Math.round(estimate.decorationSubtotal / decorationUnit)
        : 0;
    if (qty > 0) {
      return [
        {
          id: "decoration-all",
          description: "Decorated garments",
          size: "All sizes",
          decorationDetail,
          qty,
          garmentUnit: null,
          decorationUnit,
          amount: round2(decorationUnit * qty),
        },
      ];
    }
  }

  return [];
}

function buildFeeLines(estimate: OrderRequestEstimateTotals): FeeLine[] {
  return (estimate.rows || [])
    .filter((row) => row.kind === "fee")
    .map((row, index) => ({
      id: row.id || `fee-${index}`,
      description: row.description,
      detail: row.detail || "",
      qty: row.qty || 1,
      unitCost: row.unitCost,
      lineTotal: row.lineTotal,
    }));
}

export function PortalEstimateBreakdown({
  estimate,
  accent,
  loading,
  error,
  onExport,
  exporting,
  className,
  blankSource,
  lineItems,
}: {
  estimate: OrderRequestEstimateTotals | null;
  accent: string;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
  exporting?: boolean;
  className?: string;
  /** When customer supplies blanks, hide the garment cost column. */
  blankSource?: "shop_orders" | "customer_supplies" | string | null;
  /** Used to expand size rows when blanks are customer-supplied. */
  lineItems?: {
    brand?: string;
    productName?: string;
    color?: string;
    sizes?: Record<string, number>;
  }[];
}) {
  if (loading) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-[#ebebeb] bg-white px-4 py-8 text-center shadow-sm sm:px-5",
          className
        )}
      >
        <Loader2
          className="mx-auto size-5 animate-spin"
          style={{ color: accent }}
        />
        <p className="mt-2 text-[13px] text-[#616161]">
          Calculating your estimate from your pricing…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-4 text-[13px] text-[#8f1f1f] sm:px-5",
          className
        )}
      >
        {error}
      </section>
    );
  }

  if (!estimate) return null;

  const showGarmentCost = blankSource !== "customer_supplies";
  const sizeLines = buildSizeLines(estimate, showGarmentCost, lineItems);
  const feeLines = buildFeeLines(estimate);
  const rateLabel = estimate.usingShopPricing
    ? "Shop rates"
    : estimate.rateSheetName || "Your negotiated rates";
  const hasLines = sizeLines.length > 0 || feeLines.length > 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Estimated total
          </h2>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            Based on {rateLabel}
            {blankSource === "customer_supplies"
              ? " · Garment cost omitted (you supply blanks)"
              : ""}
            . Saved as a versioned estimate PDF for your records.
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-[22px] font-semibold tabular-nums tracking-tight"
            style={{ color: accent }}
          >
            {formatCurrency(estimate.total)}
          </p>
          <p className="text-[11px] text-[#8a8a8a]">
            Incl. {formatCurrency(estimate.tax)} tax
          </p>
        </div>
      </div>

      {hasLines ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              <tr>
                <th className="px-4 py-2.5 sm:px-5">Description</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                {showGarmentCost ? (
                  <th className="px-4 py-2.5 text-right">Garment</th>
                ) : null}
                <th className="px-4 py-2.5 text-right">Decoration</th>
                <th className="px-4 py-2.5 text-right sm:px-5">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {sizeLines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-[#303030]">
                      {line.description}
                      {line.size ? (
                        <span className="text-[#616161]"> — {line.size}</span>
                      ) : null}
                    </p>
                    {line.decorationDetail ? (
                      <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">
                        {line.decorationDetail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#616161]">
                    {line.qty.toLocaleString()}
                  </td>
                  {showGarmentCost ? (
                    <td className="px-4 py-3 text-right tabular-nums text-[#616161]">
                      {line.garmentUnit == null
                        ? "—"
                        : formatCurrency(line.garmentUnit)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right tabular-nums text-[#616161]">
                    {line.decorationUnit == null
                      ? "—"
                      : formatCurrency(line.decorationUnit)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#303030] sm:px-5">
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}

              {feeLines.length > 0 && sizeLines.length > 0 ? (
                <tr className="bg-[#fafafa]">
                  <td
                    colSpan={showGarmentCost ? 5 : 4}
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:px-5"
                  >
                    Fees & extras
                  </td>
                </tr>
              ) : null}

              {feeLines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-[#303030]">
                      {line.description}
                    </p>
                    {line.detail ? (
                      <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                        {line.detail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#616161]">
                    {line.qty.toLocaleString()}
                  </td>
                  {showGarmentCost ? (
                    <td className="px-4 py-3 text-right text-[#b5b5b5]">—</td>
                  ) : null}
                  <td className="px-4 py-3 text-right tabular-nums text-[#616161]">
                    {line.unitCost == null
                      ? "—"
                      : formatCurrency(line.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#303030] sm:px-5">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-4 text-[13px] text-[#616161] sm:px-5">
          Line-item pricing will be confirmed by the shop if decoration methods
          need a custom quote.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
        <p className="max-w-md text-[12px] leading-relaxed text-[#8a8a8a]">
          {estimate.disclaimer ||
            "If the shop adjusts fees or rates later, a new estimate version is saved so you always have a paper trail."}
        </p>
        <div className="ml-auto space-y-1 text-right text-[13px]">
          <p className="text-[#616161]">
            Subtotal{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {formatCurrency(estimate.subtotal)}
            </span>
          </p>
          <p className="text-[#616161]">
            Tax{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {formatCurrency(estimate.tax)}
            </span>
          </p>
          <p className="text-[15px] font-semibold text-[#303030]">
            Total{" "}
            <span className="tabular-nums" style={{ color: accent }}>
              {formatCurrency(estimate.total)}
            </span>
          </p>
        </div>
      </div>

      {onExport ? (
        <div className="border-t border-[#ebebeb] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-semibold text-[#303030] hover:bg-[#fafafa] disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export PDF
          </button>
        </div>
      ) : null}
    </section>
  );
}
