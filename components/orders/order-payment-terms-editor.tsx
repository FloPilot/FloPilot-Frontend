"use client";

import { useMemo, useState } from "react";
import {
  OrderHeaderCombo,
  OrderHeaderField,
} from "@/components/orders/order-header-field";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import {
  dashboardSelectContentClass,
  dashboardSelectItemClass,
} from "@/lib/dashboard-styles";
import {
  orderHeaderComboTriggerClass,
  orderHeaderSelectContentClass,
} from "@/lib/order-addresses";
import {
  PAYMENT_TERMS_PRESETS,
  normalizePaymentTerms,
  resolvePaymentTerms,
} from "@/lib/payment-terms";
import type { Customer, Order } from "@/types";
import { cn } from "@/lib/utils";

const CLEAR_VALUE = "__clear__";

export type OrderPaymentTermsDraft = {
  paymentTermsLabel: string | null;
  paymentTermsDays: number | null;
};

export function OrderPaymentTermsEditor({
  order,
  customer,
  onSave,
  onDraftChange,
  className,
}: {
  order: Pick<Order, "id" | "paymentTermsLabel" | "paymentTermsDays">;
  customer?: Pick<
    Customer,
    "paymentTermsLabel" | "paymentTermsDays"
  > | null;
  onSave?: (next: OrderPaymentTermsDraft) => Promise<void | unknown>;
  /** When set, edits stay local until the parent Save/Discard bar commits. */
  onDraftChange?: (next: OrderPaymentTermsDraft) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const deferSave = Boolean(onDraftChange);

  const orderTerms = resolvePaymentTerms(order);
  const accountTerms = resolvePaymentTerms(customer);
  const effective = orderTerms || accountTerms;

  const selectItems = useMemo(() => {
    const items = PAYMENT_TERMS_PRESETS.map((preset) => ({
      value: preset.label,
      label: preset.label,
    }));
    if (
      effective?.label &&
      !items.some(
        (item) => item.label.toLowerCase() === effective.label.toLowerCase()
      )
    ) {
      items.unshift({ value: effective.label, label: effective.label });
    }
    if (accountTerms?.label) {
      items.push({
        value: CLEAR_VALUE,
        label: `Account default (${accountTerms.label})`,
      });
    } else {
      items.push({ value: CLEAR_VALUE, label: "Clear terms" });
    }
    return items;
  }, [effective?.label, accountTerms?.label]);

  const currentValue = effective?.label || CLEAR_VALUE;

  const apply = async (next: OrderPaymentTermsDraft) => {
    const currentLabel = (order.paymentTermsLabel || "").trim();
    const currentDays =
      typeof order.paymentTermsDays === "number" ? order.paymentTermsDays : null;
    if (
      (next.paymentTermsLabel || "").trim() === currentLabel &&
      next.paymentTermsDays === currentDays
    ) {
      return;
    }

    if (deferSave) {
      onDraftChange?.(next);
      return;
    }
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrderHeaderField label="Payment terms" className={className}>
      <OrderHeaderCombo>
        <Select
          value={currentValue}
          onValueChange={(value) => {
            if (!value || value === CLEAR_VALUE) {
              void apply({
                paymentTermsLabel: null,
                paymentTermsDays: null,
              });
              return;
            }
            const next = normalizePaymentTerms({ label: value });
            void apply({
              paymentTermsLabel: next.label || null,
              paymentTermsDays: next.days,
            });
          }}
          disabled={saving}
        >
          <SelectTrigger
            id={`order-payment-terms-${order.id}`}
            className={cn(orderHeaderComboTriggerClass, "min-w-[9.5rem]")}
          >
            <LabeledSelectValue
              value={currentValue}
              options={selectItems}
            />
          </SelectTrigger>
          <SelectContent
            align="start"
            alignItemWithTrigger={false}
            className={cn(
              dashboardSelectContentClass,
              orderHeaderSelectContentClass
            )}
          >
            {selectItems.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={dashboardSelectItemClass}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OrderHeaderCombo>
    </OrderHeaderField>
  );
}
