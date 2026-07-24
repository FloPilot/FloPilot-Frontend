"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { CustomerBrandMarkFromRecord } from "@/components/customers/customer-brand-mark";
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
import { Textarea } from "@/components/ui/textarea";
import { createClientStore } from "@/lib/api";
import type { ClientStore } from "@/lib/client-stores";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Customer" },
  { id: 2, label: "Store details" },
] as const;

const fieldClassName =
  "h-10 rounded-lg border-[#e3e3e3] bg-white text-[13px] text-[#303030] shadow-none focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/15";

export function CreateStoreDialog({
  open,
  onOpenChange,
  onCreated,
  presetCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (store: ClientStore) => void;
  presetCustomerId?: string;
}) {
  const { getIdToken } = useAuth();
  const { customers } = useSchedule();
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState(presetCustomerId || "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCustomerId(presetCustomerId || "");
    setCustomerQuery("");
    setName("");
    setHeadline("");
    setDescription("");
    setError(null);
  }, [open, presetCustomerId]);

  const activeCustomers = useMemo(
    () => (customers || []).filter((customer) => !customer.archivedAt),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const list = !q
      ? activeCustomers
      : activeCustomers.filter((customer) => {
          const haystack = [
            customer.company,
            customer.name,
            customer.firstName,
            customer.lastName,
            customer.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
    return list.slice(0, 12);
  }, [activeCustomers, customerQuery]);

  const selectedCustomer = activeCustomers.find((c) => c.id === customerId);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setError(null);
    const customer = activeCustomers.find((c) => c.id === id);
    if (!customer) return;
    const company = customer.company || customer.name || "Client";
    setName(`${company} gear`);
    setHeadline(`Official ${company} apparel`);
  };

  const goToDetails = () => {
    if (!customerId) {
      setError("Select a customer to continue.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCreate = async () => {
    if (!customerId) {
      setError("Select a customer for this store.");
      return;
    }
    if (!name.trim()) {
      setError("Give the store a name.");
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await createClientStore(token, {
        customerId,
        name: name.trim(),
        headline: headline.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (!res.store?.id) {
        throw new Error("Store was created but no id was returned.");
      }
      onCreated(res.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,680px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-6 pb-4 pt-6 text-left sm:px-7">
          <DialogTitle className="pr-8 text-xl font-semibold tracking-tight text-[#121a2e]">
            New client store
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-[#5a6478]">
            {step === 1
              ? "Start from a customer so branding and contact details come along."
              : "Name the store and add a short pitch your client’s team will see."}
          </DialogDescription>

          <div className="mt-5 flex items-center gap-2">
            {STEPS.map((item, index) => {
              const active = step === item.id;
              const done = step > item.id;
              return (
                <div key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div
                      className={cn(
                        "h-1 w-full rounded-full transition-colors",
                        done || active ? "bg-brand-primary" : "bg-[#ebebeb]"
                      )}
                    />
                    <span
                      className={cn(
                        "truncate text-[11px] font-medium",
                        active || done ? "text-[#303030]" : "text-[#8a8a8a]"
                      )}
                    >
                      {index + 1}. {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          {step === 1 ? (
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="store-customer-search"
                  className="text-[13px] font-medium text-[#303030]"
                >
                  Customer
                </Label>
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                  <Input
                    id="store-customer-search"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search by company, name, or email…"
                    className={cn(fieldClassName, "pl-9")}
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#fafafa]">
                <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-1.5">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-10 text-center text-[13px] text-[#8a8a8a]">
                      No customers match that search.
                    </p>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const selected = customer.id === customerId;
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            selected
                              ? "bg-white ring-1 ring-brand-primary/25 shadow-[0_1px_2px_rgba(26,26,26,0.06)]"
                              : "hover:bg-white/90"
                          )}
                        >
                          <CustomerBrandMarkFromRecord
                            customer={customer}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#303030]">
                              {customer.company || customer.name}
                            </p>
                            <p className="truncate text-[12px] text-[#8a8a8a]">
                              {[customer.name, customer.email]
                                .filter(Boolean)
                                .join(" · ") || "No contact"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                              selected
                                ? "border-brand-primary bg-brand-primary text-white"
                                : "border-[#d4d4d8] bg-white"
                            )}
                          >
                            {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedCustomer ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3">
                  <CustomerBrandMarkFromRecord
                    customer={selectedCustomer}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#303030]">
                      {selectedCustomer.company || selectedCustomer.name}
                    </p>
                    <p className="text-[12px] text-[#8a8a8a]">
                      Logo and accent color will carry into the store
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0 px-2 text-[12px] font-medium text-[#616161] hover:bg-white hover:text-[#303030]"
                    onClick={() => setStep(1)}
                    disabled={saving}
                  >
                    Change
                  </Button>
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="store-name"
                    className="text-[13px] font-medium text-[#303030]"
                  >
                    Store name
                  </Label>
                  <Input
                    id="store-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Grace Church spring gear"
                    className={cn(fieldClassName, "mt-1.5")}
                    autoFocus
                  />
                </div>
                <div>
                  <Label
                    htmlFor="store-headline"
                    className="text-[13px] font-medium text-[#303030]"
                  >
                    Headline
                  </Label>
                  <Input
                    id="store-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Order your team apparel"
                    className={cn(fieldClassName, "mt-1.5")}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="store-description"
                    className="text-[13px] font-medium text-[#303030]"
                  >
                    Short description
                    <span className="ml-1 font-normal text-[#8a8a8a]">
                      Optional
                    </span>
                  </Label>
                  <Textarea
                    id="store-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dates, sizing notes, or how fulfillment works."
                    className="mt-1.5 min-h-[96px] rounded-lg border-[#e3e3e3] bg-white text-[13px] text-[#303030] shadow-none focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
                  />
                </div>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-[#e3e3e3] bg-white px-4 text-[13px] font-medium text-[#303030] hover:bg-white hover:text-[#121a2e]"
            disabled={saving}
            onClick={() => {
              if (step === 2) {
                setError(null);
                setStep(1);
                return;
              }
              onOpenChange(false);
            }}
          >
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          {step === 1 ? (
            <Button
              type="button"
              className="h-10 rounded-lg bg-brand-primary px-4 text-[13px] font-medium text-white hover:bg-brand-primary/90 disabled:opacity-40"
              disabled={!customerId}
              onClick={goToDetails}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10 rounded-lg bg-brand-primary px-4 text-[13px] font-medium text-white hover:bg-brand-primary/90"
              disabled={saving || !name.trim()}
              onClick={() => void handleCreate()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Create draft
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
