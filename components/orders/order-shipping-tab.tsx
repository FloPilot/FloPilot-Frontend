"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Store,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { CustomerShippingLocationsSection } from "@/components/customers/customer-shipping-locations-section";
import { OrderShippingDeleteDialog } from "@/components/orders/order-shipping-delete-dialog";
import { OrderShippingSwitchDialog } from "@/components/orders/order-shipping-switch-dialog";
import type { ShippingModeSwitch } from "@/components/orders/order-shipping-switch-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SHIPPING_METHODS } from "@/lib/create-order";
import { US_STATES } from "@/lib/customers";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import {
  countProducedPieces,
  hasProducedGoodsVariance,
  mergeOrderProducedGoods,
} from "@/lib/order-produced-goods";
import { lineItemPieceCount } from "@/lib/line-items";
import {
  buildAllocationsFromRemaining,
  buildShipmentDestinationLabel,
  convertShipmentsToPickups,
  createEmptyShipment,
  createPickupAll,
  formatLineItemLabel,
  formatLocationSelectLabel,
  formatShipmentDestination,
  fulfillmentLineItems,
  fulfillmentProgress,
  fulfillmentStatusLabel,
  getRemainingQty,
  getShipmentAllocationRow,
  getUnallocatedPieceCount,
  hasCarrierShipments,
  isWillCallMethod,
  isWillCallOrder,
  locationById,
  normalizeShipmentForSave,
  orderShippingPieceCount,
  fulfillableQtyForSize,
  resolveCustomerShippingLocations,
  resolveShipToSelectLabel,
  statusOptionsForShipment,
  shipmentPieceCount,
  shippingMethodLabel,
  sizesForAllocation,
  totalHandlingCost,
  WILL_CALL_METHOD_KEY,
} from "@/lib/order-shipping";
import type {
  Order,
  OrderShippingSettings,
  Shipment,
  ShippingAddress,
} from "@/types";
import { cn } from "@/lib/utils";

/** Unified shipping tab controls — dashboard elevation, matched h-10. */
const shippingControlClass = cn(
  dashboardControlClass,
  "!h-10 min-h-10 max-h-10 w-full px-3 py-0"
);

const shippingSelectClass = cn(shippingControlClass, "justify-between");

function ShippingSaveBar({
  willCallMode,
  saving,
  isDirty,
  savedFlash,
  onSave,
  className,
}: {
  willCallMode: boolean;
  saving: boolean;
  isDirty: boolean;
  savedFlash: boolean;
  onSave: () => void;
  className?: string;
}) {
  const label = willCallMode ? "Save pickup" : "Save shipping";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        className
      )}
    >
      {savedFlash ? (
        <span className="text-[12px] font-medium text-emerald-700">Saved</span>
      ) : null}
      <Button
        type="button"
        className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
        disabled={!isDirty || saving}
        onClick={onSave}
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )}
        {label}
      </Button>
    </div>
  );
}

