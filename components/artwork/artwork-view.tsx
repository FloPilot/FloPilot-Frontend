"use client";

import Link from "next/link";
import { useGuardedRouter } from "@/hooks/use-guarded-router";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileImage,
  Loader2,
  Palette,
  RotateCcw,
  Search,
} from "lucide-react";
import { DesignLibraryView } from "@/components/artwork/design-library-view";
import {
  DesignsFilterBar,
  type DesignsAddFilterField,
  type DesignsActiveFilter,
} from "@/components/artwork/designs-filter-bar";
import {
  BulkArchiveOrdersDialog,
  type BulkArchiveMode,
} from "@/components/orders/bulk-archive-orders-dialog";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ARTWORK_QUEUE_FILTERS,
  artworkQueueEntryKey,
  collectArtworkQueue,
  countArtworkQueue,
  countArtworkScopes,
  filterArtworkQueue,
  filterArtworkQueueByScope,
  searchArtworkQueue,
  type ArtworkQueueFilter,
  type ArtworkQueueScope,
} from "@/lib/artwork-queue";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { groupArtworkDepartmentByOrder } from "@/lib/department-queues";
import { decorationLabel, formatDate } from "@/lib/format";
import { formatOrderRef } from "@/lib/order-display";
import { artworkOrderWorkspaceHref } from "@/lib/artwork-routes";
import {
  artDueDateKey,
  formatArtDueLabel,
  rollupArtworkStatus,
  sharedArtAssigneeId,
} from "@/lib/artwork-status";
import { getProofSlides } from "@/lib/proof-slides";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";

