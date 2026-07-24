"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collectEndBusinessOptions,
  createDocumentFilterId,
  DOCUMENT_DATE_MODES,
  documentFilterFieldOptions,
  getDocumentFilterChipParts,
  NO_END_BUSINESS,
  type DocumentAdvancedFilter,
  type DocumentDateMode,
  type DocumentFilterField,
  type DocumentFilterScope,
  type EndBusinessOption,
} from "@/lib/document-filters";
import type { Customer, Order } from "@/types";
import { dashboardPrimaryButtonClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type PanelStep = "pick" | DocumentFilterField;

export function DocumentFilterBuilder({
  scope,
  customers,
  orders,
  filters,
  onChange,
}: {
  scope: DocumentFilterScope;
  customers: Customer[];
  orders: Order[];
  filters: DocumentAdvancedFilter[];
  onChange: (filters: DocumentAdvancedFilter[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PanelStep>("pick");
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [draftCustomerIds, setDraftCustomerIds] = useState<string[]>([]);
  const [draftEndBusinessIds, setDraftEndBusinessIds] = useState<string[]>([]);
  const [draftOrderQuery, setDraftOrderQuery] = useState("");
  const [draftDateMode, setDraftDateMode] =
    useState<DocumentDateMode>("before");
  const [draftDate, setDraftDate] = useState("");

  const endBusinessOptions = useMemo(
    () => collectEndBusinessOptions(customers, orders),
    [customers, orders]
  );

  const fieldOptions = useMemo(
    () => documentFilterFieldOptions(scope),
    [scope]
  );

  const resetPanel = () => {
    setStep("pick");
    setDraftCustomerIds([]);
    setDraftEndBusinessIds([]);
    setDraftOrderQuery("");
    setDraftDateMode("before");
    setDraftDate("");
  };

  const closePanel = () => {
    setOpen(false);
    resetPanel();
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closePanel();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const addFilter = (filter: DocumentAdvancedFilter) => {
    onChange([...filters, filter]);
    closePanel();
  };

  const openField = (field: DocumentFilterField) => {
    resetPanel();
    setDraftDateMode("before");
    setStep(field);
    setOpen(true);
  };

  const dateFieldTitle = (field: DocumentFilterField) => {
    switch (field) {
      case "due_date":
        return "Due date";
      case "sent_date":
        return "Sent date";
      case "created_date":
        return "Created date";
      default:
        return "In-hands date";
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const { label, value } = getDocumentFilterChipParts(
          filter,
          customers,
          endBusinessOptions
        );
        return (
          <FilterChip
            key={filter.id}
            label={label}
            value={value}
            onRemove={() => removeFilter(filter.id)}
          />
        );
      })}

      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (open) closePanel();
            else {
              resetPanel();
              setStep("pick");
              setOpen(true);
            }
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-medium transition-colors",
            open
              ? "border-[#2c6ecb]/40 bg-[#f0f5ff] text-[#2c6ecb]"
              : "border-[#d4d4d4] bg-white text-[#616161] hover:border-[#2c6ecb]/40 hover:text-[#303030]"
          )}
        >
          <Plus className="size-3.5" />
          Add filter
        </button>

        {open ? (
          <div
            ref={panelRef}
            className="absolute left-0 top-full z-50 mt-2 flex max-h-[min(420px,calc(100vh-8rem))] w-[min(calc(100vw-2rem),320px)] flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xl ring-1 ring-black/5"
          >
            {step === "pick" ? (
              <FilterPickStep
                options={fieldOptions}
                onSelect={openField}
              />
            ) : step === "customer" ? (
              <CustomerFilterStep
                customers={customers}
                selectedIds={draftCustomerIds}
                onChange={setDraftCustomerIds}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (draftCustomerIds.length === 0) return;
                  addFilter({
                    id: createDocumentFilterId(),
                    field: "customer",
                    customerIds: draftCustomerIds,
                  });
                }}
              />
            ) : step === "end_business" ? (
              <EndBusinessFilterStep
                options={endBusinessOptions}
                selectedIds={draftEndBusinessIds}
                onChange={setDraftEndBusinessIds}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (draftEndBusinessIds.length === 0) return;
                  addFilter({
                    id: createDocumentFilterId(),
                    field: "end_business",
                    endBusinessIds: draftEndBusinessIds,
                  });
                }}
              />
            ) : step === "order_number" ? (
              <OrderNumberFilterStep
                query={draftOrderQuery}
                onChange={setDraftOrderQuery}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (!draftOrderQuery.trim()) return;
                  addFilter({
                    id: createDocumentFilterId(),
                    field: "order_number",
                    query: draftOrderQuery.trim(),
                  });
                }}
              />
            ) : (
              <DateFilterStep
                title={dateFieldTitle(step)}
                mode={draftDateMode}
                date={draftDate}
                onModeChange={setDraftDateMode}
                onDateChange={setDraftDate}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (!draftDate) return;
                  addFilter({
                    id: createDocumentFilterId(),
                    field: step as
                      | "in_hands_date"
                      | "due_date"
                      | "sent_date"
                      | "created_date",
                    mode: draftDateMode,
                    date: draftDate,
                  });
                }}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-lg border border-[#e3e3e3] bg-white text-xs shadow-sm">
      <span className="flex shrink-0 items-center border-r border-[#e3e3e3] px-2 py-1.5 text-[#616161]">
        {label}
      </span>
      <span className="flex max-w-[180px] items-center truncate bg-[#f0f5ff] px-2 py-1.5 font-medium text-[#303030]">
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center border-l border-[#e3e3e3] px-1.5 text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#303030]"
        aria-label="Remove filter"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function PanelHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#303030]"
        >
          <ArrowLeft className="size-3.5" />
        </button>
      ) : null}
      <p className="text-xs font-semibold text-[#303030]">{title}</p>
    </div>
  );
}

