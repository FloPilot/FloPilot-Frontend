"use client";

import { Suspense } from "react";
import { PortalOrderRequestWizard } from "@/components/portal/portal-order-request-wizard";

export default function PortalPreviewNewOrderRequestPage() {
  return (
    <Suspense fallback={null}>
      <PortalOrderRequestWizard />
    </Suspense>
  );
}
