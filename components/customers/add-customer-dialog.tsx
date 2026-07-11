"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  EMPTY_NEW_CUSTOMER,
  US_STATES,
  validateNewCustomer,
  type NewCustomerInput,
} from "@/lib/customers";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

const inputClassName = "h-10 rounded-lg";

export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreate,
  title = "Add customer",
  description = "Create a new account. You can start an order from their profile after saving.",
  submitLabel = "Add customer",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: NewCustomerInput) => Customer | Promise<Customer>;
  title?: string;
  description?: string;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<NewCustomerInput>(EMPTY_NEW_CUSTOMER);
  const [logo, setLogo] = useState<string | null>(null);
  const [accentColorKey, setAccentColorKey] = useState<CustomerAccentKey | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_NEW_CUSTOMER);
      setLogo(null);
      setAccentColorKey(null);
      setError(null);
    }
  }, [open]);

  const updateField = <K extends keyof NewCustomerInput>(
    key: K,
    value: NewCustomerInput[K]
  ) => {
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
      await onCreate({
        ...form,
        ...(logo ? { logoUrl: logo } : {}),
        ...(accentColorKey ? { accentColorKey } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden max-h-[min(90vh,720px)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="px-8 pt-7 pb-5 border-b border-border shrink-0 text-left">
            <DialogTitle className="text-xl font-semibold text-brand-ink">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
            <FormSection title="Brand identity" optional>
              <CustomerBrandingFields
                company={form.company}
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
                  htmlFor="customer-company"
                  className="sm:col-span-2"
                >
                  <Input
                    id="customer-company"
                    value={form.company}
                    onChange={(event) =>
                      updateField("company", event.target.value)
                    }
                    placeholder="Northside Construction"
                    className={inputClassName}
                    autoFocus
                  />
                </Field>
                <Field label="First name" htmlFor="customer-first-name">
                  <Input
                    id="customer-first-name"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    placeholder="David"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Last name" htmlFor="customer-last-name">
                  <Input
                    id="customer-last-name"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    placeholder="Park"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Contact">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="customer-email">
                  <Input
                    id="customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="name@company.com"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Phone" htmlFor="customer-phone">
                  <Input
                    id="customer-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="(555) 123-4567"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Location">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="City" htmlFor="customer-city">
                  <Input
                    id="customer-city"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Seattle"
                    className={inputClassName}
                  />
                </Field>
                <Field label="State">
                  <Select
                    value={form.state || null}
                    onValueChange={(value) =>
                      updateField("state", value ?? "")
                    }
                  >
                    <SelectTrigger className={cn(inputClassName, "w-full")}>
                      <SelectValue placeholder="Select state" />
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
              </div>
            </FormSection>

            <FormSection title="Internal notes" optional>
              <Textarea
                id="customer-notes"
                value={form.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Terms, shipping preferences, Pantone matches…"
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

          <div className="shrink-0 border-t border-border px-8 py-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end bg-muted/15">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full min-w-[132px]"
              disabled={submitting}
            >
              {submitting ? "Saving…" : submitLabel}
            </Button>
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
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
          {title}
        </h3>
        {optional && (
          <span className="text-[11px] text-brand-muted/80">Optional</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-sm text-brand-ink">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-brand-muted">(optional)</span>
        )}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
