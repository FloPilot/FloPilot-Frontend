"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGuardedRouter } from "@/hooks/use-guarded-router";
import {
  Building2,
  ChevronRight,
  FileImage,
  Palette,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ArtworkDueCalendar } from "@/components/departments/artwork-due-calendar";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentOrderLink,
  DepartmentQueueCard,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useWorkspaceScope } from "@/components/providers/workspace-scope-provider";
import { Input } from "@/components/ui/input";
import { collectArtworkDepartmentCompleted, collectArtworkDepartmentQueue, groupArtworkDepartmentByOrder } from "@/lib/department-queues";
import { departmentArtworkProofHref } from "@/lib/departments";
import { formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { latestRevisionNote } from "@/lib/revision-notes";
import { resolveArtworkRevisionNotes } from "@/lib/artwork-routes";
import {
  artDueDateKey,
  formatArtDueLabel,
  rollupArtworkStatus,
  sharedArtAssigneeId,
} from "@/lib/artwork-status";
import { applyWorkspaceScopeToOrders } from "@/lib/workspace-scope";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ArtworkFilter = "all" | "with_art" | "revision_requested" | "completed";
type AddFilterKind = "pick" | "artist" | "customer";

const FILTERS: { value: ArtworkFilter; label: string }[] = [
  { value: "all", label: "All open" },
  { value: "with_art", label: "With art" },
  { value: "revision_requested", label: "Revision" },
  { value: "completed", label: "Completed" },
];

const ALL_VALUE = "all";

export function ArtworkDepartmentPanel() {
  const router = useGuardedRouter();
  const { orders, getCustomerById } = useSchedule();
  const { scope: workspaceScope, currentUserId, setCustomer } =
    useWorkspaceScope();
  const [filter, setFilter] = useState<ArtworkFilter>("all");
  const [artistFilter, setArtistFilter] = useState(ALL_VALUE);
  const [customerFilter, setCustomerFilter] = useState(ALL_VALUE);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDueDay, setSelectedDueDay] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddFilterKind>("pick");
  const [search, setSearch] = useState("");
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);

  const scopedOrders = useMemo(
    () => applyWorkspaceScopeToOrders(orders, workspaceScope, currentUserId),
    [orders, workspaceScope, currentUserId]
  );

  // Mirror workspace customer into the local customer chip when set from the top bar.
  useEffect(() => {
    if (workspaceScope.customerId) {
      setCustomerFilter(workspaceScope.customerId);
    }
  }, [workspaceScope.customerId]);

  const openEntries = useMemo(
    () => collectArtworkDepartmentQueue(scopedOrders),
    [scopedOrders]
  );
  const completedEntries = useMemo(
    () => collectArtworkDepartmentCompleted(scopedOrders),
    [scopedOrders]
  );
  const entries = filter === "completed" ? completedEntries : openEntries;

  const artistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      const id = entry.artwork.artAssigneeId?.trim();
      if (!id) continue;
      map.set(id, entry.artwork.artAssigneeName?.trim() || "Artist");
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      const customer = getCustomerById(entry.customerId);
      map.set(
        entry.customerId,
        customer?.company || entry.company || entry.customerName
      );
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, getCustomerById]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (
        (filter === "with_art" || filter === "revision_requested") &&
        entry.artwork.status !== filter
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
        customerFilter !== ALL_VALUE &&
        entry.customerId !== customerFilter
      ) {
        return false;
      }
      if (selectedDueDay) {
        if (artDueDateKey(entry.artwork.artDueAt) !== selectedDueDay) {
          return false;
        }
      }
      return true;
    });
  }, [artistFilter, customerFilter, entries, filter, selectedDueDay]);

  /** Orders that match the active filters, with all related proofs from this pool. */
  const orderGroups = useMemo(() => {
    const matchingOrderIds = new Set(filtered.map((entry) => entry.orderId));
    const enriched = entries.filter((entry) =>
      matchingOrderIds.has(entry.orderId)
    );
    return groupArtworkDepartmentByOrder(enriched);
  }, [entries, filtered]);

  const withArtOrderCount = useMemo(() => {
    const ids = new Set(
      openEntries
        .filter((entry) => entry.artwork.status === "with_art")
        .map((entry) => entry.orderId)
    );
    return ids.size;
  }, [openEntries]);
  const revisionOrderCount = useMemo(() => {
    const ids = new Set(
      openEntries
        .filter((entry) => entry.artwork.status === "revision_requested")
        .map((entry) => entry.orderId)
    );
    return ids.size;
  }, [openEntries]);
  const openOrderCount = useMemo(
    () => new Set(openEntries.map((entry) => entry.orderId)).size,
    [openEntries]
  );
  const completedOrderCount = useMemo(
    () => new Set(completedEntries.map((entry) => entry.orderId)).size,
    [completedEntries]
  );

  const artistLabel =
    artistFilter === "unassigned"
      ? "Unassigned"
      : artistOptions.find((item) => item.value === artistFilter)?.label;
  const customerLabel = customerOptions.find(
    (item) => item.value === customerFilter
  )?.label;

  const hasExtraFilters =
    artistFilter !== ALL_VALUE ||
    customerFilter !== ALL_VALUE ||
    Boolean(selectedDueDay);

  const chooseCustomerFilter = (value: string) => {
    setCustomerFilter(value);
    if (value === ALL_VALUE) {
      setCustomer(null);
      return;
    }
    const match = customerOptions.find((item) => item.value === value);
    setCustomer(value, match?.label ?? null);
  };

  const clearExtraFilters = () => {
    setArtistFilter(ALL_VALUE);
    chooseCustomerFilter(ALL_VALUE);
    setSelectedDueDay(null);
  };

  const closeAddPanel = () => {
    setAddOpen(false);
    setAddStep("pick");
    setSearch("");
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

  const searchLower = search.trim().toLowerCase();
  const visibleArtists = [
    { value: "unassigned", label: "Unassigned" },
    ...artistOptions,
  ].filter(
    (item) =>
      !searchLower || item.label.toLowerCase().includes(searchLower)
  );
  const visibleCustomers = customerOptions.filter(
    (item) => !searchLower || item.label.toLowerCase().includes(searchLower)
  );

  return (
    <DepartmentsShell
      activeSlug="artwork"
      title="Artwork queue"
      description="Orders with proofs in art — open an order to review every location, assign artists, and send work back to the team."
    >
      <div className="mb-4">
        <ArtworkDueCalendar
          entries={openEntries}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          selectedDay={selectedDueDay}
          onSelectDay={setSelectedDueDay}
        />
      </div>

      <div className={cn(dashboardInsetSurfaceClass, "mb-4 overflow-visible")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
          <div className="flex rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
            {FILTERS.map((item) => {
              const count =
                item.value === "with_art"
                  ? withArtOrderCount
                  : item.value === "revision_requested"
                    ? revisionOrderCount
                    : item.value === "completed"
                      ? completedOrderCount
                      : openOrderCount;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFilter(item.value);
                    if (item.value === "completed") {
                      setSelectedDueDay(null);
                    }
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    filter === item.value
                      ? "bg-white text-[#303030] shadow-sm"
                      : "text-[#616161] hover:text-[#303030]"
                  )}
                >
                  {item.label}
                  <span className="ml-1 tabular-nums text-[#8a8a8a]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2 bg-[#fafafa] px-3 py-2.5">
          <span className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Filters
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {artistFilter !== ALL_VALUE && artistLabel ? (
              <ActiveFilterChip
                label="Artist"
                value={artistLabel}
                onRemove={() => setArtistFilter(ALL_VALUE)}
              />
            ) : null}
            {customerFilter !== ALL_VALUE && customerLabel ? (
              <ActiveFilterChip
                label="Customer"
                value={customerLabel}
                onRemove={() => chooseCustomerFilter(ALL_VALUE)}
              />
            ) : null}
            {selectedDueDay ? (
              <ActiveFilterChip
                label="Due"
                value={formatArtDueLabel(selectedDueDay)}
                onRemove={() => setSelectedDueDay(null)}
              />
            ) : null}

            <div className="relative shrink-0">
              <button
                ref={addTriggerRef}
                type="button"
                onClick={() => {
                  if (addOpen) closeAddPanel();
                  else {
                    setAddStep("pick");
                    setSearch("");
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
                        <button
                          type="button"
                          onClick={() => {
                            setAddStep("artist");
                            setSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-[#303030] hover:bg-[#f6f6f7]"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Palette className="size-3.5 text-[#8a8a8a]" />
                            Artist
                          </span>
                          <ChevronRight className="size-3.5 text-[#c9c9c9]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddStep("customer");
                            setSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-[#303030] hover:bg-[#f6f6f7]"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Building2 className="size-3.5 text-[#8a8a8a]" />
                            Customer
                          </span>
                          <ChevronRight className="size-3.5 text-[#c9c9c9]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAddStep("pick");
                            setSearch("");
                          }}
                          className="text-[12px] font-medium text-[#2c6ecb]"
                        >
                          Back
                        </button>
                        <p className="text-[13px] font-semibold text-[#303030]">
                          {addStep === "artist" ? "Artist" : "Customer"}
                        </p>
                      </div>
                      <div className="space-y-2 p-2.5">
                        <div className="relative">
                          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                          <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={
                              addStep === "artist"
                                ? "Search artists…"
                                : "Search customers…"
                            }
                            className={cn(
                              dashboardControlClass,
                              "h-9 bg-white pl-8 shadow-none"
                            )}
                          />
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {(addStep === "artist"
                            ? visibleArtists
                            : visibleCustomers
                          ).map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                if (addStep === "artist") {
                                  setArtistFilter(item.value);
                                } else {
                                  chooseCustomerFilter(item.value);
                                }
                                closeAddPanel();
                              }}
                              className="flex w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#303030] hover:bg-[#f6f6f7]"
                            >
                              {item.label}
                            </button>
                          ))}
                          {(addStep === "artist"
                            ? visibleArtists
                            : visibleCustomers
                          ).length === 0 ? (
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
              onClick={clearExtraFilters}
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
      </div>

      {orderGroups.length === 0 ? (
        <DepartmentEmptyState
          icon={FileImage}
          title={
            filter === "completed"
              ? "No completed orders yet"
              : "Art queue is clear"
          }
          description={
            filter === "completed"
              ? "Orders show up here after art finishes every location and sends them back to the team."
              : "Orders appear here when proofs are submitted to artwork or the customer requests changes."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {orderGroups.map((group) => {
            const customer = getCustomerById(group.customerId);
            const order = orders.find((item) => item.id === group.orderId);
            const statuses = group.proofs.map((proof) => proof.artwork.status);
            const rollup = rollupArtworkStatus(statuses);
            const revisionCount = group.proofs.filter(
              (proof) => proof.artwork.status === "revision_requested"
            ).length;
            const withArtCount = group.proofs.filter(
              (proof) => proof.artwork.status === "with_art"
            ).length;
            const sharedArtistId = sharedArtAssigneeId(
              group.proofs.map((proof) => proof.artwork)
            );
            const assignee = sharedArtistId
              ? group.proofs.find(
                  (proof) => proof.artwork.artAssigneeId === sharedArtistId
                )?.artwork.artAssigneeName?.trim() || null
              : null;
            const mixedArtists =
              !assignee &&
              group.proofs.some((proof) => proof.artwork.artAssigneeId);
            const dueKeys = group.proofs
              .map((proof) => artDueDateKey(proof.artwork.artDueAt))
              .filter((value): value is string => Boolean(value))
              .sort();
            const earliestDue = dueKeys[0]
              ? formatArtDueLabel(dueKeys[0])
              : null;
            const latestNoteEntry = group.proofs
              .map((proof) => ({
                proof,
                note: latestRevisionNote(
                  resolveArtworkRevisionNotes(order, proof)
                ),
              }))
              .find((item) => item.note);
            const completedAt = group.proofs
              .map((proof) => proof.artwork.artCompletedAt)
              .filter(Boolean)
              .sort()
              .at(-1);
            const locationLabels = group.proofs
              .map((proof) => proof.imprintLabel)
              .filter(Boolean);
            const locationSummary =
              locationLabels.length <= 2
                ? locationLabels.join(" · ")
                : `${locationLabels.slice(0, 2).join(" · ")} +${
                    locationLabels.length - 2
                  } more`;

            return (
              <DepartmentQueueCard
                key={group.orderId}
                customerId={group.customerId}
                company={customer?.company ?? group.company}
                logoUrl={customer?.logoUrl}
                accentColorKey={customer?.accentColorKey}
                fallbackKey={group.orderId}
                onClick={() =>
                  router.push(departmentArtworkProofHref(group.orderId))
                }
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <DepartmentCardTitle>
                      {formatOrderDisplayLine({
                        number: group.orderNumber,
                        customLabel: group.orderCustomLabel,
                      })}
                    </DepartmentCardTitle>
                    {rollup ? (
                      <ArtworkStatusBadge status={rollup} size="sm" />
                    ) : null}
                  </div>
                }
                subtitle={
                  <>
                    <DepartmentOrderLink
                      orderId={group.orderId}
                      orderNumber={group.orderNumber}
                      customLabel={group.orderCustomLabel}
                    />
                    <span className="mx-1 text-[#c9cccf]">·</span>
                    {group.proofs.length} proof
                    {group.proofs.length !== 1 ? "s" : ""}
                    {locationSummary ? (
                      <>
                        <span className="mx-1 text-[#c9cccf]">·</span>
                        <span className="truncate">{locationSummary}</span>
                      </>
                    ) : null}
                    {assignee ? (
                      <>
                        <span className="mx-1 text-[#c9cccf]">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Palette className="size-3" />
                          {assignee}
                        </span>
                      </>
                    ) : mixedArtists ? (
                      <>
                        <span className="mx-1 text-[#c9cccf]">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Palette className="size-3" />
                          Multiple artists
                        </span>
                      </>
                    ) : null}
                  </>
                }
                meta={
                  <p className={dashboardTaskDetailClass}>
                    {revisionCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[#8a6116]">
                        <RotateCcw className="size-3.5" />
                        {revisionCount} revision
                        {revisionCount !== 1 ? "s" : ""} requested
                      </span>
                    ) : withArtCount > 0 && filter !== "completed" ? (
                      departmentStatusPill(
                        `${withArtCount} with art`,
                        "progress"
                      )
                    ) : (
                      departmentStatusPill(
                        rollup === "approved"
                          ? "Approved"
                          : rollup === "art_ready"
                            ? "Ready for team"
                            : "In artwork",
                        filter === "completed" ? "success" : "progress"
                      )
                    )}
                    {earliestDue && filter !== "completed" ? (
                      <>
                        <span className="mx-2 text-[#d4d4d4]">·</span>
                        <span className="font-medium text-[#303030]">
                          Due {earliestDue}
                          {dueKeys.length > 1 ? "+" : ""}
                        </span>
                      </>
                    ) : null}
                    {filter === "completed" && completedAt ? (
                      <>
                        <span className="mx-2 text-[#d4d4d4]">·</span>
                        <span className="font-medium text-[#303030]">
                          Completed {formatDate(completedAt)}
                        </span>
                      </>
                    ) : null}
                    {latestNoteEntry?.note ? (
                      <>
                        <span className="mx-2 text-[#d4d4d4]">·</span>
                        <span className="line-clamp-1 italic">
                          “{latestNoteEntry.note.content}”
                        </span>
                      </>
                    ) : null}
                    <span className="mx-2 text-[#d4d4d4]">·</span>
                    In hands {formatDate(group.inHandsDate)}
                  </p>
                }
              />
            );
          })}
        </div>
      )}
    </DepartmentsShell>
  );
}

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
