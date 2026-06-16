"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileImage,
  RotateCcw,
  Search,
} from "lucide-react";
import { ArtworkDetailDialog } from "@/components/artwork/artwork-detail-dialog";
import { StaffHeader } from "@/components/layout/staff-header";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  filterArtworkQueue,
  searchArtworkQueue,
  type ArtworkQueueEntry,
  type ArtworkQueueFilter,
} from "@/lib/artwork-queue";
import { decorationLabel, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left shadow-sm transition-all",
        active
          ? "border-brand-primary/30 bg-brand-primary/[0.05] ring-1 ring-brand-primary/15"
          : "border-border/60 bg-white hover:border-brand-primary/20",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          {label}
        </p>
        <div
          className={cn(
            "rounded-lg p-1.5",
            active ? "bg-brand-primary/10 text-brand-primary" : "bg-muted/60 text-brand-muted"
          )}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", accent)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
    </Wrapper>
  );
}

function EmptyState({
  filter,
  hasSearch,
}: {
  filter: ArtworkQueueFilter;
  hasSearch: boolean;
}) {
  if (hasSearch) {
    return (
      <div className="px-6 py-16 text-center">
        <Search className="mx-auto mb-3 size-8 text-brand-muted/40" />
        <p className="text-sm font-medium text-brand-ink">No matches</p>
        <p className="mt-1 text-sm text-brand-muted">
          Try a different order number, customer, or file name.
        </p>
      </div>
    );
  }

  if (filter !== "all") {
    return (
      <div className="px-6 py-16 text-center">
        <FileImage className="mx-auto mb-3 size-8 text-brand-muted/40" />
        <p className="text-sm font-medium text-brand-ink">
          No {filter.replace("_", " ")} artwork
        </p>
        <p className="mt-1 text-sm text-brand-muted">
          Switch filters or check back when proofs move through review.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-16 text-center max-w-md mx-auto">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
        <FileImage className="size-6" />
      </div>
      <p className="text-sm font-medium text-brand-ink">No artwork yet</p>
      <p className="mt-2 text-sm text-brand-muted leading-relaxed">
        When you create an order with decoration events or attach files, each
        imprint location shows up here for proofing and approval.
      </p>
      <Button
        className="mt-5 rounded-full"
        variant="outline"
        nativeButton={false}
        render={<Link href="/app/orders" />}
      >
        <ClipboardList className="size-4" />
        View orders
      </Button>
    </div>
  );
}

export function ArtworkView() {
  const { orders } = useSchedule();
  const [filter, setFilter] = useState<ArtworkQueueFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ArtworkQueueEntry | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const entries = useMemo(() => collectArtworkQueue(orders), [orders]);
  const counts = useMemo(() => countArtworkQueue(entries), [entries]);
  const filtered = useMemo(() => {
    const byStatus = filterArtworkQueue(entries, filter);
    return searchArtworkQueue(byStatus, search);
  }, [entries, filter, search]);

  const needsAttention = counts.pending + counts.revision_requested;

  const openEntry = (entry: ArtworkQueueEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  return (
    <>
      <StaffHeader
        title="Artwork"
        description="Proofs and production files from orders — artwork appears here when events are added"
        action={null}
      />

      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="All locations"
            value={counts.all}
            hint="Decoration spots with artwork"
            icon={FileImage}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <SummaryTile
            label="Pending"
            value={counts.pending}
            hint="Awaiting review or proof"
            icon={Clock}
            accent="text-brand-primary"
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          />
          <SummaryTile
            label="Revision"
            value={counts.revision_requested}
            hint="Changes requested"
            icon={RotateCcw}
            accent="text-amber-800"
            active={filter === "revision_requested"}
            onClick={() => setFilter("revision_requested")}
          />
          <SummaryTile
            label="Approved"
            value={counts.approved}
            hint="Ready for production"
            icon={CheckCircle2}
            accent="text-emerald-700"
            active={filter === "approved"}
            onClick={() => setFilter("approved")}
          />
        </section>

        {needsAttention > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-800" />
            <p className="text-amber-950">
              <span className="font-medium">{needsAttention}</span> location
              {needsAttention !== 1 ? "s" : ""} need attention — pending review or
              revision requested.
            </p>
          </div>
        )}

        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col gap-4 border-b border-border/60 bg-muted/10 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Artwork queue</CardTitle>
                <p className="mt-1 text-xs text-brand-muted">
                  {filtered.length} location{filtered.length !== 1 ? "s" : ""}
                  {search.trim() ? " matching search" : ""}
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders, customers, files…"
                  className="h-10 rounded-full pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border bg-muted/25 p-0.5">
                {ARTWORK_QUEUE_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === option.value
                        ? "bg-white text-brand-ink shadow-sm"
                        : "text-brand-muted hover:text-brand-ink"
                    )}
                  >
                    {option.label}
                    <span className="ml-1.5 tabular-nums text-[10px] opacity-70">
                      {counts[option.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState filter={filter} hasSearch={Boolean(search.trim())} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Location</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead className="hidden lg:table-cell">Decoration</TableHead>
                    <TableHead className="hidden sm:table-cell">File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden xl:table-cell">In-hands</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow
                      key={artworkQueueEntryKey(entry)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Review ${entry.imprintLabel} on ${entry.orderNumber}`}
                      className="group cursor-pointer border-border/70 transition-colors hover:bg-brand-primary/[0.06] active:bg-brand-primary/10 focus-visible:outline-none focus-visible:bg-brand-primary/[0.06] focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-inset"
                      onClick={() => openEntry(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEntry(entry);
                        }
                      }}
                    >
                      <TableCell className="relative pl-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors group-hover:before:bg-brand-primary">
                        <p className="font-medium text-brand-ink transition-colors group-hover:text-brand-primary">
                          {entry.imprintLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-brand-muted">
                          {entry.jobName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/app/orders/${entry.orderId}`}
                          className="text-sm font-medium text-brand-ink hover:text-brand-primary"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {entry.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-brand-muted md:hidden">
                          {entry.company || entry.customerName}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-brand-ink">
                          {entry.company || entry.customerName}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {entry.customerName}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-brand-muted">
                        {decorationLabel(entry.decoration)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="max-w-[200px] truncate text-sm text-brand-ink">
                          {entry.artwork.name}
                        </p>
                        <p className="text-xs text-brand-muted">
                          v{entry.artwork.version} ·{" "}
                          {formatDateTime(entry.artwork.uploadedAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ArtworkStatusBadge status={entry.artwork.status} />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-brand-muted tabular-nums">
                        {formatDate(entry.inHandsDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="ml-auto size-4 text-brand-primary opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <ArtworkDetailDialog
        entry={selectedEntry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
