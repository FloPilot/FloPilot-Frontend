"use client";

import { useMemo } from "react";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  deriveCustomerUnitPriceFromMarkup,
  normalizeMarkupPercent,
  shouldShowBlankPricingForBlankSource,
} from "@/lib/blank-pricing";
import { formatCurrency } from "@/lib/format";
import { BLANK_SOURCE_LABELS } from "@/lib/order-materials";
import { blankSourceLabel } from "@/lib/order-receiving-checkpoints";
import {
  ORDER_REQUEST_SIZE_KEYS,
  pieceCountFromSizes,
  type OrderRequestDetail,
  type OrderRequestLineItem,
} from "@/lib/order-requests";
import type { BlankSource } from "@/types";
import { cn } from "@/lib/utils";

function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[#616161]">
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      Pending
    </span>
  );
}

type SizeRow = {
  key: string;
  item: OrderRequestLineItem;
  size: string;
  qty: number;
  isFirst: boolean;
  rowSpan: number;
};

function expandSizeRows(items: OrderRequestLineItem[]): SizeRow[] {
  const rows: SizeRow[] = [];
  for (const item of items) {
    const sizes = ORDER_REQUEST_SIZE_KEYS.filter(
      (size) => (item.sizes?.[size] || 0) > 0
    );
    const entries =
      sizes.length > 0
        ? sizes
        : item.quantity > 0
          ? (["—"] as string[])
          : [];
    entries.forEach((size, index) => {
      rows.push({
        key: `${item.id}-${size}`,
        item,
        size,
        qty:
          size === "—"
            ? item.quantity || 0
            : item.sizes?.[size] || 0,
        isFirst: index === 0,
        rowSpan: entries.length,
      });
    });
  }
  return rows;
}

