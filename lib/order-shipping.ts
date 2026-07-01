import { SHIPPING_METHODS } from "@/lib/create-order";
import { lineItemPieceCount } from "@/lib/line-items";
import type {
  Customer,
  CustomerShippingLocation,
  LineItem,
  Order,
  OrderShippingSettings,
  Shipment,
  ShipmentAllocation,
  ShippingAddress,
  SizeBreakdown,
} from "@/types";

export const SHIPMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "labeled", label: "Labeled" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
] as const;

export function createShipmentId(): string {
  return `ship-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCustomerLocationId(): string {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatLineItemLabel(item: LineItem): string {
  const product = item.productName.startsWith(item.brand)
    ? item.productName
    : `${item.brand} ${item.productName}`;
  return `${product} · ${item.color}`;
}

export function formatLocationSelectLabel(
  location: CustomerShippingLocation
): string {
  const name =
    location.label?.trim() || location.line1?.trim() || "Ship-to location";
  const cityLine = [location.city, location.state].filter(Boolean).join(", ");
  return cityLine ? `${name} · ${cityLine}` : name;
}

export function resolveShipToSelectLabel(
  locationId: string | undefined,
  locations: CustomerShippingLocation[],
  address?: ShippingAddress
): string {
  if (!locationId) return "";
  if (locationId === "custom") return "Custom address";
  const location = locationById(locations, locationId);
  if (location) return formatLocationSelectLabel(location);
  if (address?.label?.trim()) return address.label.trim();
  if (address?.line1) return formatShippingAddress(address);
  return "Saved location";
}

export function formatShippingAddress(address: ShippingAddress): string {
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
  const lines = [
    address.attention,
    address.line1,
    address.line2,
    cityLine,
  ].filter(Boolean);
  return lines.join(" · ");
}

export function formatShipmentDestination(shipment: Shipment): string {
  if (shipment.address) {
    const label = shipment.address.label?.trim();
    const formatted = formatShippingAddress(shipment.address);
    return label ? `${label} — ${formatted}` : formatted;
  }
  return shipment.destination;
}

export function shippingMethodLabel(methodKey?: string, fallback = "UPS Ground"): string {
  if (!methodKey) return fallback;
  return (
    SHIPPING_METHODS.find((method) => method.key === methodKey)?.label ?? fallback
  );
}

export function resolveCustomerShippingLocations(
  customer: Customer | undefined
): CustomerShippingLocation[] {
  if (!customer) return [];
  if (customer.shippingLocations?.length) {
    return [...customer.shippingLocations].sort((a, b) => {
      if (a.isDefault === b.isDefault) return 0;
      return a.isDefault ? -1 : 1;
    });
  }

  if (customer.city || customer.state || customer.company) {
    return [
      {
        id: "profile-default",
        label: "Customer profile",
        line1: customer.company || customer.name,
        city: customer.city,
        state: customer.state,
        postalCode: "",
        isDefault: true,
      },
    ];
  }

  return [];
}

export function locationById(
  locations: CustomerShippingLocation[],
  locationId?: string
): CustomerShippingLocation | undefined {
  if (!locationId) return undefined;
  return locations.find((location) => location.id === locationId);
}

export function allocationPieceCount(allocation: ShipmentAllocation): number {
  return allocation.sizes.reduce((sum, row) => sum + row.quantity, 0);
}

export function shipmentPieceCount(shipment: Shipment): number {
  return (shipment.allocations ?? []).reduce(
    (sum, allocation) => sum + allocationPieceCount(allocation),
    0
  );
}

export function orderShippingPieceCount(order: Order): number {
  return order.lineItems.reduce((sum, item) => sum + lineItemPieceCount(item), 0);
}

export function allocatedPiecesByLineItem(
  shipments: Shipment[],
  excludeShipmentId?: string
): Map<string, Map<string, number>> {
  const totals = new Map<string, Map<string, number>>();

  for (const shipment of shipments) {
    if (excludeShipmentId && shipment.id === excludeShipmentId) continue;
    for (const allocation of shipment.allocations ?? []) {
      const sizeMap =
        totals.get(allocation.lineItemId) ?? new Map<string, number>();
      for (const row of allocation.sizes) {
        sizeMap.set(row.size, (sizeMap.get(row.size) ?? 0) + row.quantity);
      }
      totals.set(allocation.lineItemId, sizeMap);
    }
  }

  return totals;
}

export function getRemainingQty(
  lineItem: LineItem,
  shipments: Shipment[],
  excludeShipmentId?: string
): Map<string, number> {
  const allocated = allocatedPiecesByLineItem(shipments, excludeShipmentId);
  const sizeMap = allocated.get(lineItem.id) ?? new Map<string, number>();
  const remaining = new Map<string, number>();

  for (const row of lineItem.sizes) {
    remaining.set(row.size, Math.max(0, row.quantity - (sizeMap.get(row.size) ?? 0)));
  }

  return remaining;
}

export function getUnallocatedPieceCount(order: Order, shipments: Shipment[]): number {
  const total = orderShippingPieceCount(order);
  const allocated = shipments.reduce(
    (sum, shipment) => sum + shipmentPieceCount(shipment),
    0
  );
  return Math.max(0, total - allocated);
}

export function buildShipmentDestinationLabel(
  address: ShippingAddress | undefined,
  location: CustomerShippingLocation | undefined
): string {
  if (address) {
    return formatShippingAddress(address);
  }
  if (location) {
    const formatted = formatShippingAddress(location);
    return location.label ? `${location.label} — ${formatted}` : formatted;
  }
  return "Select destination";
}

export function createEmptyShipment(
  order: Order,
  locations: CustomerShippingLocation[],
  settings?: OrderShippingSettings
): Shipment {
  const defaultLocation = locations.find((location) => location.isDefault) ?? locations[0];
  const methodKey = settings?.defaultMethodKey ?? SHIPPING_METHODS[0].key;
  const method = shippingMethodLabel(methodKey);

  return {
    id: createShipmentId(),
    label: `Shipment ${order.shipments.length + 1}`,
    method,
    methodKey,
    status: "pending",
    destination: defaultLocation
      ? buildShipmentDestinationLabel(undefined, defaultLocation)
      : "Select destination",
    customerLocationId: defaultLocation?.id,
    address: defaultLocation ? { ...defaultLocation } : undefined,
    allocations: [],
    handlingCost: 0,
  };
}

export function normalizeShipmentForSave(shipment: Shipment): Shipment {
  const methodKey = shipment.methodKey;
  const method =
    shipment.method.trim() ||
    shippingMethodLabel(methodKey, SHIPPING_METHODS[0].label);

  return {
    ...shipment,
    method,
    methodKey,
    destination: formatShipmentDestination({
      ...shipment,
      method,
    }),
    handlingCost:
      typeof shipment.handlingCost === "number" && shipment.handlingCost > 0
        ? shipment.handlingCost
        : undefined,
    handlingNotes: shipment.handlingNotes?.trim() || undefined,
    trackingNumber: shipment.trackingNumber?.trim() || undefined,
    allocations: (shipment.allocations ?? []).filter(
      (allocation) => allocationPieceCount(allocation) > 0
    ),
  };
}

export function buildAllocationsFromRemaining(
  order: Order,
  shipments: Shipment[],
  shipmentId: string
): ShipmentAllocation[] {
  return order.lineItems
    .map((item) => {
      const remaining = getRemainingQty(item, shipments, shipmentId);
      const sizes = [...remaining.entries()]
        .filter(([, qty]) => qty > 0)
        .map(([size, quantity]) => ({ size, quantity }));
      if (sizes.length === 0) return null;
      return { lineItemId: item.id, sizes };
    })
    .filter((entry): entry is ShipmentAllocation => entry !== null);
}

export function totalHandlingCost(shipments: Shipment[]): number {
  return shipments.reduce((sum, shipment) => sum + (shipment.handlingCost ?? 0), 0);
}

export function getShipmentAllocationRow(
  lineItem: LineItem,
  shipments: Shipment[],
  shipmentId: string,
  size: string
): {
  ordered: number;
  /** Pieces still open to assign on this shipment (excludes ship-here qty). */
  available: number;
  /** Max allowed in ship-here for this size on this shipment. */
  maxShipHere: number;
  shipHere: number;
} {
  const ordered =
    lineItem.sizes.find((row) => row.size === size)?.quantity ?? 0;
  const remaining = getRemainingQty(lineItem, shipments, shipmentId);
  const remainingForSize = remaining.get(size) ?? 0;
  const shipment = shipments.find((entry) => entry.id === shipmentId);
  const shipHere =
    shipment?.allocations
      ?.find((allocation) => allocation.lineItemId === lineItem.id)
      ?.sizes.find((row) => row.size === size)?.quantity ?? 0;
  const maxShipHere = Math.min(ordered, remainingForSize);
  const available = Math.max(0, maxShipHere - shipHere);

  return { ordered, available, maxShipHere, shipHere };
}

export function sizesForAllocation(
  lineItem: LineItem,
  allocation: ShipmentAllocation | undefined
): SizeBreakdown[] {
  const bySize = new Map(allocation?.sizes.map((row) => [row.size, row.quantity]));
  return lineItem.sizes.map((row) => ({
    size: row.size,
    quantity: bySize.get(row.size) ?? 0,
  }));
}
