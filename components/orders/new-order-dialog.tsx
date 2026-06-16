"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  FolderOpen,
  Package,
  Palette,
  Plus,
  Trash2,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import { OrderPriorityToggle } from "@/components/orders/order-priority-toggle";
import { useSchedule } from "@/components/providers/schedule-provider";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  countOrderFormPieces,
  createEmptyNewOrderForm,
  createEmptyNewOrderJob,
  createFileDraftId,
  isArtworkAttachableFile,
  NEW_ORDER_COLORS,
  NEW_ORDER_FILE_KINDS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
  NEW_ORDER_STEPS,
  previewOrderTotals,
  SHIPPING_METHODS,
  validateNewOrderStep,
  type NewOrderFormInput,
  type NewOrderFileInput,
  type NewOrderJobInput,
} from "@/lib/create-order";
import { decorationLabel, formatCurrency } from "@/lib/format";
import { IMPRINT_LOCATION_LABELS } from "@/lib/job-imprints";
import { eventLabel, eventsLabel } from "@/lib/terminology";
import { ORDER_FILE_KIND_LABELS } from "@/lib/order-files";
import { PRODUCTION_STEP_TEMPLATES } from "@/lib/order-production";
import type { DecorationType, ImprintLocationKey, Order } from "@/types";
import { cn } from "@/lib/utils";

