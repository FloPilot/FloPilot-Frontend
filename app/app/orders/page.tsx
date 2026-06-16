"use client";

import { OrdersListView } from "@/components/orders/orders-list-view";
import { StaffHeader } from "@/components/layout/staff-header";
import { NewOrderButton } from "@/components/providers/new-order-provider";

export default function OrdersPage() {
  return (
    <>
      <StaffHeader
        title="Orders"
        description="Active orders, quotes, and order history"
        action={<NewOrderButton label="New Order" />}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <OrdersListView />
      </main>
    </>
  );
}
