"use client";

import { Suspense, use } from "react";
import { CustomerPortalOrderView } from "@/components/portal/customer-portal-order-view";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function PortalPreviewOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  return (
    <Suspense fallback={<AppLoadingScreen label="Loading order…" />}>
      <CustomerPortalOrderView orderId={orderId} />
    </Suspense>
  );
}