function FilterPickStep({
  options,
  onSelect,
}: {
  options: { field: DocumentFilterField; label: string; hint: string }[];
  onSelect: (field: DocumentFilterField) => void;
}) {
  return (
    <div className="p-1">
      <PanelHeader title="Add filter" />
      <div className="p-1">
        {options.map((option) => (
          <button
            key={option.field}
            type="button"
            onClick={() => onSelect(option.field)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f6f6f7]"
          >
            <span>
              <span className="block text-xs font-medium text-[#303030]">
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                {option.hint}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-[#8a8a8a]" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerFilterStep({
  customers,
  selectedIds,
  onChange,
  onBack,
  onApply,
}: {
  customers: Customer[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const [search, setSearch] = useState("");
  const sorted = useMemo(
    () => [...customers].sort((a, b) => a.company.localeCompare(b.company)),
    [customers]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.company, c.name, c.email].join(" ").toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <>
      <PanelHeader title="Customer" onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col space-y-2 p-3">
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="h-8 rounded-lg pl-8 text-xs"
            autoFocus
          />
        </div>
        <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
          {filtered.map((customer) => (
            <CheckboxRow
              key={customer.id}
              checked={selectedIds.includes(customer.id)}
              title={customer.company}
              subtitle={customer.name}
              onClick={() => toggle(customer.id)}
            />
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-[#8a8a8a]">
              No customers match
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <ApplyButton disabled={selectedIds.length === 0} onClick={onApply} />
        </div>
      </div>
    </>
  );
}

function EndBusinessFilterStep({
  options,
  selectedIds,
  onChange,
  onBack,
  onApply,
}: {
  options: EndBusinessOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((entry) =>
      [entry.name, entry.customerName].join(" ").toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <>
      <PanelHeader title="End business" onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col space-y-2 p-3">
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search end businesses…"
            className="h-8 rounded-lg pl-8 text-xs"
            autoFocus
          />
        </div>
        <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
          <CheckboxRow
            checked={selectedIds.includes(NO_END_BUSINESS)}
            title="No end business"
            subtitle="Orders billed only to the parent account"
            onClick={() => toggle(NO_END_BUSINESS)}
          />
          {filtered.map((entry) => (
            <CheckboxRow
              key={entry.id}
              checked={selectedIds.includes(entry.id)}
              title={entry.name}
              subtitle={entry.customerName}
              onClick={() => toggle(entry.id)}
            />
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-[#8a8a8a]">
              No end businesses yet
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <ApplyButton disabled={selectedIds.length === 0} onClick={onApply} />
        </div>
      </div>
    </>
  );
}

function OrderNumberFilterStep({
  query,
  onChange,
  onBack,
  onApply,
}: {
  query: string;
  onChange: (q: string) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <PanelHeader title="Order number" onBack={onBack} />
      <div className="space-y-3 p-3">
        <Input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. SO-1042"
          className="h-9 rounded-lg text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) onApply();
          }}
        />
        <p className="text-[11px] text-[#8a8a8a]">
          Matches order numbers that contain your text.
        </p>
        <ApplyButton disabled={!query.trim()} onClick={onApply} />
      </div>
    </>
  );
}

function DateFilterStep({
  title,
  mode,
  date,
  onModeChange,
  onDateChange,
  onBack,
  onApply,
}: {
  title: string;
  mode: DocumentDateMode;
  date: string;
  onModeChange: (mode: DocumentDateMode) => void;
  onDateChange: (date: string) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <PanelHeader title={title} onBack={onBack} />
      <div className="space-y-3 p-3">
        <div className="flex rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-0.5">
          {DOCUMENT_DATE_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              className={cn(
                "flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors",
                mode === option.value
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-9 rounded-lg text-xs"
        />
        {title === "Due date" ? (
          <p className="text-[11px] leading-relaxed text-[#8a8a8a]">
            Uses the invoice due date when set, otherwise the order in-hands
            date — handy for client statement balances.
          </p>
        ) : null}
        <ApplyButton disabled={!date} onClick={onApply} />
      </div>
    </>
  );
}

function CheckboxRow({
  checked,
  title,
  subtitle,
  onClick,
}: {
  checked: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors",
        checked ? "bg-[#f0f5ff]" : "hover:bg-[#f6f6f7]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
            : "border-[#d4d4d4] bg-white"
        )}
      >
        {checked ? <Check className="size-2.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#303030]">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-[#8a8a8a]">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

function ApplyButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      className={cn(dashboardPrimaryButtonClass, "h-8 w-full text-xs")}
      disabled={disabled}
      onClick={onClick}
    >
      Apply filter
    </Button>
  );
}
