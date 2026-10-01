"use client";

import { useMemo, useState } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import {
  OrderHeaderCombo,
  OrderHeaderField,
} from "@/components/orders/order-header-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  LabeledSelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/lib/customers";
import {
  appendCustomerShippingLocation,
  buildAddressSelection,
  buildBillToOptions,
  buildShipToOptions,
  orderHeaderComboTriggerClass,
  orderHeaderSelectContentClass,
} from "@/lib/order-addresses";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardSelectContentClass,
  dashboardSelectItemClass,
} from "@/lib/dashboard-styles";
import type {
  Customer,
  CustomerShippingLocation,
  Order,
  OrderAddressSelection,
  ShippingAddress,
} from "@/types";
import { cn } from "@/lib/utils";

type AddressPurpose = "bill_to" | "ship_to";

type AddressDraft = {
  label: string;
  attention: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const NONE_VALUE = "none";

function emptyDraft(): AddressDraft {
  return {
    label: "",
    attention: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    isDefault: false,
  };
}

function AddressOptionRows({
  options,
}: {
  options: { value: string; label: string; detail?: string }[];
}) {
  return (
    <>
      {options.map((item) => (
        <SelectItem
          key={item.value}
          value={item.value}
          className={cn(dashboardSelectItemClass, "items-start py-2")}
        >
          <span className="block whitespace-normal break-words leading-snug">
            {item.label}
          </span>
          {item.detail ? (
            <span className="mt-0.5 block whitespace-normal break-words text-[11px] font-normal leading-snug text-[#8a8a8a]">
              {item.detail}
            </span>
          ) : null}
        </SelectItem>
      ))}
    </>
  );
}

export function OrderAddressEditors({
  order,
  customer,
  billTo,
  shipTo,
  onBillToChange,
  onShipToChange,
  onCustomerLocationsSave,
  onPersistAddresses,
  className,
}: {
  order: Pick<Order, "id" | "subCustomerId">;
  customer?: Customer | null;
  billTo?: OrderAddressSelection | null;
  shipTo?: OrderAddressSelection | null;
  onBillToChange: (next: OrderAddressSelection | null) => void;
  onShipToChange: (next: OrderAddressSelection | null) => void;
  onCustomerLocationsSave: (
    locations: CustomerShippingLocation[]
  ) => Promise<Customer | void>;
  /** Persist bill/ship selection immediately (used after New address). */
  onPersistAddresses?: (next: {
    billTo?: OrderAddressSelection | null;
    shipTo?: OrderAddressSelection | null;
  }) => Promise<void>;
  className?: string;
}) {
  const scope = { subCustomerId: order.subCustomerId };
  const billOptions = useMemo(
    () => buildBillToOptions(customer, scope),
    [customer, order.subCustomerId]
  );
  const shipOptions = useMemo(
    () => buildShipToOptions(customer, scope),
    [customer, order.subCustomerId]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [purpose, setPurpose] = useState<AddressPurpose>("ship_to");
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always controlled — never pass undefined to Select.
  const billValue = billTo?.locationId || NONE_VALUE;
  const shipValue = shipTo?.locationId || NONE_VALUE;

  const billSelectItems = useMemo(
    () => [
      {
        value: NONE_VALUE,
        label: billOptions.length ? "Select bill-to" : "No billing address",
      },
      ...billOptions.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    ],
    [billOptions]
  );

  const shipSelectItems = useMemo(
    () => [
      { value: NONE_VALUE, label: "Not set" },
      ...shipOptions.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    ],
    [shipOptions]
  );

  const openNewAddress = (nextPurpose: AddressPurpose) => {
    setPurpose(nextPurpose);
    setDraft({
      ...emptyDraft(),
      label: nextPurpose === "bill_to" ? "Billing address" : "Ship-to location",
      isDefault: nextPurpose === "ship_to" && shipOptions.length === 0,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleBillChange = (value: string | null) => {
    if (!value || value === NONE_VALUE) {
      onBillToChange(null);
      return;
    }
    onBillToChange(buildAddressSelection(value, billOptions));
  };

  const handleShipChange = (value: string | null) => {
    if (!value || value === NONE_VALUE) {
      onShipToChange(null);
      return;
    }
    onShipToChange(buildAddressSelection(value, shipOptions));
  };

  const saveNewAddress = async () => {
    if (!customer) {
      setError("Load the customer before adding an address.");
      return;
    }
    if (!draft.line1.trim() || !draft.city.trim() || !draft.state.trim()) {
      setError("Address line 1, city, and state are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextLocations = appendCustomerShippingLocation(
        customer.shippingLocations,
        draft
      );
      const created = nextLocations[nextLocations.length - 1]!;
      await onCustomerLocationsSave(nextLocations);

      const snapshot: ShippingAddress = { ...created };
      const selection: OrderAddressSelection = {
        locationId: created.id,
        address: snapshot,
      };
      if (purpose === "bill_to") {
        onBillToChange(selection);
        await onPersistAddresses?.({
          billTo: selection,
          shipTo: shipTo ?? null,
        });
      } else {
        onShipToChange(selection);
        await onPersistAddresses?.({
          billTo: billTo ?? null,
          shipTo: selection,
        });
      }

      setModalOpen(false);
      setDraft(emptyDraft());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this address."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={cn("contents", className)}>
        <OrderHeaderField label="Bill to">
          <OrderHeaderCombo
            onAdd={() => openNewAddress("bill_to")}
            addLabel="Add bill-to address"
            addDisabled={!customer}
          >
            <Select
              value={billValue}
              onValueChange={(value) => handleBillChange(value)}
            >
              <SelectTrigger
                id={`order-bill-to-${order.id}`}
                className={orderHeaderComboTriggerClass}
              >
                <LabeledSelectValue
                  value={billValue}
                  options={billSelectItems}
                  placeholder="Select bill-to"
                />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className={orderHeaderSelectContentClass}
              >
                <SelectItem
                  value={NONE_VALUE}
                  className={dashboardSelectItemClass}
                >
                  {billOptions.length ? "Select bill-to" : "No billing address"}
                </SelectItem>
                <AddressOptionRows options={billOptions} />
              </SelectContent>
            </Select>
          </OrderHeaderCombo>
        </OrderHeaderField>

        <OrderHeaderField label="Ship to">
          <OrderHeaderCombo
            onAdd={() => openNewAddress("ship_to")}
            addLabel="Add ship-to address"
            addDisabled={!customer}
          >
            <Select
              value={shipValue}
              onValueChange={(value) => handleShipChange(value)}
            >
              <SelectTrigger
                id={`order-ship-to-${order.id}`}
                className={orderHeaderComboTriggerClass}
              >
                <LabeledSelectValue
                  value={shipValue}
                  options={shipSelectItems}
                  placeholder="Select ship-to"
                />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className={orderHeaderSelectContentClass}
              >
                <SelectItem
                  value={NONE_VALUE}
                  className={dashboardSelectItemClass}
                >
                  Not set
                </SelectItem>
                <AddressOptionRows options={shipOptions} />
              </SelectContent>
            </Select>
          </OrderHeaderCombo>
        </OrderHeaderField>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[#303030]">
              <MapPin className="size-4 text-[#2c6ecb]" />
              {purpose === "bill_to"
                ? "Add bill-to address"
                : "Add ship-to address"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#616161]">
              Saves to {customer?.company || "this customer"}’s address book and
              assigns it on this order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Label
              </Label>
              <Input
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Warehouse, HQ, store…"
                className={cn(dashboardControlClass, "h-9 w-full")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Attention
              </Label>
              <Input
                value={draft.attention}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    attention: event.target.value,
                  }))
                }
                placeholder="Receiving / AP contact"
                className={cn(dashboardControlClass, "h-9 w-full")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Address
              </Label>
              <AddressAutocompleteInput
                value={draft.line1}
                onChange={(line1) =>
                  setDraft((current) => ({ ...current, line1 }))
                }
                onAddressSelect={(parts) =>
                  setDraft((current) => ({
                    ...current,
                    line1: parts.line1 || current.line1,
                    line2: parts.line2 ?? current.line2,
                    city: parts.city || current.city,
                    state: parts.state || current.state,
                    postalCode: parts.postalCode || current.postalCode,
                    country: parts.country || current.country,
                  }))
                }
                tone="dashboard"
                className={cn(dashboardControlClass, "h-9 w-full")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Apt / suite
              </Label>
              <Input
                value={draft.line2}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    line2: event.target.value,
                  }))
                }
                className={cn(dashboardControlClass, "h-9 w-full")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  City
                </Label>
                <Input
                  value={draft.city}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className={cn(dashboardControlClass, "h-9 w-full")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  State
                </Label>
                <Select
                  value={draft.state || NONE_VALUE}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      state: !value || value === NONE_VALUE ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger
                    className={cn(dashboardControlClass, "h-9 w-full")}
                  >
                    <LabeledSelectValue
                      value={draft.state || NONE_VALUE}
                      options={[
                        { value: NONE_VALUE, label: "ST" },
                        ...US_STATES.map((state) => ({
                          value: state.value,
                          label: state.value,
                        })),
                      ]}
                      placeholder="ST"
                    />
                  </SelectTrigger>
                  <SelectContent className={dashboardSelectContentClass}>
                    {US_STATES.map((state) => (
                      <SelectItem
                        key={state.value}
                        value={state.value}
                        className={dashboardSelectItemClass}
                      >
                        {state.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  ZIP
                </Label>
                <Input
                  value={draft.postalCode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                  className={cn(dashboardControlClass, "h-9 w-full")}
                />
              </div>
            </div>

            {purpose === "ship_to" ? (
              <label className="inline-flex items-center gap-2 text-[13px] text-[#303030]">
                <input
                  type="checkbox"
                  checked={draft.isDefault}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="size-3.5 accent-[#2c6ecb]"
                />
                Set as default ship-to on this account
              </label>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              onClick={() => void saveNewAddress()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {saving ? "Saving…" : "Save & assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
