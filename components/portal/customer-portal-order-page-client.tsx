"use client";

import { Suspense } from "react";
import { CustomerPortalOrderView } from "@/components/portal/customer-portal-order-view";

export function CustomerPortalOrderPageClient({
  orderId,
}: {
  orderId: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[#616161]">
          Loading order…
        </div>
      }
    >
      <CustomerPortalOrderView orderId={orderId} />
    </Suspense>
  );
}
