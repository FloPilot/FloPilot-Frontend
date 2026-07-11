"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileImage,
  FileText,
  Layers,
  Search,
  X,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { DesignLibraryView } from "@/components/artwork/design-library-view";
import {
  FILES_ARTWORK,
  FILES_BASE,
  FILES_SCREENS,
} from "@/components/layout/nav-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import { formatOrderRef } from "@/lib/order-display";
import { isArchivedOrder } from "@/lib/order-archive";
import { buildOrderFileList, type OrderFileItem } from "@/lib/order-files";
import type { OrderFileKind } from "@/types";
import { cn } from "@/lib/utils";

export type FilesViewKey = "all" | "artwork" | "screens";

type FileRow = {
  file: OrderFileItem;
  orderId: string;
  orderNumber: string;
  orderCustomLabel?: string;
  customerName: string;
  company: string;
};

const KIND_LABELS: Record<OrderFileKind, string> = {
  mockup: "Mockup",
  production_art: "Production art",
  separation: "Separation",
  embroidery_file: "Embroidery",
  purchase_order: "Purchase order",
  invoice: "Invoice",
  quote: "Quote",
  packing_list: "Packing list",
  customer_supplied: "Customer supplied",
  internal: "Internal",
  other: "Other",
};

const KIND_BADGE: Partial<Record<OrderFileKind, string>> = {
  mockup: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
  production_art: "border-[#d6c9f0] bg-[#f6f2fd] text-[#6b3fb5]",
  separation: "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]",
  embroidery_file: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
  customer_supplied: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
};

const NEUTRAL_BADGE = "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]";

const IMAGE_KINDS: OrderFileKind[] = [
  "mockup",
  "production_art",
  "separation",
  "customer_supplied",
];
const DOC_KINDS: OrderFileKind[] = [
  "purchase_order",
  "invoice",
  "quote",
  "packing_list",
];
const SCREEN_KINDS: OrderFileKind[] = ["separation"];

function kindLabel(kind: OrderFileKind): string {
  return KIND_LABELS[kind] ?? "File";
}

function FileKindIcon({
  kind,
  className,
}: {
  kind: OrderFileKind;
  className?: string;
}) {
  if (kind === "separation") return <Layers className={className} />;
  if (IMAGE_KINDS.includes(kind)) return <FileImage className={className} />;
  if (DOC_KINDS.includes(kind)) return <FileText className={className} />;
  return <FileIcon className={className} />;
}

const SECONDARY_TABS: { key: FilesViewKey; label: string; href: string }[] = [
  { key: "all", label: "All files", href: FILES_BASE },
  { key: "artwork", label: "Artwork", href: FILES_ARTWORK },
  { key: "screens", label: "Screens", href: FILES_SCREENS },
];

const VIEW_COPY: Record<FilesViewKey, string> = {
  all: "Every file across your orders — proofs, production art, separations, and documents in one place.",
  artwork:
    "Your saved design library — approved imprints ready to reuse on repeat orders.",
  screens:
    "Screen separations and film positives pulled from your orders, ready for the burn room.",
};

