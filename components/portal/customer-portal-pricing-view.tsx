"use client";

import { useEffect, useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import {
  fetchCustomerPortalPricing,
  type CustomerPortalPricingResponse,
} from "@/lib/customer-portal-api";
import {
  dashboardCardClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatCurrency, formatDate } from "@/lib/format";
import type { CustomerNegotiatedRateSheet } from "@/types";
import { cn } from "@/lib/utils";

function RateSheetTable({ sheet }: { sheet: CustomerNegotiatedRateSheet }) {
  const methods = (sheet.methods || []).filter((method) => method.rows.length > 0);
  if (methods.length === 0) return null;

  return (
    <div className="space-y-4">
      {methods.map((method) => (
        <div key={method.id} className="overflow-hidden rounded-lg border border-[#ebebeb]">
          <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
            <p className="text-[14px] font-semibold text-[#303030]">
              {method.name || "Decoration method"}
            </p>
            {method.notes ? (
              <p className="mt-0.5 text-[12px] text-[#616161]">{method.notes}</p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#fafafa]">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                    Min qty
                  </th>
                  {method.columns.map((column, index) => (
                    <th
                      key={index}
                      className="border-l border-[#ebebeb] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {method.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-[#ebebeb]">
                    <td className="px-3 py-2 tabular-nums text-[#303030]">
                      {row.minQty}+
                    </td>
                    {row.prices.map((price, colIndex) => (
                      <td
                        key={colIndex}
                        className="border-l border-[#ebebeb] px-3 py-2 tabular-nums text-[#303030]"
                      >
                        {formatCurrency(price)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerPortalPricingView() {
  const { token, accent } = useCustomerPortal();
  const [data, setData] = useState<CustomerPortalPricingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCustomerPortalPricing(token);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load pricing."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your pricing…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-6 text-center text-[14px] text-[#8f1f1f]">
        {error}
      </div>
    );
  }

  const pricing = data?.pricing;
  const items = pricing?.items ?? [];
  const rateSheets = pricing?.rateSheets ?? [];
  const hasContent = items.length > 0 || rateSheets.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={dashboardSectionTitleClass}>Your pricing</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#616161]">
          Account-specific rates your shop has set up for you. For quotes on new
          work, contact {data?.shop?.name || "your shop"}.
        </p>
      </div>

      {!data?.hasNegotiatedPricing || !hasContent ? (
        <section className={cn(dashboardCardClass, "px-6 py-12 text-center")}>
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#f1f1f1]"
            style={{ color: accent }}
          >
            <Tag className="size-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-[#303030]">
            No negotiated pricing yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#616161]">
            Your shop hasn&apos;t published custom rates to your portal. Standard
            pricing applies on new orders until your account manager sets up
            negotiated pricing.
          </p>
          {data?.shop?.email ? (
            <a
              href={`mailto:${data.shop.email}`}
              className="mt-5 inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Email {data.shop.name}
            </a>
          ) : null}
        </section>
      ) : (
        <div className="space-y-4">
          {pricing?.summary ? (
            <section className={cn(dashboardCardClass, "px-4 py-4 sm:px-5")}>
              <p className="text-[14px] leading-relaxed text-[#616161]">
                {pricing.summary}
              </p>
              {pricing.updatedAt ? (
                <p className="mt-2 text-[12px] text-[#8a8a8a]">
                  Last updated {formatDate(pricing.updatedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          {rateSheets.map((sheet) => (
            <section key={sheet.id} className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-4 sm:px-5">
                <h2 className="text-[16px] font-semibold text-[#303030]">
                  {sheet.name}
                </h2>
                {sheet.notes ? (
                  <p className={cn("mt-1", dashboardTaskDetailClass)}>
                    {sheet.notes}
                  </p>
                ) : null}
              </div>
              <div className="p-4 sm:p-5">
                <RateSheetTable sheet={sheet} />
              </div>
            </section>
          ))}

          {items.length > 0 ? (
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-4 sm:px-5">
                <h2 className="text-[16px] font-semibold text-[#303030]">
                  Additional rates
                </h2>
              </div>
              <div className="divide-y divide-[#f1f1f1]">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#303030]">
                        {item.label}
                      </p>
                      {item.decoration ? (
                        <p className="mt-0.5 text-[13px] text-[#616161]">
                          {decorationLabel(item.decoration)}
                        </p>
                      ) : null}
                      {item.detail ? (
                        <p className="mt-1 text-[13px] text-[#8a8a8a]">
                          {item.detail}
                        </p>
                      ) : null}
                      {item.minQty != null && item.minQty > 0 ? (
                        <p className="mt-1 text-[12px] text-[#8a8a8a]">
                          {item.minQty}+ pieces
                        </p>
                      ) : null}
                    </div>
                    {item.unitPrice != null ? (
                      <p className="text-[16px] font-semibold tabular-nums text-[#303030]">
                        {formatCurrency(item.unitPrice)}
                        <span className="text-[12px] font-normal text-[#8a8a8a]">
                          {" "}
                          / piece
                        </span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
