"use client";

import { useSchedule } from "@/components/providers/schedule-provider";
import type { Order, ScheduleBlock } from "@/types";
import {
  formatOrderDisplayLine,
  formatOrderRef,
  formatScheduleBlockDisplayLine,
} from "@/lib/order-display";

export function OrderDisplayLine({
  order,
}: {
  order: { number: string; customLabel?: string | null };
}) {
  return <>{formatOrderDisplayLine(order)}</>;
}

export function OrderRefLine({
  ref,
}: {
  ref: { orderNumber: string; orderCustomLabel?: string | null };
}) {
  return <>{formatOrderRef(ref)}</>;
}

export function ScheduleBlockOrderLine({ block }: { block: ScheduleBlock }) {
  const { activeOrders } = useSchedule();
  const order = activeOrders.find((entry) => entry.id === block.orderId);
  return <>{formatScheduleBlockDisplayLine(block, order)}</>;
}

export function useOrderForBlock(block: ScheduleBlock): Order | undefined {
  const { activeOrders } = useSchedule();
  return activeOrders.find((entry) => entry.id === block.orderId);
}

export function useScheduleBlockDisplayLine(block: ScheduleBlock): string {
  const order = useOrderForBlock(block);
  return formatScheduleBlockDisplayLine(block, order);
}
