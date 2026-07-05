import { getCustomerAccentFromCustomer } from "@/lib/production-customer-colors";
import type { CustomerAccent } from "@/lib/production-customer-colors";
import {
  COMPLETED_EVENT_CLASSES,
  type ScheduleBlockProductionStatus,
} from "@/lib/schedule-block-display";
import type { Customer, Order, ScheduleBlock } from "@/types";

export type ScheduleBlockCustomerPresentation = {
  company: string;
  logoUrl?: string | null;
  accentColorKey?: string | null;
  customerId?: string;
  accent: CustomerAccent;
};

export function resolveScheduleBlockCustomer(
  block: ScheduleBlock,
  orders: Order[],
  getCustomerById: (id: string) => Customer | undefined
): ScheduleBlockCustomerPresentation {
  const order = orders.find((o) => o.id === block.orderId);
  const customer = order?.customerId
    ? getCustomerById(order.customerId)
    : undefined;
  const company = customer?.company || block.customerName || "Customer";

  return {
    company,
    logoUrl: customer?.logoUrl,
    accentColorKey: customer?.accentColorKey,
    customerId: customer?.id ?? order?.customerId,
    accent: getCustomerAccentFromCustomer(
      customer,
      order?.customerId || block.orderId
    ),
  };
}

export function getScheduleBlockEventClasses(
  presentation: ScheduleBlockCustomerPresentation,
  options?: {
    muted?: boolean;
    hasConflict?: boolean;
    productionStatus?: ScheduleBlockProductionStatus;
  }
): string[] {
  if (options?.hasConflict) {
    return [];
  }
  if (options?.productionStatus === "completed") {
    return [...COMPLETED_EVENT_CLASSES];
  }
  if (options?.muted) {
    return ["bg-muted/45", "border-border/70", "text-brand-muted"];
  }
  return [
    presentation.accent.bg,
    presentation.accent.border,
    presentation.accent.text,
  ];
}
