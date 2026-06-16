"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyAdvancedFilters,
  createFilterId,
  FILTER_FIELD_OPTIONS,
  getFilterChipParts,
  IN_HANDS_DATE_MODES,
  ORDER_STATUS_OPTIONS,
  type InHandsDateMode,
  type OrderAdvancedFilter,
  type OrderFilterField,
} from "@/lib/order-advanced-filters";
import type { Customer, Order, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

type PanelStep = "pick" | OrderFilterField;

export function OrderFilterBuilder({
  customers,
  filters,
  onChange,
}: {
  customers: Customer[];
  filters: OrderAdvancedFilter[];
  onChange: (filters: OrderAdvancedFilter[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PanelStep>("pick");
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const resetPanel = () => {
    setStep("pick");
    setDraftCustomerIds([]);
    setDraftOrderQuery("");
    setDraftStatuses([]);
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

  const addFilter = (filter: OrderAdvancedFilter) => {
    onChange([...filters, filter]);
    closePanel();
  };

  const [draftCustomerIds, setDraftCustomerIds] = useState<string[]>([]);
  const [draftOrderQuery, setDraftOrderQuery] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<OrderStatus[]>([]);
  const [draftDateMode, setDraftDateMode] = useState<InHandsDateMode>("before");
  const [draftDate, setDraftDate] = useState("");

  const openField = (field: OrderFilterField) => {
    resetPanel();
    setStep(field);
    setOpen(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
      {filters.map((filter) => {
        const { label, value } = getFilterChipParts(filter, customers);
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
              ? "border-brand-primary/40 bg-brand-primary/5 text-brand-primary"
              : "border-border bg-white text-brand-muted hover:border-brand-primary/30 hover:text-brand-ink"
          )}
        >
          <Plus className="size-3.5" />
          Add filter
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute left-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),320px)] rounded-xl border border-border bg-white shadow-xl ring-1 ring-black/5"
          >
            {step === "pick" ? (
              <FilterPickStep onSelect={openField} />
            ) : step === "customer" ? (
              <CustomerFilterStep
                customers={customers}
                selectedIds={draftCustomerIds}
                onChange={setDraftCustomerIds}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (draftCustomerIds.length === 0) return;
                  addFilter({
                    id: createFilterId(),
                    field: "customer",
                    customerIds: draftCustomerIds,
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
                    id: createFilterId(),
                    field: "order_number",
                    query: draftOrderQuery.trim(),
                  });
                }}
              />
            ) : step === "status" ? (
              <StatusFilterStep
                selected={draftStatuses}
                onChange={setDraftStatuses}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (draftStatuses.length === 0) return;
                  addFilter({
                    id: createFilterId(),
                    field: "status",
                    statuses: draftStatuses,
                  });
                }}
              />
            ) : (
              <InHandsDateFilterStep
                mode={draftDateMode}
                date={draftDate}
                onModeChange={setDraftDateMode}
                onDateChange={setDraftDate}
                onBack={() => setStep("pick")}
                onApply={() => {
                  if (!draftDate) return;
                  addFilter({
                    id: createFilterId(),
                    field: "in_hands_date",
                    mode: draftDateMode,
                    date: draftDate,
                  });
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function filterOrdersWithAdvanced(
  orders: Order[],
  filters: OrderAdvancedFilter[]
): Order[] {
  return applyAdvancedFilters(orders, filters);
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
    <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-lg border border-border bg-white text-xs shadow-sm">
      <span className="flex items-center px-2 py-1.5 text-brand-muted border-r border-border shrink-0">
        {label}
      </span>
      <span className="flex items-center px-2 py-1.5 font-medium text-brand-ink bg-brand-primary/[0.06] truncate max-w-[180px]">
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center px-1.5 text-brand-muted hover:bg-muted/60 hover:text-brand-ink border-l border-border"
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
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-brand-muted hover:bg-muted/60 hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" />
        </button>
      )}
      <p className="text-xs font-semibold text-brand-ink">{title}</p>
    </div>
  );
}

function FilterPickStep({
  onSelect,
}: {
  onSelect: (field: OrderFilterField) => void;
}) {
  return (
    <div className="p-1">
      <PanelHeader title="Add filter" />
      <div className="p-1">
        {FILTER_FIELD_OPTIONS.map((option) => (
          <button
            key={option.field}
            type="button"
            onClick={() => onSelect(option.field)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <span>
              <span className="block text-xs font-medium text-brand-ink">
                {option.label}
              </span>
              <span className="block text-[11px] text-brand-muted mt-0.5">
                {option.hint}
              </span>
            </span>
            <ChevronRight className="size-4 text-brand-muted shrink-0" />
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
      <div className="p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-brand-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="h-8 pl-8 text-xs rounded-lg"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {filtered.map((customer) => {
            const checked = selectedIds.includes(customer.id);
            return (
              <CheckboxRow
                key={customer.id}
                checked={checked}
                title={customer.company}
                subtitle={customer.name}
                onClick={() => toggle(customer.id)}
              />
            );
          })}
        </div>
        <ApplyButton disabled={selectedIds.length === 0} onClick={onApply} />
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
      <div className="p-3 space-y-3">
        <Input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. SO-1042"
          className="h-9 text-xs rounded-lg"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) onApply();
          }}
        />
        <p className="text-[11px] text-brand-muted">
          Matches order numbers that contain your text.
        </p>
        <ApplyButton disabled={!query.trim()} onClick={onApply} />
      </div>
    </>
  );
}

function StatusFilterStep({
  selected,
  onChange,
  onBack,
  onApply,
}: {
  selected: OrderStatus[];
  onChange: (statuses: OrderStatus[]) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const toggle = (status: OrderStatus) => {
    onChange(
      selected.includes(status)
        ? selected.filter((s) => s !== status)
        : [...selected, status]
    );
  };

  return (
    <>
      <PanelHeader title="Status" onBack={onBack} />
      <div className="p-3 space-y-2">
        <div className="max-h-52 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {ORDER_STATUS_OPTIONS.map((option) => (
            <CheckboxRow
              key={option.value}
              checked={selected.includes(option.value)}
              title={option.label}
              onClick={() => toggle(option.value)}
            />
          ))}
        </div>
        <ApplyButton disabled={selected.length === 0} onClick={onApply} />
      </div>
    </>
  );
}

function InHandsDateFilterStep({
  mode,
  date,
  onModeChange,
  onDateChange,
  onBack,
  onApply,
}: {
  mode: InHandsDateMode;
  date: string;
  onModeChange: (mode: InHandsDateMode) => void;
  onDateChange: (date: string) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <PanelHeader title="In-hands date" onBack={onBack} />
      <div className="p-3 space-y-3">
        <div className="flex rounded-lg border border-border bg-muted/20 p-0.5">
          {IN_HANDS_DATE_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                mode === option.value
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted hover:text-brand-ink"
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
          className="h-9 text-xs rounded-lg"
        />
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
        checked ? "bg-brand-primary/8" : "hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-brand-primary bg-brand-primary text-white"
            : "border-border bg-white"
        )}
      >
        {checked && <Check className="size-2.5" />}
      </span>
      <span className="min-w-0">
        <span className="font-medium block truncate text-brand-ink">{title}</span>
        {subtitle && (
          <span className="text-brand-muted truncate block">{subtitle}</span>
        )}
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
      className="w-full rounded-lg h-8 text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      Apply filter
    </Button>
  );
}
