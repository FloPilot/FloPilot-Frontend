"use client";

import { Suspense } from "react";
import { use } from "react";
import { CustomerPortalOrderView } from "@/components/portal/customer-portal-order-view";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

function OrderPage({ orderId }: { orderId: string }) {
  return <CustomerPortalOrderView orderId={orderId} />;
}

export default function PortalAppOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  return (
    <Suspense fallback={<AppLoadingScreen label="Loading order…" />}>
      <OrderPage orderId={orderId} />
    </Suspense>
  );
}
