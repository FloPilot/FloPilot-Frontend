"use client";

import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { OrderPriorityToggle } from "@/components/orders/order-priority-toggle";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import {
  ORDER_REQUEST_STATUS_LABELS,
  orderRequestStatusTone,
  type OrderRequestDetail,
  type OrderRequestStatus,
} from "@/lib/order-requests";
import type { DecorationType } from "@/types";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: OrderRequestStatus) {
  const tone = orderRequestStatusTone(status);
  if (tone === "warning") return "bg-amber-50 text-amber-900 border-amber-200";
  if (tone === "info") return "bg-[#f4f7fd] text-[#2c6ecb] border-[#c4d7f2]";
  if (tone === "success")
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (tone === "danger") return "bg-[#fff1f1] text-[#8f1f1f] border-[#f5b5b5]";
  return "bg-[#f4f4f5] text-[#616161] border-[#e3e3e3]";
}

function requestStatusHint(status: OrderRequestStatus) {
  if (status === "submitted") {
    return "New request — review garments and decoration, then mark in review or convert.";
  }
  if (status === "in_review") {
    return "Shop is reviewing — save edits, then convert to create the production order.";
  }
  if (status === "converted") {
    return "Already converted — open the shop order to continue production.";
  }
  if (status === "declined") {
    return "This request was declined and will not become an order.";
  }
  if (status === "cancelled") {
    return "Cancelled by the customer.";
  }
  return "Draft — not yet submitted.";
}

export type OrderRequestActionId =
  | "convert"
  | "review"
  | "save"
  | "decline"
  | "open_order";

