"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { CustomerShippingLocationDeleteDialog } from "@/components/customers/customer-shipping-location-delete-dialog";
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
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/lib/customers";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  createCustomerLocationId,
  formatShippingAddress,
  resolveCustomerShippingLocations,
} from "@/lib/order-shipping";
import type { Customer, CustomerShippingLocation } from "@/types";
import { cn } from "@/lib/utils";

type LocationDraft = Omit<CustomerShippingLocation, "id"> & { id?: string };

function emptyLocationDraft(): LocationDraft {
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

function sortLocations(
  locations: CustomerShippingLocation[]
): CustomerShippingLocation[] {
  return [...locations].sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return (a.label ?? "").localeCompare(b.label ?? "");
    }
    return a.isDefault ? -1 : 1;
  });
}

export function CustomerShippingLocationsSection({
  customer,
  onSave,
  onLocationDeleted,
  variant = "card",
  className,
}: {
  customer: Customer;
  onSave: (locations: CustomerShippingLocation[]) => Promise<void>;
  onLocationDeleted?: (locationId: string) => void;
  variant?: "card" | "compact";
  className?: string;
}) {
  const savedLocations = useMemo(
    () => sortLocations(customer.shippingLocations ?? []),
    [customer.shippingLocations]
  );
  const selectableLocations = useMemo(
    () => resolveCustomerShippingLocations(customer),
    [customer]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null
  );
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(
    emptyLocationDraft()
  );
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CustomerShippingLocation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNewLocation = () => {
    setEditingLocationId(null);
    setLocationDraft(emptyLocationDraft());
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEditLocation = (location: CustomerShippingLocation) => {
    if (location.id === "profile-default") return;
    setEditingLocationId(location.id);
    setLocationDraft({ ...location });
    setDraftError(null);
    setDialogOpen(true);
  };

  const persistLocations = async (nextLocations: CustomerShippingLocation[]) => {
    setSaving(true);
    try {
      await onSave(nextLocations);
    } finally {
      setSaving(false);
    }
  };

  const saveLocationDraft = async () => {
    const trimmedLabel = locationDraft.label?.trim() || "Ship-to location";
    const nextLocation: CustomerShippingLocation = {
      id: editingLocationId ?? createCustomerLocationId(),
      label: trimmedLabel,
      attention: locationDraft.attention?.trim() || undefined,
      line1: locationDraft.line1.trim(),
      line2: locationDraft.line2?.trim() || undefined,
      city: locationDraft.city.trim(),
      state: locationDraft.state.trim(),
      postalCode: locationDraft.postalCode.trim(),
      country: locationDraft.country?.trim() || "US",
      isDefault: locationDraft.isDefault,
    };

    if (!nextLocation.line1 || !nextLocation.city || !nextLocation.state) {
      setDraftError("Address line 1, city, and state are required.");
      return;
    }

    const withoutEdited = editingLocationId
      ? savedLocations.filter((location) => location.id !== editingLocationId)
      : savedLocations;
    const clearedDefaults = locationDraft.isDefault
      ? withoutEdited.map((location) => ({ ...location, isDefault: false }))
      : withoutEdited;
    const nextLocations = sortLocations([...clearedDefaults, nextLocation]);

    await persistLocations(nextLocations);
    setDialogOpen(false);
    setLocationDraft(emptyLocationDraft());
    setEditingLocationId(null);
    setDraftError(null);
  };

  const deleteLocation = async (locationId: string) => {
    setDeleting(true);
    try {
      const nextLocations = savedLocations.filter(
        (location) => location.id !== locationId
      );
      await persistLocations(nextLocations);
      onLocationDeleted?.(locationId);
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingLocationId(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    const location = savedLocations.find((entry) => entry.id === editingLocationId);
    if (location) setDeleteTarget(location);
  };

  const locationList = (
    <div className="space-y-2">
      {savedLocations.length === 0 ? (
        <div
          className={cn(
            "rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-6 text-center",
            variant === "compact" && "py-5"
          )}
        >
          <p className="text-[13px] font-medium text-[#303030]">
            No ship-to locations yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-xs", dashboardTaskDetailClass)}>
            Add warehouses, stores, or offices to reuse when splitting order
            shipments.
          </p>
        </div>
      ) : (
        savedLocations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => openEditLocation(location)}
            className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[#303030]">
                  {location.label}
                </p>
                {location.isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                    <Star className="size-3 fill-current" />
                    Default
                  </span>
                ) : null}
              </div>
              {location.attention ? (
                <p className="mt-1 text-[12px] text-[#616161]">
                  Attn: {location.attention}
                </p>
              ) : null}
              <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
                {formatShippingAddress(location)}
              </p>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
          </button>
        ))
      )}

      {savedLocations.length === 0 &&
      selectableLocations.some((location) => location.id === "profile-default") ? (
        <div className={cn(dashboardInsetSurfaceClass, "rounded-lg px-3 py-2.5")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Profile fallback
          </p>
          <p className="mt-1 text-[12px] text-[#616161]">
            Until you add locations, orders can ship to{" "}
            {customer.company || customer.name}
            {customer.city ? ` · ${customer.city}` : ""}
            {customer.state ? `, ${customer.state}` : ""}.
          </p>
        </div>
      ) : null}
    </div>
  );

  const addButton = (
    <Button
      type="button"
      variant={variant === "card" ? "default" : "outline"}
      className={cn(
        variant === "card"
          ? cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")
          : cn(dashboardControlClass, "h-9 w-full justify-center")
      )}
      onClick={openNewLocation}
    >
      <Plus className="size-3.5" />
      Add location
    </Button>
  );

  return (
    <>
      {variant === "card" ? (
        <section className={cn(dashboardCardClass, className)}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
                <MapPin className="size-4 text-[#2c6ecb]" />
                Shipping locations
              </h2>
              <p className={cn("mt-1", dashboardTaskDetailClass)}>
                Define warehouses, stores, or offices — reused when planning
                split shipments on orders.
              </p>
            </div>
            {addButton}
          </div>
          <div className="p-4 sm:p-5">{locationList}</div>
        </section>
      ) : (
        <aside
          className={cn(
            dashboardInsetSurfaceClass,
            "space-y-3 rounded-lg p-4",
            className
          )}
        >
          <div className="flex items-center gap-2 text-[#303030]">
            <MapPin className="size-4 text-[#2c6ecb]" />
            <p className="text-[13px] font-semibold">Customer locations</p>
          </div>
          <p className={dashboardTaskDetailClass}>
            Saved ship-to addresses for this customer.
          </p>
          {locationList}
          {addButton}
        </aside>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingLocationId ? "Edit ship-to location" : "Add ship-to location"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Saved on {customer.company} for reuse across orders and split
              shipments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Location name
              </Label>
              <Input
                value={locationDraft.label ?? ""}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Warehouse 1, Store #12, HQ"
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Attention
              </Label>
              <Input
                value={locationDraft.attention ?? ""}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    attention: event.target.value,
                  }))
                }
                placeholder="Receiving contact (optional)"
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Address line 1
              </Label>
              <Input
                value={locationDraft.line1}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    line1: event.target.value,
                  }))
                }
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Address line 2
              </Label>
              <Input
                value={locationDraft.line2 ?? ""}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    line2: event.target.value,
                  }))
                }
                placeholder="Suite, unit, dock door (optional)"
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  City
                </Label>
                <Input
                  value={locationDraft.city}
                  onChange={(event) =>
                    setLocationDraft((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  State
                </Label>
                <Select
                  value={locationDraft.state || null}
                  onValueChange={(value) =>
                    setLocationDraft((current) => ({
                      ...current,
                      state: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      dashboardControlClass,
                      "h-9 w-full justify-between"
                    )}
                  >
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Postal code
              </Label>
              <Input
                value={locationDraft.postalCode}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))
                }
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#303030]">
              <input
                type="checkbox"
                checked={Boolean(locationDraft.isDefault)}
                onChange={(event) =>
                  setLocationDraft((current) => ({
                    ...current,
                    isDefault: event.target.checked,
                  }))
                }
                className="size-4 rounded border-[#c9c9c9]"
              />
              Default ship-to for this customer
            </label>

            {draftError ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {draftError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            {editingLocationId ? (
              <Button
                type="button"
                variant="ghost"
                className="text-[#8f1f1f] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                disabled={saving || deleting}
                onClick={openDeleteConfirm}
              >
                <Trash2 className="size-3.5" />
                Delete location
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-lg"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                disabled={saving}
                onClick={saveLocationDraft}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerShippingLocationDeleteDialog
        open={Boolean(deleteTarget)}
        location={deleteTarget}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void deleteLocation(deleteTarget.id);
        }}
      />
    </>
  );
}
