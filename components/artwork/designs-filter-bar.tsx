"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronRight,
  Hash,
  Palette,
  Plus,
  Search,
  Shirt,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type DesignsFilterOption = {
  value: string;
  label: string;
};

export type DesignsStatusTab = {
  value: string;
  label: string;
  count: number;
};

export type DesignsActiveFilter = {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
};

export type DesignsAddFilterField =
  | "customer"
  | "artist"
  | "design_code"
  | "decoration";

const FIELD_META: Record<
  DesignsAddFilterField,
  { label: string; icon: LucideIcon; searchPlaceholder: string }
> = {
  customer: {
    label: "Customer",
    icon: Building2,
    searchPlaceholder: "Search customers…",
  },
  artist: {
    label: "Artist",
    icon: Palette,
    searchPlaceholder: "Search artists…",
  },
  design_code: {
    label: "Design code",
    icon: Hash,
    searchPlaceholder: "Search design codes…",
  },
  decoration: {
    label: "Decoration",
    icon: Shirt,
    searchPlaceholder: "Search decoration types…",
  },
};

function ActiveFilterChip({
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
      <span className="flex shrink-0 items-center border-r border-[#ebebeb] px-2 py-1.5 text-[#8a8a8a]">
        {label}
      </span>
      <span className="flex max-w-[200px] items-center truncate bg-[#f4f7fd] px-2 py-1.5 font-medium text-[#303030]">
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center border-l border-[#ebebeb] px-1.5 text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#303030]"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function DesignsFilterBar({
  statusTabs,
  activeStatus,
  onStatusChange,
  activeFilters,
  onClearFilters,
  availableFields,
  fieldOptions,
  onSelectOption,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search orders, design codes, customers…",
}: {
  statusTabs: DesignsStatusTab[];
  activeStatus: string;
  onStatusChange: (value: string) => void;
  activeFilters: DesignsActiveFilter[];
  onClearFilters: () => void;
  availableFields: DesignsAddFilterField[];
  fieldOptions: Partial<Record<DesignsAddFilterField, DesignsFilterOption[]>>;
  onSelectOption: (field: DesignsAddFilterField, value: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<"pick" | DesignsAddFilterField>("pick");
  const [pickerSearch, setPickerSearch] = useState("");
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);

  const closeAddPanel = () => {
    setAddOpen(false);
    setAddStep("pick");
    setPickerSearch("");
  };

  useEffect(() => {
    if (!addOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        addPanelRef.current?.contains(target) ||
        addTriggerRef.current?.contains(target)
      ) {
        return;
      }
      closeAddPanel();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAddPanel();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [addOpen]);

  const pickerOptions = useMemo(() => {
    if (addStep === "pick") return [];
    const options = fieldOptions[addStep] ?? [];
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.label.toLowerCase().includes(q));
  }, [addStep, fieldOptions, pickerSearch]);

  const hasExtraFilters = activeFilters.length > 0;

  return (
    <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
        <div className="flex flex-wrap rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                activeStatus === tab.value
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              {tab.label}
              <span className="ml-1 tabular-nums text-[#8a8a8a]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2 bg-[#fafafa] px-3 py-2.5">
        <span className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Filters
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <ActiveFilterChip
              key={filter.id}
              label={filter.label}
              value={filter.value}
              onRemove={filter.onRemove}
            />
          ))}

          <div className="relative shrink-0">
            <button
              ref={addTriggerRef}
              type="button"
              onClick={() => {
                if (addOpen) closeAddPanel();
                else {
                  setAddStep("pick");
                  setPickerSearch("");
                  setAddOpen(true);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-medium transition-colors",
                addOpen
                  ? "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
                  : "border-[#d8d8d8] bg-white text-[#616161] hover:border-[#2c6ecb]/30 hover:text-[#303030]"
              )}
            >
              <Plus className="size-3.5" />
              Add filter
            </button>

            {addOpen ? (
              <div
                ref={addPanelRef}
                className="absolute left-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),320px)] rounded-xl border border-[#e3e3e3] bg-white shadow-xl ring-1 ring-black/5"
              >
                {addStep === "pick" ? (
                  <div>
                    <div className="border-b border-[#ebebeb] px-3 py-2.5">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        Add filter
                      </p>
                    </div>
                    <div className="p-1.5">
                      {availableFields.map((field) => {
                        const meta = FIELD_META[field];
                        const Icon = meta.icon;
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              setAddStep(field);
                              setPickerSearch("");
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-[#303030] hover:bg-[#f6f6f7]"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Icon className="size-3.5 text-[#8a8a8a]" />
                              {meta.label}
                            </span>
                            <ChevronRight className="size-3.5 text-[#c9c9c9]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAddStep("pick");
                          setPickerSearch("");
                        }}
                        className="text-[12px] font-medium text-[#2c6ecb]"
                      >
                        Back
                      </button>
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {FIELD_META[addStep].label}
                      </p>
                    </div>
                    <div className="space-y-2 p-2.5">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                        <Input
                          value={pickerSearch}
                          onChange={(event) =>
                            setPickerSearch(event.target.value)
                          }
                          placeholder={FIELD_META[addStep].searchPlaceholder}
                          className={cn(
                            dashboardControlClass,
                            "h-9 bg-white pl-8 shadow-none"
                          )}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {pickerOptions.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              onSelectOption(addStep, item.value);
                              closeAddPanel();
                            }}
                            className="flex w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#303030] hover:bg-[#f6f6f7]"
                          >
                            {item.label}
                          </button>
                        ))}
                        {pickerOptions.length === 0 ? (
                          <p className="px-2.5 py-3 text-[12px] text-[#8a8a8a]">
                            No matches.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {hasExtraFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className={cn(
              dashboardControlClass,
              "h-8 shrink-0 gap-1.5 px-2.5 text-[12px] text-[#616161] hover:text-[#303030]"
            )}
          >
            <X className="size-3.5 shrink-0" strokeWidth={2} />
            Clear filters
          </button>
        ) : null}
      </div>

      {onSearchChange ? (
        <div className="border-t border-[#ebebeb] px-3 py-2.5">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={searchValue ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(dashboardControlClass, "h-9 w-full bg-white pl-9")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
