"use client";

import { useMemo } from "react";
import { OrderActivityFeed } from "@/components/orders/order-activity-feed";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { buildOrderFromRequest } from "@/lib/order-request-design-studio";
import type { OrderRequestDetail } from "@/lib/order-requests";
import { cn } from "@/lib/utils";

export function OrderRequestActivityTab({
  request,
}: {
  request: OrderRequestDetail;
}) {
  const order = useMemo(() => buildOrderFromRequest(request), [request]);
  const converted = request.status === "converted" && request.convertedOrderNumber;

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Activity</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Paper trail for this request — submit, edits, messages, and estimate
          changes.
          {converted
            ? ` Converted to order ${request.convertedOrderNumber}; full history continues there.`
            : " When you convert, this history carries onto the order with a clear request → order break."}
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <OrderActivityFeed order={order} variant="timeline" />
      </div>
    </section>
  );
}
