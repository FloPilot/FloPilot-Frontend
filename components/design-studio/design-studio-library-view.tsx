"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Palette,
  Search,
  Shirt,
} from "lucide-react";
import { NewDesignBlankModal } from "@/components/design-studio/new-design-blank-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
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
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { DESIGN_STUDIO_BASE } from "@/components/layout/nav-config";
import { duplicateDesign } from "@/lib/api";
import {
  upsertDesignStudioCache,
  useDesignStudioDesigns,
} from "@/lib/design-studio-cache";
import {
  mergeDesignStudioLines,
  type DesignStudioFile,
  type DesignStudioLine,
} from "@/lib/design-studio-library";
import { decorationLabel, formatDateTime } from "@/lib/format";
import { formatOrderNumberWithLabel } from "@/lib/order-display";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type { DecorationType } from "@/types";
import { cn } from "@/lib/utils";

function resolveLibraryDesignId(line: DesignStudioLine): string | null {
  if (line.id.startsWith("line:solo:")) {
    const id = line.id.slice("line:solo:".length).trim();
    return id || null;
  }
  const fromFile = line.files.find((file) => file.designId)?.designId;
  return fromFile?.trim() || null;
}

function FileThumb({
  file,
  size = "md",
}: {
  file: DesignStudioFile;
  size?: "sm" | "md";
}) {
  const bgColor = useImageBackgroundColor(file.previewUrl);
  const box = size === "sm" ? "size-10" : "size-12";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] transition-colors",
        box,
        !bgColor && "bg-[#f6f6f7]"
      )}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      title={file.locationLabel}
    >
      {file.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.previewUrl}
          alt=""
          // Match the crossOrigin mode used by useImageBackgroundColor so the
          // browser caches a CORS-clean response and the canvas isn't tainted.
          crossOrigin={
            /^https?:\/\//i.test(file.previewUrl) ? "anonymous" : undefined
          }
          className="size-full object-contain"
        />
      ) : (
        <Shirt
          className={
            size === "sm" ? "size-3.5 text-[#8a8a8a]" : "size-4 text-[#8a8a8a]"
          }
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}

