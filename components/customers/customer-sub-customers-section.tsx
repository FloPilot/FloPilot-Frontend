"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
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
} from "@/lib/order-shipping";
import {
  createSubCustomerId,
  MAX_SUB_CUSTOMERS,
  sortSubCustomers,
  subCustomerLocationCount,
  subCustomerSummary,
} from "@/lib/sub-customers";
import type { Customer, CustomerShippingLocation, SubCustomer } from "@/types";
import { cn } from "@/lib/utils";

type SubCustomerDraft = Omit<SubCustomer, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

type LocationDraft = Omit<CustomerShippingLocation, "id"> & { id?: string };

function emptySubCustomerDraft(): SubCustomerDraft {
  return {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    notes: "",
    warehousesAtParent: false,
    shippingLocations: [],
  };
}

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

function sortLocations(locations: CustomerShippingLocation[]) {
  return [...locations].sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return (a.label ?? "").localeCompare(b.label ?? "");
    }
    return a.isDefault ? -1 : 1;
  });
}

function SubCustomerLocationEditor({
  locations,
  onChange,
}: {
  locations: CustomerShippingLocation[];
  onChange: (next: CustomerShippingLocation[]) => void;
}) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null
  );
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(
    emptyLocationDraft()
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  const openNewLocation = () => {
    setEditingLocationId(null);
    setLocationDraft(emptyLocationDraft());
    setLocationError(null);
    setLocationDialogOpen(true);
  };

  const openEditLocation = (location: CustomerShippingLocation) => {
    setEditingLocationId(location.id);
    setLocationDraft({ ...location });
    setLocationError(null);
    setLocationDialogOpen(true);
  };

  const saveLocation = () => {
    const nextLocation: CustomerShippingLocation = {
      id: editingLocationId ?? createCustomerLocationId(),
      label: locationDraft.label?.trim() || "Ship-to location",
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
      setLocationError("Address line 1, city, and state are required.");
      return;
    }

    const withoutEdited = editingLocationId
      ? locations.filter((entry) => entry.id !== editingLocationId)
      : locations;
    const clearedDefaults = locationDraft.isDefault
      ? withoutEdited.map((entry) => ({ ...entry, isDefault: false }))
      : withoutEdited;

    onChange(sortLocations([...clearedDefaults, nextLocation]));
    setLocationDialogOpen(false);
    setLocationDraft(emptyLocationDraft());
    setEditingLocationId(null);
    setLocationError(null);
  };

  const deleteLocation = (locationId: string) => {
    onChange(locations.filter((entry) => entry.id !== locationId));
    setLocationDialogOpen(false);
    setEditingLocationId(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-[#303030]">
            Ship-to locations
          </p>
          <p className="text-[11px] text-[#8a8a8a]">
            Direct ship addresses for this business.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn(dashboardControlClass, "h-8 text-[12px]")}
          onClick={openNewLocation}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-4 text-center text-[12px] text-[#616161]">
          No locations yet. Add a store, jobsite, or office address if goods ship
          directly to this business.
        </p>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => openEditLocation(location)}
              className="flex w-full items-start justify-between gap-2 rounded-lg border border-[#ebebeb] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] font-semibold text-[#303030]">
                    {location.label}
                  </p>
                  {location.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7fd] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                      <Star className="size-2.5 fill-current" />
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#616161]">
                  {formatShippingAddress(location)}
                </p>
              </div>
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[#8a8a8a]" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="flex max-h-[min(85vh,640px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingLocationId ? "Edit location" : "Add location"}
            </DialogTitle>
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
                placeholder="Store, jobsite, HQ"
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
            <label className="flex items-center gap-2 text-[12px] text-[#303030]">
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
              Default for this business
            </label>
            {locationError ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
                {locationError}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            {editingLocationId ? (
              <Button
                type="button"
                variant="ghost"
                className="text-[#8f1f1f] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                onClick={() => deleteLocation(editingLocationId)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                onClick={saveLocation}
              >
                Save location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CustomerSubCustomersSection({
  customer,
  onSave,
  className,
}: {
  customer: Customer;
  onSave: (subCustomers: SubCustomer[]) => Promise<void>;
  className?: string;
}) {
  const savedSubCustomers = useMemo(
    () => sortSubCustomers(customer.subCustomers ?? []),
    [customer.subCustomers]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SubCustomerDraft>(emptySubCustomerDraft());
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const atLimit = savedSubCustomers.length >= MAX_SUB_CUSTOMERS;

  const openNew = () => {
    setEditingId(null);
    setDraft(emptySubCustomerDraft());
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: SubCustomer) => {
    setEditingId(entry.id);
    setDraft({
      id: entry.id,
      name: entry.name,
      contactName: entry.contactName ?? "",
      email: entry.email ?? "",
      phone: entry.phone ?? "",
      notes: entry.notes ?? "",
      warehousesAtParent: entry.warehousesAtParent ?? false,
      shippingLocations: entry.shippingLocations ?? [],
    });
    setDraftError(null);
    setDialogOpen(true);
  };

  const persist = async (next: SubCustomer[]) => {
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const name = draft.name.trim();
    if (!name) {
      setDraftError("Business name is required.");
      return;
    }

    const now = new Date().toISOString();
    const nextEntry: SubCustomer = {
      id: editingId ?? createSubCustomerId(),
      name,
      contactName: draft.contactName?.trim() || undefined,
      email: draft.email?.trim() || undefined,
      phone: draft.phone?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      warehousesAtParent: draft.warehousesAtParent,
      shippingLocations: sortLocations(draft.shippingLocations ?? []),
      createdAt: editingId
        ? savedSubCustomers.find((entry) => entry.id === editingId)?.createdAt ??
          now
        : now,
      updatedAt: now,
    };

    const withoutEdited = editingId
      ? savedSubCustomers.filter((entry) => entry.id !== editingId)
      : savedSubCustomers;

    if (!editingId && withoutEdited.length >= MAX_SUB_CUSTOMERS) {
      setDraftError(`You can add up to ${MAX_SUB_CUSTOMERS} businesses.`);
      return;
    }

    await persist(sortSubCustomers([...withoutEdited, nextEntry]));
    setDialogOpen(false);
    setDraft(emptySubCustomerDraft());
    setEditingId(null);
    setDraftError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await persist(
        savedSubCustomers.filter((entry) => entry.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className={cn(dashboardCardClass, className)}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
              <Users className="size-4 text-[#2c6ecb]" />
              End businesses
            </h2>
            <p className={cn("mt-1 max-w-xl", dashboardTaskDetailClass)}>
              For brokers and contractors — track the brands or businesses this
              account orders for, each with their own ship-to addresses.
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#8a8a8a]">
              {savedSubCustomers.length} of {MAX_SUB_CUSTOMERS} added
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")}
            onClick={openNew}
            disabled={atLimit}
          >
            <Plus className="size-3.5" />
            Add business
          </Button>
        </div>

        <div className="space-y-2 p-4 sm:p-5">
          {savedSubCustomers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
              <Building2 className="mx-auto size-8 text-[#c9c9c9]" />
              <p className="mt-3 text-[13px] font-medium text-[#303030]">
                No end businesses yet
              </p>
              <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
                Add the companies or brands this customer places orders for. You
                can tag orders to a specific business when creating them.
              </p>
            </div>
          ) : (
            savedSubCustomers.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEdit(entry)}
                className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#303030]">
                      {entry.name}
                    </p>
                    {entry.warehousesAtParent ? (
                      <span className="rounded-full bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                        Parent warehouse
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-[#616161]">
                    {subCustomerSummary(entry)}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#8a8a8a]">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-[#8a8a8a]">
                  {subCustomerLocationCount(entry) > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {subCustomerLocationCount(entry)}
                    </span>
                  ) : null}
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingId ? "Edit end business" : "Add end business"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Saved under {customer.company}. Tag orders to this business when
              you create them.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Business name
              </Label>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Acme Construction · West region"
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Contact name
                </Label>
                <Input
                  value={draft.contactName ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      contactName: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Phone
                </Label>
                <Input
                  value={draft.phone ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Email
              </Label>
              <Input
                type="email"
                value={draft.email ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Notes
              </Label>
              <textarea
                value={draft.notes ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Internal notes about this business (optional)"
                className="w-full resize-none rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 text-[13px] text-[#303030] outline-none focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/15"
              />
            </div>

            <label
              className={cn(
                dashboardInsetSurfaceClass,
                "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3"
              )}
            >
              <input
                type="checkbox"
                checked={Boolean(draft.warehousesAtParent)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    warehousesAtParent: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-[#c9c9c9]"
              />
              <span>
                <span className="block text-[13px] font-medium text-[#303030]">
                  Can ship from parent warehouse
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-[#616161]">
                  When checked, orders for this business can also use{" "}
                  {customer.company}&apos;s saved ship-to locations — useful when
                  the broker holds inventory.
                </span>
              </span>
            </label>

            <SubCustomerLocationEditor
              locations={draft.shippingLocations ?? []}
              onChange={(shippingLocations) =>
                setDraft((current) => ({ ...current, shippingLocations }))
              }
            />

            {draftError ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {draftError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                className="text-[#8f1f1f] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                disabled={saving || deleting}
                onClick={() => {
                  const entry = savedSubCustomers.find(
                    (item) => item.id === editingId
                  );
                  if (entry) setDeleteTarget(entry);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete business
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                disabled={saving}
                onClick={() => void saveDraft()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save business
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Existing orders tagged to this business will keep their label, but
              you won&apos;t be able to select it on new orders.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#b42318] text-white hover:bg-[#912018]"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
