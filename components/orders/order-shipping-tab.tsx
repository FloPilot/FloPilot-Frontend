"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";
import { CustomerShippingLocationsSection } from "@/components/customers/customer-shipping-locations-section";
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
import { lineItemPieceCount } from "@/lib/line-items";
import {
  buildAllocationsFromRemaining,
  buildShipmentDestinationLabel,
  createEmptyShipment,
  formatLineItemLabel,
  formatLocationSelectLabel,
  formatShipmentDestination,
  getRemainingQty,
  getShipmentAllocationRow,
  getUnallocatedPieceCount,
  locationById,
  normalizeShipmentForSave,
  orderShippingPieceCount,
  resolveCustomerShippingLocations,
  resolveShipToSelectLabel,
  SHIPMENT_STATUS_OPTIONS,
  shipmentPieceCount,
  shippingMethodLabel,
  sizesForAllocation,
  totalHandlingCost,
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

export function OrderShippingTab({ order }: { order: Order }) {
  const { customers, updateOrderShipments, updateCustomer } = useSchedule();
  const customer = customers.find((entry) => entry.id === order.customerId);
  const customerLocations = useMemo(
    () => resolveCustomerShippingLocations(customer),
    [customer]
  );

  const [shipments, setShipments] = useState<Shipment[]>(order.shipments ?? []);
  const [settings, setSettings] = useState<OrderShippingSettings>(
    order.shipping ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setShipments(order.shipments ?? []);
    setSettings(order.shipping ?? {});
  }, [order.id, order.shipments, order.shipping]);

  const totalPieces = orderShippingPieceCount(order);
  const unallocatedPieces = getUnallocatedPieceCount(order, shipments);
  const allocatedPieces = totalPieces - unallocatedPieces;
  const handlingTotal = totalHandlingCost(shipments);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(shipments) !== JSON.stringify(order.shipments ?? []) ||
      JSON.stringify(settings) !== JSON.stringify(order.shipping ?? {})
    );
  }, [shipments, settings, order.shipments, order.shipping]);

  const handleSave = async () => {
    setSaving(true);
    setSavedFlash(false);
    try {
      const normalized = shipments.map(normalizeShipmentForSave);
      await updateOrderShipments(order.id, normalized, {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addShipment = () => {
    setShipments((current) => [
      ...current,
      createEmptyShipment(order, customerLocations, settings),
    ]);
  };

  const updateShipment = (shipmentId: string, patch: Partial<Shipment>) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === shipmentId ? { ...shipment, ...patch } : shipment
      )
    );
  };

  const removeShipment = (shipmentId: string) => {
    setShipments((current) => current.filter((entry) => entry.id !== shipmentId));
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

        const remaining = getRemainingQty(lineItem, current, shipmentId);
        const orderedQty =
          lineItem.sizes.find((row) => row.size === size)?.quantity ?? 0;
        const maxQty = Math.min(
          orderedQty,
          remaining.get(size) ?? 0
        );
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
              Plan one or more shipments, split blanks/garments across customer
              locations, and track handling costs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savedFlash ? (
              <span className="text-[12px] font-medium text-emerald-700">
                Saved
              </span>
            ) : null}
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save shipping
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Default carrier
                </Label>
                <Select
                  value={settings.defaultMethodKey ?? SHIPPING_METHODS[0].key}
                  onValueChange={(value) => {
                    if (!value) return;
                    setSettings((current) => ({
                      ...current,
                      defaultMethodKey: value,
                    }));
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

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Allocation
                </Label>
                <div className={cn(shippingControlClass, "cursor-default hover:bg-white")}>
                  <span className="truncate text-[13px] font-medium text-[#303030]">
                    {allocatedPieces} / {totalPieces} pieces assigned
                  </span>
                  {unallocatedPieces > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-800">
                      {unallocatedPieces} open
                    </span>
                  ) : totalPieces > 0 ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-700">
                      Fully assigned
                    </span>
                  ) : (
                    <span className="shrink-0 text-[12px] text-[#8a8a8a]">—</span>
                  )}
                </div>
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
                className="min-h-[88px] resize-none rounded-lg border-[#e3e3e3]"
              />
            </div>
          </div>

          {customer ? (
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
            <Truck className="size-5" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-[#303030]">
            No shipments planned yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-md", dashboardTaskDetailClass)}>
            Add a shipment for each destination — assign specific
            blanks/garments when the order splits across stores or offices.
          </p>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "mt-4 rounded-lg")}
            onClick={addShipment}
          >
            <Plus className="size-3.5" />
            Add shipment
          </Button>
        </section>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const selectedLocationId =
              shipment.customerLocationId ??
              (shipment.address ? "custom" : undefined);
            const isCustom = selectedLocationId === "custom";
            const shipToLabel = resolveShipToSelectLabel(
              selectedLocationId,
              customerLocations,
              shipment.address
            );
            const methodKey =
              shipment.methodKey ??
              SHIPPING_METHODS.find((method) => method.label === shipment.method)
                ?.key ??
              SHIPPING_METHODS[0].key;

            return (
              <section key={shipment.id} className={dashboardCardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={shipment.label ?? ""}
                      onChange={(event) =>
                        updateShipment(shipment.id, { label: event.target.value })
                      }
                      placeholder="Shipment label"
                      className="h-9 max-w-sm rounded-lg border-[#e3e3e3] text-[13px] font-semibold"
                    />
                    <p className={dashboardTaskDetailClass}>
                      {formatShipmentDestination(shipment)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#f4f7fd] px-2.5 py-1 text-[11px] font-semibold text-[#2c6ecb]">
                      {shipmentPieceCount(shipment)} pcs
                    </span>
                    <button
                      type="button"
                      onClick={() => removeShipment(shipment.id)}
                      className="rounded-lg p-2 text-[#8a8a8a] transition-colors hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                      aria-label="Remove shipment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
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
                          {SHIPPING_METHODS.map((method) => (
                            <SelectItem key={method.key} value={method.key}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isCustom ? (
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

                  <div className="grid gap-3 sm:grid-cols-3">
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
                              SHIPMENT_STATUS_OPTIONS.find(
                                (option) => option.value === shipment.status
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SHIPMENT_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Handling notes
                    </Label>
                    <Textarea
                      value={shipment.handlingNotes ?? ""}
                      onChange={(event) =>
                        updateShipment(shipment.id, {
                          handlingNotes: event.target.value,
                        })
                      }
                      placeholder="Carton count, blind ship, reference numbers…"
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
                        this shipment.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {order.lineItems.map((item) => {
                          const allocation = shipment.allocations?.find(
                            (entry) => entry.lineItemId === item.id
                          );
                          const allocationSizes = sizesForAllocation(
                            item,
                            allocation
                          );
                          const inThisShipment = allocationSizes.reduce(
                            (sum, row) => sum + row.quantity,
                            0
                          );

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
                                    {lineItemPieceCount(item)} pieces on order
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                                    This shipment
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
                                        Ordered
                                      </th>
                                      <th className="px-4 py-2.5 text-left">
                                        Available
                                      </th>
                                      <th className="px-4 py-2.5">
                                        <div className="flex justify-end">
                                          <span className="w-14 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                                            Ship here
                                          </span>
                                        </div>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.sizes.map((sizeRow) => {
                                      const {
                                        ordered,
                                        available,
                                        maxShipHere,
                                        shipHere,
                                      } = getShipmentAllocationRow(
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
                                            {ordered}
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
                                                disabled={ordered === 0}
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
                </div>
              </section>
            );
          })}

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
        </div>
      )}

      {handlingTotal > 0 ? (
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
