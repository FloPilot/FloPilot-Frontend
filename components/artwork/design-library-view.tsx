"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BookMarked,
  Layers,
  Search,
  Shirt,
} from "lucide-react";
import { BulkArchiveDesignsDialog } from "@/components/artwork/bulk-archive-designs-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  clearLocalArchivedDesignIds,
  readLocalArchivedDesignIds,
} from "@/lib/design-archive";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import {
  archiveDesign as apiArchiveDesign,
  bulkArchiveDesigns,
  bulkRestoreDesigns,
  listDesigns,
  restoreDesign as apiRestoreDesign,
} from "@/lib/api";
import { decorationLabel } from "@/lib/format";
import { formatOrderNumberWithLabel } from "@/lib/order-display";
import type { SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

type LibraryScope = "active" | "archived";

function DesignThumb({
  design,
  className,
}: {
  design: SavedDesign;
  className?: string;
}) {
  const previewUrl = design.artwork.previewUrl;

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={design.name}
        // Match the crossOrigin mode used by useImageBackgroundColor so the
        // browser caches a CORS-clean response and the canvas isn't tainted.
        crossOrigin="anonymous"
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 text-[#8a8a8a]">
      <Shirt className="size-7" strokeWidth={1.5} />
      <span className="text-[11px] font-semibold uppercase tracking-wide">
        {decorationLabel(design.decoration)}
      </span>
    </div>
  );
}

function DesignCard({
  design,
  archived,
  groupCount,
  selected,
  selectable,
  onToggleSelected,
  onArchiveToggle,
  archiveBusy,
}: {
  design: SavedDesign;
  archived: boolean;
  groupCount: number;
  selected: boolean;
  selectable: boolean;
  onToggleSelected: () => void;
  onArchiveToggle: () => void;
  archiveBusy: boolean;
}) {
  const pms = design.pmsCodes ?? [];
  const bgColor = useImageBackgroundColor(design.artwork.previewUrl);

  return (
    <div
      className={cn(
        dashboardCardClass,
        "group flex flex-col transition-[border-color,box-shadow] hover:border-[#c9cccf]",
        archived && "opacity-75",
        selected && "border-[#2c6ecb] ring-1 ring-[#2c6ecb]/30"
      )}
    >
      <div className="relative">
        {selectable ? (
          <label
            className="absolute left-2.5 top-2.5 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md border border-[#e3e3e3] bg-white/95 shadow-sm backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              className="size-3.5 accent-[#2c6ecb]"
              aria-label={`Select ${design.name}`}
            />
          </label>
        ) : null}
        <Link
          href={`/app/designs/${design.id}`}
          className="flex flex-1 flex-col text-left"
        >
          <div
            className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden border-b border-[#ebebeb] bg-[#f6f6f7] p-3 transition-colors"
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            <DesignThumb design={design} className="max-h-[230px]" />
            <div
              className={cn(
                "absolute top-2.5 flex flex-wrap gap-1.5",
                selectable ? "left-11" : "left-2.5"
              )}
            >
              {archived ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161] backdrop-blur">
                  <Archive className="size-2.5" />
                  Archived
                </span>
              ) : null}
              {groupCount > 1 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-[#c4d7f2] bg-[#f4f7fd]/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#2c6ecb] backdrop-blur"
                  title={`${groupCount} designs saved from this order`}
                >
                  <Layers className="size-2.5" />
                  {groupCount} from order
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <p className="truncate text-[14px] font-semibold text-[#303030] group-hover:text-[#2c6ecb]">
              {design.name}
            </p>
            <p className="truncate text-[12px] text-[#616161]">
              {design.company || design.customerName || "Unassigned"} ·{" "}
              {decorationLabel(design.decoration)}
            </p>
            {design.imprintCustomLabel?.trim() ? (
              <p className="truncate text-[11px] text-[#8a8a8a]">
                {design.imprintCustomLabel.trim()}
              </p>
            ) : null}
            {pms.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {pms.slice(0, 3).map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#616161]"
                  >
                    {code}
                  </span>
                ))}
                {pms.length > 3 ? (
                  <span className="inline-flex items-center text-[10px] text-[#8a8a8a]">
                    +{pms.length - 3}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#ebebeb] px-3 py-2">
        {design.sourceOrderNumber ? (
          <Link
            href={`/app/orders/${design.sourceOrderId}`}
            className="truncate text-[12px] font-medium text-[#616161] hover:text-[#2c6ecb] hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {formatOrderNumberWithLabel(
              design.sourceOrderNumber,
              design.sourceOrderCustomLabel
            )}
          </Link>
        ) : (
          <span className="text-[12px] text-[#8a8a8a]">Saved design</span>
        )}
        <button
          type="button"
          disabled={archiveBusy}
          onClick={(event) => {
            event.stopPropagation();
            onArchiveToggle();
          }}
          className={cn(
            dashboardControlClass,
            "h-7 shrink-0 gap-1.5 px-2 text-[12px] disabled:opacity-60"
          )}
        >
          {archived ? (
            <>
              <ArchiveRestore className="size-3.5" />
              Restore
            </>
          ) : (
            <>
              <Archive className="size-3.5" />
              Archive
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function mergeDesignUpdates(
  current: SavedDesign[],
  updates: SavedDesign[]
): SavedDesign[] {
  if (updates.length === 0) return current;
  const byId = new Map(updates.map((design) => [design.id, design]));
  return current.map((design) => byId.get(design.id) ?? design);
}

export function DesignLibraryView() {
  const { getIdToken } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [localArchivedIds, setLocalArchivedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<LibraryScope>("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const { designs: next } = await listDesigns(token, {
        search: search.trim() || undefined,
        includeArchived: true,
      });
      setDesigns(next);
      setLocalArchivedIds(readLocalArchivedDesignIds());
    } finally {
      setLoading(false);
    }
  }, [getIdToken, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const isDesignArchived = useCallback(
    (design: SavedDesign) =>
      design.archived === true || localArchivedIds.includes(design.id),
    [localArchivedIds]
  );

  const activeCount = useMemo(
    () => designs.filter((design) => !isDesignArchived(design)).length,
    [designs, isDesignArchived]
  );
  const archivedCount = designs.length - activeCount;

  const scopedDesigns = useMemo(
    () =>
      designs.filter((design) =>
        scope === "archived"
          ? isDesignArchived(design)
          : !isDesignArchived(design)
      ),
    [designs, scope, isDesignArchived]
  );

  const orderGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const design of designs) {
      if (!design.sourceOrderId) continue;
      counts.set(
        design.sourceOrderId,
        (counts.get(design.sourceOrderId) ?? 0) + 1
      );
    }
    return counts;
  }, [designs]);

  useEffect(() => {
    setSelectedIds(new Set());
    setStatusMessage(null);
  }, [scope, search]);

  useEffect(() => {
    const visibleIds = new Set(scopedDesigns.map((design) => design.id));
    setSelectedIds((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (visibleIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [scopedDesigns]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    scopedDesigns.length > 0 &&
    scopedDesigns.every((design) => selectedIds.has(design.id));

  const toggleSelected = (designId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(designId)) next.delete(designId);
      else next.add(designId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const visibleIds = scopedDesigns.map((design) => design.id);
      const everySelected =
        visibleIds.length > 0 && visibleIds.every((id) => current.has(id));
      if (everySelected) return new Set();
      return new Set(visibleIds);
    });
  };

  const applyLocalClear = (ids: string[]) => {
    clearLocalArchivedDesignIds(ids);
    setLocalArchivedIds(readLocalArchivedDesignIds());
  };

  const toggleArchive = useCallback(
    async (design: SavedDesign) => {
      const token = await getIdToken();
      if (!token) return;
      const archived = isDesignArchived(design);
      setBusyIds((current) => new Set(current).add(design.id));
      setStatusMessage(null);
      try {
        const { design: next } = archived
          ? await apiRestoreDesign(token, design.id)
          : await apiArchiveDesign(token, design.id);
        setDesigns((current) => mergeDesignUpdates(current, [next]));
        applyLocalClear([design.id]);
      } catch (err) {
        setStatusMessage(
          err instanceof Error
            ? err.message
            : archived
              ? "Could not restore that design."
              : "Could not archive that design."
        );
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(design.id);
          return next;
        });
      }
    },
    [getIdToken, isDesignArchived]
  );

  const handleBulkConfirm = async () => {
    const token = await getIdToken();
    if (!token) throw new Error("Sign in again to continue.");
    const ids = [...selectedIds];
    if (ids.length === 0) {
      throw new Error(
        scope === "archived"
          ? "Select at least one design to restore."
          : "Select at least one design to archive."
      );
    }

    if (scope === "archived") {
      const result = await bulkRestoreDesigns(token, ids);
      setDesigns((current) => mergeDesignUpdates(current, result.designs));
      applyLocalClear(ids);
      setSelectedIds(new Set());
      setStatusMessage(
        result.errors.length > 0
          ? `Restored ${result.restoredCount} of ${result.requestedCount}. ${result.errors.length} could not be restored.`
          : `Restored ${result.restoredCount} design${result.restoredCount === 1 ? "" : "s"}.`
      );
      return;
    }

    const result = await bulkArchiveDesigns(token, ids);
    setDesigns((current) => mergeDesignUpdates(current, result.designs));
    applyLocalClear(ids);
    setSelectedIds(new Set());
    setStatusMessage(
      result.errors.length > 0
        ? `Archived ${result.archivedCount} of ${result.requestedCount}. ${result.errors.length} could not be archived.`
        : `Archived ${result.archivedCount} design${result.archivedCount === 1 ? "" : "s"}.`
    );
  };

  const showLoading = loading && designs.length === 0 && !search.trim();
  const hasSearch = Boolean(search.trim());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex w-fit gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
            dashboardElevatedShadow
          )}
        >
          {(
            [
              { value: "active" as const, label: "Active", count: activeCount },
              {
                value: "archived" as const,
                label: "Archived",
                count: archivedCount,
              },
            ]
          ).map((option) => (
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
                {option.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, customer, PMS…"
            className={cn(dashboardControlClass, "h-9 w-full pl-9")}
          />
        </div>
      </div>

      {scopedDesigns.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#616161]">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="size-3.5 accent-[#2c6ecb]"
            />
            Select all visible
          </label>
          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#dbe6f5] bg-[#f4f7fd] px-3 py-2">
              <p className="text-[13px] font-medium text-[#303030]">
                {selectedCount} selected
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(dashboardControlClass, "h-8")}
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(
                  dashboardControlClass,
                  "h-8",
                  scope === "active" &&
                    "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f]"
                )}
                onClick={() => setBulkOpen(true)}
              >
                {scope === "archived" ? (
                  <>
                    <ArchiveRestore className="size-3.5" />
                    Restore selected
                  </>
                ) : (
                  <>
                    <Archive className="size-3.5" />
                    Archive selected
                  </>
                )}
              </Button>
            </div>
          ) : null}
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

      {showLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(dashboardCardClass, "animate-pulse")}
            >
              <div className="aspect-[4/3] w-full border-b border-[#ebebeb] bg-[#f1f1f1]" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-3/4 rounded bg-[#f1f1f1]" />
                <div className="h-3 w-1/2 rounded bg-[#f1f1f1]" />
              </div>
            </div>
          ))}
        </div>
      ) : scopedDesigns.length === 0 ? (
        <section className={cn(dashboardCardClass, "px-6 py-14 text-center")}>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
            {scope === "archived" ? (
              <Archive className="size-6" />
            ) : (
              <BookMarked className="size-6" />
            )}
          </div>
          <p className="text-sm font-medium text-[#303030]">
            {hasSearch
              ? "No designs match your search"
              : scope === "archived"
                ? "No archived designs"
                : "No saved designs yet"}
          </p>
          <p className={cn("mx-auto mt-2 max-w-md", dashboardTaskDetailClass)}>
            {hasSearch
              ? "Try a different name, customer, or PMS code."
              : scope === "archived"
                ? "Archive a design to tuck it away here without deleting it."
                : "Proofs sync here automatically from active orders. Add or edit a proof on an order and it appears in the library — ink colors and specs stay in sync."}
          </p>
          {!hasSearch && scope === "active" ? (
            <Button
              className={cn(dashboardControlClass, "mt-4 h-9")}
              nativeButton={false}
              render={<Link href="/app/orders" />}
            >
              View orders
            </Button>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scopedDesigns.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              archived={isDesignArchived(design)}
              groupCount={
                design.sourceOrderId
                  ? (orderGroupCounts.get(design.sourceOrderId) ?? 1)
                  : 1
              }
              selected={selectedIds.has(design.id)}
              selectable
              onToggleSelected={() => toggleSelected(design.id)}
              onArchiveToggle={() => void toggleArchive(design)}
              archiveBusy={busyIds.has(design.id)}
            />
          ))}
        </div>
      )}

      <BulkArchiveDesignsDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedCount={selectedCount}
        mode={scope === "archived" ? "restore" : "archive"}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
