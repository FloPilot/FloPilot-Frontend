"use client";

import Link from "next/link";
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
  LayoutPanelLeft,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { ArtworkDetailDialog } from "@/components/artwork/artwork-detail-dialog";
import { DesignLibraryView } from "@/components/artwork/design-library-view";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ARTWORK_QUEUE_FILTERS,
  artworkQueueEntryKey,
  collectArtworkQueue,
  countArtworkQueue,
  countArtworkScopes,
  filterArtworkQueue,
  filterArtworkQueueByScope,
  searchArtworkQueue,
  type ArtworkQueueEntry,
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
import { decorationLabel, formatDate, formatDateTime } from "@/lib/format";
import { formatOrderRef } from "@/lib/order-display";
import { artworkOrderWorkspaceHref } from "@/lib/artwork-routes";
import { cn } from "@/lib/utils";

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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardControlClass,
        "h-8 px-2.5 text-[12px]",
        active && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
      )}
    >
      {children}
    </button>
  );
}

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
          Try a different order number, customer, or file name.
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
  const { orders, bulkArchiveOrders, restoreOrder } = useSchedule();
  const { isAdmin } = useStaffAccess();
  const [tab, setTab] = useState<"queue" | "library">("queue");
  const [filter, setFilter] = useState<ArtworkQueueFilter>("all");
  const [scope, setScope] = useState<ArtworkQueueScope>("active");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ArtworkQueueEntry | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const filtered = useMemo(() => {
    const byStatus = filterArtworkQueue(scopedEntries, filter);
    return searchArtworkQueue(byStatus, search);
  }, [scopedEntries, filter, search]);

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
  }, [scope, filter, search, tab]);

  useEffect(() => {
    const visibleKeys = new Set(filtered.map((entry) => artworkQueueEntryKey(entry)));
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

  const openEntry = (entry: ArtworkQueueEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  const toggleEntry = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
            <h1 className={dashboardSectionTitleClass}>Artwork</h1>
            <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
              {scope === "active" && needsAttention > 0
                ? `${needsAttention} location${needsAttention !== 1 ? "s" : ""} need attention — pending review or revision requested`
                : "Proof queue and saved design library for repeat decoration"}
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
                { id: "queue", label: "Proof queue" },
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
                    Artwork queue
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#616161]">
                    {filtered.length} location{filtered.length !== 1 ? "s" : ""}
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
                <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ARTWORK_QUEUE_FILTERS.slice(1).map((option) => (
                        <FilterChip
                          key={option.value}
                          active={filter === option.value}
                          onClick={() =>
                            setFilter((current) =>
                              current === option.value ? "all" : option.value
                            )
                          }
                        >
                          {option.label}
                          <span className="ml-1.5 tabular-nums text-[10px] opacity-70">
                            {counts[option.value]}
                          </span>
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search orders, customers, files…"
                        className={cn(dashboardControlClass, "h-9 w-full pl-9")}
                      />
                    </div>
                  </div>

                  {canBulkSelect && selectedCount > 0 ? (
                    <div className="mx-3 mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#dbe6f5] bg-[#f4f7fd] px-3 py-2.5">
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

                  {statusMessage ? (
                    <p
                      className={cn(
                        "mx-3 mb-2.5 rounded-lg border px-3 py-2 text-[13px]",
                        statusMessage.toLowerCase().includes("could not")
                          ? "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]"
                          : "border-[#cfe8d8] bg-[#e8f5ee] text-[#0d5c2e]"
                      )}
                    >
                      {statusMessage}
                    </p>
                  ) : null}
                </div>

                {filtered.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa]">
                    <EmptyState
                      filter={filter}
                      scope={scope}
                      hasSearch={Boolean(search.trim())}
                    />
                  </div>
                ) : (
                  <div className="mt-4 -mx-4 overflow-x-auto border-t border-[#ebebeb] sm:-mx-5">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#ebebeb] hover:bg-transparent">
                          {canBulkSelect ? (
                            <TableHead className="h-9 w-10 bg-[#fafafa] pl-4 sm:pl-5">
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleAllVisible}
                                className="size-3.5 accent-[#2c6ecb]"
                                aria-label="Select all visible artwork"
                              />
                            </TableHead>
                          ) : null}
                          <TableHead
                            className={cn(
                              "h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]",
                              !canBulkSelect && "pl-4 sm:pl-5"
                            )}
                          >
                            Location
                          </TableHead>
                          <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                            Order
                          </TableHead>
                          <TableHead className="hidden h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161] md:table-cell">
                            Customer
                          </TableHead>
                          <TableHead className="hidden h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161] lg:table-cell">
                            Decoration
                          </TableHead>
                          <TableHead className="hidden h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161] sm:table-cell">
                            File
                          </TableHead>
                          <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                            Status
                          </TableHead>
                          <TableHead className="hidden h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161] xl:table-cell">
                            In-hands
                          </TableHead>
                          <TableHead className="h-9 w-10 bg-[#fafafa] pr-4 sm:pr-5" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((entry) => {
                          const entryKey = artworkQueueEntryKey(entry);
                          const isSelected = selectedKeys.has(entryKey);
                          return (
                            <TableRow
                              key={entryKey}
                              tabIndex={0}
                              role="button"
                              aria-label={`Review ${entry.imprintLabel} on ${formatOrderRef(entry)}`}
                              className={cn(
                                "group cursor-pointer border-[#ebebeb] transition-colors hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7] focus-visible:outline-none",
                                entry.archived && "opacity-70",
                                isSelected && "bg-[#f4f7fd]"
                              )}
                              onClick={() => openEntry(entry)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openEntry(entry);
                                }
                              }}
                            >
                              {canBulkSelect ? (
                                <TableCell
                                  className="py-2.5 pl-4 sm:pl-5"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleEntry(entryKey)}
                                    className="size-3.5 accent-[#2c6ecb]"
                                    aria-label={`Select ${entry.imprintLabel}`}
                                  />
                                </TableCell>
                              ) : null}
                              <TableCell
                                className={cn(
                                  "py-2.5",
                                  !canBulkSelect && "pl-4 sm:pl-5"
                                )}
                              >
                                <p className="text-[13px] font-medium text-[#303030] transition-colors group-hover:text-[#2c6ecb]">
                                  {entry.imprintLabel}
                                </p>
                                <p className="mt-0.5 text-[12px] text-[#616161]">
                                  {entry.jobName}
                                </p>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Link
                                  href={`/app/orders/${entry.orderId}`}
                                  className="text-[13px] font-semibold text-[#303030] hover:text-[#2c6ecb] hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {formatOrderRef(entry)}
                                </Link>
                                <p className="mt-0.5 text-[12px] text-[#616161] md:hidden">
                                  {entry.company || entry.customerName}
                                </p>
                              </TableCell>
                              <TableCell className="hidden py-2.5 md:table-cell">
                                <div className="min-w-0 max-w-[220px]">
                                  <p className="truncate text-[13px] font-medium text-[#303030]">
                                    {entry.company || entry.customerName}
                                  </p>
                                  <p className="truncate text-[12px] text-[#616161]">
                                    {entry.customerName}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden py-2.5 text-[13px] text-[#616161] lg:table-cell">
                                {decorationLabel(entry.decoration)}
                              </TableCell>
                              <TableCell className="hidden py-2.5 sm:table-cell">
                                <p className="max-w-[200px] truncate text-[13px] text-[#303030]">
                                  {entry.artwork.name}
                                </p>
                                <p className="text-[12px] text-[#616161]">
                                  v{entry.artwork.version} ·{" "}
                                  {formatDateTime(entry.artwork.uploadedAt)}
                                </p>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <ArtworkStatusBadge
                                    status={entry.artwork.status}
                                  />
                                  {entry.archived ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                                      <Archive className="size-2.5" />
                                      Archived
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="hidden py-2.5 text-[13px] tabular-nums text-[#616161] xl:table-cell">
                                {formatDate(entry.inHandsDate)}
                              </TableCell>
                              <TableCell className="py-2.5 pr-4 text-right sm:pr-5">
                                <div className="flex items-center justify-end gap-1">
                                  <Link
                                    href={artworkOrderWorkspaceHref(
                                      entry.orderId,
                                      entry.jobId,
                                      entry.imprintId
                                    )}
                                    className={cn(
                                      dashboardControlClass,
                                      "h-7 w-7 justify-center p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                    )}
                                    title="Open artwork workspace"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <LayoutPanelLeft className="size-3.5" />
                                  </Link>
                                  <ChevronRight className="size-4 -translate-x-1 text-brand-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <ArtworkDetailDialog
        entry={selectedEntry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

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
