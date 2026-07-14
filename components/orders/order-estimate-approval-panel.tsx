"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Send,
} from "lucide-react";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  canEnterProduction,
  isQuoteApproved,
} from "@/lib/order-approval";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import { computeEstimateTotals } from "@/lib/order-estimate";
import { resolveOrderEstimateStatus } from "@/lib/order-estimate-status";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<
  ReturnType<typeof resolveOrderEstimateStatus>,
  { badge: string; badgeClass: string; detail: string }
> = {
  pending: {
    badge: "Not approved",
    badgeClass: "bg-[#f1f1f1] text-[#616161]",
    detail:
      "Approve when the customer signs off — or after phone / email confirmation.",
  },
  sent: {
    badge: "Awaiting customer",
    badgeClass: "bg-[#ebf4ff] text-[#2c6ecb]",
    detail:
      "Estimate was sent for review. Approve manually if they already confirmed outside the portal.",
  },
  revision: {
    badge: "Revision requested",
    badgeClass: "bg-[#fff5ea] text-[#b98900]",
    detail:
      "Customer requested estimate changes. Update pricing, then approve when they sign off.",
  },
  approved: {
    badge: "Approved",
    badgeClass: "bg-[#e8f5ee] text-[#0d5c2e]",
    detail: "Estimate approved — ready once proofs are approved too.",
  },
};

export function OrderEstimateApprovalPanel({ order }: { order: Order }) {
  const {
    approveOrderEstimate,
    sendProofsAndEstimate,
    getCustomerById,
  } = useSchedule();
  const { settings } = useShopSettings();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const customer = getCustomerById(order.customerId);
  const quoteApproved = isQuoteApproved(order);
  const estimateStatus = resolveOrderEstimateStatus(order);
  const statusCopy = STATUS_COPY[estimateStatus];
  const readyForProduction = canEnterProduction(order);

  const [expanded, setExpanded] = useState(() => !isQuoteApproved(order));
  const wasApprovedRef = useRef(quoteApproved);

  useEffect(() => {
    const justApproved = !wasApprovedRef.current && quoteApproved;
    wasApprovedRef.current = quoteApproved;

    if (!quoteApproved) {
      setExpanded(true);
      return;
    }

    if (justApproved) {
      const timer = window.setTimeout(() => setExpanded(false), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [quoteApproved]);

  const totals = useMemo(() => {
    const pricingMatrix = resolveEffectivePricingMatrix(
      settings,
      customer,
      order
    );
    return computeEstimateTotals(
      order,
      settings.taxRate,
      pricingMatrix,
      customer
    );
  }, [order, settings, customer]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const handleApprove = async () => {
    try {
      await approveOrderEstimate(order.id);
      showToast("Estimate marked approved.");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not approve the estimate. Please try again.",
        "error"
      );
      throw err;
    }
  };

  const handleSend = async () => {
    try {
      const email = await sendProofsAndEstimate(order.id);
      showToast(`Proofs & estimate emailed to ${email.to}.`);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again.",
        "error"
      );
      throw err;
    }
  };

  const compactComplete = quoteApproved && !expanded;

  return (
    <section
      className={cn(
        dashboardCardClass,
        "transition-[border-color,box-shadow] duration-300",
        compactComplete && "border-[#86d4a8] bg-[#fafffe]"
      )}
    >
      <div
        className={cn(
          "border-b border-[#ebebeb]",
          compactComplete ? "px-4 py-3 sm:px-5" : "px-4 py-3.5 sm:px-5"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="-m-1.5 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-[#fafafa]"
            aria-expanded={expanded}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
                quoteApproved
                  ? "bg-[#e8f5ee] text-[#0d5c2e]"
                  : "bg-[#f4f7fd] text-[#2c6ecb]"
              )}
            >
              {quoteApproved ? (
                <CheckCircle2 className="size-4" strokeWidth={2} />
              ) : (
                <FileText className="size-4" strokeWidth={1.75} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={dashboardTaskTitleClass}>Estimate approval</h2>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors duration-300",
                    statusCopy.badgeClass
                  )}
                >
                  {statusCopy.badge}
                </span>
              </div>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                {compactComplete
                  ? readyForProduction
                    ? "Estimate approved — order is ready for production scheduling."
                    : order.quoteApprovedAt
                      ? `Approved ${formatDate(order.quoteApprovedAt)}`
                      : "Estimate approved."
                  : statusCopy.detail}
              </p>
            </div>

            <ChevronDown
              className={cn(
                "mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </button>

          {!expanded && !quoteApproved ? (
            <ProofActionButton
              variant="success"
              className="mt-0.5 shrink-0"
              successLabel="Approved"
              onClick={handleApprove}
            >
              Approve
            </ProofActionButton>
          ) : null}
        </div>

        {toast ? (
          <div
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-[13px] font-medium",
              toast.type === "error"
                ? "border-[#e7b4b4] bg-[#fdf2f2] text-[#b42318]"
                : "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
            )}
          >
            {toast.message}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Estimate total
                </p>
                <p className="mt-1 text-[1.35rem] font-semibold tabular-nums tracking-tight text-[#303030]">
                  {formatCurrency(totals.total)}
                </p>
                {totals.balance > 0 && totals.paid > 0 ? (
                  <p className="mt-0.5 text-[12px] text-[#616161]">
                    Balance due {formatCurrency(totals.balance)}
                  </p>
                ) : null}
              </div>
              {quoteApproved ? (
                <div className="rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3 py-2 text-[13px] font-medium text-[#0d5c2e]">
                  Approved
                  {order.quoteApprovedAt
                    ? ` · ${formatDate(order.quoteApprovedAt)}`
                    : ""}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <ProofActionButton
                    variant="secondary"
                    successLabel="Emailed"
                    onClick={handleSend}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Send className="size-3.5" />
                      Send to customer
                    </span>
                  </ProofActionButton>
                  <ProofActionButton
                    variant="success"
                    successLabel="Approved"
                    onClick={handleApprove}
                  >
                    Approve estimate
                  </ProofActionButton>
                </div>
              )}
            </div>

            {!quoteApproved ? (
              <p className="text-[12px] leading-relaxed text-[#616161]">
                Same as proofs: mark approved when the customer confirms. Once
                the estimate and all proofs are approved, the order moves into
                production automatically.
              </p>
            ) : readyForProduction ? (
              <p className="text-[12px] leading-relaxed text-[#0d5c2e]">
                Estimate and proofs are both approved — you can schedule this
                order on the calendar.
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-[#616161]">
                Estimate is approved. Finish proof approvals on the Proofs tab
                to unlock production scheduling.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
