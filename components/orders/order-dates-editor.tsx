"use client";

import { OrderDateField } from "@/components/orders/order-date-field";
import { resolveOrderDate, type OrderDateOnly } from "@/lib/order-dates";
import type { Order } from "@/types";

export type OrderDatesDraft = {
  orderDate: string | null;
  shipDate: string | null;
  inHandsDate: string | null;
};

export function orderDatesDraftFromOrder(order: Order): OrderDatesDraft {
  return {
    orderDate: resolveOrderDate(order),
    shipDate: order.shipDate?.trim() || null,
    inHandsDate: order.inHandsDate?.trim() || null,
  };
}

export function OrderDatesEditor({
  draft,
  onChange,
  disabled = false,
}: {
  draft: OrderDatesDraft;
  onChange: (patch: Partial<OrderDatesDraft>) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <OrderDateField
        label="Order date"
        value={draft.orderDate}
        disabled={disabled}
        onChange={(orderDate: OrderDateOnly | null) => onChange({ orderDate })}
      />
      <OrderDateField
        label="Ship date"
        value={draft.shipDate}
        disabled={disabled}
        onChange={(shipDate: OrderDateOnly | null) => onChange({ shipDate })}
      />
      <OrderDateField
        label="In-hands date"
        value={draft.inHandsDate}
        disabled={disabled}
        onChange={(inHandsDate: OrderDateOnly | null) =>
          onChange({ inHandsDate })
        }
      />
    </>
  );
}