function FilesStack({
  files,
  onOpenFile,
}: {
  files: DesignStudioFile[];
  onOpenFile: (file: DesignStudioFile) => void;
}) {
  const shown = files.slice(0, 4);
  const overflow = files.length - shown.length;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((file) => (
        <button
          key={file.id}
          type="button"
          className="rounded-md outline-none ring-[#2c6ecb] transition hover:ring-2 focus-visible:ring-2"
          onClick={(event) => {
            event.stopPropagation();
            onOpenFile(file);
          }}
          title={`${file.locationLabel} — open file`}
        >
          <FileThumb file={file} />
        </button>
      ))}
      {overflow > 0 ? (
        <span className="inline-flex size-12 items-center justify-center rounded-md border border-[#ebebeb] bg-[#f6f6f7] text-[11px] font-semibold text-[#616161]">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function DesignLineRow({
  line,
  expanded,
  onToggle,
  onOpenLine,
  onOpenFile,
  onDuplicate,
  duplicating,
}: {
  line: DesignStudioLine;
  expanded: boolean;
  onToggle: () => void;
  onOpenLine: () => void;
  onOpenFile: (file: DesignStudioFile) => void;
  onDuplicate?: () => void;
  duplicating?: boolean;
}) {
  const locationSummary = line.files
    .map((file) => file.locationLabel)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
  const extraLocations = Math.max(0, line.files.length - 3);

  return (
    <>
      <TableRow
        className="cursor-pointer border-[#ebebeb] hover:bg-[#fafafa]"
        onClick={onOpenLine}
      >
        <TableCell className="py-2.5 pl-3 sm:pl-4">
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-[#8a8a8a] hover:bg-[#f1f1f1] hover:text-[#303030]"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            aria-label={expanded ? "Collapse files" : "Expand files"}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="py-2.5">
          <FilesStack files={line.files} onOpenFile={onOpenFile} />
        </TableCell>
        <TableCell className="py-2.5">
          <p className="truncate text-[13px] font-semibold text-[#303030]">
            {line.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
            {locationSummary}
            {extraLocations > 0 ? ` · +${extraLocations} more` : ""}
          </p>
        </TableCell>
        <TableCell className="py-2.5">
          <p className="truncate text-[13px] text-[#616161]">
            {line.customerLabel}
          </p>
        </TableCell>
        <TableCell className="py-2.5 tabular-nums text-[13px] text-[#616161]">
          {line.files.length}
        </TableCell>
        <TableCell className="py-2.5">
          {line.hasStudioMockup ? (
            <span className="inline-flex rounded-md bg-[#f4f7fd] px-2 py-1 text-[11px] font-semibold text-[#2c6ecb]">
              Has mockups
            </span>
          ) : (
            <span className="inline-flex rounded-md bg-[#f1f1f1] px-2 py-1 text-[11px] font-semibold text-[#616161]">
              Artwork only
            </span>
          )}
        </TableCell>
        <TableCell className="py-2.5 tabular-nums text-[13px] text-[#616161]">
          {line.versionCount > 0 ? line.versionCount : "—"}
        </TableCell>
        <TableCell className="py-2.5">
          <p className="truncate text-[13px] text-[#616161]">
            {line.sourceOrderNumber
              ? formatOrderNumberWithLabel(
                  line.sourceOrderNumber,
                  line.orderCustomLabel
                )
              : "Library"}
          </p>
        </TableCell>
        <TableCell className="py-2.5 text-[13px] text-[#8a8a8a]">
          {formatDateTime(line.updatedAt)}
        </TableCell>
        <TableCell className="py-2.5 pr-4 sm:pr-5">
          {onDuplicate ? (
            <Button
              type="button"
              variant="outline"
              disabled={duplicating}
              className={cn(dashboardControlClass, "h-8 px-2.5 text-[12px]")}
              title="Duplicate — change blank color and save as a new file"
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate();
              }}
            >
              {duplicating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
          ) : (
            <span className="text-[11px] text-[#a3a3a3]">—</span>
          )}
        </TableCell>
      </TableRow>

      {expanded
        ? line.files.map((file) => (
            <TableRow
              key={`${line.id}-${file.id}`}
              className="cursor-pointer border-[#ebebeb] bg-[#fcfcfc] hover:bg-[#f6f6f7]"
              onClick={() => onOpenFile(file)}
            >
              <TableCell className="py-2 pl-3 sm:pl-4" />
              <TableCell className="py-2">
                <div className="pl-2">
                  <FileThumb file={file} size="sm" />
                </div>
              </TableCell>
              <TableCell className="py-2" colSpan={2}>
                <p className="truncate text-[13px] font-medium text-[#303030]">
                  {file.locationLabel}
                </p>
                <p className="truncate text-[11px] text-[#8a8a8a]">{file.name}</p>
              </TableCell>
              <TableCell className="py-2 text-[12px] text-[#8a8a8a]">
                File
              </TableCell>
              <TableCell className="py-2">
                {file.hasStudioMockup ? (
                  <span className="inline-flex rounded-md bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold text-[#2c6ecb]">
                    Mockup
                  </span>
                ) : (
                  <span className="inline-flex rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[10px] font-semibold text-[#616161]">
                    Art
                  </span>
                )}
              </TableCell>
              <TableCell className="py-2 text-[12px] text-[#616161]">
                {file.decoration
                  ? decorationLabel(file.decoration as DecorationType)
                  : "—"}
              </TableCell>
              <TableCell className="py-2 text-[12px] text-[#8a8a8a]">
                {file.versionCount > 0 ? `${file.versionCount} ver` : "—"}
              </TableCell>
              <TableCell className="py-2 pr-4 text-[12px] text-[#8a8a8a] sm:pr-5">
                {formatDateTime(file.updatedAt)}
              </TableCell>
              <TableCell className="py-2 pr-4 sm:pr-5" />
            </TableRow>
          ))
        : null}
    </>
  );
}

export function DesignStudioLibraryView() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const { orders } = useSchedule();
  const { designs, loading, refreshing } = useDesignStudioDesigns(getIdToken);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mockups">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [newDesignOpen, setNewDesignOpen] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Wait for the designs fetch (or cache) before merging with orders so the
  // table doesn't paint order-only rows first, then reshuffle.
  const lines = useMemo(() => {
    if (loading && designs.length === 0) return [];
    return mergeDesignStudioLines(designs, orders);
  }, [designs, orders, loading]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((line) => {
      if (filter === "mockups" && !line.hasStudioMockup) return false;
      if (!q) return true;
      const haystack = [
        line.name,
        line.customerLabel,
        line.sourceOrderNumber,
        ...line.files.map((file) => file.locationLabel),
        ...line.files.map((file) => file.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lines, filter, search]);

  const mockupCount = lines.filter((line) => line.hasStudioMockup).length;

  const openLine = (line: DesignStudioLine) => {
    router.push(`${DESIGN_STUDIO_BASE}/${encodeURIComponent(line.id)}`);
  };

  const openFile = (file: DesignStudioFile) => {
    router.push(`${DESIGN_STUDIO_BASE}/${encodeURIComponent(file.id)}`);
  };

  const toggleExpanded = (lineId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const handleDuplicate = async (line: DesignStudioLine) => {
    const designId = resolveLibraryDesignId(line);
    if (!designId) {
      setActionError(
        "Open this design and save it to the library first, then you can duplicate it."
      );
      return;
    }
    setActionError(null);
    setDuplicatingId(line.id);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const { design } = await duplicateDesign(token, {
        designId,
        author: "Shop",
      });
      upsertDesignStudioCache(design);
      router.push(`${DESIGN_STUDIO_BASE}/${encodeURIComponent(design.id)}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not duplicate design"
      );
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Design Studio</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            Design lines group related location files — front chest, back, labels,
            and more — so you can open the whole package or a single file.
          </p>
        </div>
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "h-9 shrink-0")}
          onClick={() => setNewDesignOpen(true)}
        >
          New design
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex w-fit gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
            dashboardElevatedShadow
          )}
        >
          {(
            [
              {
                value: "all" as const,
                label: "All lines",
                count: lines.length,
              },
              {
                value: "mockups" as const,
                label: "With mockups",
                count: mockupCount,
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                filter === option.value
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

        <div className="flex w-full items-center gap-2 sm:max-w-xs">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search line, customer, location…"
              className={cn(dashboardControlClass, "h-9 w-full pl-9")}
            />
          </div>
          {refreshing ? (
            <Loader2
              className="size-3.5 shrink-0 animate-spin text-[#8a8a8a]"
              aria-label="Refreshing designs"
            />
          ) : null}
        </div>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {actionError}
        </p>
      ) : null}

      {loading && lines.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#616161]">
          <Loader2 className="size-4 animate-spin" />
          Loading design lines…
        </div>
      ) : visible.length === 0 ? (
        <section className={cn(dashboardCardClass, "px-6 py-14 text-center")}>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
            <Palette className="size-6" />
          </div>
          <p className="text-[14px] font-semibold text-[#303030]">
            {search.trim()
              ? "No design lines match that search"
              : filter === "mockups"
                ? "No design lines with mockups yet"
                : "No design lines yet"}
          </p>
          <p className={cn("mx-auto mt-1 max-w-md", dashboardTaskDetailClass)}>
            Create a design with New design, or compose mockups on an order —
            locations from the same order group into one Design Line here.
          </p>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "mt-5 h-9")}
            onClick={() => setNewDesignOpen(true)}
          >
            New design
          </Button>
        </section>
      ) : (
        <section className={cn(dashboardCardClass, "overflow-hidden")}>
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="border-[#ebebeb] hover:bg-transparent">
                <TableHead className="h-10 w-10 bg-[#fafafa] pl-3 sm:pl-4" />
                <TableHead className="h-10 min-w-[160px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Files
                </TableHead>
                <TableHead className="h-10 min-w-[200px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Design line
                </TableHead>
                <TableHead className="h-10 min-w-[140px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Customer
                </TableHead>
                <TableHead className="h-10 min-w-[70px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  #
                </TableHead>
                <TableHead className="h-10 min-w-[110px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Status
                </TableHead>
                <TableHead className="h-10 min-w-[80px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Versions
                </TableHead>
                <TableHead className="h-10 min-w-[110px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Source
                </TableHead>
                <TableHead className="h-10 min-w-[140px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Updated
                </TableHead>
                <TableHead className="h-10 min-w-[110px] bg-[#fafafa] pr-4 text-[12px] font-medium text-[#616161] sm:pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((line) => (
                <DesignLineRow
                  key={line.id}
                  line={line}
                  expanded={expandedIds.has(line.id)}
                  onToggle={() => toggleExpanded(line.id)}
                  onOpenLine={() => openLine(line)}
                  onOpenFile={openFile}
                  onDuplicate={
                    resolveLibraryDesignId(line)
                      ? () => void handleDuplicate(line)
                      : undefined
                  }
                  duplicating={duplicatingId === line.id}
                />
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <NewDesignBlankModal
        open={newDesignOpen}
        onOpenChange={setNewDesignOpen}
      />
    </div>
  );
}
