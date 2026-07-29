"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { OrderDesignStudioTab } from "@/components/orders/order-design-studio-tab";
import { updateOrderRequest } from "@/lib/api";
import { clearOrderRequestsListCache } from "@/lib/order-requests-cache";
import { buildOrderFromRequest } from "@/lib/order-request-design-studio";
import type { OrderRequestDetail } from "@/lib/order-requests";
import type { OrderDesignMockup } from "@/types";

export function OrderRequestDesignStudioTab({
  request,
  editable = true,
  onRequestChange,
  onRequestAddBlank,
}: {
  request: OrderRequestDetail;
  editable?: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
  onRequestAddBlank?: () => void;
}) {
  const { getIdToken } = useAuth();
  const order = useMemo(() => buildOrderFromRequest(request), [request]);

  const handleSave = useCallback(
    async (
      _orderId: string,
      jobId: string,
      imprintId: string,
      designMockup: OrderDesignMockup,
      options?: { attachToProof?: boolean; proofLabel?: string }
    ) => {
      if (!editable) {
        throw new Error("This request can’t be edited right now.");
      }
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const eventId = imprintId || jobId;
      const previewUrl = designMockup.composedPreviewUrl?.trim() || "";
      const nextEvents = (request.events || []).map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          designMockup,
          mockup: previewUrl
            ? {
                id:
                  designMockup.id ||
                  event.mockup?.id ||
                  `mockup-${event.id}`,
                name:
                  options?.proofLabel ||
                  event.mockup?.name ||
                  event.name ||
                  "Mockup",
                previewUrl,
              }
            : event.mockup,
        };
      });

      const { request: updated } = await updateOrderRequest(token, request.id, {
        blankSource: request.blankSource,
        subCustomerId: request.subCustomerId || null,
        lineItems: request.lineItems,
        events: nextEvents,
        inHandsDate: request.inHandsDate,
        rush: request.rush,
        customLabel: request.customLabel || "",
        notes: request.notes || "",
        vendorPurchaseOrder: request.vendorPurchaseOrder || null,
        estimateAdjustments: request.estimateAdjustments || [],
        excludedContractFeeIds: request.excludedContractFeeIds || [],
      });

      onRequestChange(updated);
      clearOrderRequestsListCache();
    },
    [editable, getIdToken, onRequestChange, request]
  );

  return (
    <OrderDesignStudioTab
      order={order}
      onSave={handleSave}
      persistBlankImages={false}
      canSave={editable}
      onRequestAddBlank={onRequestAddBlank}
      blankContextLabel="order request"
      addBlankLabel="Add a blank to this request"
      messages={{
        saved: "Mockup saved on this event.",
        attached:
          "Mockup saved on this event. Open Proofs to review specs — approval stays pending until convert.",
      }}
    />
  );
}
