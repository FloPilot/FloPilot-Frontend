"use client";

import { Fragment } from "react";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { formatCurrency } from "@/lib/format";
import {
  groupEstimateSections,
  groupReviewEstimateSections,
  type ReviewEstimateRow,
} from "@/lib/estimate-breakdown";
import type { EstimateTotals } from "@/lib/order-estimate";
import { feeCategoryLabel } from "@/lib/estimate-fee-categories";
import { productionRunMemberLabel } from "@/lib/order-production-run";
import type { OrderProductionRun } from "@/types";
import { cn } from "@/lib/utils";

type ProductionRunSummary = Pick<
  OrderProductionRun,
  "id" | "members" | "combinedQuantity"
>;

function SectionHeader({
  label,
  subtotal,
  compact,
}: {
  label: string;
  subtotal: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <tr className="border-t border-[#ebebeb] bg-[#fafafa]">
        <td
          colSpan={3}
          className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#616161]"
        >
          {label}
        </td>
        <td className="px-3 py-2 text-right text-[11px] font-semibold tabular-nums text-[#616161]">
          {formatCurrency(subtotal)}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[#ebebeb] bg-[#fafafa]">
      <td
        colSpan={3}
        className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#616161]"
      >
        {label}
      </td>
      <td
        colSpan={2}
        className="px-3 py-2 text-right text-[11px] font-semibold tabular-nums text-[#616161]"
      >
        {formatCurrency(subtotal)}
      </td>
    </tr>
  );
}

function DataRow({
  description,
  detail,
  qty,
  unitCost,
  lineTotal,
  badge,
  compact,
  highlight,
  includedInBundle,
}: {
  description: string;
  detail?: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  badge?: string;
  compact?: boolean;
  highlight?: boolean;
  includedInBundle?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-[#f0f0f0] align-top",
        highlight && "bg-[#fafcff]"
      )}
    >
      <td className="px-3 py-2.5" colSpan={compact ? 1 : 1}>
        <div className="flex flex-wrap items-center gap-1.5">
          {badge ? (
            <span className="rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
              {badge}
            </span>
          ) : null}
          <p className="font-medium text-[#303030]">{description}</p>
        </div>
        {detail ? (
          <p className={cn("text-[11px] text-[#8a8a8a]", !compact && "sm:hidden")}>
            {detail}
          </p>
        ) : null}
      </td>
      {!compact ? (
        <td className="hidden px-3 py-2.5 text-[12px] text-[#616161] sm:table-cell">
          {detail || "—"}
        </td>
      ) : null}
      <td className="px-3 py-2.5 text-right tabular-nums text-[#303030]">{qty}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
        {includedInBundle ? "—" : formatCurrency(unitCost)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#303030]">
        {includedInBundle ? (
          <span className="font-normal text-[#8a8a8a]">Included</span>
        ) : (
          formatCurrency(lineTotal)
        )}
      </td>
    </tr>
  );
}

function TotalsFooter({
  subtotal,
  tax,
  taxRate,
  total,
  paid,
  balance,
  accentColor,
  compact,
}: {
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  balance: number;
  accentColor?: string;
  compact?: boolean;
}) {
  const taxLabel = `Tax (${(taxRate * 100).toFixed(
    taxRate * 100 === Math.round(taxRate * 100) ? 0 : 2
  )}%)`;
  const labelColSpan = compact ? 3 : 4;

  return (
    <tfoot className="bg-[#fafafa]">
      <tr className="border-t border-[#ebebeb]">
        <td
          colSpan={labelColSpan}
          className="px-3 py-2 text-right text-[12px] text-[#616161]"
        >
          Subtotal
        </td>
        <td className="px-3 py-2 text-right font-medium tabular-nums">
          {formatCurrency(subtotal)}
        </td>
      </tr>
      <tr>
        <td colSpan={labelColSpan} className="px-3 py-2 text-right text-[12px] text-[#616161]">
          {taxLabel}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(tax)}</td>
      </tr>
      <tr className="border-t border-[#ebebeb]">
        <td
          colSpan={labelColSpan}
          className="px-3 py-3 text-right text-[14px] font-semibold text-[#303030]"
        >
          Total
        </td>
        <td
          className="px-3 py-3 text-right text-[18px] font-bold tabular-nums"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {formatCurrency(total)}
        </td>
      </tr>
      {paid > 0 ? (
        <>
          <tr>
            <td colSpan={labelColSpan} className="px-3 py-2 text-right text-[12px] text-[#616161]">
              Paid
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              −{formatCurrency(paid)}
            </td>
          </tr>
          <tr>
            <td
              colSpan={labelColSpan}
              className="px-3 py-2 text-right text-[12px] font-semibold text-[#303030]"
            >
              Balance due
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums">
              {formatCurrency(balance)}
            </td>
          </tr>
        </>
      ) : null}
    </tfoot>
  );
}