export function FilesView({ view }: { view: FilesViewKey }) {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div>
        <h1 className={dashboardSectionTitleClass}>Files</h1>
        <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
          {VIEW_COPY[view]}
        </p>
      </div>

      <div className="flex w-fit rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
        {SECONDARY_TABS.map((tab) => {
          const active = tab.key === view;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {view === "artwork" ? (
        <DesignLibraryView />
      ) : (
        <FileBrowser scope={view} />
      )}
    </main>
  );
}

function FileBrowser({ scope }: { scope: "all" | "screens" }) {
  const { orders, shopDataLoading } = useSchedule();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<OrderFileKind | "all">("all");
  const [preview, setPreview] = useState<FileRow | null>(null);

  const rows = useMemo<FileRow[]>(() => {
    const collected: FileRow[] = [];
    for (const order of orders) {
      // Files tied to an archived order should not surface in the browser.
      if (isArchivedOrder(order)) continue;
      for (const file of buildOrderFileList(order)) {
        // Skip historical artwork versions — keep the browse view to current files.
        if (file.archived) continue;
        if (scope === "screens" && !SCREEN_KINDS.includes(file.kind)) continue;
        collected.push({
          file,
          orderId: order.id,
          orderNumber: order.number,
          orderCustomLabel: order.customLabel,
          customerName: order.customerName,
          company: order.company,
        });
      }
    }
    collected.sort((a, b) =>
      String(b.file.uploadedAt || "").localeCompare(
        String(a.file.uploadedAt || "")
      )
    );
    return collected;
  }, [orders, scope]);

  const kindsPresent = useMemo(() => {
    const set = new Set<OrderFileKind>();
    for (const row of rows) set.add(row.file.kind);
    return Array.from(set).sort((a, b) =>
      kindLabel(a).localeCompare(kindLabel(b))
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (scope === "all" && kindFilter !== "all" && row.file.kind !== kindFilter) {
        return false;
      }
      if (query) {
        const haystack =
          `${row.file.name} ${formatOrderRef(row)} ${row.company} ${row.customerName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, search, kindFilter, scope]);

  const hasFilters = search.trim() !== "" || kindFilter !== "all";

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#303030]">
            {scope === "screens" ? "Screen files" : "All files"}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            {filtered.length} file{filtered.length !== 1 ? "s" : ""}
            {scope === "all" && kindFilter !== "all"
              ? ` · ${kindLabel(kindFilter)}`
              : ""}
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files, orders, customers"
            className="h-9 w-64 rounded-lg border border-[#e3e3e3] bg-white pl-8 pr-8 text-[13px] text-[#303030] shadow-[0_1px_0_rgba(26,26,26,0.04)] outline-none transition-colors placeholder:text-[#8a8a8a] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/20"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#8a8a8a] hover:text-[#303030]"
              aria-label="Clear search"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-0 p-4 sm:p-5">
        {scope === "all" && kindsPresent.length > 0 ? (
          <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Type
                </span>
                <FilterChip
                  active={kindFilter === "all"}
                  onClick={() => setKindFilter("all")}
                >
                  All
                </FilterChip>
                {kindsPresent.map((kind) => (
                  <FilterChip
                    key={kind}
                    active={kindFilter === kind}
                    onClick={() => setKindFilter(kind)}
                  >
                    {kindLabel(kind)}
                  </FilterChip>
                ))}
              </div>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setKindFilter("all");
                    setSearch("");
                  }}
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
        ) : null}

        <FilesTable
          rows={filtered}
          loading={shopDataLoading}
          scope={scope}
          hasFilters={hasFilters}
          onSelect={setPreview}
        />
      </div>

      <FilePreviewDialog row={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

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
        "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
          : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
      )}
    >
      {children}
    </button>
  );
}

function FilesTable({
  rows,
  loading,
  scope,
  hasFilters,
  onSelect,
}: {
  rows: FileRow[];
  loading: boolean;
  scope: "all" | "screens";
  hasFilters: boolean;
  onSelect: (row: FileRow) => void;
}) {
  if (rows.length === 0) {
    const message = loading
      ? "Loading files…"
      : hasFilters
        ? "No files match your filters. Try adjusting or clearing them."
        : scope === "screens"
          ? "No screen files yet. Separations uploaded to an order's files show up here."
          : "No files yet. Files attached to orders — proofs, production art, and documents — show up here.";

    return (
      <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-14 text-center text-[13px] text-[#616161]">
        {message}
      </div>
    );
  }

  return (
    <div className="mt-4 -mx-4 overflow-x-auto border-t border-[#ebebeb] sm:-mx-5">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow className="border-[#ebebeb] hover:bg-transparent">
            <TableHead className="h-9 min-w-[260px] bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
              File
            </TableHead>
            <TableHead className="h-9 min-w-[130px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Type
            </TableHead>
            <TableHead className="h-9 min-w-[110px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Order
            </TableHead>
            <TableHead className="h-9 min-w-[160px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Customer
            </TableHead>
            <TableHead className="h-9 min-w-[150px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Uploaded
            </TableHead>
            <TableHead className="h-9 w-[120px] bg-[#fafafa] pr-4 text-right text-[12px] font-medium text-[#616161] sm:pr-5">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { file } = row;
            return (
              <TableRow
                key={`${row.orderId}-${file.id}`}
                tabIndex={0}
                role="button"
                aria-label={`Preview ${file.name}`}
                className="group cursor-pointer border-[#ebebeb] transition-colors hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7] focus-visible:outline-none"
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row);
                  }
                }}
              >
                <TableCell className="py-2.5 pl-4 sm:pl-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#f6f6f7]">
                      {file.previewUrl ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileKindIcon
                          kind={file.kind}
                          className="size-4 text-[#8a8a8a]"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[260px] truncate text-[13px] font-medium text-[#303030] group-hover:text-[#2c6ecb]">
                        {file.name}
                        {file.version ? (
                          <span className="ml-1.5 text-[11px] font-normal text-[#8a8a8a]">
                            v{file.version}
                          </span>
                        ) : null}
                      </span>
                      {file.source === "imprint" && file.imprintLabel ? (
                        <span className="block max-w-[260px] truncate text-[12px] text-[#8a8a8a]">
                          {file.imprintLabel}
                          {file.jobName ? ` · ${file.jobName}` : ""}
                        </span>
                      ) : file.notes ? (
                        <span className="block max-w-[260px] truncate text-[12px] text-[#8a8a8a]">
                          {file.notes}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      KIND_BADGE[file.kind] ?? NEUTRAL_BADGE
                    )}
                  >
                    {kindLabel(file.kind)}
                  </span>
                </TableCell>
                <TableCell className="py-2.5">
                  <Link
                    href={`/app/orders/${row.orderId}`}
                    className="text-[13px] font-semibold text-[#303030] hover:text-[#2c6ecb] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {formatOrderRef(row)}
                  </Link>
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="min-w-0 max-w-[220px]">
                    <p className="truncate text-[13px] font-medium text-[#303030]">
                      {row.company || row.customerName}
                    </p>
                    {row.company ? (
                      <p className="truncate text-[12px] text-[#616161]">
                        {row.customerName}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-[13px] tabular-nums text-[#616161]">
                  {file.uploadedAt ? formatDateTime(file.uploadedAt) : "—"}
                </TableCell>
                <TableCell className="py-2.5 pr-4 text-right sm:pr-5">
                  {file.downloadUrl ? (
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className={cn(
                        dashboardControlClass,
                        "h-8 gap-1.5 px-2.5 text-[12px]"
                      )}
                    >
                      <Download className="size-3.5" strokeWidth={1.75} />
                      Download
                    </a>
                  ) : (
                    <span className="text-[12px] text-[#8a8a8a]">Preview</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FilePreviewDialog({
  row,
  onClose,
}: {
  row: FileRow | null;
  onClose: () => void;
}) {
  const file = row?.file;

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {file && row ? (
          <>
            <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
              <DialogTitle className="truncate text-[15px] font-semibold text-[#303030]">
                {file.name}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[#616161]">
                {kindLabel(file.kind)} · {row.company || row.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#f6f6f7] p-3">
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="max-h-[360px] w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-[#8a8a8a]">
                    <FileKindIcon kind={file.kind} className="size-9" />
                    <span className="text-[12px] font-medium">
                      No inline preview for this file
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[13px]">
                <Meta label="Type" value={kindLabel(file.kind)} />
                <Meta label="Order" value={formatOrderRef(row)} />
                {file.source === "imprint" && file.imprintLabel ? (
                  <Meta label="Location" value={file.imprintLabel} />
                ) : null}
                {file.version ? (
                  <Meta label="Version" value={`v${file.version}`} />
                ) : null}
                <Meta label="Uploaded by" value={file.uploadedBy || "—"} />
                <Meta
                  label="Uploaded"
                  value={
                    file.uploadedAt ? formatDateTime(file.uploadedAt) : "—"
                  }
                />
              </div>

              {file.notes ? (
                <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Notes
                  </p>
                  <p className="mt-1 text-[13px] text-[#303030]">{file.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
              <Link
                href={`/app/orders/${row.orderId}`}
                className={cn(dashboardControlClass, "h-9")}
                onClick={onClose}
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                Open order
              </Link>
              {file.downloadUrl ? (
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                >
                  <Download className="size-3.5" strokeWidth={1.75} />
                  Download
                </a>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-[#303030]">
        {value}
      </p>
    </div>
  );
}
