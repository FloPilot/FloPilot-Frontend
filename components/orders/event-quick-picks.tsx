"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { decorationLabel } from "@/lib/format";
import { imprintLocationLabel } from "@/lib/job-imprints";
import type { ProductionStepTemplate } from "@/lib/order-production";
import type { DecorationTypeOption, PrintLocationOption } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

export type EventQuickPickFilter = "all" | "finishing" | string;

export function EventQuickPickFilters({
  templates,
  decorationTypeOptions,
  filter,
  onChange,
}: {
  templates: ProductionStepTemplate[];
  decorationTypeOptions: DecorationTypeOption[];
  filter: EventQuickPickFilter;
  onChange: (filter: EventQuickPickFilter) => void;
}) {
  const counts = useMemo(() => {
    const byType = new Map<string, number>();
    let finishing = 0;
    for (const template of templates) {
      if (template.kind === "finishing") {
        finishing += 1;
        continue;
      }
      byType.set(
        template.decoration,
        (byType.get(template.decoration) ?? 0) + 1
      );
    }
    return { byType, finishing, all: templates.length };
  }, [templates]);

  const pills: { value: EventQuickPickFilter; label: string; count: number }[] =
    [
      { value: "all", label: "All", count: counts.all },
      ...decorationTypeOptions
        .filter((type) => (counts.byType.get(type.value) ?? 0) > 0)
        .map((type) => ({
          value: type.value,
          label: type.label,
          count: counts.byType.get(type.value) ?? 0,
        })),
    ];

  // Include decoration types present on picks but not in the shop catalog
  for (const [value, count] of counts.byType) {
    if (pills.some((pill) => pill.value === value)) continue;
    pills.push({
      value,
      label: decorationLabel(value),
      count,
    });
  }

  if (counts.finishing > 0) {
    pills.push({
      value: "finishing",
      label: "Finishing",
      count: counts.finishing,
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((pill) => {
        const active = filter === pill.value;
        return (
          <button
            key={pill.value}
            type="button"
            onClick={() => onChange(pill.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
              active
                ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9c9c9] hover:text-[#303030]"
            )}
          >
            {pill.label}
            <span
              className={cn(
                "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                active
                  ? "bg-[#2c6ecb] text-white"
                  : "bg-[#f1f1f1] text-[#616161]"
              )}
            >
              {pill.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function filterEventQuickPicks(
  templates: ProductionStepTemplate[],
  filter: EventQuickPickFilter,
  query = ""
): ProductionStepTemplate[] {
  const needle = query.trim().toLowerCase();
  return templates.filter((template) => {
    if (filter === "finishing") {
      if (template.kind !== "finishing") return false;
    } else if (filter !== "all") {
      if (template.kind === "finishing" || template.decoration !== filter) {
        return false;
      }
    }
    if (!needle) return true;
    const haystack = [
      template.name,
      template.decoration,
      decorationLabel(template.decoration),
      template.locationKey,
      template.kind,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function EventQuickPickGrid({
  templates,
  printLocationOptions,
  onSelect,
  disabled,
  emptyTitle = "No matches",
  emptyDescription = "Try another decoration type or clear the search.",
}: {
  templates: ProductionStepTemplate[];
  printLocationOptions: PrintLocationOption[];
  onSelect: (template: ProductionStepTemplate) => void;
  disabled?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-10 text-center">
        <p className="text-sm font-medium text-[#303030]">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#8a8a8a]">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const methodLabel =
          template.kind === "finishing"
            ? "Finishing"
            : decorationLabel(template.decoration);
        const location =
          template.kind === "finishing"
            ? "No press · floor finish"
            : imprintLocationLabel(
                template.locationKey,
                printLocationOptions
              );

        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(template)}
            className={cn(
              "group rounded-xl border border-[#e3e3e3] bg-white p-4 text-left transition-colors",
              "hover:border-[#2c6ecb]/40 hover:bg-[#f7faff]",
              "disabled:pointer-events-none disabled:opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#303030] group-hover:text-[#2c6ecb]">
                {template.name}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                  template.kind === "finishing"
                    ? "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]"
                    : "border-[#c9d7ef] bg-[#f4f7fd] text-[#2c6ecb]"
                )}
              >
                {methodLabel}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-[#8a8a8a]">{location}</p>
          </button>
        );
      })}
    </div>
  );
}

export function EventQuickPickBrowser({
  templates,
  decorationTypeOptions,
  printLocationOptions,
  onSelect,
  disabled,
  className,
}: {
  templates: ProductionStepTemplate[];
  decorationTypeOptions: DecorationTypeOption[];
  printLocationOptions: PrintLocationOption[];
  onSelect: (template: ProductionStepTemplate) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [filter, setFilter] = useState<EventQuickPickFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterEventQuickPicks(templates, filter, query),
    [templates, filter, query]
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <EventQuickPickFilters
        templates={templates}
        decorationTypeOptions={decorationTypeOptions}
        filter={filter}
        onChange={setFilter}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search locations…"
          className="h-9 w-full rounded-lg border border-[#e3e3e3] bg-white pl-9 pr-3 text-xs text-[#303030] outline-none placeholder:text-[#8a8a8a] focus:border-[#2c6ecb]/50 focus:ring-2 focus:ring-[#2c6ecb]/15"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <EventQuickPickGrid
          templates={filtered}
          printLocationOptions={printLocationOptions}
          onSelect={onSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