export function OrderRequestGarmentsTab({
  request,
  editable,
  onBlankSourceChange,
  onOrderedQtyChange,
}: {
  request: OrderRequestDetail;
  editable: boolean;
  onBlankSourceChange: (blankSource: BlankSource) => void;
  onOrderedQtyChange: (lineItemId: string, size: string, qty: number) => void;
}) {
  const { settings } = useShopSettings();
  const blankSource = request.blankSource;
  const showBlankPricing = shouldShowBlankPricingForBlankSource(blankSource);
  const shopDefaultMarkup = normalizeMarkupPercent(
    settings.pricingMatrix?.blankMarkupPercent ?? 0
  );

  const items = request.lineItems || [];
  const sizeRows = useMemo(() => expandSizeRows(items), [items]);
  const pieceCount = items.reduce(
    (sum, item) =>
      sum + (item.quantity || pieceCountFromSizes(item.sizes || {})),
    0
  );

  const garmentCustomerSubtotal = useMemo(() => {
    if (!showBlankPricing) return 0;
    return sizeRows.reduce((sum, row) => {
      const unitCost = row.item.unitCost || 0;
      const customerUnit = deriveCustomerUnitPriceFromMarkup(
        unitCost,
        shopDefaultMarkup
      );
      return sum + customerUnit * row.qty;
    }, 0);
  }, [showBlankPricing, sizeRows, shopDefaultMarkup]);

  const estimate = request.currentEstimate;
  const title =
    blankSource === "customer_supplies" ? "Garments" : "Blanks / Garments";

  return (
    <div className="space-y-4">
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={dashboardTaskTitleClass}>{title}</h2>
              <span className="rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#616161]">
                {pieceCount} pcs
              </span>
            </div>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Adjust styles, colors, and quantities before converting.
              {showBlankPricing
                ? " Blank pricing is staff only — not shown in the customer portal."
                : " Customer-supplied garments — blank cost is omitted from pricing."}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {items.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[#303030]">
                  Who orders the goods?
                </h3>
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    blankSource
                      ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                      : "border-[#f0d9a8] bg-[#ffef9d] text-[#4a3800]"
                  )}
                >
                  {blankSource ? blankSourceLabel(blankSource) : "Not set"}
                </span>
              </div>
              <p className={dashboardTaskDetailClass}>
                Shop PO vs customer-supplied garments — same rule as orders for
                blank pricing.
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  Object.entries(BLANK_SOURCE_LABELS) as [BlankSource, string][]
                ).map(([value, label]) => (
                  <ProofActionButton
                    key={value}
                    variant="secondary"
                    selected={blankSource === value}
                    disabled={!editable}
                    successLabel="Saved"
                    className="h-9 flex-1 text-[13px] sm:flex-none"
                    onClick={() => onBlankSourceChange(value)}
                  >
                    {label}
                  </ProofActionButton>
                ))}
              </div>
            </div>
          ) : null}

          {request.vendorPurchaseOrder?.poNumber ||
          request.vendorPurchaseOrder?.fileUrl ? (
            <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5 text-[13px]">
              <p className="font-medium text-[#303030]">
                Vendor PO{" "}
                {request.vendorPurchaseOrder.poNumber || "attached"}
                {request.vendorPurchaseOrder.vendorName
                  ? ` · ${request.vendorPurchaseOrder.vendorName}`
                  : ""}
              </p>
              {request.vendorPurchaseOrder.fileUrl ? (
                <a
                  href={request.vendorPurchaseOrder.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-[12px] font-medium text-[#2c6ecb] underline"
                >
                  Open vendor purchase order
                </a>
              ) : null}
            </div>
          ) : null}

          <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
            <div className="overflow-x-auto">
              <table
                className={cn(
                  "w-full text-[13px]",
                  showBlankPricing ? "min-w-[1120px]" : "min-w-[880px]"
                )}
              >
                <thead>
                  <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                    <th className="min-w-[180px] px-4 py-2.5 text-left font-medium text-[#616161]">
                      Product
                    </th>
                    <th className="min-w-[100px] px-3 py-2.5 text-left font-medium text-[#616161]">
                      Color
                    </th>
                    <th className="w-16 px-3 py-2.5 text-left font-medium text-[#616161]">
                      Size
                    </th>
                    <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                      Ordered
                    </th>
                    <th className="w-40 px-3 py-2.5 text-right font-medium text-[#616161]">
                      Received
                    </th>
                    {showBlankPricing ? (
                      <>
                        <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                          Blank cost
                        </th>
                        <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                          Markup %
                        </th>
                        <th className="w-32 px-3 py-2.5 text-right font-medium text-[#616161]">
                          Customer cost
                        </th>
                      </>
                    ) : null}
                    <th className="w-24 px-3 py-2.5 text-right font-medium text-[#616161]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sizeRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showBlankPricing ? 9 : 6}
                        className="px-4 py-8 text-center text-[13px] text-[#616161]"
                      >
                        No garments on this request yet.
                      </td>
                    </tr>
                  ) : (
                    sizeRows.map((row) => {
                      const unitCost = row.item.unitCost || 0;
                      const shopLineTotal = unitCost * row.qty;
                      const customerUnit = deriveCustomerUnitPriceFromMarkup(
                        unitCost,
                        shopDefaultMarkup
                      );
                      const customerLineTotal = customerUnit * row.qty;

                      return (
                        <tr
                          key={row.key}
                          className="border-b border-[#ebebeb] last:border-0"
                        >
                          {row.isFirst ? (
                            <>
                              <td
                                rowSpan={row.rowSpan}
                                className="border-r border-[#f0f0f0] px-4 py-3 align-top"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-[#303030]">
                                    {row.item.styleNumber?.trim() ||
                                      row.item.productName ||
                                      "Garment"}
                                  </p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8a8a8a]">
                                    <span>
                                      {[row.item.brand, row.item.productName]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                    </span>
                                    {row.item.supplierProvider ===
                                    "ssActivewear" ? (
                                      <span className="rounded bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                        S&amp;S
                                      </span>
                                    ) : null}
                                    {row.item.supplierProvider === "sanMar" ? (
                                      <span className="rounded bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                        SanMar
                                      </span>
                                    ) : null}
                                  </p>
                                </div>
                              </td>
                              <td
                                rowSpan={row.rowSpan}
                                className="border-r border-[#f0f0f0] px-3 py-3 align-top text-[#616161]"
                              >
                                {row.item.color || "—"}
                              </td>
                            </>
                          ) : null}
                          <td className="px-3 py-3 font-semibold text-[#303030]">
                            {row.size}
                          </td>
                          <td className="px-3 py-3">
                            {editable && row.size !== "—" ? (
                              <input
                                type="number"
                                min={0}
                                className={cn(
                                  dashboardControlClass,
                                  "ml-auto h-8 w-20 px-2 text-right tabular-nums"
                                )}
                                value={row.qty}
                                onChange={(e) =>
                                  onOrderedQtyChange(
                                    row.item.id,
                                    row.size,
                                    Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                              />
                            ) : (
                              <div className="text-right tabular-nums text-[#303030]">
                                {row.qty}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <PendingBadge />
                          </td>
                          {showBlankPricing ? (
                            <>
                              <td className="px-3 py-3 text-right">
                                <p className="font-medium tabular-nums text-[#303030]">
                                  {formatCurrency(shopLineTotal)}
                                </p>
                                <p className="text-[11px] tabular-nums text-[#8a8a8a]">
                                  {formatCurrency(unitCost)}/ea
                                </p>
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
                                {shopDefaultMarkup}
                                <span className="text-[#8a8a8a]">%</span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <p className="font-medium tabular-nums text-[#303030]">
                                  {formatCurrency(customerLineTotal)}
                                </p>
                                <p className="mt-0.5 inline-flex rounded-md bg-[#f6f6f7] px-1.5 py-0.5 text-[11px] tabular-nums text-[#616161]">
                                  {formatCurrency(customerUnit)}
                                </p>
                              </td>
                            </>
                          ) : null}
                          <td className="px-3 py-3 text-right">
                            <PendingBadge />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {showBlankPricing && sizeRows.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-[#ebebeb] bg-[#fafafa]">
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-right text-[13px] font-medium text-[#616161]"
                      >
                        Customer garment subtotal
                      </td>
                      <td
                        colSpan={3}
                        className="px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]"
                      >
                        {formatCurrency(garmentCustomerSubtotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </div>
      </section>

      {estimate ? (
        <section className={dashboardCardClass}>
          <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
            <h2 className={dashboardTaskTitleClass}>Order total</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Live estimate from garment costs, decoration pricing, and shop tax
              — matches the estimate tab
              {!showBlankPricing
                ? " (garment cost omitted for customer-supplied goods)."
                : "."}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className={cn(dashboardInsetSurfaceClass, "px-4 py-4")}>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#616161]">Garments</span>
                  <span className="tabular-nums text-[#303030]">
                    {formatCurrency(
                      showBlankPricing
                        ? estimate.totals.garmentSubtotal
                        : 0
                    )}
                  </span>
                </div>
                {estimate.totals.decorationSubtotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Decoration</span>
                    <span className="tabular-nums text-[#303030]">
                      {formatCurrency(estimate.totals.decorationSubtotal)}
                    </span>
                  </div>
                ) : null}
                {estimate.totals.feesSubtotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Fees</span>
                    <span className="tabular-nums text-[#303030]">
                      {formatCurrency(estimate.totals.feesSubtotal)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-[#616161]">Subtotal</span>
                  <span className="tabular-nums text-[#303030]">
                    {formatCurrency(estimate.totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161]">Tax</span>
                  <span className="tabular-nums text-[#303030]">
                    {formatCurrency(estimate.totals.tax)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#ebebeb] pt-2 font-semibold">
                  <span className="text-[#303030]">Order total</span>
                  <span className="tabular-nums text-[#303030]">
                    {formatCurrency(estimate.totals.total)}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-[#8a6116]">
                  <span>Balance due</span>
                  <span className="tabular-nums">
                    {formatCurrency(estimate.totals.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
