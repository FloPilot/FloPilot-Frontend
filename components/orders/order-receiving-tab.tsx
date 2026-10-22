"use client";

import { OrderInternalNotes } from "@/components/orders/order-internal-notes";
import { OrderMaterialsPanel } from "@/components/orders/order-materials-panel";
import {
  OrderReceivingStatusBar,
  OrderReceivingTeamCallout,
} from "@/components/orders/order-receiving-callout";
import { OrderSubcontractReturnsPanel } from "@/components/orders/order-subcontract-returns-panel";
import type { Order } from "@/types";

export function OrderReceivingTab({
  order,
  orderId,
}: {
  order: Order;
  orderId: string;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <OrderReceivingStatusBar order={order} />
        <OrderReceivingTeamCallout order={order} />
      </div>
      <OrderMaterialsPanel order={order} section="received_goods" />
      <OrderSubcontractReturnsPanel order={order} />
      <OrderInternalNotes
        orderId={orderId}
        title="Receiving notes"
        description="Longer notes for this order — also on the Notes tab. Assign to Receiving so the team sees a popup when they open the app."
        placeholder="e.g. Short 2 Mediums — vendor reshipping Thursday…"
        defaultTargetDepartment="receiving"
      />
    </div>
  );
}