const KPI_CONFIG: {
  key: ArtworkQueueFilter;
  label: string;
  hint: string;
  icon: LucideIcon;
  surface: string;
  border: string;
  iconWrap: string;
  iconColor: string;
  valueColor: string;
}[] = [
  {
    key: "all",
    label: "All locations",
    hint: "Decoration spots with artwork",
    icon: FileImage,
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  },
  {
    key: "pending",
    label: "Pending",
    hint: "Awaiting review or proof",
    icon: Clock,
    surface: "bg-[#f4f7fd]",
    border: "border-[#c4d7f2]",
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#2c6ecb]",
  },
  {
    key: "revision_requested",
    label: "Revision",
    hint: "Changes requested",
    icon: RotateCcw,
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  },
  {
    key: "approved",
    label: "Approved",
    hint: "Ready for production",
    icon: CheckCircle2,
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
];

const SCOPE_OPTIONS: { value: ArtworkQueueScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

function EmptyState({
  filter,
  scope,
  hasSearch,
}: {
  filter: ArtworkQueueFilter;
  scope: ArtworkQueueScope;
  hasSearch: boolean;
}) {
  if (hasSearch) {
    return (
      <div className="px-6 py-16 text-center">
        <Search className="mx-auto mb-3 size-8 text-[#c9cccf]" />
        <p className="text-sm font-medium text-[#303030]">No matches</p>
        <p className="mt-1 text-sm text-[#616161]">
          Try a different order number, customer, design code, or clear filters.
        </p>
      </div>
    );
  }

  if (scope === "archived") {
    return (
      <div className="px-6 py-16 text-center">
        <Archive className="mx-auto mb-3 size-8 text-[#c9cccf]" />
        <p className="text-sm font-medium text-[#303030]">No archived artwork</p>
        <p className="mt-1 text-sm text-[#616161]">
          Artwork moves here automatically when its order is archived.
        </p>
      </div>
    );
  }

  if (filter !== "all") {
    return (
      <div className="px-6 py-16 text-center">
        <FileImage className="mx-auto mb-3 size-8 text-[#c9cccf]" />
        <p className="text-sm font-medium text-[#303030]">
          No {filter.replace("_", " ")} artwork
        </p>
        <p className="mt-1 text-sm text-[#616161]">
          Switch filters or check back when proofs move through review.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
        <FileImage className="size-6" />
      </div>
      <p className="text-sm font-medium text-[#303030]">No artwork yet</p>
      <p className="mt-2 text-sm leading-relaxed text-[#616161]">
        When you create an order with decoration events or attach files, each
        imprint location shows up here for proofing and approval.
      </p>
      <Button
        className={cn(dashboardControlClass, "mt-5 h-9")}
        nativeButton={false}
        render={<Link href="/app/orders" />}
      >
        <ClipboardList className="size-3.5" />
        View orders
      </Button>
    </div>
  );
}

export function ArtworkView() {
  const router = useGuardedRouter();
  const { orders, bulkArchiveOrders, restoreOrder, getCustomerById } =
    useSchedule();
  const { isAdmin } = useStaffAccess();
  const [tab, setTab] = useState<"queue" | "library">("queue");
  const [filter, setFilter] = useState<ArtworkQueueFilter>("all");
  const [scope, setScope] = useState<ArtworkQueueScope>("active");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState(ALL_VALUE);
  const [artistFilter, setArtistFilter] = useState(ALL_VALUE);
  const [designCodeFilter, setDesignCodeFilter] = useState(ALL_VALUE);
  const [decorationFilter, setDecorationFilter] = useState(ALL_VALUE);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreSaving, setRestoreSaving] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const entries = useMemo(() => collectArtworkQueue(orders), [orders]);
  const scopeCounts = useMemo(() => countArtworkScopes(entries), [entries]);

  const scopedEntries = useMemo(
    () => filterArtworkQueueByScope(entries, scope),
    [entries, scope]
  );
  const counts = useMemo(
    () => countArtworkQueue(scopedEntries),
    [scopedEntries]
  );

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of scopedEntries) {
      const customer = getCustomerById(entry.customerId);
      map.set(
        entry.customerId,
        customer?.company || entry.company || entry.customerName
      );
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [scopedEntries, getCustomerById]);

  const artistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of scopedEntries) {
      const id = entry.artwork.artAssigneeId?.trim();
      if (!id) continue;
      map.set(id, entry.artwork.artAssigneeName?.trim() || "Artist");
    }
    return [
      { value: "unassigned", label: "Unassigned" },
      ...Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [scopedEntries]);

  const designCodeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of scopedEntries) {
      const code = entry.designCode?.trim();
      if (!code) continue;
      map.set(code.toUpperCase(), code.toUpperCase());
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [scopedEntries]);

  const decorationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of scopedEntries) {
      map.set(entry.decoration, decorationLabel(entry.decoration));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [scopedEntries]);

  const filtered = useMemo(() => {
    const byStatus = filterArtworkQueue(scopedEntries, filter);
    const byMeta = byStatus.filter((entry) => {
      if (
        customerFilter !== ALL_VALUE &&
        entry.customerId !== customerFilter
      ) {
        return false;
      }
      if (artistFilter !== ALL_VALUE) {
        if (artistFilter === "unassigned") {
          if (entry.artwork.artAssigneeId) return false;
        } else if (entry.artwork.artAssigneeId !== artistFilter) {
          return false;
        }
      }
      if (
        designCodeFilter !== ALL_VALUE &&
        entry.designCode?.trim().toUpperCase() !== designCodeFilter
      ) {
        return false;
      }
      if (
        decorationFilter !== ALL_VALUE &&
        entry.decoration !== decorationFilter
      ) {
        return false;
      }
      return true;
    });
    return searchArtworkQueue(byMeta, search);
  }, [
    scopedEntries,
    filter,
    search,
    customerFilter,
    artistFilter,
    designCodeFilter,
    decorationFilter,
  ]);

  const orderGroups = useMemo(
    () => groupArtworkDepartmentByOrder(filtered),
    [filtered]
  );

  const statusTabs = useMemo(
    () => [
      { value: "all", label: "All", count: counts.all },
      ...ARTWORK_QUEUE_FILTERS.slice(1).map((option) => ({
        value: option.value,
        label: option.label,
        count: counts[option.value],
      })),
    ],
    [counts]
  );

  const activeFilters = useMemo((): DesignsActiveFilter[] => {
    const chips: DesignsActiveFilter[] = [];
    if (customerFilter !== ALL_VALUE) {
      chips.push({
        id: "customer",
        label: "Customer",
        value:
          customerOptions.find((item) => item.value === customerFilter)
            ?.label || "Customer",
        onRemove: () => setCustomerFilter(ALL_VALUE),
      });
    }
    if (artistFilter !== ALL_VALUE) {
      chips.push({
        id: "artist",
        label: "Artist",
        value:
          artistOptions.find((item) => item.value === artistFilter)?.label ||
          "Artist",
        onRemove: () => setArtistFilter(ALL_VALUE),
      });
    }
    if (designCodeFilter !== ALL_VALUE) {
      chips.push({
        id: "design_code",
        label: "Design code",
        value: designCodeFilter,
        onRemove: () => setDesignCodeFilter(ALL_VALUE),
      });
    }
    if (decorationFilter !== ALL_VALUE) {
      chips.push({
        id: "decoration",
        label: "Decoration",
        value: decorationLabel(decorationFilter),
        onRemove: () => setDecorationFilter(ALL_VALUE),
      });
    }
    return chips;
  }, [
    customerFilter,
    artistFilter,
    designCodeFilter,
    decorationFilter,
    customerOptions,
    artistOptions,
  ]);

  const clearExtraFilters = () => {
    setCustomerFilter(ALL_VALUE);
    setArtistFilter(ALL_VALUE);
    setDesignCodeFilter(ALL_VALUE);
    setDecorationFilter(ALL_VALUE);
  };

  const handleSelectFilterOption = (
    field: DesignsAddFilterField,
    value: string
  ) => {
    if (field === "customer") setCustomerFilter(value);
    else if (field === "artist") setArtistFilter(value);
    else if (field === "design_code") setDesignCodeFilter(value);
    else if (field === "decoration") setDecorationFilter(value);
  };

  const needsAttention = counts.pending + counts.revision_requested;
  const canBulkSelect = isAdmin && scope !== "all";
  const selectedCount = selectedKeys.size;

  const selectedOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of filtered) {
      if (selectedKeys.has(artworkQueueEntryKey(entry))) {
        ids.add(entry.orderId);
      }
    }
    return [...ids];
  }, [filtered, selectedKeys]);

  const allVisibleSelected =
    canBulkSelect &&
    filtered.length > 0 &&
    filtered.every((entry) => selectedKeys.has(artworkQueueEntryKey(entry)));

  useEffect(() => {
    setSelectedKeys(new Set());
    setStatusMessage(null);
  }, [
    scope,
    filter,
    search,
    tab,
    customerFilter,
    artistFilter,
    designCodeFilter,
    decorationFilter,
  ]);

  useEffect(() => {
    const visibleKeys = new Set(
      filtered.map((entry) => artworkQueueEntryKey(entry))
    );
    setSelectedKeys((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of current) {
        if (visibleKeys.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [filtered]);

  const toggleOrderGroup = (orderId: string) => {
    const keys = filtered
      .filter((entry) => entry.orderId === orderId)
      .map((entry) => artworkQueueEntryKey(entry));
    setSelectedKeys((current) => {
      const everySelected =
        keys.length > 0 && keys.every((key) => current.has(key));
      const next = new Set(current);
      if (everySelected) {
        for (const key of keys) next.delete(key);
      } else {
        for (const key of keys) next.add(key);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedKeys((current) => {
      const visibleKeys = filtered.map((entry) => artworkQueueEntryKey(entry));
      const everySelected =
        visibleKeys.length > 0 && visibleKeys.every((key) => current.has(key));
      if (everySelected) return new Set();
      return new Set(visibleKeys);
    });
  };

  const handleBulkArchive = async (mode: BulkArchiveMode) => {
    if (selectedOrderIds.length === 0) {
      throw new Error("Select at least one artwork row to archive its order.");
    }
    const result = await bulkArchiveOrders(selectedOrderIds, {
      includeOrderData: mode === "orders_and_data",
    });
    setSelectedKeys(new Set());
    setStatusMessage(
      result.errors.length > 0
        ? `Archived ${result.archivedCount} of ${result.requestedCount} orders. ${result.errors.length} could not be archived.`
        : mode === "orders_and_data"
          ? `Archived ${result.archivedCount} order${result.archivedCount === 1 ? "" : "s"} and linked design data.`
          : `Archived ${result.archivedCount} order${result.archivedCount === 1 ? "" : "s"}. Artwork moved to Archived.`
    );
  };

  const handleBulkRestore = async () => {
    if (selectedOrderIds.length === 0) {
      throw new Error("Select at least one artwork row to restore its order.");
    }
    setRestoreSaving(true);
    setRestoreError(null);
    let restored = 0;
    const errors: string[] = [];
    try {
      for (const orderId of selectedOrderIds) {
        try {
          await restoreOrder(orderId);
          restored += 1;
        } catch (err) {
          errors.push(
            err instanceof Error ? err.message : "Could not restore an order."
          );
        }
      }
      setSelectedKeys(new Set());
      setStatusMessage(
        errors.length > 0
          ? `Restored ${restored} of ${selectedOrderIds.length} orders. ${errors.length} could not be restored.`
          : `Restored ${restored} order${restored === 1 ? "" : "s"}. Artwork moved to Active.`
      );
      setRestoreOpen(false);
    } catch (err) {
      setRestoreError(
        err instanceof Error ? err.message : "Could not restore the selected orders."
      );
    } finally {
      setRestoreSaving(false);
    }
  };

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={dashboardSectionTitleClass}>Designs</h1>
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              {scope === "active" && needsAttention > 0
                ? `${needsAttention} location${needsAttention !== 1 ? "s" : ""} need attention — pending review or revision requested`
                : "Artwork queue and saved design library for repeat decoration"}
            </p>
          </div>
          <div
            className={cn(
              "flex gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
              dashboardElevatedShadow
            )}
          >
            {(
              [
                { id: "queue", label: "Artwork" },
                { id: "library", label: "Design library" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTab(option.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  tab === option.id
                    ? "bg-[#f4f7fd] text-[#2c6ecb]"
                    : "text-[#616161] hover:text-[#303030]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "library" ? (
          <DesignLibraryView />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {KPI_CONFIG.map((config) => {
                const Icon = config.icon;
                const value = counts[config.key];
                const isActive = config.key !== "all" && filter === config.key;

                return (
                  <button
                    key={config.key}
                    type="button"
                    onClick={() =>
                      setFilter((current) =>
                        current === config.key && config.key !== "all"
                          ? "all"
                          : config.key
                      )
                    }
                    className={cn(
                      dashboardKpiCardClass,
                      "min-h-[128px] border text-left",
                      config.surface,
                      config.border,
                      isActive && "ring-2 ring-[#2c6ecb]/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          config.iconWrap
                        )}
                      >
                        <Icon
                          className={cn("size-3.5", config.iconColor)}
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className={dashboardKpiTitleClass}>{config.label}</p>
                    </div>
                    <p
                      className={cn(
                        dashboardValueClass,
                        "mt-2.5",
                        config.valueColor
                      )}
                    >
                      {value}
                    </p>
                    <p className="mt-1.5 text-xs leading-snug text-[#616161]">
                      {config.hint}
                    </p>
                  </button>
                );
              })}
            </div>

            {scope === "active" && needsAttention > 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#8a6116]" />
                <p className="text-[#5a4410]">
                  <span className="font-semibold">{needsAttention}</span> location
                  {needsAttention !== 1 ? "s" : ""} need attention — pending review
                  or revision requested.
                </p>
              </div>
            ) : null}

            <section className={dashboardCardClass}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#303030]">
                    Artwork by order
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#616161]">
                    {orderGroups.length} order
                    {orderGroups.length !== 1 ? "s" : ""}
                    {" · "}
                    {filtered.length} location
                    {filtered.length !== 1 ? "s" : ""}
                    {filter !== "all"
                      ? ` · ${ARTWORK_QUEUE_FILTERS.find((item) => item.value === filter)?.label}`
                      : ""}
                    {scope !== "active" ? ` · ${scope === "archived" ? "Archived" : "All orders"}` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1">
                  {SCOPE_OPTIONS.map((option) => {
                    const scopeCount =
                      option.value === "active"
                        ? scopeCounts.active
                        : option.value === "archived"
                          ? scopeCounts.archived
                          : scopeCounts.all;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setScope(option.value)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                          scope === option.value
                            ? "bg-[#f4f7fd] text-[#2c6ecb]"
                            : "text-[#616161] hover:text-[#303030]"
                        )}
                      >
                        {option.label}
                        <span className="ml-1.5 tabular-nums text-[10px] opacity-70">
                          {scopeCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-0 p-4 sm:p-5">
                <DesignsFilterBar
                  statusTabs={statusTabs}
                  activeStatus={filter}
                  onStatusChange={(value) =>
                    setFilter(value as ArtworkQueueFilter)
                  }
                  activeFilters={activeFilters}
                  onClearFilters={clearExtraFilters}
                  availableFields={[
                    "customer",
                    "artist",
                    "design_code",
                    "decoration",
                  ]}
                  fieldOptions={{
                    customer: customerOptions,
                    artist: artistOptions,
                    design_code: designCodeOptions,
                    decoration: decorationOptions,
                  }}
                  onSelectOption={handleSelectFilterOption}
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search orders, design codes, customers…"
                />

                <div className="mt-4 space-y-2.5">
                  {canBulkSelect && selectedCount > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#dbe6f5] bg-[#f4f7fd] px-3 py-2.5">
                      <p className="text-[13px] font-medium text-[#303030]">
                        {selectedCount} location
                        {selectedCount === 1 ? "" : "s"} selected
                        {selectedOrderIds.length > 0
                          ? ` · ${selectedOrderIds.length} order${selectedOrderIds.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(dashboardControlClass, "h-8")}
                          onClick={() => setSelectedKeys(new Set())}
                        >
                          Clear
                        </Button>
                        {scope === "archived" ? (
                          <Button
                            type="button"
                            size="sm"
                            className={cn(dashboardControlClass, "h-8")}
                            onClick={() => setRestoreOpen(true)}
                          >
                            <ArchiveRestore className="size-3.5" />
                            Restore selected
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className={cn(
                              dashboardControlClass,
                              "h-8 border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f]"
                            )}
                            onClick={() => setArchiveOpen(true)}
                          >
                            <Archive className="size-3.5" />
                            Archive selected
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {canBulkSelect && filtered.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#616161]">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="size-3.5 accent-[#2c6ecb]"
                        />
                        Select all visible orders
                      </label>
                    </div>
                  ) : null}

                  {statusMessage ? (
                    <p
                      className={cn(
                        "rounded-lg border px-3 py-2 text-[13px]",
                        statusMessage.toLowerCase().includes("could not")
                          ? "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]"
                          : "border-[#cfe8d8] bg-[#e8f5ee] text-[#0d5c2e]"
                      )}
                    >
                      {statusMessage}
                    </p>
                  ) : null}
                </div>

                {orderGroups.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa]">
                    <EmptyState
                      filter={filter}
                      scope={scope}
                      hasSearch={
                        Boolean(search.trim()) || activeFilters.length > 0
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {orderGroups.map((group) => {
                      const order = orders.find(
                        (item) => item.id === group.orderId
                      );
                      const statuses = group.proofs.map(
                        (proof) => proof.artwork.status
                      );
                      const rollup = rollupArtworkStatus(statuses);
                      const revisionCount = group.proofs.filter(
                        (proof) =>
                          proof.artwork.status === "revision_requested"
                      ).length;
                      const sharedArtistId = sharedArtAssigneeId(
                        group.proofs.map((proof) => proof.artwork)
                      );
                      const assignee = sharedArtistId
                        ? group.proofs.find(
                            (proof) =>
                              proof.artwork.artAssigneeId === sharedArtistId
                          )?.artwork.artAssigneeName?.trim() || null
                        : null;
                      const dueKeys = group.proofs
                        .map((proof) => artDueDateKey(proof.artwork.artDueAt))
                        .filter((value): value is string => Boolean(value))
                        .sort();
                      const earliestDue = dueKeys[0]
                        ? formatArtDueLabel(dueKeys[0])
                        : null;
                      const locationLabels = group.proofs
                        .map((proof) => proof.imprintLabel)
                        .filter(Boolean);
                      const locationSummary =
                        locationLabels.length <= 2
                          ? locationLabels.join(" · ")
                          : `${locationLabels.slice(0, 2).join(" · ")} +${
                              locationLabels.length - 2
                            } more`;
                      const thumbs = group.proofs
                        .map((proof) => {
                          const slides = getProofSlides(proof.artwork);
                          return (
                            slides[0]?.previewUrl ||
                            proof.artwork.previewUrl ||
                            null
                          );
                        })
                        .filter((url): url is string => Boolean(url))
                        .slice(0, 3);
                      const groupKeys = group.proofs.map((proof) =>
                        artworkQueueEntryKey(proof)
                      );
                      const groupSelected =
                        canBulkSelect &&
                        groupKeys.length > 0 &&
                        groupKeys.every((key) => selectedKeys.has(key));
                      const designCode =
                        order?.designCode?.trim() ||
                        group.proofs[0]?.designCode?.trim() ||
                        null;
                      const archived =
                        group.proofs.some((proof) => proof.archived) ||
                        Boolean(order?.archived);

                      return (
                        <div
                          key={group.orderId}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            router.push(
                              artworkOrderWorkspaceHref(group.orderId)
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              router.push(
                                artworkOrderWorkspaceHref(group.orderId)
                              );
                            }
                          }}
                          className={cn(
                            dashboardInsetSurfaceClass,
                            "flex cursor-pointer items-stretch gap-3 px-3 py-3 transition-colors hover:border-[#c9cccf] hover:bg-[#f6f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/25",
                            groupSelected && "border-[#2c6ecb] bg-[#f4f7fd]",
                            archived && "opacity-75"
                          )}
                        >
                          {canBulkSelect ? (
                            <label
                              className="flex items-start pt-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={groupSelected}
                                onChange={() =>
                                  toggleOrderGroup(group.orderId)
                                }
                                className="size-3.5 accent-[#2c6ecb]"
                                aria-label={`Select ${formatOrderRef(group)}`}
                              />
                            </label>
                          ) : null}

                          <div className="flex shrink-0 gap-1.5">
                            {thumbs.length > 0 ? (
                              thumbs.map((url, index) => (
                                <span
                                  key={`${group.orderId}-thumb-${index}`}
                                  className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#f6f6f7]"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </span>
                              ))
                            ) : (
                              <span className="flex size-12 items-center justify-center rounded-md border border-[#ebebeb] bg-[#f6f6f7] text-[#8a8a8a]">
                                <FileImage className="size-4" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[14px] font-semibold text-[#303030]">
                                {formatOrderRef(group)}
                              </p>
                              {designCode ? (
                                <span className="inline-flex items-center rounded-md border border-[#c4d7f2] bg-[#f4f7fd] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#2c6ecb]">
                                  {designCode}
                                </span>
                              ) : null}
                              {rollup ? (
                                <ArtworkStatusBadge status={rollup} size="sm" />
                              ) : null}
                              {archived ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                                  <Archive className="size-2.5" />
                                  Archived
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                              {group.company || group.customerName}
                              {" · "}
                              {group.proofs.length} proof
                              {group.proofs.length !== 1 ? "s" : ""}
                              {locationSummary
                                ? ` · ${locationSummary}`
                                : ""}
                              {assignee ? (
                                <>
                                  {" · "}
                                  <span className="inline-flex items-center gap-1">
                                    <Palette className="size-3" />
                                    {assignee}
                                  </span>
                                </>
                              ) : null}
                            </p>
                            <p className="mt-1 text-[12px] text-[#8a8a8a]">
                              {revisionCount > 0 ? (
                                <span className="font-medium text-[#8a6116]">
                                  {revisionCount} revision
                                  {revisionCount !== 1 ? "s" : ""} requested
                                  {" · "}
                                </span>
                              ) : null}
                              {earliestDue ? (
                                <span className="font-medium text-[#303030]">
                                  Due {earliestDue}
                                  {dueKeys.length > 1 ? "+" : ""}
                                  {" · "}
                                </span>
                              ) : null}
                              In hands {formatDate(group.inHandsDate)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center self-center text-[#8a8a8a]">
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <BulkArchiveOrdersDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        selectedCount={selectedOrderIds.length}
        onConfirm={handleBulkArchive}
      />

      <Dialog
        open={restoreOpen}
        onOpenChange={(next) => {
          if (restoreSaving) return;
          setRestoreError(null);
          setRestoreOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Restore{" "}
              {selectedOrderIds.length === 1
                ? "1 order"
                : `${selectedOrderIds.length.toLocaleString()} orders`}
              ?
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Restored orders return to Active work. Their artwork locations
              move back to the Active proof queue.
            </DialogDescription>
          </DialogHeader>
          {restoreError ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {restoreError}
            </p>
          ) : null}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "sm:min-w-[96px]")}
              disabled={restoreSaving}
              onClick={() => setRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardControlClass, "sm:min-w-[150px]")}
              disabled={restoreSaving || selectedOrderIds.length <= 0}
              onClick={() => void handleBulkRestore()}
            >
              {restoreSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArchiveRestore className="size-3.5" />
              )}
              Restore orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
