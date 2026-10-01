import {
  formatCustomerBillingAddress,
  normalizeBillingAddress,
} from "@/lib/customers";
import {
  createCustomerLocationId,
  formatLocationSelectLabel,
  formatShippingAddress,
  resolveCustomerShippingLocations,
} from "@/lib/order-shipping";
import type {
  Customer,
  CustomerShippingLocation,
  OrderAddressSelection,
  ShippingAddress,
} from "@/types";
import { ORDER_BILL_TO_ACCOUNT } from "@/types";

export { ORDER_BILL_TO_ACCOUNT };

export type OrderAddressOption = {
  value: string;
  label: string;
  detail?: string;
  address: ShippingAddress;
};

export function shippingAddressFromBilling(
  customer: Customer | null | undefined
): ShippingAddress | null {
  if (!customer) return null;
  const billing = normalizeBillingAddress(customer.billingAddress);
  if (!billing?.line1) return null;
  return {
    label: "Account billing",
    line1: billing.line1,
    line2: billing.line2,
    city: billing.city,
    state: billing.state,
    postalCode: billing.postalCode,
    country: billing.country || "US",
  };
}

export function buildBillToOptions(
  customer: Customer | null | undefined,
  options?: { subCustomerId?: string | null }
): OrderAddressOption[] {
  if (!customer) return [];
  const items: OrderAddressOption[] = [];
  const billing = shippingAddressFromBilling(customer);
  if (billing) {
    items.push({
      value: ORDER_BILL_TO_ACCOUNT,
      label: "Account billing",
      detail: formatCustomerBillingAddress(customer) || undefined,
      address: billing,
    });
  }

  for (const location of resolveCustomerShippingLocations(customer, options)) {
    if (location.id === "profile-default") continue;
    items.push({
      value: location.id,
      label: formatLocationSelectLabel(location),
      detail: formatShippingAddress(location),
      address: location,
    });
  }
  return items;
}

export function buildShipToOptions(
  customer: Customer | null | undefined,
  options?: { subCustomerId?: string | null }
): OrderAddressOption[] {
  if (!customer) return [];
  return resolveCustomerShippingLocations(customer, options)
    .filter((location) => location.id !== "profile-default" || location.line1)
    .map((location) => ({
      value: location.id,
      label: formatLocationSelectLabel(location),
      detail: formatShippingAddress(location),
      address: location,
    }));
}

export function resolveOrderAddressSelection(
  selection: OrderAddressSelection | null | undefined,
  options: OrderAddressOption[]
): OrderAddressOption | null {
  if (!selection?.locationId) return null;
  return options.find((item) => item.value === selection.locationId) || null;
}

export function orderAddressSelectionLabel(
  selection: OrderAddressSelection | null | undefined,
  options: OrderAddressOption[],
  emptyLabel = "Select address"
): string {
  const matched = resolveOrderAddressSelection(selection, options);
  if (matched) return matched.label;
  if (selection?.address?.line1) {
    return (
      selection.address.label?.trim() ||
      formatShippingAddress(selection.address)
    );
  }
  return emptyLabel;
}

export function buildAddressSelection(
  locationId: string | null,
  options: OrderAddressOption[]
): OrderAddressSelection | null {
  if (!locationId) return null;
  const match = options.find((item) => item.value === locationId);
  if (!match) {
    return { locationId, address: null };
  }
  return {
    locationId: match.value,
    address: { ...match.address },
  };
}

/** Prefer account billing when the order has no bill-to yet. */
export function defaultBillToSelection(
  customer: Customer | null | undefined,
  options?: { subCustomerId?: string | null }
): OrderAddressSelection | null {
  const billOptions = buildBillToOptions(customer, options);
  const account = billOptions.find(
    (item) => item.value === ORDER_BILL_TO_ACCOUNT
  );
  if (account) return buildAddressSelection(account.value, billOptions);
  return billOptions[0]
    ? buildAddressSelection(billOptions[0].value, billOptions)
    : null;
}