export function OrderRequestActionPanel({
  request,
  dirty,
  busy,
  canReview,
  canConvert,
  canDecline,
  editable,
  decorationTypes,
  onAction,
  onRushChange,
}: {
  request: OrderRequestDetail;
  dirty: boolean;
  busy: "review" | "decline" | "convert" | "save" | null;
  canReview: boolean;
  canConvert: boolean;
  canDecline: boolean;
  editable: boolean;
  decorationTypes: string[];
  onAction: (actionId: OrderRequestActionId) => void;
  onRushChange: (rush: boolean) => void;
}) {
  const estimateTotal =
    request.currentEstimate?.totals?.total ?? request.estimateTotal ?? null;

  const primary =
    request.status === "converted" && request.convertedOrderId
      ? ({
          id: "open_order" as const,
          label: request.convertedOrderNumber
            ? `Open order ${request.convertedOrderNumber}`
            : "Open order",
          description: "Continue on the shop order",
        })
      : canConvert
        ? ({
            id: "convert" as const,
            label: "Convert to order",
            description: dirty
              ? "Save your changes before converting"
              : "Create the shop order from this request",
            disabled: dirty || busy !== null,
          })
        : null;

  const secondary: {
    id: OrderRequestActionId;
    label: string;
    description: string;
    disabled?: boolean;
  }[] = [];

  if (editable) {
    secondary.push({
      id: "save",
      label: dirty ? "Save changes" : "Saved",
      description: dirty
        ? "Keep garment and event edits"
        : "No unsaved edits",
      disabled: !dirty || busy !== null,
    });
  }
  if (canReview) {
    secondary.push({
      id: "review",
      label: "Mark in review",
      description: "Claim this request while you work it",
      disabled: busy !== null,
    });
  }
  if (canDecline) {
    secondary.push({
      id: "decline",
      label: "Decline request",
      description: "Do not convert — optionally leave a reason",
      disabled: busy !== null,
    });
  }

  return (
    <aside className="space-y-4">
      <section className={cn(dashboardCardClass, "overflow-visible")}>
        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Request status
          </p>
          <div className="mt-2">
            <div
              className={cn(
                dashboardControlClass,
                "flex h-9 w-full items-center justify-between bg-white px-3"
              )}
            >
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                  statusBadgeClass(request.status)
                )}
              >
                {ORDER_REQUEST_STATUS_LABELS[request.status]}
              </span>
            </div>
          </div>
          <p className={cn("mt-2.5", dashboardTaskDetailClass)}>
            {requestStatusHint(request.status)}
          </p>
        </div>

        {decorationTypes.length > 0 ? (
          <div className="border-b border-[#ebebeb] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Decoration types
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {decorationTypes.map((type) => (
                <DecorationTypePill
                  key={type}
                  decoration={type as DecorationType}
                />
              ))}
            </div>
            <p className={cn("mt-2", dashboardTaskDetailClass)}>
              {decorationTypes.length === 1
                ? "Single decoration method on this request"
                : `${decorationTypes.length} decoration methods on this request`}
            </p>
          </div>
        ) : null}

        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Convert
          </p>
          <p className={cn("mt-1.5", dashboardTaskDetailClass)}>
            Turning this request into a shop order unlocks receiving,
            scheduling, and invoice — same screen you already use for orders.
          </p>
          {primary ? (
            <Button
              type="button"
              className={cn(
                dashboardElevatedShadow,
                "mt-3 inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border-0 bg-brand-primary px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-60"
              )}
              disabled={Boolean(primary.disabled) || busy === "convert"}
              onClick={() => onAction(primary.id)}
            >
              {busy === "convert" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {primary.label}
            </Button>
          ) : null}
          <button
            type="button"
            disabled
            className={cn(
              dashboardControlClass,
              "mt-2 flex h-10 w-full cursor-not-allowed items-center justify-start gap-2 px-3 text-[13px] font-medium text-[#8a8a8a] opacity-60"
            )}
          >
            Customer messaging opens after convert
          </button>
        </div>

        {secondary.length > 0 ? (
          <div className="space-y-2 border-b border-[#ebebeb] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Suggested actions
            </p>
            {secondary.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => onAction(action.id)}
                className={cn(
                  dashboardControlClass,
                  "flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:border-brand-ink/20 hover:bg-brand-ink/[0.03]",
                  action.disabled && "opacity-50",
                  action.id === "decline" &&
                    "border-[#f5b5b5] bg-[#fff1f1] hover:bg-[#fde2e2]"
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 text-[13px] font-medium",
                    action.id === "decline" ? "text-[#8f1f1f]" : "text-[#303030]"
                  )}
                >
                  {busy === action.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : action.id === "save" ? (
                    <Save className="size-3.5" />
                  ) : action.id === "review" ? (
                    <ClipboardList className="size-3.5" />
                  ) : (
                    <XCircle className="size-3.5" />
                  )}
                  {action.label}
                </span>
                <span className="pl-6 text-[12px] font-normal text-[#8a8a8a]">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Pre-convert checklist
          </p>
          <ul className="mt-3 space-y-2">
            {[
              {
                label: "Events",
                ok: (request.events || []).length > 0,
              },
              {
                label: "Garments",
                ok: (request.lineItems || []).length > 0,
              },
              {
                label: "Estimate",
                ok: estimateTotal != null,
              },
              {
                label: "Mockups",
                ok: (request.events || []).some((e) => e.mockup?.previewUrl),
              },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-[13px] text-[#616161]">{item.label}</span>
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    item.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  )}
                >
                  {item.ok ? "Ready" : "Needs review"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Customer estimate
            </p>
            <CreditCard className="size-3.5 text-[#8a8a8a]" />
          </div>
          <div className={cn(dashboardInsetSurfaceClass, "space-y-2 px-3 py-3")}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#616161]">Status</span>
              <span className="font-medium text-[#303030]">
                {estimateTotal != null ? "Priced" : "Not priced"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#616161]">Estimate total</span>
              <span className="font-semibold tabular-nums text-[#303030]">
                {estimateTotal != null ? formatCurrency(estimateTotal) : "—"}
              </span>
            </div>
            {request.currentEstimateVersion ? (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#616161]">Version</span>
                <span className="font-medium text-[#303030]">
                  v{request.currentEstimateVersion}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[#ebebeb] px-4 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Priority
          </p>
          <OrderPriorityToggle
            rush={Boolean(request.rush)}
            compact
            fullWidth
            disabled={!editable}
            onChange={onRushChange}
          />
        </div>
      </section>
    </aside>
  );
}
