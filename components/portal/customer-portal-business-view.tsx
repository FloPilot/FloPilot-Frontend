"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import {
  fetchCustomerPortalProfile,
  updateCustomerPortalProfile,
  type CustomerPortalProfile,
} from "@/lib/customer-portal-api";
import { US_STATES } from "@/lib/customers";
import {
  dashboardCardClass,
  dashboardSectionTitleClass,
} from "@/lib/dashboard-styles";
import {
  createCustomerLocationId,
  formatShippingAddress,
} from "@/lib/order-shipping";
import type { CustomerShippingLocation } from "@/types";

type LocationDraft = Omit<CustomerShippingLocation, "id"> & { id?: string };

function emptyLocation(): LocationDraft {
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

const inputClass =
  "h-11 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[14px] text-[#303030] outline-none transition-shadow placeholder:text-[#b5b5b5] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/15";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#616161]";

export function CustomerPortalBusinessView() {
  const { token, accent } = useCustomerPortal();
  const [profile, setProfile] = useState<CustomerPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [locations, setLocations] = useState<CustomerShippingLocation[]>([]);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(
    emptyLocation()
  );
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCustomerPortalProfile(token);
        if (cancelled) return;
        if (result.profile) {
          setProfile(result.profile);
          setCompany(result.profile.company);
          setFirstName(result.profile.firstName);
          setLastName(result.profile.lastName);
          setEmail(result.profile.email);
          setPhone(result.profile.phone);
          setCity(result.profile.city);
          setState(result.profile.state);
          setLocations(result.profile.shippingLocations ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load your info."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sortedLocations = useMemo(
    () =>
      [...locations].sort((a, b) => {
        if (a.isDefault === b.isDefault) {
          return (a.label ?? "").localeCompare(b.label ?? "");
        }
        return a.isDefault ? -1 : 1;
      }),
    [locations]
  );

  const openAddLocation = () => {
    setEditingLocationId(null);
    setLocationDraft({
      ...emptyLocation(),
      isDefault: locations.length === 0,
    });
    setLocationError(null);
    setLocationDialogOpen(true);
  };

  const openEditLocation = (location: CustomerShippingLocation) => {
    setEditingLocationId(location.id);
    setLocationDraft({ ...location });
    setLocationError(null);
    setLocationDialogOpen(true);
  };

  const saveLocationDraft = () => {
    const line1 = locationDraft.line1.trim();
    const cityVal = locationDraft.city.trim();
    const stateVal = locationDraft.state.trim();
    const postalCode = locationDraft.postalCode.trim();

    if (!line1 || !cityVal || !stateVal || !postalCode) {
      setLocationError("Street, city, state, and ZIP are required.");
      return;
    }

    const next: CustomerShippingLocation = {
      id: editingLocationId || createCustomerLocationId(),
      label: (locationDraft.label ?? "").trim(),
      attention: (locationDraft.attention ?? "").trim(),
      line1,
      line2: locationDraft.line2?.trim() || "",
      city: cityVal,
      state: stateVal,
      postalCode,
      country: locationDraft.country || "US",
      isDefault: locationDraft.isDefault,
    };

    let nextLocations = editingLocationId
      ? locations.map((loc) => (loc.id === editingLocationId ? next : loc))
      : [...locations, next];

    if (next.isDefault) {
      nextLocations = nextLocations.map((loc) => ({
        ...loc,
        isDefault: loc.id === next.id,
      }));
    } else if (!nextLocations.some((loc) => loc.isDefault) && nextLocations.length) {
      nextLocations = nextLocations.map((loc, index) => ({
        ...loc,
        isDefault: index === 0,
      }));
    }

    setLocations(nextLocations);
    setLocationDialogOpen(false);
  };

  const removeLocation = (id: string) => {
    const next = locations.filter((loc) => loc.id !== id);
    if (next.length && !next.some((loc) => loc.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    setLocations(next);
  };

  const setDefaultLocation = (id: string) => {
    setLocations(
      locations.map((loc) => ({ ...loc, isDefault: loc.id === id }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await updateCustomerPortalProfile(token, {
        company,
        firstName,
        lastName,
        email,
        phone,
        city,
        state,
        shippingLocations: locations,
      });
      setProfile(result.profile);
      setLocations(result.profile.shippingLocations ?? []);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your business info…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={dashboardSectionTitleClass}>Business information</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#616161]">
            Keep your contact details up to date and manage delivery locations
            for your orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="size-4" />
              Saved
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[14px] text-[#8f1f1f]">
          {error}
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Contact details
          </h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Company name</label>
            <input
              className={inputClass}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div>
            <label className={labelClass}>First name</label>
            <input
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <select
              className={inputClass}
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Select state</option>
              {US_STATES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={dashboardCardClass}>
        <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#303030]">
              Delivery locations
            </h2>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              Saved addresses for shipping your orders.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddLocation}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
          >
            <Plus className="size-3.5" />
            Add location
          </button>
        </div>

        {sortedLocations.length === 0 ? (
          <div className="px-4 py-10 text-center sm:px-5">
            <MapPin className="mx-auto size-8 text-[#c4c4c4]" />
            <p className="mt-3 text-[15px] font-medium text-[#303030]">
              No delivery locations yet
            </p>
            <p className="mt-1 text-[14px] text-[#616161]">
              Add an address so your shop knows where to ship.
            </p>
            <button
              type="button"
              onClick={openAddLocation}
              className="mt-4 inline-flex h-10 items-center rounded-lg px-4 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Add your first location
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f1f1]">
            {sortedLocations.map((location) => (
              <div
                key={location.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#303030]">
                      {location.label || "Delivery location"}
                    </p>
                    {location.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f1faf1] px-2 py-0.5 text-[11px] font-semibold text-[#0d5c2e]">
                        <Star className="size-3 fill-current" />
                        Default
                      </span>
                    ) : null}
                  </div>
                  {location.attention ? (
                    <p className="mt-0.5 text-[13px] text-[#616161]">
                      Attn: {location.attention}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
                    {formatShippingAddress(location)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!location.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefaultLocation(location.id)}
                      className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#616161] hover:bg-[#f6f6f7]"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEditLocation(location)}
                    className="flex size-9 items-center justify-center rounded-lg text-[#616161] hover:bg-[#f6f6f7]"
                    aria-label="Edit location"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLocation(location.id)}
                    className="flex size-9 items-center justify-center rounded-lg text-[#8f1f1f] hover:bg-[#fff1f1]"
                    aria-label="Remove location"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {profile ? (
        <p className="text-center text-[12px] text-[#8a8a8a]">
          Changes are shared with {profile.company || profile.name || "your shop"}.
        </p>
      ) : null}

      {locationDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setLocationDialogOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-[#ebebeb] px-5 py-4">
              <h3 className="text-[17px] font-semibold text-[#303030]">
                {editingLocationId ? "Edit location" : "Add location"}
              </h3>
              <p className="mt-1 text-[13px] text-[#616161]">
                Where should orders be delivered?
              </p>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
              {locationError ? (
                <p className="rounded-lg bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                  {locationError}
                </p>
              ) : null}
              <div>
                <label className={labelClass}>Location name (optional)</label>
                <input
                  className={inputClass}
                  value={locationDraft.label}
                  onChange={(e) =>
                    setLocationDraft((d) => ({ ...d, label: e.target.value }))
                  }
                  placeholder="e.g. Main warehouse"
                />
              </div>
              <div>
                <label className={labelClass}>Attention (optional)</label>
                <input
                  className={inputClass}
                  value={locationDraft.attention}
                  onChange={(e) =>
                    setLocationDraft((d) => ({
                      ...d,
                      attention: e.target.value,
                    }))
                  }
                  placeholder="Receiving department"
                />
              </div>
              <div>
                <label className={labelClass}>Street address</label>
                <input
                  className={inputClass}
                  value={locationDraft.line1}
                  onChange={(e) =>
                    setLocationDraft((d) => ({ ...d, line1: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Apt / suite (optional)</label>
                <input
                  className={inputClass}
                  value={locationDraft.line2 || ""}
                  onChange={(e) =>
                    setLocationDraft((d) => ({ ...d, line2: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    value={locationDraft.city}
                    onChange={(e) =>
                      setLocationDraft((d) => ({ ...d, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    className={inputClass}
                    value={locationDraft.state}
                    onChange={(e) =>
                      setLocationDraft((d) => ({
                        ...d,
                        state: e.target.value,
                      }))
                    }
                  >
                    <option value="">State</option>
                    {US_STATES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ZIP</label>
                  <input
                    className={inputClass}
                    value={locationDraft.postalCode}
                    onChange={(e) =>
                      setLocationDraft((d) => ({
                        ...d,
                        postalCode: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[#303030]">
                <input
                  type="checkbox"
                  checked={!!locationDraft.isDefault}
                  onChange={(e) =>
                    setLocationDraft((d) => ({
                      ...d,
                      isDefault: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-[#d4d4d4]"
                />
                Use as default delivery location
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ebebeb] px-5 py-4">
              <button
                type="button"
                onClick={() => setLocationDialogOpen(false)}
                className="h-10 rounded-lg px-4 text-[14px] font-medium text-[#616161] hover:bg-[#f6f6f7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLocationDraft}
                className="h-10 rounded-lg px-5 text-[14px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {editingLocationId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
