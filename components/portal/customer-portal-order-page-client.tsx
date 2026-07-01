"use client";

import { CustomerPortalOrderView } from "@/components/portal/customer-portal-order-view";

export function CustomerPortalOrderPageClient({
  orderId,
}: {
  orderId: string;
}) {
  return <CustomerPortalOrderView orderId={orderId} />;
}
