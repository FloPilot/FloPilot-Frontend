import type { Customer, CustomerShippingLocation, SubCustomer } from "@/types";

export const MAX_SUB_CUSTOMERS = 20;

export function createSubCustomerId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function findSubCustomer(
  customer: Customer | undefined,
  subCustomerId?: string | null
): SubCustomer | undefined {
  if (!customer?.subCustomers?.length || !subCustomerId) return undefined;
  return customer.subCustomers.find((entry) => entry.id === subCustomerId);
}

export function sortSubCustomers(subCustomers: SubCustomer[] = []): SubCustomer[] {
  return [...subCustomers].sort((a, b) => a.name.localeCompare(b.name));
}

export function subCustomerLocationCount(subCustomer: SubCustomer): number {
  return subCustomer.shippingLocations?.length ?? 0;
}

export function resolveSubCustomerShippingLocations(
  customer: Customer | undefined,
  subCustomerId?: string | null
): CustomerShippingLocation[] {
  const sub = findSubCustomer(customer, subCustomerId);
  if (!sub) return [];

  const own = [...(sub.shippingLocations ?? [])].sort((a, b) => {
    if (a.isDefault === b.isDefault) return 0;
    return a.isDefault ? -1 : 1;
  });

  if (!sub.warehousesAtParent || !customer?.shippingLocations?.length) {
    return own;
  }

  const parent = customer.shippingLocations.filter(
    (location) => !own.some((entry) => entry.id === location.id)
  );

  return [...own, ...parent];
}

export function subCustomerSummary(subCustomer: SubCustomer): string {
  const parts = [subCustomer.name];
  if (subCustomer.contactName) parts.push(subCustomer.contactName);
  if (subCustomer.warehousesAtParent) parts.push("Uses parent warehouse");
  if (subCustomerLocationCount(subCustomer) > 0) {
    parts.push(
      `${subCustomerLocationCount(subCustomer)} ship-to${
        subCustomerLocationCount(subCustomer) === 1 ? "" : "s"
      }`
    );
  }
  return parts.join(" · ");
}
