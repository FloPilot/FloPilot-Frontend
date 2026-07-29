"use client";

import { use } from "react";
import { PortalOrderRequestDetail } from "@/components/portal/portal-order-request-detail";

export default function PortalPreviewOrderRequestPage({
  params,
}: {
  params: Promise<{ token: string; requestId: string }>;
}) {
  const { requestId } = use(params);
  return <PortalOrderRequestDetail requestId={requestId} />;
}
