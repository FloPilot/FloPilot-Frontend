"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileImage,
  Package,
  Palette,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { OrderCustomLabelField } from "@/components/orders/order-custom-label-field";
import { NewOrderBlanksStep } from "@/components/orders/new-order-blanks-step";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
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
  LabeledSelectValue,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { readImagePreviewDataUrl } from "@/lib/artwork-preview";
import {
  activeLineItems,
  applyAutoEventNames,
  compactOrderNumberForLabel,
  createEmptyNewOrderForm,
  createEmptyNewOrderJob,
  createMockupDraftId,
  formatLineItemInputLabel,
  generateOrderNumber,
  NEW_ORDER_STEPS,
  NEW_ORDER_STEP_COUNT,
  validateNewOrderForm,
  validateNewOrderStep,
  type NewOrderFormInput,
  type NewOrderJobInput,
} from "@/lib/create-order";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  DECORATION_TYPE_OPTIONS,
  EVENT_KIND_OPTIONS,
  decorationLabel,
} from "@/lib/format";
import {
  defaultPrintLocationKey,
  getPrintLocationOptions,
  resolvePrintLocationLabel,
} from "@/lib/shop-settings";
import { getProductionStepQuickPicks } from "@/lib/order-production";
import { eventLabel, eventsLabel } from "@/lib/terminology";
import type { DecorationType, ImprintLocationKey, Order } from "@/types";
import { cn } from "@/lib/utils";

const stepIcons = [User, Package, Palette, FileImage] as const;

