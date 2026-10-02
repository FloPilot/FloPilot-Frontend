"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import { CustomerBrandingFields } from "@/components/customers/customer-branding-fields";
import { normalizeAccentPickerValue } from "@/components/customers/customer-accent-picker";
import type { CustomerAccentKey } from "@/lib/production-customer-colors";
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
import { Textarea } from "@/components/ui/textarea";
import {
  billingFieldsFromCustomer,
  buildBillingAddressFromInput,
  US_STATES,
  validateNewCustomer,
  type NewCustomerInput,
} from "@/lib/customers";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import type { CustomerUpdate } from "@/lib/api";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

const inputClassName = cn(
  dashboardControlClass,
  "h-10 w-full justify-start px-3 text-[13px] font-normal text-[#303030] shadow-none hover:bg-white"
);

type EditForm = NewCustomerInput;

function toForm(customer: Customer): EditForm {
  const billing = billingFieldsFromCustomer(customer);
  return {
    company: customer.company ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    ...billing,
    notes: customer.notes ?? "",
  };
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onSave,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: CustomerUpdate) => Promise<unknown>;
}) {
  const [form, setForm] = useState<EditForm>(() => toForm(customer));
  const [logo, setLogo] = useState<string | null>(customer.logoUrl ?? null);
  const [accentColorKey, setAccentColorKey] = useState<CustomerAccentKey | null>(
    () => normalizeAccentPickerValue(customer.accentColorKey)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(customer));
      setLogo(customer.logoUrl ?? null);
      setAccentColorKey(normalizeAccentPickerValue(customer.accentColorKey));
      setError(null);
    }
  }, [open, customer]);

  const updateField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateNewCustomer(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const logoChanged = (logo ?? "") !== (customer.logoUrl ?? "");
      const accentChanged =
        (accentColorKey ?? null) !==
        (normalizeAccentPickerValue(customer.accentColorKey) ?? null);
      const billingAddress = buildBillingAddressFromInput(form);
      await onSave({
        company: form.company.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2?.trim() || "",
        city: billingAddress.city,
        state: billingAddress.state,
        postalCode: billingAddress.postalCode,
        billingAddress,
        notes: form.notes?.trim() || "",
        ...(logoChanged ? { logoUrl: logo ?? null } : {}),
        ...(accentChanged ? { accentColorKey: accentColorKey ?? null } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save customer changes."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-xl p-0 gap-0 overflow-hidden max-h-[min(90vh,720px)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-6 py-4 text-left">
            <DialogTitle className="text-[15px] font-semibold text-[#303030]">
              Edit customer
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#616161]">
              Update account details and contact info. Changes apply across
              orders and the customer portal.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
            <p className="text-xs text-[#8a8a8a]">
              <span className="font-medium text-[#303030]">*</span> Required
            </p>

            <FormSection title="Brand identity">
              <CustomerBrandingFields
                company={form.company}
                customerId={customer.id}
                logo={logo}
                onLogoChange={setLogo}
                accentColorKey={accentColorKey}
                onAccentColorKeyChange={setAccentColorKey}
                onError={setError}
              />
            </FormSection>

            <FormSection title="Account">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  label="Company"
                  htmlFor="edit-customer-company"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    id="edit-customer-company"
                    value={form.company}
                    onChange={(event) =>
                      updateField("company", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field
                  label="First name"
                  htmlFor="edit-customer-first-name"
                  required
                >
                  <Input
                    id="edit-customer-first-name"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field
                  label="Last name"
                  htmlFor="edit-customer-last-name"
                  required
                >
                  <Input
                    id="edit-customer-last-name"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Contact">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="edit-customer-email" required>
                  <Input
                    id="edit-customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Phone" htmlFor="edit-customer-phone" required>
                  <Input
                    id="edit-customer-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Billing address">
              <div className="grid gap-y-4">
                <Field
                  label="Address"
                  htmlFor="edit-customer-address-line1"
                  required
                >
                  <AddressAutocompleteInput
                    id="edit-customer-address-line1"
                    value={form.addressLine1}
                    onChange={(next) => updateField("addressLine1", next)}
                    onAddressSelect={(address) => {
                      setForm((current) => ({
                        ...current,
                        addressLine1: address.line1,
                        addressLine2: address.line2 || current.addressLine2 || "",
                        city: address.city,
                        state: address.state,
                        postalCode: address.postalCode,
                      }));
                      if (error) setError(null);
                    }}
                    className={inputClassName}
                    tone="dashboard"
                  />
                </Field>
                <Field
                  label="Apartment, suite, etc"
                  htmlFor="edit-customer-address-line2"
                  optional
                >
                  <Input
                    id="edit-customer-address-line2"
                    value={form.addressLine2 ?? ""}
                    onChange={(event) =>
                      updateField("addressLine2", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                  <Field label="City" htmlFor="edit-customer-city" required>
                    <Input
                      id="edit-customer-city"
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="State" required>
                    <Select
                      value={form.state || null}
                      onValueChange={(value) =>
                        updateField("state", value ?? "")
                      }
                    >
                      <SelectTrigger className={cn(inputClassName, "w-full")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="ZIP code"
                    htmlFor="edit-customer-postal"
                    required
                  >
                    <Input
                      id="edit-customer-postal"
                      value={form.postalCode}
                      onChange={(event) =>
                        updateField("postalCode", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            <FormSection title="Internal notes" optional>
              <Textarea
                id="edit-customer-notes"
                value={form.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                className="rounded-lg resize-none min-h-[88px]"
              />
            </FormSection>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-3.5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={cn(dashboardGhostButtonClass, "h-9")}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                dashboardPrimaryButtonClass,
                "h-9 min-w-[132px] justify-center disabled:opacity-60"
              )}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          {title}
        </h3>
        {optional && (
          <span className="text-[11px] text-[#a0a0a0]">Optional</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-[#616161]">
        {label}
        {required ? (
          <span className="ml-0.5 text-[#303030]" aria-hidden>
            *
          </span>
        ) : null}
        {optional && (
          <span className="ml-1 font-normal text-[#8a8a8a]">(optional)</span>
        )}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
