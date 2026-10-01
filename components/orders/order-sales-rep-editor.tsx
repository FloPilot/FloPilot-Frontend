"use client";

import { useState } from "react";
import {
  OrderHeaderCombo,
  OrderHeaderField,
} from "@/components/orders/order-header-field";
import { StaffRepSelect } from "@/components/staff/staff-rep-select";
import {
  orderHeaderComboTriggerClass,
  orderHeaderSelectContentClass,
} from "@/lib/order-addresses";
import { dashboardSelectItemClass } from "@/lib/dashboard-styles";
import type { Order } from "@/types";

export function OrderSalesRepEditor({
  order,
  onSave,
  onDraftChange,
  className,
}: {
  order: Pick<Order, "id" | "salesRepId" | "salesRepName">;
  onSave?: (salesRepId: string | null) => Promise<void | unknown>;
  /** When set, edits stay local until the parent Save/Discard bar commits. */
  onDraftChange?: (salesRepId: string | null) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const deferSave = Boolean(onDraftChange);

  const handleChange = async (salesRepId: string | null) => {
    const currentId = order.salesRepId ?? null;
    if (salesRepId === currentId || saving) return;

    if (deferSave) {
      onDraftChange?.(salesRepId);
      return;
    }
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave(salesRepId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrderHeaderField label="Sales rep" className={className}>
      <OrderHeaderCombo>
        <StaffRepSelect
          id={`order-sales-rep-${order.id}`}
          value={order.salesRepId}
          onChange={handleChange}
          disabled={saving}
          placeholder="None"
          triggerClassName={orderHeaderComboTriggerClass}
          contentClassName={orderHeaderSelectContentClass}
          itemClassName={dashboardSelectItemClass}
          contentAlignItemWithTrigger={false}
        />
      </OrderHeaderCombo>
    </OrderHeaderField>
  );
}