const stepIcons = [User, FolderOpen, Palette, Package, Truck] as const;
const inputClassName = "h-10 rounded-lg";

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
  const { customers, getCustomerById, createOrderFromForm } = useSchedule();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NewOrderFormInput>(() =>
    createEmptyNewOrderForm(initialCustomerId)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const totals = useMemo(() => previewOrderTotals(form), [form]);
  const pieceCount = useMemo(() => countOrderFormPieces(form), [form]);
  const hasProducts = pieceCount > 0;

  const updateForm = <K extends keyof NewOrderFormInput>(
    key: K,
    value: NewOrderFormInput[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  };

  const updateSize = (size: (typeof NEW_ORDER_SIZES)[number], value: string) => {
    const quantity = Math.max(0, Number.parseInt(value, 10) || 0);
    setForm((current) => ({
      ...current,
      sizes: { ...current.sizes, [size]: quantity },
    }));
    if (error) setError(null);
  };

  const updateJob = (id: string, patch: Partial<NewOrderJobInput>) => {
    setForm((current) => ({
      ...current,
      jobs: current.jobs.map((job) =>
        job.id === id ? { ...job, ...patch } : job
      ),
    }));
    if (error) setError(null);
  };

  const addJob = (seed?: Partial<NewOrderJobInput>) => {
    setForm((current) => ({
      ...current,
      jobs: [...current.jobs, createEmptyNewOrderJob(seed)],
    }));
    if (error) setError(null);
  };

  const removeJob = (id: string) => {
    setForm((current) => ({
      ...current,
      jobs: current.jobs.filter((job) => job.id !== id),
    }));
    if (error) setError(null);
  };

  const addJobFromTemplate = (templateId: string) => {
    const template = PRODUCTION_STEP_TEMPLATES.find(
      (item) => item.id === templateId
    );
    if (!template) return;
    addJob({
      name: template.name,
      decorationType: template.decoration,
      locationKey: template.locationKey,
      kind: template.kind,
    });
  };

  const addFiles = (fileList: FileList | null, kind = NEW_ORDER_FILE_KINDS[0].value) => {
    if (!fileList?.length) return;
    const next = Array.from(fileList).map((file) => ({
      id: createFileDraftId(),
      name: file.name,
      kind,
    }));
    setForm((current) => ({
      ...current,
      files: [...current.files, ...next],
    }));
    if (error) setError(null);
  };

  const updateFile = (id: string, patch: Partial<NewOrderFileInput>) => {
    setForm((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === id ? { ...file, ...patch } : file
      ),
    }));
  };

  const removeFile = (id: string) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter((file) => file.id !== id),
      jobs: current.jobs.map((job) =>
        job.attachedFileId === id
          ? { ...job, attachedFileId: undefined }
          : job
      ),
    }));
  };

  const attachableFiles = useMemo(
    () => form.files.filter(isArtworkAttachableFile),
    [form.files]
  );

  const goNext = () => {
    const validationError = validateNewOrderStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(5, current + 1));
    setError(null);
  };

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1));
    setError(null);
  };

  const handleCreate = async () => {
    const validationError = validateNewOrderStep(5, form);
    if (validationError) {
      setError(validationError);
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
    2: "Upload artwork, mockups, POs, and other files for this order.",
    3: `Add ${eventsLabel.toLowerCase()} now, or skip and add them later on the order.`,
    4: "Add garments and quantities now, or skip and add them later on the order.",
    5: "Set shipping details and review totals.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-0 gap-0 overflow-hidden max-h-[min(92vh,820px)] flex flex-col">
        <DialogHeader className="px-8 pt-7 pb-5 border-b border-border shrink-0 text-left">
          <DialogTitle className="text-xl font-semibold text-brand-ink">
            New sales order
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Create a quote or sales order in a few steps without leaving your
            current screen.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pt-5 pb-2 shrink-0">
          <nav className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
                    "flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "border-brand-primary/30 bg-brand-primary/8 text-brand-ink"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                        : "border-border bg-white text-brand-muted hover:bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      isActive
                        ? "bg-brand-primary text-white"
                        : isComplete
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-brand-muted"
                    )}
                  >
                    {isComplete ? <Check className="size-3.5" /> : item.id}
                  </span>
                  <span className="hidden md:inline">{item.title}</span>
                  <Icon className="size-3.5 shrink-0 sm:hidden" />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-brand-ink">
              {stepMeta.title}
            </h3>
            <p className="text-xs text-brand-muted mt-1">
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
                    updateForm("customerId", value ?? "")
                  }
                >
                  <SelectTrigger
                    id="new-order-customer"
                    className={cn(inputClassName, "w-full")}
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
                <div className="rounded-xl border border-border/70 bg-brand-primary/[0.04] px-4 py-3 text-sm">
                  <p className="font-medium text-brand-ink">
                    {selectedCustomer.company}
                  </p>
                  <p className="text-brand-muted mt-0.5">
                    {selectedCustomer.email} · {selectedCustomer.phone}
                  </p>
                  <p className="text-brand-muted">
                    {selectedCustomer.city}, {selectedCustomer.state}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.dst,.svg,.zip"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-primary/25 bg-brand-primary/[0.03] px-6 py-10 text-center transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/[0.06]"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-ink">
                    Upload files for this order
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    Artwork, mockups, purchase orders, customer files, and more.
                  </p>
                </div>
                <span className="text-xs font-medium text-brand-primary">
                  Browse files
                </span>
              </button>

              {form.files.length === 0 ? (
                <p className="text-center text-sm text-brand-muted py-2">
                  No files yet — you can skip this step and upload later, or add
                  files now to attach them to events.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {form.files.length} file{form.files.length !== 1 ? "s" : ""}{" "}
                    ready
                  </p>
                  {form.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-white p-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/8 text-brand-primary">
                          <FileUp className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-brand-ink">
                            {file.name}
                          </p>
                          <p className="text-xs text-brand-muted mt-0.5">
                            {isArtworkAttachableFile(file)
                              ? "Can attach to an event"
                              : "Saved to order files"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Select
                          value={file.kind}
                          onValueChange={(value) =>
                            updateFile(file.id, {
                              kind: (value ??
                                "production_art") as NewOrderFileInput["kind"],
                            })
                          }
                        >
                          <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NEW_ORDER_FILE_KINDS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-brand-muted">
                  {form.jobs.length === 0
                    ? `No ${eventsLabel.toLowerCase()} yet — optional`
                    : `${form.jobs.length} ${form.jobs.length !== 1 ? eventsLabel.toLowerCase() : eventLabel.toLowerCase()}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCTION_STEP_TEMPLATES.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addJobFromTemplate(template.id)}
                      className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-brand-muted transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:text-brand-ink"
                    >
                      + {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {form.jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-brand-ink">
                    Skip for now
                  </p>
                  <p className="mt-1 text-xs text-brand-muted max-w-sm mx-auto">
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
                      uploadedFiles={attachableFiles}
                      canRemove
                      onChange={(patch) => updateJob(job.id, patch)}
                      onRemove={() => removeJob(job.id)}
                    />
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg border-dashed h-10 text-xs"
                onClick={() => addJob()}
              >
                <Plus className="size-3.5" />
                Add {eventLabel.toLowerCase()}
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-brand-muted">
                {hasProducts
                  ? `${pieceCount} piece${pieceCount !== 1 ? "s" : ""} in this order`
                  : "No products yet — optional"}
              </p>

              {!hasProducts && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-brand-ink">
                    Skip for now
                  </p>
                  <p className="mt-1 text-xs text-brand-muted max-w-sm mx-auto">
                    Leave quantities at zero to create a placeholder order. Add
                    blanks and sizes from the order detail page later.
                  </p>
                </div>
              )}

              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Product" optional={!hasProducts}>
                  <Select
                    value={form.productKey}
                    onValueChange={(value) =>
                      updateForm(
                        "productKey",
                        (value ??
                          "g64000") as NewOrderFormInput["productKey"]
                      )
                    }
                  >
                    <SelectTrigger className={cn(inputClassName, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_ORDER_PRODUCTS.map((product) => (
                        <SelectItem key={product.key} value={product.key}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Color" optional={!hasProducts}>
                  <Select
                    value={form.colorKey}
                    onValueChange={(value) =>
                      updateForm(
                        "colorKey",
                        (value ?? "heather") as NewOrderFormInput["colorKey"]
                      )
                    }
                  >
                    <SelectTrigger className={cn(inputClassName, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_ORDER_COLORS.map((color) => (
                        <SelectItem key={color.key} value={color.key}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div>
                <Label className="text-sm text-brand-ink">
                  Size matrix
                  {!hasProducts && (
                    <span className="ml-1 font-normal text-brand-muted">
                      (optional)
                    </span>
                  )}
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {NEW_ORDER_SIZES.map((size) => (
                    <div key={size} className="space-y-1.5">
                      <Label className="text-xs text-brand-muted">{size}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.sizes[size]}
                        onChange={(event) => updateSize(size, event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Shipping method">
                  <Select
                    value={form.shippingMethod}
                    onValueChange={(value) =>
                      updateForm(
                        "shippingMethod",
                        (value ??
                          "ups_ground") as NewOrderFormInput["shippingMethod"]
                      )
                    }
                  >
                    <SelectTrigger className={cn(inputClassName, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_METHODS.map((method) => (
                        <SelectItem key={method.key} value={method.key}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="In-hands date" htmlFor="new-order-in-hands">
                  <Input
                    id="new-order-in-hands"
                    type="date"
                    value={form.inHandsDate}
                    onChange={(event) =>
                      updateForm("inHandsDate", event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
                <p className="mb-3 text-sm font-medium text-brand-ink">
                  Priority
                </p>
                <OrderPriorityToggle
                  rush={form.rush}
                  onChange={(rush) => updateForm("rush", rush)}
                />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">Customer</span>
                  <span className="font-medium text-right">
                    {selectedCustomer?.company ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">Files</span>
                  <span className="font-medium text-right">
                    {form.files.length} uploaded
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">{eventsLabel}</span>
                  <span className="font-medium text-right">
                    {form.jobs.length === 0
                      ? "None — add later"
                      : `${form.jobs.length} ${form.jobs.length !== 1 ? eventsLabel.toLowerCase() : eventLabel.toLowerCase()}`}
                  </span>
                </div>
                {form.jobs.length > 0 && (
                  <ul className="space-y-1 text-xs text-brand-muted">
                    {form.jobs.map((job) => {
                      const attached = job.attachedFileId
                        ? form.files.find((file) => file.id === job.attachedFileId)
                        : undefined;
                      return (
                        <li key={job.id} className="flex justify-between gap-3">
                          <span className="truncate">
                            {job.name || `Untitled ${eventLabel.toLowerCase()}`}
                            {attached && (
                              <span className="text-brand-muted">
                                {" "}
                                · {attached.name}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0">
                            {job.kind === "finishing"
                              ? "Finishing"
                              : decorationLabel(job.decorationType)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">Products</span>
                  <span className="font-medium text-right">
                    {hasProducts
                      ? `${pieceCount} piece${pieceCount !== 1 ? "s" : ""}`
                      : "None — add later"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-muted">Tax (8%)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between gap-4 font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-8 py-4 flex items-center justify-between gap-3 bg-muted/15">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
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
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step < 5 ? (
              <Button type="button" className="rounded-full" onClick={goNext}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full"
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
  uploadedFiles,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  job: NewOrderJobInput;
  uploadedFiles: NewOrderFileInput[];
  canRemove: boolean;
  onChange: (patch: Partial<NewOrderJobInput>) => void;
  onRemove: () => void;
}) {
  const isFinishing = job.kind === "finishing";
  const attachedFile = job.attachedFileId
    ? uploadedFiles.find((file) => file.id === job.attachedFileId)
    : undefined;

  return (
    <div className="rounded-xl border border-border/70 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {eventLabel} {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-brand-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label={`${eventLabel} name`} htmlFor={`job-name-${job.id}`}>
          <Input
            id={`job-name-${job.id}`}
            value={job.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Spring Season Logo — Front"
            className={inputClassName}
          />
        </Field>
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
            <SelectTrigger className={cn(inputClassName, "w-full")}>
              <SelectValue />
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
                <SelectTrigger className={cn(inputClassName, "w-full")}>
                  <SelectValue />
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
                    locationKey: (value ??
                      "front_chest") as ImprintLocationKey,
                  })
                }
              >
                <SelectTrigger className={cn(inputClassName, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPRINT_LOCATION_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </div>

      {!isFinishing && uploadedFiles.length > 0 && (
        <Field label="Attach artwork" optional>
          <Select
            value={job.attachedFileId ?? "none"}
            onValueChange={(value) =>
              onChange({
                attachedFileId: value === "none" ? undefined : value ?? undefined,
              })
            }
          >
            <SelectTrigger className={cn(inputClassName, "w-full")}>
              <SelectValue placeholder="Select uploaded file" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No file attached</SelectItem>
              {uploadedFiles.map((file) => (
                <SelectItem key={file.id} value={file.id}>
                  {file.name} · {ORDER_FILE_KIND_LABELS[file.kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {attachedFile && (
            <p className="mt-1.5 text-xs text-brand-muted">
              This file will become the artwork proof for this event when the
              order is created.
            </p>
          )}
        </Field>
      )}

      {!isFinishing && uploadedFiles.length === 0 && (
        <p className="text-xs text-brand-muted rounded-lg bg-muted/30 px-3 py-2">
          Upload files in the previous section to attach artwork to this event.
        </p>
      )}

      <Field label="Notes" htmlFor={`job-notes-${job.id}`} optional>
        <Textarea
          id={`job-notes-${job.id}`}
          value={job.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Placement, colors, special instructions…"
          rows={2}
          className="rounded-lg resize-none min-h-[72px]"
        />
      </Field>
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
