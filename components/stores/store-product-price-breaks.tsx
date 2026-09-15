"use client";

import {
  clientStorePriceBreakDisplayRows,
  clientStoreStartingPrice,
  type PublicClientStoreProduct,
} from "@/lib/client-stores";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StoreProductPriceLabel({
  product,
  className,
  showFrom = true,
}: {
  product: Pick<PublicClientStoreProduct, "sellPrice" | "priceBreaks"> | null | undefined;
  className?: string;
  showFrom?: boolean;
}) {
  if (!product || product.sellPrice == null) return null;
  const hasBreaks = (product.priceBreaks || []).length > 0;
  const starting = clientStoreStartingPrice(product);
  if (starting == null) return null;

  return (
    <p className={cn("tabular-nums", className)}>
      {hasBreaks && showFrom ? (
        <>
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8a8a8a]">
            From{" "}
          </span>
          {formatCurrency(starting)}
        </>
      ) : (
        formatCurrency(product.sellPrice)
      )}
    </p>
  );
}

export function StoreProductPriceBreaksTable({
  product,
  className,
  activeQty,
}: {
  product: Pick<PublicClientStoreProduct, "sellPrice" | "priceBreaks"> | null | undefined;
  className?: string;
  /** Highlight the tier that matches the current quantity. */
  activeQty?: number;
}) {
  const rows = clientStorePriceBreakDisplayRows(product || {});
  if (!rows.length) return null;

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-xl border border-[#ebebeb] bg-[#fafafa]",
        className
      )}
    >
      <div className="border-b border-[#ebebeb] px-3.5 py-2">
        <p className="text-[12px] font-medium text-[#303030]">
          Quantity pricing
        </p>
      </div>
      <dl className="divide-y divide-[#ebebeb]">
        {rows.map((row) => {
          const active =
            activeQty != null &&
            activeQty >= row.minQty &&
            (row.maxQty == null || activeQty <= row.maxQty);
          return (
            <div
              key={`${row.minQty}-${row.unitPrice}`}
              className={cn(
                "flex items-baseline justify-between gap-4 px-3.5 py-2 text-[13px]",
                active && "bg-white"
              )}
            >
              <dt
                className={cn(
                  "tabular-nums",
                  active ? "font-medium text-[#121a2e]" : "text-[#8a8a8a]"
                )}
              >
                {row.label} pcs
              </dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  active ? "text-[#121a2e]" : "text-[#303030]"
                )}
              >
                {formatCurrency(row.unitPrice)}
                <span className="ml-1 text-[11px] font-normal text-[#8a8a8a]">
                  /ea
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
