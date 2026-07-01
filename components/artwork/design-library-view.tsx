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
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { useArchivedDesigns } from "@/lib/design-archive";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import { listDesigns } from "@/lib/api";
import { decorationLabel } from "@/lib/format";
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
  onArchiveToggle,
}: {
  design: SavedDesign;
  archived: boolean;
  groupCount: number;
  onArchiveToggle: () => void;
}) {
  const pms = design.pmsCodes ?? [];
  const bgColor = useImageBackgroundColor(design.artwork.previewUrl);

  return (
    <div
      className={cn(
        dashboardCardClass,
        "group flex flex-col transition-[border-color,box-shadow] hover:border-[#c9cccf]",
        archived && "opacity-75"
      )}
    >
      <Link
        href={`/app/designs/${design.id}`}
        className="flex flex-1 flex-col text-left"
      >
        <div
          className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden border-b border-[#ebebeb] bg-[#f6f6f7] p-3 transition-colors"
          style={bgColor ? { backgroundColor: bgColor } : undefined}
        >
          <DesignThumb design={design} className="max-h-[230px]" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
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

      <div className="flex items-center justify-between gap-2 border-t border-[#ebebeb] px-3 py-2">
        {design.sourceOrderNumber ? (
          <Link
            href={`/app/orders/${design.sourceOrderId}`}
            className="truncate text-[12px] font-medium text-[#616161] hover:text-[#2c6ecb] hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {design.sourceOrderNumber}
          </Link>
        ) : (
          <span className="text-[12px] text-[#8a8a8a]">Saved design</span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onArchiveToggle();
          }}
          className={cn(
            dashboardControlClass,
            "h-7 shrink-0 gap-1.5 px-2 text-[12px]"
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


export function DesignLibraryView() {
  const { getIdToken } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<LibraryScope>("active");

  const { hydrated, archive, restore, isArchived } = useArchivedDesigns();

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const { designs: next } = await listDesigns(token, {
        search: search.trim() || undefined,
      });
      setDesigns(next);
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

  const activeCount = useMemo(
    () => designs.filter((design) => !isArchived(design.id)).length,
    [designs, isArchived]
  );
  const archivedCount = designs.length - activeCount;

  const scopedDesigns = useMemo(
    () =>
      designs.filter((design) =>
        scope === "archived" ? isArchived(design.id) : !isArchived(design.id)
      ),
    [designs, scope, isArchived]
  );

  // Count of designs per source order (across the whole library) for grouping.
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

  const toggleArchive = useCallback(
    (id: string) => {
      if (isArchived(id)) restore(id);
      else archive(id);
    },
    [isArchived, archive, restore]
  );

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
                {hydrated ? option.count : ""}
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
              archived={isArchived(design.id)}
              groupCount={
                design.sourceOrderId
                  ? orderGroupCounts.get(design.sourceOrderId) ?? 1
                  : 1
              }
              onArchiveToggle={() => toggleArchive(design.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
