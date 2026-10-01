"use client";

import Link from "next/link";
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
import { dashboardSelectItemClass } from "@/lib/dashboard-styles";
import {
  orderHeaderComboTriggerClass,
  orderHeaderSelectContentClass,
} from "@/lib/order-addresses";
import { sortSubCustomers } from "@/lib/sub-customers";
import type { Order, SubCustomer } from "@/types";

export function OrderEndBusinessEditor({
  order,
  subCustomers,
  onSave,
  onDraftChange,
  className,
}: {
  order: Pick<Order, "id" | "subCustomerId" | "subCustomerName">;
  subCustomers: SubCustomer[];
  /** @deprecated Prefer linking the customer name in the order header. */
  customerId?: string;
  onSave?: (subCustomerId: string | null) => Promise<void | unknown>;
  /** When set, edits stay local until the parent Save/Discard bar commits. */
  onDraftChange?: (subCustomerId: string | null) => void;
  className?: string;
}) {
  const sorted = useMemo(() => sortSubCustomers(subCustomers), [subCustomers]);
  const deferSave = Boolean(onDraftChange);

  const selectItems = useMemo(() => {
    const items = [
      { value: "none", label: "General account order" },
      ...sorted.map((entry) => ({
        value: entry.id,
        label: entry.name,
      })),
    ];

    if (
      order.subCustomerId &&
      !sorted.some((entry) => entry.id === order.subCustomerId)
    ) {
      items.push({
        value: order.subCustomerId,
        label: order.subCustomerName
          ? `${order.subCustomerName} (removed)`
          : "Unknown business (removed)",
      });
    }

    return items;
  }, [sorted, order.subCustomerId, order.subCustomerName]);

  const currentValue = order.subCustomerId || "none";
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string | null) => {
    const nextId = !value || value === "none" ? null : value;
    const currentId = order.subCustomerId ?? null;
    if (nextId === currentId || saving) return;

    if (deferSave) {
      onDraftChange?.(nextId);
      return;
    }
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave(nextId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrderHeaderField label="End business" className={className}>
      <OrderHeaderCombo>
        <Select
          value={currentValue}
          onValueChange={(value) => void handleChange(value)}
          disabled={saving}
        >
          <SelectTrigger
            id={`order-end-business-${order.id}`}
            className={orderHeaderComboTriggerClass}
          >
            <LabeledSelectValue
              value={currentValue}
              options={selectItems}
              placeholder="None"
            />
          </SelectTrigger>
          <SelectContent
            align="start"
            alignItemWithTrigger={false}
            className={orderHeaderSelectContentClass}
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