/** Prefer the customer's default ship-to when the order has none. */
export function defaultShipToSelection(
  customer: Customer | null | undefined,
  options?: { subCustomerId?: string | null }
): OrderAddressSelection | null {
  const shipOptions = buildShipToOptions(customer, options);
  if (shipOptions.length === 0) return null;
  const preferred =
    shipOptions.find((item) =>
      Boolean((item.address as CustomerShippingLocation).isDefault)
    ) ||
    shipOptions.find((item) => item.value === "profile-default") ||
    shipOptions[0];
  return preferred
    ? buildAddressSelection(preferred.value, shipOptions)
    : null;
}

export function appendCustomerShippingLocation(
  existing: CustomerShippingLocation[] | undefined,
  draft: Omit<CustomerShippingLocation, "id"> & { id?: string }
): CustomerShippingLocation[] {
  const next: CustomerShippingLocation = {
    id: draft.id || createCustomerLocationId(),
    label: draft.label?.trim() || "Address",
    attention: draft.attention?.trim() || undefined,
    line1: draft.line1.trim(),
    line2: draft.line2?.trim() || undefined,
    city: draft.city.trim(),
    state: draft.state.trim(),
    postalCode: draft.postalCode.trim(),
    country: draft.country?.trim() || "US",
    isDefault: Boolean(draft.isDefault),
  };
  const withoutDup = (existing ?? []).filter(
    (location) => location.id !== next.id
  );
  const cleared = next.isDefault
    ? withoutDup.map((location) => ({ ...location, isDefault: false }))
    : withoutDup;
  return [...cleared, next];
}

/** Compact on-brand trigger for standalone order header selects */
export const orderHeaderSelectTriggerClass = [
  "h-8 min-w-[11rem] w-auto max-w-[min(100%,18rem)] gap-1.5 border border-[#e3e3e3] bg-white px-2.5 text-[13px] font-medium text-[#303030]",
  "shadow-[0_1px_0_rgba(26,26,26,0.05),0_1px_2px_rgba(26,26,26,0.04)]",
  "hover:bg-[#fafafa] focus-visible:border-[#c4d7f2] focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/15",
  "data-placeholder:font-normal data-placeholder:text-[#8a8a8a]",
  "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1",
].join(" ");

/** Outer shell for Shopify-style select (+ optional add) combo */
export const orderHeaderComboShellClass = [
  "inline-flex h-8 max-w-full min-w-[10.5rem] items-stretch overflow-hidden rounded-lg border border-[#e3e3e3] bg-white",
  "shadow-[0_1px_0_rgba(26,26,26,0.05),0_1px_2px_rgba(26,26,26,0.04)]",
  "transition-[border-color,box-shadow] focus-within:border-[#c4d7f2] focus-within:ring-2 focus-within:ring-[#2c6ecb]/15",
].join(" ");

/** Borderless trigger that lives inside the combo shell */
export const orderHeaderComboTriggerClass = [
  "h-full! min-h-8 w-full! min-w-0 max-w-none gap-1.5 rounded-none! border-0! bg-transparent px-2.5 text-[13px] font-medium text-[#303030] shadow-none!",
  "hover:bg-[#fafafa] focus-visible:border-transparent focus-visible:ring-0!",
  "data-placeholder:font-normal data-placeholder:text-[#8a8a8a]",
  "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:truncate",
].join(" ");

/** Compact action trigger that matches header combo selects (e.g. Multi-job run) */
export const orderHeaderActionTriggerClass = [
  "inline-flex h-full min-h-8 w-full min-w-[9.5rem] items-center justify-between gap-1.5 bg-transparent px-2.5 text-[13px] font-medium text-[#303030]",
  "hover:bg-[#fafafa]",
].join(" ");

export const orderHeaderComboAddClass = [
  "inline-flex h-full w-8 shrink-0 items-center justify-center border-l border-[#ebebeb] bg-white text-[#616161]",
  "transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

export const orderHeaderFieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8a8a]";

/** Wide popup so address / name rows are readable */
export const orderHeaderSelectContentClass = [
  "z-50 w-max! min-w-[min(92vw,22rem)] max-w-[min(92vw,28rem)] overflow-hidden border border-[#e3e3e3] bg-white p-1 text-[#303030]",
  "rounded-lg shadow-[0_4px_16px_rgba(26,26,26,0.12),0_1px_0_rgba(26,26,26,0.05)] ring-0",
].join(" ");

