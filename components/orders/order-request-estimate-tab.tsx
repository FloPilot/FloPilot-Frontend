"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { OrderEstimatePricingPanel } from "@/components/orders/order-estimate-pricing-panel";
import { StaffEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import { updateOrderRequest } from "@/lib/api";
import {
  customerHasNegotiatedPricing,
  resolveEffectivePricingMatrix,
} from "@/lib/customer-pricing";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { EstimateTotals } from "@/lib/order-estimate";
import { clearOrderRequestsListCache } from "@/lib/order-requests-cache";
import { buildOrderFromRequest } from "@/lib/order-request-design-studio";
import type {
  OrderRequestDetail,
  OrderRequestEstimateDocument,
} from "@/lib/order-requests";
import type { OrderEstimateAdjustment } from "@/types";
import { cn } from "@/lib/utils";

function requestEstimateToTotals(
  estimate: OrderRequestEstimateDocument | null | undefined,
  taxRate: number
): EstimateTotals | null {
  if (!estimate?.totals) return null;
  const totals = estimate.totals;
  return {
    rows: (totals.rows || []).map((row, index) => ({
      id: row.id || `row-${index}`,
      kind: row.kind,
      description: row.description,
      detail: row.detail || "",
      qty: row.qty,
      unitCost: row.unitCost ?? 0,
      lineTotal: row.lineTotal,
      includedInBundle: row.includedInBundle,
      feeCategory:
        row.feeCategory === "setup" ||
        row.feeCategory === "decoration" ||
        row.feeCategory === "finishing" ||
        row.feeCategory === "other"
          ? row.feeCategory
          : undefined,
    })),
    garmentSubtotal: totals.garmentSubtotal || 0,
    decorationSubtotal: totals.decorationSubtotal || 0,
    feesSubtotal: totals.feesSubtotal || 0,
    subtotal: totals.subtotal || 0,
    taxRate,
    tax: totals.tax || 0,
    total: totals.total || 0,
    paid: 0,
    balance: totals.total || 0,
  };
}

export function OrderRequestEstimateTab({
  request,
  editable = true,
  onRequestChange,
}: {
  request: OrderRequestDetail;
  editable?: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
}) {
  const { getIdToken } = useAuth();
  const { getCustomerById } = useSchedule();
  const { settings } = useShopSettings();
  const [busy, setBusy] = useState(false);

  const customer = getCustomerById(request.customerId);
  const order = useMemo(() => buildOrderFromRequest(request), [request]);

  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings, customer, order]
  );

  const totals = useMemo(
    () =>
      requestEstimateToTotals(
        request.currentEstimate,
        settings.taxRate ?? 0
      ),
    [request.currentEstimate, settings.taxRate]
  );

  const persistPricing = useCallback(
    async (updates: {
      selectedRateSheetId?: string | null;
      estimateAdjustments?: OrderEstimateAdjustment[];
      excludedContractFeeIds?: string[];
    }) => {
      if (!editable) return;
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      setBusy(true);
      try {
        const { request: updated } = await updateOrderRequest(token, request.id, {
          blankSource: request.blankSource,
          subCustomerId: request.subCustomerId || null,
          lineItems: request.lineItems,
          events: request.events,
          inHandsDate: request.inHandsDate,
          rush: request.rush,
          customLabel: request.customLabel || "",
          notes: request.notes || "",
          vendorPurchaseOrder: request.vendorPurchaseOrder || null,
          estimateAdjustments:
            updates.estimateAdjustments !== undefined
              ? updates.estimateAdjustments
              : request.estimateAdjustments || [],
          excludedContractFeeIds:
            updates.excludedContractFeeIds !== undefined
              ? updates.excludedContractFeeIds
              : request.excludedContractFeeIds || [],
          selectedRateSheetId:
            updates.selectedRateSheetId !== undefined
              ? updates.selectedRateSheetId
              : request.selectedRateSheetId ?? null,
        });
        onRequestChange(updated);
        clearOrderRequestsListCache();
      } finally {
        setBusy(false);
      }
    },
    [editable, getIdToken, onRequestChange, request]
  );

  const pdfUrl = request.currentEstimate?.pdf?.downloadUrl?.trim() || "";

  return (
    <div className="space-y-4">
      <section className={dashboardCardClass}>
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className={dashboardTaskTitleClass}>Estimate</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Pricing breakdown for this request. Add fees or switch rate sheets
              before convert — approval stays pending until this becomes an
              order.
              {pricingMatrix.rateSheetName && !pricingMatrix.usingShopPricing ? (
                <span className="mt-1 block text-[#2c6ecb]">
                  Using negotiated rates: {pricingMatrix.rateSheetName}
                </span>
              ) : pricingMatrix.usingShopPricing &&
                customerHasNegotiatedPricing(customer) ? (
                <span className="mt-1 block text-[#616161]">
                  Using shop standard pricing for this request
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  dashboardControlClass,
                  "inline-flex h-9 items-center gap-1.5 px-3 text-[13px]"
                )}
              >
                <FileText className="size-3.5" />
                Preview PDF
              </a>
            ) : null}
            {busy ? (
              <span className="inline-flex h-9 items-center gap-1.5 px-2 text-[12px] text-[#2c6ecb]">
                <Loader2 className="size-3.5 animate-spin" />
                Updating estimate…
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <OrderEstimatePricingPanel
            order={order}
            customer={customer}
            readOnly={!editable}
            onPersist={persistPricing}
          />
          {totals ? (
            <StaffEstimateBreakdownTable
              totals={totals}
              productionRun={order.productionRun}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-10 text-center text-[13px] text-[#8a8a8a]">
              No estimate document yet. Save the request or adjust fees to
              generate one.
            </div>
          )}
        </div>
      </section>

      {(request.estimateDocuments || []).length > 1 ? (
        <section className={dashboardCardClass}>
          <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
            <h2 className={dashboardTaskTitleClass}>Estimate versions</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Prior priced snapshots for this request.
            </p>
          </div>
          <ul className="divide-y divide-[#f1f1f1]">
            {(request.estimateDocuments || []).map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px] sm:px-5"
              >
                <div>
                  <p className="font-medium text-[#303030]">
                    Version {doc.version}
                    {doc.id === request.currentEstimate?.id ? (
                      <span className="ml-2 text-[11px] font-medium text-[#8a8a8a]">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {doc.reason || "update"}
                    {doc.rateSheetName ? ` · ${doc.rateSheetName}` : ""}
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-[#303030]">
                  ${(doc.totals.total || 0).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
