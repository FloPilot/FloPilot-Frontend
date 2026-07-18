"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Ruler,
  Send,
  Sparkles,
  Table2,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/orders/pdf-preview-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatCurrency } from "@/lib/format";
import { isLocationsMetaColumn } from "@/lib/pricing-location-bundle";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  customerHasNegotiatedPricing,
  resolveEffectivePricingMatrix,
} from "@/lib/customer-pricing";
import { computeEstimateTotals } from "@/lib/order-estimate";
import { OrderEstimateApprovalPanel } from "@/components/orders/order-estimate-approval-panel";
import { OrderEstimatePricingPanel } from "@/components/orders/order-estimate-pricing-panel";
import { StaffEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import { orderHasDtfEvents } from "@/lib/order-materials";
import {
  filterMatrixMethodsForOrder,
  filterPricingHighlights,
  formatPricingHighlightSummary,
  getPricingStepAccent,
  PRICING_APPLIED_CHROME,
  resolveOrderPricingHighlights,
  type PricingMatrixHighlight,
} from "@/lib/pricing-matrix-lookup";
import type { PricingMethod } from "@/lib/shop-settings";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "loading";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

export function OrderEstimateTab({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const { previewOrderDocument, sendProofsAndEstimate, getCustomerById } =
    useSchedule();

  const customer = getCustomerById(order.customerId);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings.pricingMatrix, customer, order]
  );

  const totals = useMemo(
    () => computeEstimateTotals(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer]
  );

  const pricingMethods = useMemo(
    () =>
      pricingMatrix.enabled
        ? pricingMatrix.methods.filter((m) => m.rows.length > 0)
        : [],
    [pricingMatrix]
  );

  const pricingLookup = useMemo(
    () => resolveOrderPricingHighlights(order, pricingMatrix),
    [order, pricingMatrix]
  );

  const sortedPricingMethods = useMemo(() => {
    const filtered = filterMatrixMethodsForOrder(pricingMethods, {
      hasDtf: orderHasDtfEvents(order),
      appliedMethodIds: pricingLookup.appliedMethodIds,
    });
    if (pricingLookup.appliedMethodIds.size === 0) return filtered;
    return [...filtered].sort((a, b) => {
      const aApplied = pricingLookup.appliedMethodIds.has(a.id);
      const bApplied = pricingLookup.appliedMethodIds.has(b.id);
      if (aApplied === bApplied) return 0;
      return aApplied ? -1 : 1;
    });
  }, [order, pricingMethods, pricingLookup.appliedMethodIds]);

  const dtfHighlights = useMemo(
    () => filterPricingHighlights(pricingLookup.highlights, "dtf"),
    [pricingLookup.highlights]
  );

  const matrixHighlights = useMemo(
    () => filterPricingHighlights(pricingLookup.highlights, "matrix"),
    [pricingLookup.highlights]
  );

  const hasDtf = orderHasDtfEvents(order);
  const showDtfBreakdown = hasDtf;
  const showPricingMatrix =
    sortedPricingMethods.length > 0 ||
    matrixHighlights.length > 0 ||
    (!hasDtf && pricingLookup.highlights.length > 0);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    if (type !== "loading") {
      setTimeout(() => setToast(null), 5000);
    }
  }, []);

  const loadEstimatePdf = useCallback(
    () => previewOrderDocument(order.id, "all"),
    [previewOrderDocument, order.id]
  );

  const handleSend = useCallback(async () => {
    setSending(true);
    showToast("Sending proofs & estimate…", "loading");
    try {
      const email = await sendProofsAndEstimate(order.id);
      showToast(`Proofs & estimate emailed to ${email.to}.`, "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again.",
        "error"
      );
    } finally {
      setSending(false);
    }
  }, [sendProofsAndEstimate, order.id, showToast]);

  return (
    <div className="space-y-4">
      <OrderEstimateApprovalPanel order={order} />

      <section className={dashboardCardClass}>
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className={dashboardTaskTitleClass}>Estimate</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Pricing breakdown for this order. Preview the full customer PDF
              (estimate + proofs) or send it for approval.
              {pricingMatrix.rateSheetName && !pricingMatrix.usingShopPricing ? (
                <span className="mt-1 block text-[#2c6ecb]">
                  Using negotiated rates: {pricingMatrix.rateSheetName}
                </span>
              ) : pricingMatrix.usingShopPricing && customerHasNegotiatedPricing(customer) ? (
                <span className="mt-1 block text-[#616161]">
                  Using shop standard pricing for this order
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className={cn(
                dashboardControlClass,
                "inline-flex h-9 items-center gap-1.5 px-3 text-[13px]"
              )}
            >
              <FileText className="size-3.5" />
              Preview PDF
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className={cn(
                dashboardPrimaryButtonClass,
                "inline-flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send proofs + estimate
            </button>
          </div>
        </div>

        {toast ? (
          <div
            className={cn(
              "flex items-center gap-2 border-b px-4 py-2.5 text-[12px] sm:px-5",
              toast.type === "success" &&
                "border-[#cdeccd] bg-[#f1faf1] text-[#0f7a3d]",
              toast.type === "error" &&
                "border-[#f5c2c2] bg-[#fff1f1] text-[#b42318]",
              toast.type === "loading" &&
                "border-[#d7e3fb] bg-[#f4f7fd] text-[#2c6ecb]"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="size-3.5 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="size-3.5 shrink-0" />
            ) : (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            )}
            <span>{toast.message}</span>
          </div>
        ) : null}

        <div className="space-y-4 p-4 sm:p-5">
          <OrderEstimatePricingPanel order={order} customer={customer} />
          <StaffEstimateBreakdownTable
            totals={totals}
            productionRun={order.productionRun}
          />
        </div>
      </section>

      {showDtfBreakdown ? (
        <section className={dashboardCardClass}>
          <div className="flex items-center gap-2 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
            <Ruler className="size-4 text-[#616161]" />
            <div className="min-w-0">
              <h2 className={dashboardTaskTitleClass}>DTF cost breakdown</h2>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                Transfer pricing by print size and quantity tier — set print
                dimensions on each proof location to match your DTF matrix.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            {dtfHighlights.length > 0 ? (
              <DtfCostBreakdown highlights={dtfHighlights} />
            ) : (
              <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-10 text-center">
                <Ruler className="size-5 text-[#b5b5b5]" />
                <p className="text-[13px] font-medium text-[#616161]">
                  DTF pricing not matched yet
                </p>
                <p className="max-w-md text-[12px] text-[#8a8a8a]">
                  Add print dimensions on the Proofs tab and publish a DTF method
                  in Settings → Pricing so this order can price by transfer
                  size.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {showPricingMatrix ? (
      <section className={dashboardCardClass}>
        <div className="flex items-center gap-2 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <Table2 className="size-4 text-[#616161]" />
          <div className="min-w-0">
            <h2 className={dashboardTaskTitleClass}>Pricing matrix</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {matrixHighlights.length > 0
                ? "Highlighted cells show the tier applied to each decoration on this order."
                : "Your published per-piece pricing by quantity tier."}
            </p>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          {matrixHighlights.length > 0 ? (
            <AppliedPricingCallout highlights={matrixHighlights} />
          ) : null}

          {sortedPricingMethods.length > 0 ? (
            <div className="space-y-5">
              {sortedPricingMethods.map((method) => (
                <PricingMethodTable
                  key={method.id}
                  method={method}
                  highlightedCells={
                    pricingLookup.cellsByMethod.get(method.id) ?? new Map()
                  }
                  isApplied={pricingLookup.appliedMethodIds.has(method.id)}
                />
              ))}
            </div>
          ) : matrixHighlights.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-10 text-center">
              <Table2 className="size-5 text-[#b5b5b5]" />
              <p className="text-[13px] font-medium text-[#616161]">
                No pricing matrix published
              </p>
              <p className="max-w-sm text-[12px] text-[#8a8a8a]">
                An admin can upload pricing tiers under Settings → Pricing to
                show the matrix here.
              </p>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`Proofs & estimate · Order ${formatOrderDisplayLine(order)}`}
        subtitle="Same PDF attached when you send proofs + estimate to the customer."
        load={loadEstimatePdf}
      />
    </div>
  );
}

function EstimateBreakdown({
  totals,
}: {
  totals: ReturnType<typeof computeEstimateTotals>;
}) {
  const garmentRows = totals.rows.filter((row) => row.kind === "garment");
  const decorationRows = totals.rows.filter((row) => row.kind === "decoration");
  const feeRows = totals.rows.filter((row) => row.kind === "fee");

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
          {totals.rows.length > 0 ? (
            <>
              {garmentRows.length > 0 ? (
                <EstimateSectionHeader
                  label="Garments"
                  subtotal={totals.garmentSubtotal}
                />
              ) : null}
              {garmentRows.map((row) => (
                <EstimateDataRow key={row.id} row={row} />
              ))}

              {decorationRows.length > 0 ? (
                <EstimateSectionHeader
                  label="Decoration"
                  subtotal={totals.decorationSubtotal}
                />
              ) : null}
              {decorationRows.map((row) => (
                <EstimateDataRow key={row.id} row={row} />
              ))}

              {feeRows.length > 0 ? (
                <EstimateSectionHeader
                  label="Fees"
                  subtotal={totals.feesSubtotal}
                />
              ) : null}
              {feeRows.map((row) => (
                <EstimateDataRow key={row.id} row={row} />
              ))}
            </>
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
        <tfoot className="bg-[#fafafa]">
          <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <TotalsRow
            label={`Tax (${(totals.taxRate * 100).toFixed(
              totals.taxRate * 100 === Math.round(totals.taxRate * 100) ? 0 : 2
            )}%)`}
            value={formatCurrency(totals.tax)}
          />
          <TotalsRow label="Total" value={formatCurrency(totals.total)} strong />
          {totals.paid > 0 ? (
            <>
              <TotalsRow label="Paid" value={`−${formatCurrency(totals.paid)}`} />
              <TotalsRow
                label="Balance due"
                value={formatCurrency(totals.balance)}
                strong
              />
            </>
          ) : null}
        </tfoot>
      </table>
    </div>
  );
}

function EstimateSectionHeader({
  label,
  subtotal,
}: {
  label: string;
  subtotal: number;
}) {
  return (
    <tr className="border-t border-[#ebebeb] bg-[#fafafa]">
      <td colSpan={3} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
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

function EstimateDataRow({
  row,
}: {
  row: ReturnType<typeof computeEstimateTotals>["rows"][number];
}) {
  const accent =
    row.kind === "decoration" && row.pricingStepIndex !== undefined
      ? getPricingStepAccent(row.pricingStepIndex)
      : null;

  return (
    <tr
      className={cn(
        "border-t border-[#f0f0f0] align-top",
        accent?.cellBg
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {row.kind === "decoration" && row.decorationType && accent ? (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                accent.badgeBg,
                accent.badgeText
              )}
            >
              {decorationLabel(row.decorationType)}
            </span>
          ) : null}
          <p className="font-medium text-[#303030]">{row.description}</p>
        </div>
        <p className="text-[11px] text-[#8a8a8a] sm:hidden">{row.detail || "—"}</p>
      </td>
      <td className="hidden px-3 py-2.5 text-[12px] text-[#616161] sm:table-cell">
        {row.detail || "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#303030]">
        {row.qty}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
        {row.includedInBundle ? "—" : formatCurrency(row.unitCost)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#303030]">
        {row.includedInBundle ? (
          <span className="font-normal text-[#8a8a8a]">Included</span>
        ) : (
          formatCurrency(row.lineTotal)
        )}
      </td>
    </tr>
  );
}

function TotalsRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr className="border-t border-[#f0f0f0]">
      <td className="hidden sm:table-cell" />
      <td className="hidden sm:table-cell" />
      <td />
      <td
        className={cn(
          "px-3 py-2 text-right text-[12px]",
          strong ? "font-semibold text-[#303030]" : "text-[#616161]"
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right tabular-nums",
          strong
            ? "text-[14px] font-semibold text-[#303030]"
            : "text-[13px] text-[#303030]"
        )}
      >
        {value}
      </td>
    </tr>
  );
}

function DtfCostBreakdown({
  highlights,
}: {
  highlights: PricingMatrixHighlight[];
}) {
  const dtfMethodId = highlights[0]?.methodId;
  const dtfMethod = highlights[0]?.methodName;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border p-3.5 sm:p-4",
          PRICING_APPLIED_CHROME.callout
        )}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles
              className={cn("size-4", PRICING_APPLIED_CHROME.calloutIcon)}
            />
            <p className="text-[13px] font-semibold text-[#303030]">
              Applied to this order
            </p>
          </div>
          {dtfMethod ? (
            <span className="text-[11px] text-[#8a8a8a]">{dtfMethod}</span>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {highlights.map((entry) => {
            const accent = getPricingStepAccent(entry.stepIndex);
            const lineTotal = entry.unitPrice * entry.pieceCount;
            return (
              <div
                key={`${entry.methodId}-${entry.stepIndex}-${entry.imprintLabel}`}
                className={cn(
                  "rounded-lg border border-[#ebebeb] border-l-4 bg-white px-3 py-2.5",
                  accent.cardBorder
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                      accent.badgeBg,
                      accent.badgeText
                    )}
                  >
                    DTF
                  </span>
                  <span className="text-[12px] font-medium text-[#303030]">
                    {entry.imprintLabel}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-[12px] text-[#616161]">
                  <div className="flex justify-between gap-3">
                    <dt>Print size</dt>
                    <dd className="font-medium text-[#303030]">
                      {entry.sizeLabel || entry.columnLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Quantity</dt>
                    <dd className="tabular-nums text-[#303030]">
                      {entry.pieceCount} pcs · {entry.qtyLabel} tier
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Per piece</dt>
                    <dd className={cn("font-semibold tabular-nums", accent.priceText)}>
                      {entry.bundledIncluded
                        ? "Included"
                        : formatCurrency(entry.unitPrice)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[#f0f0f0] pt-1.5">
                    <dt className="font-medium text-[#303030]">Line total</dt>
                    <dd className="font-semibold tabular-nums text-[#303030]">
                      {entry.bundledIncluded
                        ? "—"
                        : formatCurrency(lineTotal)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                  Matrix column: {entry.columnLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {dtfMethodId ? (
        <DtfPricingMethodTable
          methodId={dtfMethodId}
          highlights={highlights}
        />
      ) : null}
    </div>
  );
}

function DtfPricingMethodTable({
  methodId,
  highlights,
}: {
  methodId: string;
  highlights: PricingMatrixHighlight[];
}) {
  const { settings } = useShopSettings();
  const method = settings.pricingMatrix.methods.find((m) => m.id === methodId);
  if (!method || method.rows.length === 0) return null;

  const highlightedCells = new Map<string, number[]>();
  for (const entry of highlights) {
    const key = `${entry.rowIndex}:${entry.colIndex}`;
    const existing = highlightedCells.get(key) ?? [];
    highlightedCells.set(key, [...existing, entry.stepIndex]);
  }

  return (
    <PricingMethodTable
      method={method}
      highlightedCells={highlightedCells}
      isApplied
      sizeColumnHeaders
    />
  );
}

function AppliedPricingCallout({
  highlights,
}: {
  highlights: PricingMatrixHighlight[];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 sm:p-4",
        PRICING_APPLIED_CHROME.callout
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className={cn("size-4", PRICING_APPLIED_CHROME.calloutIcon)} />
        <p className="text-[13px] font-semibold text-[#303030]">
          Applied to this order
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {highlights.map((entry) => {
          const accent = getPricingStepAccent(entry.stepIndex);
          return (
          <div
            key={`${entry.methodId}-${entry.stepIndex}-${entry.imprintLabel}`}
            className={cn(
              "rounded-lg border border-[#ebebeb] border-l-4 bg-white px-3 py-2.5",
              accent.cardBorder
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  accent.dot
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  accent.badgeBg,
                  accent.badgeText
                )}
              >
                {decorationLabel(entry.decoration)}
              </span>
              <span className="text-[12px] font-medium text-[#303030]">
                {entry.imprintLabel}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-[#616161]">
              {formatPricingHighlightSummary(entry)} ·{" "}
              {entry.bundledIncluded ? (
                <span className="font-semibold text-[#8a8a8a]">Included</span>
              ) : (
                <>
                  <span className={cn("font-semibold", accent.priceText)}>
                    {formatCurrency(entry.unitPrice)}
                  </span>{" "}
                  / pc
                </>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
              {entry.bundledIncluded
                ? `${entry.methodName} · included in location rate`
                : `${entry.methodName} · ${entry.qtyLabel} tier · ${entry.columnLabel}`}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingMethodTable({
  method,
  highlightedCells,
  isApplied,
  sizeColumnHeaders = false,
}: {
  method: PricingMethod;
  highlightedCells: Map<string, number[]>;
  isApplied: boolean;
  sizeColumnHeaders?: boolean;
}) {
  const getStepIndices = (rowIdx: number, colIdx: number) =>
    highlightedCells.get(`${rowIdx}:${colIdx}`) ?? [];

  const isCellHighlighted = (rowIdx: number, colIdx: number) =>
    getStepIndices(rowIdx, colIdx).length > 0;

  const isRowHighlighted = (rowIdx: number) =>
    method.columns.some((_, colIdx) => isCellHighlighted(rowIdx, colIdx));

  const isColHighlighted = (colIdx: number) =>
    method.rows.some((_, rowIdx) => isCellHighlighted(rowIdx, colIdx));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border",
        isApplied
          ? PRICING_APPLIED_CHROME.tableWrap
          : "border-[#ebebeb] opacity-80"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          isApplied
            ? PRICING_APPLIED_CHROME.tableHeader
            : "border-[#ebebeb] bg-[#fafafa]"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[#303030]">
            {method.name || "Method"}
          </span>
          {isApplied ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PRICING_APPLIED_CHROME.badge
              )}
            >
              <Sparkles className="size-2.5" />
              On this order
            </span>
          ) : null}
        </div>
        <span className="text-[11px] text-[#8a8a8a]">{method.unit}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              <th className="px-3 py-2 text-left">Qty</th>
              {method.columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-3 py-2 text-right",
                    isColHighlighted(idx) && "bg-[#f6f6f7] text-[#303030]"
                  )}
                >
                  {sizeColumnHeaders ? col : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {method.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "border-t border-[#f0f0f0]",
                  isRowHighlighted(rowIdx) && "bg-[#fafafa]"
                )}
              >
                <td
                  className={cn(
                    "px-3 py-2 font-medium",
                    isRowHighlighted(rowIdx)
                      ? "text-[#303030]"
                      : "text-[#303030]"
                  )}
                >
                  {row.minQty}+
                  {isRowHighlighted(rowIdx) ? (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Tier
                    </span>
                  ) : null}
                </td>
                {method.columns.map((col, colIdx) => {
                  const stepIndices = getStepIndices(rowIdx, colIdx);
                  const active = stepIndices.length > 0;
                  const multi = stepIndices.length > 1;
                  const accent = active
                    ? getPricingStepAccent(stepIndices[0])
                    : null;
                  const isLocationsCol = isLocationsMetaColumn(col);
                  const cellValue = row.prices[colIdx] ?? 0;
                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        "relative px-3 py-2 text-right tabular-nums",
                        active && accent
                          ? multi
                            ? "bg-white font-semibold text-[#303030] ring-2 ring-inset ring-[#d4d4d4]"
                            : cn(
                                "font-semibold ring-2 ring-inset",
                                accent.cellBg,
                                accent.cellText,
                                accent.cellRing
                              )
                          : "text-[#616161]"
                      )}
                    >
                      {multi ? (
                        <div
                          className="absolute inset-x-0 top-0 flex h-1"
                          aria-hidden
                        >
                          {stepIndices.map((stepIndex) => (
                            <span
                              key={stepIndex}
                              className={cn(
                                "flex-1",
                                getPricingStepAccent(stepIndex).dot
                              )}
                            />
                          ))}
                        </div>
                      ) : null}
                      {isLocationsCol
                        ? String(Math.floor(Number(cellValue) || 0))
                        : formatCurrency(cellValue)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {method.notes ? (
        <p className="border-t border-[#f0f0f0] bg-white px-3 py-2 text-[11px] text-[#8a8a8a]">
          {method.notes}
        </p>
      ) : null}
    </div>
  );
}
