"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { CustomerWarningDialog } from "@/components/customers/customer-warning-dialog";
import { OrderAddressEditors } from "@/components/orders/order-address-editors";
import { OrderCustomLabelEditor } from "@/components/orders/order-custom-label-field";
import { OrderEndBusinessEditor } from "@/components/orders/order-end-business-editor";
import { OrderHeaderField } from "@/components/orders/order-header-field";
import { OrderSalesRepEditor } from "@/components/orders/order-sales-rep-editor";
import { OrderProductionRunEditor } from "@/components/orders/order-production-run-editor";
import { RushBadge, ClientStoreBadge } from "@/components/status-badges";
import {
  dashboardControlClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { orderHeaderComboShellClass } from "@/lib/order-addresses";
import { getCustomerWarningNotes } from "@/lib/customer-notes";
import { formatDate } from "@/lib/format";
import { isArchivedOrder } from "@/lib/order-archive";
import {
  buildOrderDetailTabs,
  type OrderDetailTab,
} from "@/lib/order-detail-tabs";
import type { OrderListSummary } from "@/lib/order-list-summary";
import {
  formatPaymentTermsLabel,
  resolvePaymentTerms,
} from "@/lib/payment-terms";
import type {
  Customer,
  CustomerShippingLocation,
  Order,
  OrderAddressSelection,
  SubCustomer,
} from "@/types";
import { cn } from "@/lib/utils";

export type { OrderDetailTab } from "@/lib/order-detail-tabs";
export type OrderQuickLink = OrderDetailTab | "messages" | "payments";

export { parseOrderDetailTab, resolveOrderDetailTab } from "@/lib/order-detail-tabs";

export function OrderDetailHeader({
  order,
  summary,
  activeTab,
  onTabChange,
  onCustomLabelSave,
  onCustomLabelDraftChange,
  customer,
  subCustomers,
  onEndBusinessSave,
  onEndBusinessDraftChange,
  onSalesRepSave,
  onSalesRepDraftChange,
  billTo,
  shipTo,
  onBillToDraftChange,
  onShipToDraftChange,
  onCustomerLocationsSave,
  onPersistAddresses,
  orders,
  onProductionRunSave,
}: {
  order: Order;
  summary: OrderListSummary;
  activeTab: OrderDetailTab;
  onTabChange: (tab: OrderDetailTab) => void;
  onCustomLabelSave?: (customLabel: string) => Promise<void | Order>;
  onCustomLabelDraftChange?: (customLabel: string) => void;
  customer?: Customer | null;
  subCustomers?: SubCustomer[];
  onEndBusinessSave?: (subCustomerId: string | null) => Promise<void | Order>;
  onEndBusinessDraftChange?: (subCustomerId: string | null) => void;
  onSalesRepSave?: (salesRepId: string | null) => Promise<void | Order>;
  onSalesRepDraftChange?: (salesRepId: string | null) => void;
  billTo?: OrderAddressSelection | null;
  shipTo?: OrderAddressSelection | null;
  onBillToDraftChange?: (next: OrderAddressSelection | null) => void;
  onShipToDraftChange?: (next: OrderAddressSelection | null) => void;
  onCustomerLocationsSave?: (
    locations: CustomerShippingLocation[]
  ) => Promise<Customer | void>;
  onPersistAddresses?: (next: {
    billTo?: OrderAddressSelection | null;
    shipTo?: OrderAddressSelection | null;
  }) => Promise<void>;
  orders?: Order[];
  onProductionRunSave?: (linkedOrderIds: string[]) => Promise<void | Order>;
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const warnings = getCustomerWarningNotes(customer);
  const tabs = buildOrderDetailTabs(order);
  const showEndBusiness =
    Boolean(onEndBusinessSave || onEndBusinessDraftChange) &&
    Boolean(subCustomers?.length || order.subCustomerId);
  const paymentTerms =
    resolvePaymentTerms(order) || resolvePaymentTerms(customer);
  const paymentTermsLabel =
    paymentTerms?.label ||
    formatPaymentTermsLabel(paymentTerms?.days ?? null);

  const dueLabel =
    summary.dueDays === null
      ? formatDate(order.inHandsDate)
      : summary.dueDays < 0
        ? `${formatDate(order.inHandsDate)} · ${Math.abs(summary.dueDays)}d overdue`
        : summary.dueDays === 0
          ? `${formatDate(order.inHandsDate)} · Due today`
          : summary.dueDays === 1
            ? `${formatDate(order.inHandsDate)} · Due tomorrow`
            : formatDate(order.inHandsDate);

  return (
    <header className="space-y-4">
      <div className="min-w-0 space-y-2">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[13px]"
        >
          <Link
            href="/app/orders"
            className="rounded-md px-1 py-0.5 text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
          >
            Orders
          </Link>
          <span className="text-[#c9c9c9]" aria-hidden>
            /
          </span>
          <span className="px-1 font-medium text-[#303030]">
            Order {order.number}
            {order.customLabel?.trim() ? ` — ${order.customLabel.trim()}` : ""}
          </span>
        </nav>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
          <h1 className={cn(dashboardSectionTitleClass, "shrink-0")}>
            Order {order.number}
          </h1>
          {onCustomLabelSave || onCustomLabelDraftChange ? (
            <OrderCustomLabelEditor
              order={order}
              onSave={onCustomLabelSave}
              onDraftChange={onCustomLabelDraftChange}
            />
          ) : order.customLabel?.trim() ? (
            <span className="rounded-md border border-[#ebebeb] px-2.5 py-1 text-[13px] font-medium text-[#616161]">
              {order.customLabel.trim()}
            </span>
          ) : null}
          {order.rush ? <RushBadge /> : null}
          {order.source === "client_store" ? (
            <ClientStoreBadge storeName={order.clientStoreName} />
          ) : null}
          {isArchivedOrder(order) ? (
            <span className="inline-flex rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Archived
            </span>
          ) : null}
          {warnings.length > 0 ? (
            <button
              type="button"
              onClick={() => setWarningOpen(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#f5b5b5] bg-[#fff1f1] px-2 text-[11px] font-semibold uppercase tracking-wide text-[#b42318] transition-colors hover:bg-[#fdf2f2]"
              aria-label="View customer warning"
              title="Customer warning"
            >
              <Info className="size-3.5" />
              Warning
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
          <p className={dashboardTaskDetailClass}>
            {order.customerId ? (
              <Link
                href={`/app/customers/${order.customerId}`}
                className="font-medium text-[#2c6ecb] hover:underline"
              >
                {order.company}
              </Link>
            ) : (
              order.company
            )}{" "}
            · {order.customerName} · In-hands {dueLabel}
          </p>
          {paymentTermsLabel ? (
            <span
              className="inline-flex h-7 items-center rounded-md border border-[#d7e3f4] bg-[#f4f7fd] px-2.5 text-[12px] font-semibold text-[#2c6ecb]"
              title={
                paymentTerms?.days == null
                  ? "Account payment terms"
                  : paymentTerms.days === 0
                    ? "Invoices are due when sent"
                    : `Invoices due ${paymentTerms.days} days after send`
              }
            >
              Payment terms · {paymentTermsLabel}
            </span>
          ) : null}
          {order.source === "client_store" && order.clientStoreName ? (
            <p className={dashboardTaskDetailClass}>
              Storefront: {order.clientStoreName}
              {order.clientStoreShopperName
                ? ` · Shopper ${order.clientStoreShopperName}`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
          {showEndBusiness ? (
            <OrderEndBusinessEditor
              order={order}
              subCustomers={subCustomers ?? []}
              onSave={onEndBusinessSave}
              onDraftChange={onEndBusinessDraftChange}
            />
          ) : null}
          {onSalesRepSave || onSalesRepDraftChange ? (
            <OrderSalesRepEditor
              order={order}
              onSave={onSalesRepSave}
              onDraftChange={onSalesRepDraftChange}
            />
          ) : null}
          {orders && onProductionRunSave ? (
            <OrderProductionRunEditor
              order={order}
              orders={orders}
              onSave={onProductionRunSave}
            />
          ) : null}
          {onBillToDraftChange &&
          onShipToDraftChange &&
          onCustomerLocationsSave ? (
            <OrderAddressEditors
              order={order}
              customer={customer}
              billTo={billTo}
              shipTo={shipTo}
              onBillToChange={onBillToDraftChange}
              onShipToChange={onShipToDraftChange}
              onCustomerLocationsSave={onCustomerLocationsSave}
              onPersistAddresses={onPersistAddresses}
            />
          ) : null}
          <OrderHeaderField label="Design code">
            <div
              className={cn(
                orderHeaderComboShellClass,
                "min-w-0 items-center px-2.5",
                order.designCode?.trim()
                  ? "border-[#d7e3f4] bg-[#f4f7fd]"
                  : null
              )}
              title={
                order.designCode?.trim()
                  ? "From the design code on proofs"
                  : "Set a design code on the Proofs tab"
              }
            >
              <span
                className={cn(
                  "truncate text-[13px] font-medium",
                  order.designCode?.trim()
                    ? "font-semibold tracking-wide text-[#2c6ecb]"
                    : "text-[#8a8a8a]"
                )}
              >
                {order.designCode?.trim() || "Not set"}
              </span>
            </div>
          </OrderHeaderField>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border px-4 py-3",
          summary.attention === "critical"
            ? "border-[#f5b5b5] bg-[#fff1f1]"
            : summary.attention === "warning"
              ? "border-[#f0d9a8] bg-[#fff8eb]"
              : "border-[#e3e3e3] bg-white"
        )}
      >
        <p className="flex items-start gap-2 text-[14px] font-medium text-[#303030]">
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
          <span>{summary.nextStep}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[#ebebeb] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              dashboardControlClass,
              "h-9 px-3 text-[13px]",
              activeTab === tab.id &&
                "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CustomerWarningDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
        customer={customer}
        warnings={warnings}
        confirmLabel="Close"
      />
    </header>
  );
}