export function NewOrderDialog({
  open,
  onOpenChange,
  initialCustomerId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerId?: string;
  onCreated?: (order: Order) => void;
}) {
  const { customers, orders, getCustomerById, createOrderFromForm } = useSchedule();
  const { settings } = useShopSettings();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NewOrderFormInput>(() =>
    createEmptyNewOrderForm(initialCustomerId)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(createEmptyNewOrderForm(initialCustomerId ?? ""));
    setError(null);
  }, [open, initialCustomerId]);

  const selectedCustomer = form.customerId
    ? getCustomerById(form.customerId)
    : undefined;

  const customerSelectItems = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: `${customer.company} — ${customer.name}`,
      })),
    [customers]
  );

  const previewOrderNumber = useMemo(
    () => generateOrderNumber(orders.map((order) => order.number)),
    [orders]
  );

  const printLocationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const defaultLocationKey = useMemo(
    () => defaultPrintLocationKey(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const quickPickTemplates = useMemo(
    () => getProductionStepQuickPicks(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const syncJobNames = (jobs: NewOrderJobInput[]) =>
    applyAutoEventNames(
      previewOrderNumber,
      jobs,
      settings.productionDefaults
    );

  const blanks = useMemo(() => activeLineItems(form), [form]);
  const blankSourceMissing =
    blanks.length > 0 && form.blankSource === undefined;
  const highlightBlankSource =
    step === 2 && blankSourceMissing && Boolean(error);
  const decorationJobs = useMemo(
    () => form.jobs.filter((job) => job.kind !== "finishing"),
    [form.jobs]
  );

  const patchForm = (patch: Partial<NewOrderFormInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    if (error) setError(null);
  };

  const updateJob = (id: string, patch: Partial<NewOrderJobInput>) => {
    setForm((current) => {
      const nextJobs = current.jobs.map((job) =>
        job.id === id ? { ...job, ...patch } : job
      );
      const shouldRename =
        patch.locationKey !== undefined || patch.kind !== undefined;
      return {
        ...current,
        jobs: shouldRename ? syncJobNames(nextJobs) : nextJobs,
      };
    });
    if (error) setError(null);
  };

  const addJob = (seed?: Partial<NewOrderJobInput>) => {
    const defaultLineItemIds = blanks.map((item) => item.id);
    setForm((current) => ({
      ...current,
      jobs: syncJobNames([
        ...current.jobs,
        createEmptyNewOrderJob({
          lineItemIds: defaultLineItemIds,
          locationKey: defaultLocationKey,
          ...seed,
        }),
      ]),
    }));
    if (error) setError(null);
  };

  const removeJob = (id: string) => {
    setForm((current) => ({
      ...current,
      jobs: syncJobNames(current.jobs.filter((job) => job.id !== id)),
    }));
    if (error) setError(null);
  };

  const addJobFromTemplate = (templateId: string) => {
    const template = quickPickTemplates.find((item) => item.id === templateId);
    if (!template) return;
    addJob({
      decorationType: template.decoration,
      locationKey: template.locationKey,
      kind: template.kind,
      ...(template.kind === "finishing" ? { name: template.name } : {}),
    });
  };

  const toggleJobLineItem = (jobId: string, lineItemId: string) => {
    setForm((current) => ({
      ...current,
      jobs: current.jobs.map((job) => {
        if (job.id !== jobId) return job;
        const currentIds = job.lineItemIds ?? [];
        const nextIds = currentIds.includes(lineItemId)
          ? currentIds.filter((id) => id !== lineItemId)
          : [...currentIds, lineItemId];
        return { ...job, lineItemIds: nextIds };
      }),
    }));
    if (error) setError(null);
  };

  const goNext = () => {
    const validationError = validateNewOrderStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(NEW_ORDER_STEP_COUNT, current + 1));
    setError(null);
  };

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1));
    setError(null);
  };

  const handleCreate = async () => {
    const validationError = validateNewOrderForm(form);
    if (validationError) {
      setError(validationError);
      if (validationError.includes("blank garments")) {
        setStep(2);
      } else if (validationError.includes("customer")) {
        setStep(1);
      } else if (
        validationError.includes("event") ||
        validationError.includes("blanks apply")
      ) {
        setStep(3);
      }
      return;
    }
    const customer = getCustomerById(form.customerId);
    if (!customer) {
      setError("Select a valid customer.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrderFromForm(form);
      onOpenChange(false);
      onCreated?.(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const stepMeta = NEW_ORDER_STEPS[step - 1];
  const stepDescriptions: Record<number, string> = {
    1: "Choose the account this quote or sales order belongs to.",
    2: "Add blanks/garments now, or skip and add them from the order page later.",
    3: `Create decoration events and attach blanks/garments. Names use your order number and placement (e.g. ${compactOrderNumberForLabel(previewOrderNumber)} - FRONT CHEST).`,
    4: "Upload mockups if you have them, then create the order. Shipping, dates, and pricing live on the order detail page.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
          <DialogTitle className={dashboardTaskTitleClass}>
            New sales order
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            Start with customer, blanks/garments, events, and mockups — finish
            shipping and details on the order page.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-[#ebebeb] px-5 py-3">
          <nav className="grid grid-cols-4 gap-1.5">
            {NEW_ORDER_STEPS.map((item, index) => {
              const Icon = stepIcons[index];
              const isActive = step === item.id;
              const isComplete = step > item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id <= step) {
                      setStep(item.id);
                      setError(null);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
                    isActive
                      ? "border-brand-primary/25 bg-brand-primary/[0.04]"
                      : isComplete
                        ? "border-[#86d4a8]/50 bg-[#fafffe]"
                        : "border-[#ebebeb] bg-white hover:bg-[#fafafa]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      isActive
                        ? "bg-brand-primary text-white"
                        : isComplete
                          ? "bg-[#0d5c2e] text-white"
                          : "bg-[#f1f1f1] text-[#616161]"
                    )}
                  >
                    {isComplete ? <Check className="size-3.5" /> : item.id}
                  </span>
                  <span
                    className={cn(
                      "hidden min-w-0 truncate text-[11px] font-medium sm:inline",
                      isActive
                        ? "text-[#303030]"
                        : isComplete
                          ? "text-[#0d5c2e]"
                          : "text-[#616161]"
                    )}
                  >
                    {item.title}
                  </span>
                  <Icon className="size-3.5 shrink-0 text-[#8a8a8a] sm:hidden" />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <h3 className="text-[13px] font-semibold text-[#303030]">
              {stepMeta.title}
            </h3>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {stepDescriptions[step]}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <Field label="Customer" htmlFor="new-order-customer">
                <Select
                  value={form.customerId || null}
                  items={customerSelectItems}
                  onValueChange={(value) =>
                    patchForm({ customerId: value ?? "" })
                  }
                >
                  <SelectTrigger
                    id="new-order-customer"
                    className={cn(dashboardControlClass, "h-10 w-full")}
                  >
                    <SelectValue placeholder="Search or select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company} — {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {selectedCustomer && (
                <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-sm">
                  <p className="font-medium text-[#303030]">
                    {selectedCustomer.company}
                  </p>
                  <p className="mt-0.5 text-[#616161]">
                    {selectedCustomer.email} · {selectedCustomer.phone}
                  </p>
                  <p className="text-[#616161]">
                    {selectedCustomer.city}, {selectedCustomer.state}
                  </p>
                </div>
              )}

              <OrderCustomLabelField
                orderNumber={previewOrderNumber}
                value={form.customLabel ?? ""}
                onChange={(customLabel) => patchForm({ customLabel })}
                id="new-order-custom-label"
              />
            </div>
          )}

          {step === 2 && (
            <NewOrderBlanksStep
              form={form}
              onChange={patchForm}
              highlightBlankSource={highlightBlankSource}
              showBlankSourcePrompt={blankSourceMissing}
            />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={dashboardTaskDetailClass}>
                  {form.jobs.length === 0
                    ? `No ${eventsLabel.toLowerCase()} yet — optional`
                    : `${form.jobs.length} ${form.jobs.length !== 1 ? eventsLabel.toLowerCase() : eventLabel.toLowerCase()}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPickTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addJobFromTemplate(template.id)}
                      className="rounded-full border border-[#e3e3e3] bg-white px-2.5 py-1 text-[11px] font-medium text-[#616161] transition-colors hover:border-brand-ink/25 hover:bg-brand-ink/[0.04] hover:text-[#303030]"
                    >
                      + {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {form.jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-[#303030]">
                    Skip for now
                  </p>
                  <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
                    You can add decoration and finishing events from the order
                    detail page after the order is created.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.jobs.map((job, index) => (
                    <JobStepCard
                      key={job.id}
                      index={index}
                      job={job}
                      blanks={blanks}
                      canRemove
                      printLocationOptions={printLocationOptions}
                      defaultLocationKey={defaultLocationKey}
                      onChange={(patch) => updateJob(job.id, patch)}
                      onRemove={() => removeJob(job.id)}
                      onToggleLineItem={(lineItemId) =>
                        toggleJobLineItem(job.id, lineItemId)
                      }
                    />
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg border-dashed text-xs"
                onClick={() => addJob()}
              >
                <Plus className="size-3.5" />
                Add {eventLabel.toLowerCase()}
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {decorationJobs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-[#303030]">
                    No decoration events
                  </p>
                  <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
                    Mockups attach to decoration events only. Skip this step if
                    you did not add events, or go back to add them.
                  </p>
                </div>
              ) : (
                <>
                  <p className={dashboardTaskDetailClass}>
                    Optional — upload a mockup for each decoration event. Events
                    without a file will show as no mockup attached on proofs.
                  </p>
                  <div className="space-y-3">
                    {decorationJobs.map((job) => (
                      <MockupUploadCard
                        key={job.id}
                        job={job}
                        onChange={(patch) => updateJob(job.id, patch)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2.5 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-lg"
            disabled={step === 1}
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step < NEW_ORDER_STEP_COUNT ? (
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                onClick={goNext}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                disabled={submitting}
                onClick={() => void handleCreate()}
              >
                {submitting ? "Creating…" : "Create order"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JobStepCard({
  index,
  job,
  blanks,
  canRemove,
  printLocationOptions,
  defaultLocationKey,
  onChange,
  onRemove,
  onToggleLineItem,
}: {
  index: number;
  job: NewOrderJobInput;
  blanks: ReturnType<typeof activeLineItems>;
  canRemove: boolean;
  printLocationOptions: ReturnType<typeof getPrintLocationOptions>;
  defaultLocationKey: string;
  onChange: (patch: Partial<NewOrderJobInput>) => void;
  onRemove: () => void;
  onToggleLineItem: (lineItemId: string) => void;
}) {
  const isFinishing = job.kind === "finishing";

  return (
    <div className="space-y-3 rounded-lg border border-[#ebebeb] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          {eventLabel} {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#616161] transition-colors hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        )}
      </div>

      <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Event name
        </p>
        <p className="mt-0.5 text-[13px] font-semibold tracking-wide text-[#303030]">
          {job.name}
        </p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Named from order number and placement. Mockups and proofs use this
          label.
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label={`${eventLabel} type`}>
          <Select
            value={job.kind}
            onValueChange={(value) =>
              onChange({
                kind: (value ?? "decoration") as NewOrderJobInput["kind"],
                decorationType:
                  value === "finishing" ? "finishing" : job.decorationType,
              })
            }
          >
            <SelectTrigger className={cn(dashboardControlClass, "h-10 w-full")}>
              <LabeledSelectValue value={job.kind} options={EVENT_KIND_OPTIONS} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="decoration">Decoration</SelectItem>
              <SelectItem value="finishing">Finishing</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {!isFinishing && (
          <>
            <Field label="Decoration">
              <Select
                value={job.decorationType}
                onValueChange={(value) =>
                  onChange({
                    decorationType: (value ??
                      "screen_print") as DecorationType,
                  })
                }
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full")}
                >
                  <LabeledSelectValue
                    value={job.decorationType}
                    options={DECORATION_TYPE_OPTIONS}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screen_print">Screen Print</SelectItem>
                  <SelectItem value="embroidery">Embroidery</SelectItem>
                  <SelectItem value="dtf">DTF</SelectItem>
                  <SelectItem value="vinyl">Vinyl</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Placement">
              <Select
                value={job.locationKey}
                onValueChange={(value) =>
                  onChange({
                    locationKey: (value ?? defaultLocationKey) as ImprintLocationKey,
                  })
                }
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-10 w-full")}
                >
                  <LabeledSelectValue
                    value={job.locationKey}
                    options={printLocationOptions}
                  />
                </SelectTrigger>
                <SelectContent>
                  {printLocationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </div>

      {!isFinishing && blanks.length > 0 && (
        <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Blanks/garments for this event
          </p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Select which blanks/garments this decoration runs on.
          </p>
          <div className="mt-3 space-y-2">
            {blanks.map((item) => {
              const checked = (job.lineItemIds ?? []).includes(item.id);
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-brand-ink/25 bg-white"
                      : "border-transparent bg-white/70 hover:border-[#e3e3e3]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLineItem(item.id)}
                    className="size-4 rounded border-[#c9c9c9] text-brand-ink"
                  />
                  <span className="min-w-0 text-[13px] text-[#303030]">
                    {formatLineItemInputLabel(item)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Field label="Notes" htmlFor={`job-notes-${job.id}`} optional>
        <Textarea
          id={`job-notes-${job.id}`}
          value={job.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Placement, colors, special instructions…"
          rows={2}
          className="min-h-[72px] resize-none rounded-lg"
        />
      </Field>
    </div>
  );
}

function MockupUploadCard({
  job,
  onChange,
}: {
  job: NewOrderJobInput;
  onChange: (patch: Partial<NewOrderJobInput>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings } = useShopSettings();

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const { previewUrl } = await readImagePreviewDataUrl(file);
    onChange({
      mockupFile: {
        id: createMockupDraftId(),
        name: file.name,
        previewUrl: previewUrl || undefined,
      },
    });
  };

  return (
    <div className="rounded-lg border border-[#ebebeb] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#303030]">
            {job.name || "Untitled event"}
          </p>
          <p className="text-[12px] text-[#616161]">
            {decorationLabel(job.decorationType)} ·{" "}
            {resolvePrintLocationLabel(
              job.locationKey,
              settings.productionDefaults
            )}
          </p>
        </div>
        {job.mockupFile ? (
          <button
            type="button"
            onClick={() => onChange({ mockupFile: undefined })}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#616161] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
          >
            <X className="size-3" />
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.svg"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {job.mockupFile?.previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa] p-2">
          <img
            src={job.mockupFile.previewUrl}
            alt={job.mockupFile.name}
            className="mx-auto max-h-40 w-full object-contain"
          />
          <p className="mt-2 truncate text-center text-[12px] text-[#616161]">
            {job.mockupFile.name}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-8 text-center transition-colors hover:border-brand-ink/30 hover:bg-brand-ink/[0.03]"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
            <Upload className="size-4" />
          </div>
          <p className="text-[13px] font-medium text-[#303030]">
            Upload mockup
          </p>
          <p className="text-[12px] text-[#616161]">
            Optional — skip if you will add proofs later
          </p>
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-[13px] text-[#303030]">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-[#8a8a8a]">(optional)</span>
        )}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
