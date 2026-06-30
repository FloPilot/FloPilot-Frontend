"use client";

import { useMemo } from "react";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { formatCurrency } from "@/lib/format";
import { computeEstimateTotals } from "@/lib/order-estimate";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "OS"];

export function OrderProductsTable({ order }: { order: Order }) {
  const rows = order.lineItems;

  if (rows.length === 0) {
    return (
      <p className={dashboardTaskDetailClass}>No products on this order yet.</p>
    );
  }

  const sizeColumns = useMemo(() => {
    const sizes = new Set<string>();
    for (const item of rows) {
      for (const size of item.sizes) {
        sizes.add(size.size);
      }
    }
    return [...sizes].sort(
      (a, b) =>
        (SIZE_ORDER.indexOf(a) === -1 ? 99 : SIZE_ORDER.indexOf(a)) -
        (SIZE_ORDER.indexOf(b) === -1 ? 99 : SIZE_ORDER.indexOf(b))
    );
  }, [rows]);

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
              <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                Product
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[#616161]">
                Color
              </th>
              {sizeColumns.map((size) => (
                <th
                  key={size}
                  className="px-2 py-2.5 text-center font-medium text-[#616161]"
                >
                  {size}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                Qty
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const qty = item.sizes.reduce(
                (sum, size) => sum + size.quantity,
                0
              );
              const lineTotal = item.unitCost * qty;
              const sizeMap = new Map(
                item.sizes.map((size) => [size.size, size.quantity])
              );

              return (
                <tr
                  key={item.id}
                  className="border-b border-[#ebebeb] last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#303030]">
                      {item.productName}
                    </p>
                    <p className="text-[12px] text-[#8a8a8a]">{item.brand}</p>
                  </td>
                  <td className="px-3 py-3 text-[#616161]">{item.color}</td>
                  {sizeColumns.map((size) => (
                    <td
                      key={size}
                      className="px-2 py-3 text-center tabular-nums text-[#616161]"
                    >
                      {sizeMap.get(size) ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-[#303030]">
                    {qty}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OrderFinancialSummary({ order }: { order: Order }) {
  const { settings } = useShopSettings();
  const totals = useMemo(
    () =>
      computeEstimateTotals(
        order,
        settings.taxRate,
        settings.pricingMatrix
      ),
    [order, settings.taxRate, settings.pricingMatrix]
  );

  const taxLabel = `Tax (${(totals.taxRate * 100).toFixed(
    totals.taxRate * 100 === Math.round(totals.taxRate * 100) ? 0 : 2
  )}%)`;

  return (
    <div className={cn(dashboardInsetSurfaceClass, "px-4 py-4")}>
      <div className="space-y-2 text-[13px]">
        {totals.decorationSubtotal > 0 ? (
          <>
            <div className="flex justify-between">
              <span className="text-[#616161]">Garments</span>
              <span className="tabular-nums text-[#303030]">
                {formatCurrency(totals.garmentSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#616161]">Decoration</span>
              <span className="tabular-nums text-[#303030]">
                {formatCurrency(totals.decorationSubtotal)}
              </span>
            </div>
          </>
        ) : null}
        <div className="flex justify-between">
          <span className="text-[#616161]">Subtotal</span>
          <span className="tabular-nums text-[#303030]">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#616161]">{taxLabel}</span>
          <span className="tabular-nums text-[#303030]">
            {formatCurrency(totals.tax)}
          </span>
        </div>
        <div className="flex justify-between border-t border-[#ebebeb] pt-2 font-semibold">
          <span className="text-[#303030]">Order total</span>
          <span className="tabular-nums text-[#303030]">
            {formatCurrency(totals.total)}
          </span>
        </div>
        {totals.paid > 0 ? (
          <div className="flex justify-between text-[#0d5c2e]">
            <span>Paid</span>
            <span className="tabular-nums">{formatCurrency(totals.paid)}</span>
          </div>
        ) : null}
        {totals.balance > 0 ? (
          <div className="flex justify-between font-medium text-[#8a6116]">
            <span>Balance due</span>
            <span className="tabular-nums">
              {formatCurrency(totals.balance)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
