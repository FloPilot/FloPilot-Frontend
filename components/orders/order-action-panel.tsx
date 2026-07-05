"use client";

import { useMemo } from "react";
import {
  Activity,
  Calendar,
  CreditCard,
  MessageSquare,
  Send,
  Wrench,
} from "lucide-react";
import { OrderPriorityToggle } from "@/components/orders/order-priority-toggle";
import { OrderStatusControl } from "@/components/orders/order-status-control";
import {
  CheckpointStatusBadge,
  findCheckpoint,
} from "@/components/orders/order-checkpoint-pills";
import { Button } from "@/components/ui/button";
import {
  buildOrderSuggestedActions,
  getPrimaryStatusAction,
  orderStatusHint,
  type OrderActionId,
} from "@/lib/order-detail-actions";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import { resolveOrderFinancials } from "@/lib/order-estimate";
import { getOrderDecorationSummary } from "@/lib/order-decoration-summary";
import { getOrderPaymentDisplay } from "@/lib/order-payment";
import type { OrderListSummary } from "@/lib/order-list-summary";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { CustomerPortalActions } from "@/components/orders/customer-review-preview-modal";

export function OrderActionPanel({
  order,
  summary,
  canSchedule,
  onAction,
  onStatusChange,
  onRushChange,
}: {
  order: Order;
  summary: OrderListSummary;
  canSchedule: boolean;
  onAction: (actionId: OrderActionId) => void;
  onStatusChange: (status: Order["status"]) => void;
  onRushChange: (rush: boolean) => void;
}) {
  const { settings } = useShopSettings();
  const { getCustomerById } = useSchedule();
  const customer = getCustomerById(order.customerId);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings.pricingMatrix, customer, order),
    [settings.pricingMatrix, customer, order]
  );
  const financials = useMemo(
    () => resolveOrderFinancials(order, settings.taxRate, pricingMatrix, customer),
    [order, settings.taxRate, pricingMatrix, customer]
  );
  const paymentOrder = useMemo(
    () => ({ ...order, ...financials }),
    [order, financials]
  );
  const artworkSummary = getArtworkApprovalSummary(order);
  const paymentDisplay = getOrderPaymentDisplay(paymentOrder);
  const decorationSummary = getOrderDecorationSummary(order);
  const actions = buildOrderSuggestedActions({
    order,
    summary,
    artworkSummary,
    canSchedule,
  });
  const primaryAction = getPrimaryStatusAction(actions);
  const secondaryActions = actions.filter(
    (action) => action.id !== primaryAction?.id
  );

  return (
    <aside className="space-y-4">
      <section className={cn(dashboardCardClass, "overflow-visible")}>
        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Order status
          </p>
          <div className="mt-2">
            <OrderStatusControl
              status={order.status}
              fullWidth
              onStatusChange={onStatusChange}
            />
          </div>
          <p className={cn("mt-2.5", dashboardTaskDetailClass)}>
            {orderStatusHint(order.status)}
          </p>
        </div>

        {decorationSummary.types.length > 0 ? (
          <div className="border-b border-[#ebebeb] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Decoration types
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {decorationSummary.types.map((type) => (
                <DecorationTypePill key={type} decoration={type} />
              ))}
            </div>
            <p className={cn("mt-2", dashboardTaskDetailClass)}>
              {decorationSummary.types.length === 1
                ? "Single decoration method on this order"
                : `${decorationSummary.types.length} decoration methods on this order`}
            </p>
          </div>
        ) : null}

        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Customer portal
          </p>
          <p className={cn("mt-1.5", dashboardTaskDetailClass)}>
            Preview the customer portal in a new tab, or copy the link to send
            manually.
          </p>
          <CustomerPortalActions
            orderId={order.id}
            className="mt-3"
            previewClassName={cn(
              dashboardElevatedShadow,
              "inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border-0 bg-brand-primary px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-60"
            )}
            copyClassName={cn(
              dashboardControlClass,
              "inline-flex h-10 w-full items-center justify-start gap-2 px-3 text-[13px] font-medium text-[#303030] hover:border-brand-ink/20 hover:bg-brand-ink/[0.03] disabled:opacity-60"
            )}
          />
        </div>

        {(primaryAction || secondaryActions.length > 0) && (
          <div className="space-y-2 border-b border-[#ebebeb] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Suggested actions
            </p>
            {primaryAction ? (
              <Button
                type="button"
                className={cn(
                  dashboardElevatedShadow,
                  "h-10 w-full justify-start gap-2 rounded-lg border-0 bg-brand-primary px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-primary/90"
                )}
                disabled={primaryAction.disabled}
                onClick={() => onAction(primaryAction.id)}
              >
                <ActionIcon id={primaryAction.id} />
                {primaryAction.label}
              </Button>
            ) : null}
            {secondaryActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => onAction(action.id)}
                className={cn(
                  dashboardControlClass,
                  "flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:border-brand-ink/20 hover:bg-brand-ink/[0.03]",
                  action.disabled && "opacity-50"
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-[#303030]">
                  <ActionIcon id={action.id} />
                  {action.label}
                </span>
                <span className="pl-6 text-[12px] font-normal text-[#8a8a8a]">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {summary.checkpoints.length > 0 ? (
          <div className="border-b border-[#ebebeb] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Production checklist
            </p>
            <ul className="mt-3 space-y-2">
              {summary.checkpoints
                .filter((checkpoint) => checkpoint.status !== "not_applicable")
                .map((checkpoint) => (
                  <li
                    key={checkpoint.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[13px] text-[#616161]">
                      {checkpoint.label}
                    </span>
                    <CheckpointStatusBadge
                      checkpoint={findCheckpoint(summary.checkpoints, checkpoint.key)}
                    />
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Payment
            </p>
            <CreditCard className="size-3.5 text-[#8a8a8a]" />
          </div>
          <div className={cn(dashboardInsetSurfaceClass, "space-y-2 px-3 py-3")}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#616161]">Status</span>
              <span className="font-medium text-[#303030]">
                {paymentDisplay.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#616161]">Order total</span>
              <span className="font-semibold tabular-nums text-[#303030]">
                {formatCurrency(financials.total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#616161]">Balance due</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  financials.balance > 0 ? "text-[#8a6116]" : "text-[#0d5c2e]"
                )}
              >
                {financials.balance > 0
                  ? formatCurrency(financials.balance)
                  : "Paid in full"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ebebeb] px-4 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Priority
          </p>
          <OrderPriorityToggle
            rush={order.rush}
            compact
            fullWidth
            onChange={onRushChange}
          />
        </div>
      </section>
    </aside>
  );
}

function ActionIcon({ id }: { id: OrderActionId }) {
  const className = "size-3.5 shrink-0";
  switch (id) {
    case "send_estimate":
    case "send_proofs":
      return <Send className={className} />;
    case "schedule":
      return <Calendar className={className} />;
    case "message_customer":
      return <MessageSquare className={className} />;
    case "view_tasks":
      return <Wrench className={className} />;
    case "add_production":
      return <Wrench className={className} />;
    default:
      return <Activity className={className} />;
  }
}
