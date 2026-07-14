import type { Customer, Order } from "@/types";
import type { PricingMatrix } from "@/lib/shop-settings";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import { resolveOrderFinancials } from "@/lib/order-estimate";

export type OrderFinancialContext = {
  taxRate: number;
  pricingMatrix?: PricingMatrix;
  pricingRateSheets?: import("@/lib/shop-settings").ShopPricingRateSheet[];
  getCustomer?: (customerId: string) => Customer | null | undefined;
};

export type OrderFinancials = ReturnType<typeof resolveOrderFinancials>;

const EMPTY_MATRIX: PricingMatrix = { enabled: false, methods: [] };

/** Resolves order totals using the customer's negotiated rate sheet when assigned. */
export function resolveOrderFinancialsInContext(
  order: Order,
  context: OrderFinancialContext
): OrderFinancials {
  const customer = context.getCustomer?.(order.customerId) ?? null;
  const matrix = resolveEffectivePricingMatrix(
    {
      pricingMatrix: context.pricingMatrix ?? EMPTY_MATRIX,
      pricingRateSheets: context.pricingRateSheets,
    },
    customer,
    order
  );
  return resolveOrderFinancials(order, context.taxRate, matrix, customer);
}

export function buildOrderFinancialsMap(
  orders: Order[],
  context: OrderFinancialContext
): Map<string, OrderFinancials> {
  const map = new Map<string, OrderFinancials>();
  for (const order of orders) {
    map.set(order.id, resolveOrderFinancialsInContext(order, context));
  }
  return map;
}
