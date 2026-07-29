"use client";

import { Suspense } from "react";
import { PortalOrderRequestWizard } from "@/components/portal/portal-order-request-wizard";

export default function PortalAppNewOrderRequestPage() {
  return (
    <Suspense fallback={null}>
      <PortalOrderRequestWizard />
    </Suspense>
  );
}