export function StaffEstimateBreakdownTable({
  totals,
  productionRun,
}: {
  totals: EstimateTotals;
  productionRun?: ProductionRunSummary;
}) {
  const { settings } = useShopSettings();
  const sections = groupEstimateSections(
    totals,
    settings.estimateDocument?.lineItemSections
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[#ebebeb]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            <th className="px-3 py-2 text-left">Item</th>
            <th className="hidden px-3 py-2 text-left sm:table-cell">Details</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Unit</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {productionRun?.members && productionRun.members.length > 1 ? (
            <ProductionRunRows productionRun={productionRun} />
          ) : null}
          {sections.length > 0 ? (
            sections.map((section) => (
              <SectionRows key={section.key} section={section} />
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-6 text-center text-[12px] text-[#8a8a8a]"
              >
                No line items on this order yet.
              </td>
            </tr>
          )}
        </tbody>
        <TotalsFooter
          subtotal={totals.subtotal}
          tax={totals.tax}
          taxRate={totals.taxRate}
          total={totals.total}
          paid={totals.paid}
          balance={totals.balance}
        />
      </table>
    </div>
  );
}

function ProductionRunRows({
  productionRun,
  compact = false,
}: {
  productionRun: ProductionRunSummary;
  compact?: boolean;
}) {
  return (
    <>
      <tr className="border-t border-[#cfe3d6] bg-[#f4faf6]">
        <td
          colSpan={compact ? 1 : 2}
          className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#245c3c]"
        >
          Multi-job run
          <span className="ml-2 font-normal normal-case tracking-normal text-[#52705d]">
            Combined quantity sets the unit-price tier
          </span>
        </td>
        <td
          colSpan={3}
          className="px-3 py-2 text-right text-[11px] font-semibold tabular-nums text-[#245c3c]"
        >
          {productionRun.combinedQuantity.toLocaleString()} pcs combined
        </td>
      </tr>
      {productionRun.members.map((member) => (
        <tr
          key={member.orderId}
          className="border-t border-[#e4eee7] bg-[#fbfdfb] align-top"
        >
          <td className="px-3 py-2.5">
            <p className="font-medium text-[#303030]">
              {productionRunMemberLabel(member)}
            </p>
            {compact ? (
              <p className="text-[11px] text-[#6b7d70]">
                Included in combined pricing quantity
              </p>
            ) : null}
          </td>
          {!compact ? (
            <td className="hidden px-3 py-2.5 text-[12px] text-[#6b7d70] sm:table-cell">
              Included in combined pricing quantity
            </td>
          ) : null}
          <td className="px-3 py-2.5 text-right tabular-nums text-[#303030]">
            {member.quantity.toLocaleString()}
          </td>
          <td className="px-3 py-2.5 text-right text-[#a0a0a0]">—</td>
          <td className="px-3 py-2.5 text-right text-[#a0a0a0]">—</td>
        </tr>
      ))}
    </>
  );
}

function SectionRows({
  section,
}: {
  section: ReturnType<typeof groupEstimateSections>[number];
}) {
  return (
    <>
      <SectionHeader label={section.label} subtotal={section.subtotal} />
      {section.rows.map((row) => (
        <DataRow
          key={row.id}
          description={row.description}
          detail={row.detail}
          qty={row.qty}
          unitCost={row.unitCost}
          lineTotal={row.lineTotal}
          includedInBundle={row.includedInBundle}
          badge={
            row.kind === "decoration" && row.detail.includes("combined pcs")
              ? "Combined tier"
              : row.kind === "fee" && row.feeCategory
              ? feeCategoryLabel(row.feeCategory)
              : undefined
          }
          highlight={row.kind === "decoration" || row.feeCategory === "decoration"}
        />
      ))}
    </>
  );
}

export function CustomerEstimateBreakdownTable({
  rows,
  garmentSubtotal,
  decorationSubtotal,
  subtotal,
  tax,
  taxRate,
  total,
  paid,
  balance,
  accentColor,
  productionRun,
}: {
  rows: ReviewEstimateRow[];
  garmentSubtotal: number;
  decorationSubtotal: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  balance: number;
  accentColor?: string;
  productionRun?: ProductionRunSummary;
}) {
  const sections = groupReviewEstimateSections({
    rows,
    garmentSubtotal,
    decorationSubtotal,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[#ebebeb]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Unit</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {productionRun?.members && productionRun.members.length > 1 ? (
            <ProductionRunRows productionRun={productionRun} compact />
          ) : null}
          {sections.map((section) => (
            <Fragment key={section.key}>
              <SectionHeader
                label={section.label}
                subtotal={section.subtotal}
                compact
              />
              {section.rows.map((row, index) => (
                <DataRow
                  key={`${section.key}-${index}`}
                  description={row.description}
                  detail={row.detail}
                  qty={row.qty}
                  unitCost={row.unitCost}
                  lineTotal={row.lineTotal}
                  includedInBundle={row.includedInBundle}
                  badge={
                    row.kind === "decoration" &&
                    row.detail.includes("combined pcs")
                      ? "Combined tier"
                      : row.kind === "fee" && row.feeCategory
                      ? feeCategoryLabel(row.feeCategory)
                      : undefined
                  }
                  compact
                  highlight={
                    row.kind === "decoration" || row.feeCategory === "decoration"
                  }
                />
              ))}
            </Fragment>
          ))}
        </tbody>
        <TotalsFooter
          subtotal={subtotal}
          tax={tax}
          taxRate={taxRate}
          total={total}
          paid={paid}
          balance={balance}
          accentColor={accentColor}
          compact
        />
      </table>
    </div>
  );
}
