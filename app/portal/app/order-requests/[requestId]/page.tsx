"use client";

import { use } from "react";
import { PortalOrderRequestDetail } from "@/components/portal/portal-order-request-detail";

export default function PortalAppOrderRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  return <PortalOrderRequestDetail requestId={requestId} />;
}