export function OrderShippingTab({ order }: { order: Order }) {
  const { customers, updateOrderShipments, updateCustomer } = useSchedule();
  const customer = customers.find((entry) => entry.id === order.customerId);
  const customerLocations = useMemo(
    () =>
      resolveCustomerShippingLocations(customer, {
        subCustomerId: order.subCustomerId,
      }),
    [customer, order.subCustomerId]
  );

  const [shipments, setShipments] = useState<Shipment[]>(order.shipments ?? []);
  const [settings, setSettings] = useState<OrderShippingSettings>(
    order.shipping ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [switchDialog, setSwitchDialog] = useState<ShippingModeSwitch | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setShipments(order.shipments ?? []);
    setSettings(order.shipping ?? {});
  }, [order.id, order.shipments, order.shipping]);

  const totalPieces = orderShippingPieceCount(order);
  const unallocatedPieces = getUnallocatedPieceCount(order, shipments);
  const allocatedPieces = totalPieces - unallocatedPieces;
  const handlingTotal = totalHandlingCost(shipments);
  const willCallMode = isWillCallOrder(settings, shipments);
  const fulfillment = fulfillmentProgress(shipments);
  const produced = useMemo(() => mergeOrderProducedGoods(order), [order]);
  const producedPieces = countProducedPieces(produced);
  const producedVaries = hasProducedGoodsVariance(produced);
  const fulfillableItems = useMemo(
    () => fulfillmentLineItems(order),
    [order]
  );
  const readyToInvoice =
    fulfillment.allComplete &&
    unallocatedPieces === 0 &&
    totalPieces > 0 &&
    shipments.length > 0;

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(shipments) !== JSON.stringify(order.shipments ?? []) ||
      JSON.stringify(settings) !== JSON.stringify(order.shipping ?? {})
    );
  }, [shipments, settings, order.shipments, order.shipping]);

  const handleSave = async (overrideShipments?: Shipment[]) => {
    setSaving(true);
    setSavedFlash(false);
    try {
      const source = Array.isArray(overrideShipments)
        ? overrideShipments
        : shipments;
      const normalized = source.map(normalizeShipmentForSave);
      await updateOrderShipments(order.id, normalized, {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      if (Array.isArray(overrideShipments)) {
        setShipments(normalized);
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const markShipmentFulfilled = async (
    shipmentId: string,
    status: "picked_up" | "delivered"
  ) => {
    const next = shipments.map((shipment) =>
      shipment.id === shipmentId ? { ...shipment, status } : shipment
    );
    setShipments(next);
    await handleSave(next);
  };

  const addShipment = () => {
    setShipments((current) => [
      ...current,
      createEmptyShipment(order, customerLocations, settings),
    ]);
  };

  const addPickupAll = () => {
    setShipments([createPickupAll({ ...order, shipments })]);
  };

  const handleDefaultMethodChange = (value: string) => {
    if (!value) return;
    const current = settings.defaultMethodKey ?? SHIPPING_METHODS[0].key;
    if (value === current) return;

    if (
      isWillCallMethod(value) &&
      !isWillCallMethod(current) &&
      hasCarrierShipments(shipments)
    ) {
      setSwitchDialog({
        direction: "to_will_call",
        shipmentCount: shipments.filter((entry) => isWillCallMethod(entry.methodKey) === false).length,
      });
      return;
    }

    if (
      !isWillCallMethod(value) &&
      isWillCallMethod(current) &&
      shipments.length > 0
    ) {
      setSwitchDialog({
        direction: "to_carrier",
        pickupCount: shipments.length,
      });
      return;
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      defaultMethodKey: value,
    }));
  };

  const confirmSwitchClear = () => {
    if (!switchDialog) return;
    if (switchDialog.direction === "to_will_call") {
      setShipments([]);
      setSettings((current) => ({
        ...current,
        defaultMethodKey: WILL_CALL_METHOD_KEY,
      }));
    } else {
      setShipments([]);
      setSettings((current) => ({
        ...current,
        defaultMethodKey: SHIPPING_METHODS[0].key,
      }));
    }
    setSwitchDialog(null);
  };

  const confirmSwitchConvert = () => {
    if (!switchDialog) return;
    if (switchDialog.direction === "to_will_call") {
      setShipments(convertShipmentsToPickups(shipments));
      setSettings((current) => ({
        ...current,
        defaultMethodKey: WILL_CALL_METHOD_KEY,
      }));
    } else {
      setShipments([]);
      setSettings((current) => ({
        ...current,
        defaultMethodKey: SHIPPING_METHODS[0].key,
      }));
    }
    setSwitchDialog(null);
  };

  const updateShipment = (shipmentId: string, patch: Partial<Shipment>) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === shipmentId ? { ...shipment, ...patch } : shipment
      )
    );
  };

  const removeShipment = (shipmentId: string) => {
    const target = shipments.find((entry) => entry.id === shipmentId);
    if (target) setDeleteTarget(target);
  };

  const confirmRemoveShipment = async () => {
    if (!deleteTarget) return;

    const previousShipments = shipments;
    const nextShipments = shipments.filter(
      (entry) => entry.id !== deleteTarget.id
    );
    setDeleting(true);
    setSavedFlash(false);
    setShipments(nextShipments);

    try {
      const normalized = nextShipments.map(normalizeShipmentForSave);
      await updateOrderShipments(order.id, normalized, {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      setDeleteTarget(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setShipments(previousShipments);
    } finally {
      setDeleting(false);
    }
  };

  const selectShipmentLocation = (
    shipmentId: string,
    locationId: string | "custom"
  ) => {
    if (locationId === "custom") {
      updateShipment(shipmentId, {
        customerLocationId: undefined,
        address: {
          label: "Custom address",
          line1: "",
          city: "",
          state: "",
          postalCode: "",
        },
        destination: "Custom address",
      });
      return;
    }

    const location = locationById(customerLocations, locationId);
    if (!location) return;

    updateShipment(shipmentId, {
      customerLocationId: location.id,
      address: { ...location },
      destination: buildShipmentDestinationLabel(undefined, location),
    });
  };

  const updateShipmentAddress = (
    shipmentId: string,
    patch: Partial<ShippingAddress>
  ) => {
    setShipments((current) =>
      current.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        const address = {
          label: "",
          line1: "",
          city: "",
          state: "",
          postalCode: "",
          ...(shipment.address ?? {}),
          ...patch,
        };
        return {
          ...shipment,
          address,
          destination: buildShipmentDestinationLabel(address, undefined),
        };
      })
    );
  };

  const updateAllocationQty = (
    shipmentId: string,
    lineItemId: string,
    size: string,
    quantity: number
  ) => {
    setShipments((current) =>
      current.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        const lineItem = order.lineItems.find((item) => item.id === lineItemId);
        if (!lineItem) return shipment;

        const remaining = getRemainingQty(order, lineItem, current, shipmentId);
        const producedQty = fulfillableQtyForSize(order, lineItemId, size);
        const maxQty = Math.min(producedQty, remaining.get(size) ?? 0);
        const nextQty = Math.max(0, Math.min(maxQty, quantity));

        const allocations = [...(shipment.allocations ?? [])];
        const index = allocations.findIndex(
          (allocation) => allocation.lineItemId === lineItemId
        );
        const existingSizes =
          index >= 0 ? [...allocations[index].sizes] : lineItem.sizes.map((row) => ({
            size: row.size,
            quantity: 0,
          }));

        const sizeIndex = existingSizes.findIndex((row) => row.size === size);
        if (sizeIndex >= 0) {
          existingSizes[sizeIndex] = { size, quantity: nextQty };
        } else {
          existingSizes.push({ size, quantity: nextQty });
        }

        const filteredSizes = existingSizes.filter((row) => row.quantity > 0);
        if (filteredSizes.length === 0) {
          if (index >= 0) allocations.splice(index, 1);
        } else if (index >= 0) {
          allocations[index] = { lineItemId, sizes: filteredSizes };
        } else {
          allocations.push({ lineItemId, sizes: filteredSizes });
        }

        return { ...shipment, allocations };
      })
    );
  };

  const assignRemainingToShipment = (shipmentId: string) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              allocations: buildAllocationsFromRemaining(
                order,
                current,
                shipmentId
              ),
            }
          : shipment
      )
    );
  };

  return (
    <div className="space-y-4">
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div>
            <h2 className={dashboardTaskTitleClass}>Shipping / Handling</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {willCallMode
                ? "Customer will pick up from your shop — plan one or more pickups and mark goods as picked up when they leave."
                : "Plan one or more shipments, split blanks/garments across customer locations, and track handling costs."}
            </p>
          </div>
          <ShippingSaveBar
            willCallMode={willCallMode}
            saving={saving}
            isDirty={isDirty}
            savedFlash={savedFlash}
            onSave={() => {
              void handleSave();
            }}
          />
        </div>

        {order.subCustomerName ? (
          <div className="mx-4 mt-4 flex flex-wrap items-start gap-2 rounded-lg border border-[#dbeafe] bg-[#f4f7fd] px-4 py-3 sm:mx-5">
            <Users className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
            <div className="min-w-0 text-[12px] leading-relaxed text-[#303030]">
              <p className="font-semibold">End business: {order.subCustomerName}</p>
              <p className="mt-0.5 text-[#616161]">
                Ship-to options use this business&apos;s saved addresses
                {customerLocations.length > 0
                  ? ` (${customerLocations.length} available)`
                  : ""}
                . Edit them on the{" "}
                <Link
                  href={`/app/customers/${order.customerId}`}
                  className="font-medium text-[#2c6ecb] hover:underline"
                >
                  customer profile
                </Link>
                .
              </p>
            </div>
          </div>
        ) : null}

        {shipments.length > 0 ? (
          <div
            className={cn(
              "mx-4 mt-4 rounded-lg border px-4 py-3 sm:mx-5",
              readyToInvoice
                ? "border-[#86d4a8] bg-[#e8f5ee]"
                : fulfillment.complete > 0
                  ? "border-[#f0d9a8] bg-[#fffdf5]"
                  : "border-[#ebebeb] bg-[#fafafa]"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#303030]">
                  {willCallMode ? "Pickup progress" : "Shipment progress"}
                </p>
                <p className="mt-0.5 text-[12px] text-[#616161]">
                  {fulfillment.complete} of {fulfillment.total}{" "}
                  {willCallMode ? "pickup" : "shipment"}
                  {fulfillment.total !== 1 ? "s" : ""}{" "}
                  {willCallMode ? "picked up" : "delivered"}
                  {unallocatedPieces > 0
                    ? ` · ${unallocatedPieces} pieces still unassigned`
                    : totalPieces > 0
                      ? " · all pieces assigned"
                      : ""}
                </p>
              </div>
              {readyToInvoice ? (
                <span className="inline-flex rounded-md border border-[#86d4a8] bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-semibold text-[#0d5c2e]">
                  {willCallMode ? "Picked up" : "Delivered"}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-4 p-4 sm:p-5",
            !willCallMode &&
              customer &&
              !order.subCustomerId &&
              "lg:grid-cols-[minmax(0,1fr)_280px]"
          )}
        >
          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  {willCallMode ? "Fulfillment method" : "Default carrier"}
                </Label>
                <Select
                  value={settings.defaultMethodKey ?? SHIPPING_METHODS[0].key}
                  onValueChange={(value) => {
                    if (value) handleDefaultMethodChange(value);
                  }}
                >
                  <SelectTrigger className={shippingSelectClass}>
                    <SelectValue placeholder="Select carrier">
                      {shippingMethodLabel(
                        settings.defaultMethodKey ?? SHIPPING_METHODS[0].key
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_METHODS.map((method) => (
                      <SelectItem key={method.key} value={method.key}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Allocation
                </Label>
                <div
                  className={cn(
                    shippingControlClass,
                    "w-full cursor-default hover:bg-white"
                  )}
                >
                  <span className="truncate text-[13px] font-medium text-[#303030]">
                    {allocatedPieces} / {totalPieces} pieces assigned
                  </span>
                  {unallocatedPieces > 0 ? (
                    <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-800">
                      {unallocatedPieces} open
                    </span>
                  ) : totalPieces > 0 ? (
                    <span className="shrink-0 rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold leading-none text-[#0d5c2e]">
                      Fully assigned
                    </span>
                  ) : (
                    <span className="shrink-0 text-[12px] text-[#8a8a8a]">—</span>
                  )}
                </div>
                {producedVaries ? (
                  <p className="text-[12px] leading-snug text-[#616161]">
                    Based on {producedPieces} produced pcs (differs from ordered).
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Shipping instructions
              </Label>
              <Textarea
                value={settings.instructions ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    instructions: event.target.value,
                  }))
                }
                placeholder="Blind ship, reference PO on label, split by store number…"
                rows={3}
                className="min-h-[88px] w-full resize-none rounded-lg border-[#e3e3e3]"
              />
            </div>
          </div>

          {!willCallMode && customer && !order.subCustomerId ? (
            <CustomerShippingLocationsSection
              customer={customer}
              variant="compact"
              onSave={async (shippingLocations) => {
                await updateCustomer(customer.id, { shippingLocations });
              }}
              onLocationDeleted={(locationId) => {
                setShipments((current) =>
                  current.map((shipment) =>
                    shipment.customerLocationId === locationId
                      ? {
                          ...shipment,
                          customerLocationId: undefined,
                          destination: "Select destination",
                        }
                      : shipment
                  )
                );
              }}
            />
          ) : null}
        </div>
      </section>

      {shipments.length === 0 ? (
        <section
          className={cn(
            dashboardCardClass,
            "border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-10 text-center sm:px-5"
          )}
        >
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#2c6ecb]">
            {willCallMode ? (
              <Store className="size-5" />
            ) : (
              <Truck className="size-5" />
            )}
          </div>
          <p className="mt-3 text-[13px] font-medium text-[#303030]">
            {willCallMode
              ? "No pickups planned yet"
              : "No shipments planned yet"}
          </p>
          <p className={cn("mx-auto mt-1 max-w-md", dashboardTaskDetailClass)}>
            {willCallMode
              ? "Plan when the customer picks up — one visit for everything, or split across multiple pickups."
              : "Add a shipment for each destination — assign specific blanks/garments when the order splits across stores or offices."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {willCallMode ? (
              <>
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                  onClick={addPickupAll}
                  disabled={order.lineItems.length === 0}
                >
                  <Package className="size-3.5" />
                  Pickup all at once
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(dashboardControlClass, "h-10 rounded-lg")}
                  onClick={addShipment}
                >
                  <Plus className="size-3.5" />
                  Add pickup
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                onClick={addShipment}
              >
                <Plus className="size-3.5" />
                Add shipment
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const methodKey =
              shipment.methodKey ??
              SHIPPING_METHODS.find((method) => method.label === shipment.method)
                ?.key ??
              SHIPPING_METHODS[0].key;
            const isPickup = isWillCallMethod(methodKey);
            const selectedLocationId =
              shipment.customerLocationId ??
              (shipment.address ? "custom" : undefined);
            const isCustom = selectedLocationId === "custom";
            const shipToLabel = resolveShipToSelectLabel(
              selectedLocationId,
              customerLocations,
              shipment.address
            );
            const statusOptions = statusOptionsForShipment({
              ...shipment,
              methodKey,
            });
            const isComplete =
              shipment.status === "picked_up" || shipment.status === "delivered";

            return (
              <section key={shipment.id} className={dashboardCardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={shipment.label ?? ""}
                      onChange={(event) =>
                        updateShipment(shipment.id, { label: event.target.value })
                      }
                      placeholder={isPickup ? "Pickup label" : "Shipment label"}
                      className="h-9 max-w-sm rounded-lg border-[#e3e3e3] text-[13px] font-semibold"
                    />
                    <p className={dashboardTaskDetailClass}>
                      {isPickup ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Store className="size-3.5 shrink-0 text-[#616161]" />
                          Will Call · Shop pickup
                        </span>
                      ) : (
                        formatShipmentDestination(shipment)
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f4f7fd] px-2.5 py-1 text-[11px] font-semibold text-[#2c6ecb]">
                      {shipmentPieceCount(shipment)} pcs
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        isComplete
                          ? "bg-[#e8f5ee] text-[#0d5c2e]"
                          : "bg-[#fff1d6] text-[#8a6116]"
                      )}
                    >
                      {fulfillmentStatusLabel({ ...shipment, methodKey })}
                    </span>
                    {!isComplete && isPickup ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        className={cn(
                          dashboardPrimaryButtonClass,
                          "h-8 rounded-lg px-3 text-[12px]"
                        )}
                        onClick={() =>
                          void markShipmentFulfilled(shipment.id, "picked_up")
                        }
                      >
                        {saving ? "Saving…" : "Mark picked up"}
                      </Button>
                    ) : null}
                    {!isComplete && !isPickup ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        className={cn(
                          dashboardControlClass,
                          "h-8 rounded-lg px-3 text-[12px]"
                        )}
                        onClick={() =>
                          void markShipmentFulfilled(shipment.id, "delivered")
                        }
                      >
                        {saving ? "Saving…" : "Mark delivered"}
                      </Button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeShipment(shipment.id)}
                      className="rounded-lg p-2 text-[#8a8a8a] transition-colors hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                      aria-label={isPickup ? "Remove pickup" : "Remove shipment"}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  {!isPickup ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Ship to
                      </Label>
                      <Select
                        value={selectedLocationId ?? undefined}
                        onValueChange={(value) => {
                          if (value) selectShipmentLocation(shipment.id, value);
                        }}
                      >
                        <SelectTrigger className={shippingSelectClass}>
                          <SelectValue placeholder="Select destination">
                            {shipToLabel}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {customerLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {formatLocationSelectLabel(location)}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom address</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Carrier / method
                      </Label>
                      <Select
                        value={methodKey}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateShipment(shipment.id, {
                            methodKey: value,
                            method: shippingMethodLabel(value),
                          });
                        }}
                      >
                        <SelectTrigger className={shippingSelectClass}>
                          <SelectValue>
                            {shippingMethodLabel(methodKey)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SHIPPING_METHODS.filter(
                            (method) => method.key !== WILL_CALL_METHOD_KEY
                          ).map((method) => (
                            <SelectItem key={method.key} value={method.key}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  ) : (
                    <div
                      className={cn(
                        dashboardInsetSurfaceClass,
                        "flex items-start gap-3 px-4 py-3"
                      )}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
                      <div>
                        <p className="text-[13px] font-semibold text-[#303030]">
                          Customer pickup at shop
                        </p>
                        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                          No ship-to address needed — assign which pieces the
                          customer takes on this visit.
                        </p>
                      </div>
                    </div>
                  )}

                  {!isPickup && isCustom ? (
                    <div className="grid gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Attention
                        </Label>
                        <Input
                          value={shipment.address?.attention ?? ""}
                          onChange={(event) =>
                            updateShipmentAddress(shipment.id, {
                              attention: event.target.value,
                            })
                          }
                          placeholder="Receiving contact"
                          className={shippingControlClass}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Address line 1
                        </Label>
                        <Input
                          value={shipment.address?.line1 ?? ""}
                          onChange={(event) =>
                            updateShipmentAddress(shipment.id, {
                              line1: event.target.value,
                            })
                          }
                          className={shippingControlClass}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Address line 2
                        </Label>
                        <Input
                          value={shipment.address?.line2 ?? ""}
                          onChange={(event) =>
                            updateShipmentAddress(shipment.id, {
                              line2: event.target.value,
                            })
                          }
                          className={shippingControlClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          City
                        </Label>
                        <Input
                          value={shipment.address?.city ?? ""}
                          onChange={(event) =>
                            updateShipmentAddress(shipment.id, {
                              city: event.target.value,
                            })
                          }
                          className={shippingControlClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          State
                        </Label>
                        <Select
                          value={shipment.address?.state || null}
                          onValueChange={(value) =>
                            updateShipmentAddress(shipment.id, {
                              state: value ?? "",
                            })
                          }
                        >
                          <SelectTrigger className={shippingSelectClass}>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Postal code
                        </Label>
                        <Input
                          value={shipment.address?.postalCode ?? ""}
                          onChange={(event) =>
                            updateShipmentAddress(shipment.id, {
                              postalCode: event.target.value,
                            })
                          }
                          className={shippingControlClass}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "grid gap-3",
                      isPickup ? "sm:grid-cols-1" : "sm:grid-cols-3"
                    )}
                  >
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Status
                      </Label>
                      <Select
                        value={shipment.status}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateShipment(shipment.id, {
                            status: value as Shipment["status"],
                          });
                        }}
                      >
                        <SelectTrigger className={shippingSelectClass}>
                          <SelectValue>
                            {
                              statusOptions.find(
                                (option) => option.value === shipment.status
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!isPickup ? (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Tracking
                        </Label>
                        <Input
                          value={shipment.trackingNumber ?? ""}
                          onChange={(event) =>
                            updateShipment(shipment.id, {
                              trackingNumber: event.target.value,
                            })
                          }
                          placeholder="Optional"
                          className={shippingControlClass}
                        />
                      </div>
                    ) : null}
                    {!isPickup ? (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Handling cost
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                            $
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={shipment.handlingCost ?? ""}
                            onChange={(event) =>
                              updateShipment(shipment.id, {
                                handlingCost: Math.max(
                                  0,
                                  Number(event.target.value) || 0
                                ),
                              })
                            }
                            className={cn(shippingControlClass, "pl-6")}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      {isPickup ? "Pickup notes" : "Handling notes"}
                    </Label>
                    <Textarea
                      value={shipment.handlingNotes ?? ""}
                      onChange={(event) =>
                        updateShipment(shipment.id, {
                          handlingNotes: event.target.value,
                        })
                      }
                      placeholder={
                        isPickup
                          ? "Who picked up, ID checked, cartons…"
                          : "Carton count, blind ship, reference numbers…"
                      }
                      rows={2}
                      className="min-h-[72px] resize-none rounded-lg border-[#e3e3e3]"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-[#616161]" />
                        <p className="text-[13px] font-semibold text-[#303030]">
                          Contents
                        </p>
                      </div>
                      {order.lineItems.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            dashboardControlClass,
                            "h-8 rounded-lg text-[12px]"
                          )}
                          onClick={() => assignRemainingToShipment(shipment.id)}
                        >
                          Assign remaining pieces
                        </Button>
                      ) : null}
                    </div>

                    {order.lineItems.length === 0 ? (
                      <p className={dashboardTaskDetailClass}>
                        Add blanks/garments on the order to assign pieces to
                        this {isPickup ? "pickup" : "shipment"}.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {order.lineItems.map((item) => {
                          const allocation = shipment.allocations?.find(
                            (entry) => entry.lineItemId === item.id
                          );
                          const allocationSizes = sizesForAllocation(
                            order,
                            item,
                            allocation
                          );
                          const inThisShipment = allocationSizes.reduce(
                            (sum, row) => sum + row.quantity,
                            0
                          );
                          const producedForItem =
                            fulfillableItems.find(
                              (entry) => entry.id === item.id
                            ) ?? item;
                          const producedPieceCount =
                            lineItemPieceCount(producedForItem);

                          return (
                            <div
                              key={item.id}
                              className="overflow-hidden rounded-lg border border-[#ebebeb] bg-white"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#303030]">
                                    {formatLineItemLabel(item)}
                                  </p>
                                  <p className="mt-0.5 text-[12px] text-[#616161]">
                                    {producedPieceCount} pieces produced
                                    {producedPieceCount !==
                                    lineItemPieceCount(item)
                                      ? ` · ${lineItemPieceCount(item)} ordered`
                                      : ""}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                                    This {isPickup ? "pickup" : "shipment"}
                                  </p>
                                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#2c6ecb]">
                                    {inThisShipment}
                                  </p>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-[13px]">
                                  <colgroup>
                                    <col className="w-1/4" />
                                    <col className="w-1/4" />
                                    <col className="w-1/4" />
                                    <col className="w-1/4" />
                                  </colgroup>
                                  <thead>
                                    <tr className="border-b border-[#ebebeb] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                                      <th className="px-4 py-2.5 text-left">
                                        Size
                                      </th>
                                      <th className="px-4 py-2.5 text-left">
                                        Produced
                                      </th>
                                      <th className="px-4 py-2.5 text-left">
                                        Available
                                      </th>
                                      <th className="px-4 py-2.5">
                                        <div className="flex justify-end">
                                          <span className="w-14 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                                            {isPickup ? "Pick up" : "Ship here"}
                                          </span>
                                        </div>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {producedForItem.sizes.map((sizeRow) => {
                                      const {
                                        produced: producedQty,
                                        available,
                                        maxShipHere,
                                        shipHere,
                                      } = getShipmentAllocationRow(
                                        order,
                                        item,
                                        shipments,
                                        shipment.id,
                                        sizeRow.size
                                      );

                                      return (
                                        <tr
                                          key={sizeRow.size}
                                          className={cn(
                                            "border-b border-[#ebebeb] last:border-0",
                                            shipHere > 0 && "bg-[#f4f7fd]/40"
                                          )}
                                        >
                                          <td className="px-4 py-3 font-semibold text-[#303030]">
                                            {sizeRow.size}
                                          </td>
                                          <td className="px-4 py-3 tabular-nums text-[#616161]">
                                            {producedQty}
                                          </td>
                                          <td className="px-4 py-3 tabular-nums text-[#616161]">
                                            {available}
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                              <Input
                                                type="number"
                                                min={0}
                                                max={maxShipHere}
                                                value={shipHere || ""}
                                                placeholder="0"
                                                disabled={producedQty === 0}
                                                onChange={(event) =>
                                                  updateAllocationQty(
                                                    shipment.id,
                                                    item.id,
                                                    sizeRow.size,
                                                    Math.max(
                                                      0,
                                                      parseInt(
                                                        event.target.value,
                                                        10
                                                      ) || 0
                                                    )
                                                  )
                                                }
                                                className="h-9 w-14 rounded-lg border-[#e3e3e3] px-2 text-center text-[13px] tabular-nums [-moz-appearance:textfield] disabled:bg-[#f6f6f7] disabled:text-[#8a8a8a] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-[#fafafa]">
                                      <td
                                        colSpan={3}
                                        className="px-4 py-2.5 text-left text-[12px] font-medium text-[#616161]"
                                      >
                                        Total for this garment
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex justify-end">
                                          <span className="w-14 text-center text-[13px] font-semibold tabular-nums text-[#303030]">
                                            {inThisShipment}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <ShippingSaveBar
                    willCallMode={willCallMode}
                    saving={saving}
                    isDirty={isDirty}
                    savedFlash={savedFlash}
                    onSave={() => {
              void handleSave();
            }}
                    className="border-t border-[#ebebeb] pt-4"
                  />
                </div>
              </section>
            );
          })}

          <div className="flex flex-wrap gap-2">
            {willCallMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    dashboardControlClass,
                    "h-10 border-dashed sm:w-auto"
                  )}
                  onClick={addShipment}
                >
                  <Plus className="size-3.5" />
                  Add another pickup
                </Button>
                {unallocatedPieces > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      dashboardControlClass,
                      "h-10 border-dashed sm:w-auto"
                    )}
                    onClick={addPickupAll}
                  >
                    <Package className="size-3.5" />
                    Re-plan pickup all
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className={cn(
                  dashboardControlClass,
                  "h-10 w-full justify-center border-dashed sm:w-auto"
                )}
                onClick={addShipment}
              >
                <Plus className="size-3.5" />
                Add another shipment
              </Button>
            )}
          </div>

          <ShippingSaveBar
            willCallMode={willCallMode}
            saving={saving}
            isDirty={isDirty}
            savedFlash={savedFlash}
            onSave={() => {
              void handleSave();
            }}
            className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-4 py-3"
          />
        </div>
      )}

      {readyToInvoice ? (
        <section
          className={cn(
            dashboardCardClass,
            "border-[#86d4a8] bg-gradient-to-r from-[#e8f5ee] to-[#f6fbf5]"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[14px] font-semibold text-[#0d5c2e]">
                All goods {willCallMode ? "picked up" : "delivered"}
              </p>
              <p className="mt-0.5 text-[13px] text-[#303030]">
                Every piece is assigned and fulfillment is complete. Marking
                the last pickup or delivery automatically sets the order to
                Ready to invoice.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <OrderShippingSwitchDialog
        open={switchDialog !== null}
        switchInfo={switchDialog}
        onOpenChange={(open) => {
          if (!open) setSwitchDialog(null);
        }}
        onConfirmClear={confirmSwitchClear}
        onConfirmConvert={confirmSwitchConvert}
      />

      <OrderShippingDeleteDialog
        open={deleteTarget !== null}
        shipment={deleteTarget}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmRemoveShipment}
      />

      {!willCallMode && handlingTotal > 0 ? (
        <section className={cn(dashboardInsetSurfaceClass, "rounded-lg px-4 py-3")}>
          <p className="text-[12px] text-[#616161]">
            Total handling across shipments:{" "}
            <span className="font-semibold text-[#303030]">
              {formatCurrency(handlingTotal)}
            </span>
          </p>
        </section>
      ) : null}
    </div>
  );
}
