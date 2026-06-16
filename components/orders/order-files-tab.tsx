"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  FolderOpen,
  RotateCcw,
  Send,
  Upload,
} from "lucide-react";
import { MockupCompare } from "@/components/orders/artwork/mockup-compare";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decorationLabel, formatDateTime } from "@/lib/format";
import { collectOrderMockups, type MockupEntry } from "@/lib/job-imprints";
import {
  buildOrderFileList,
  categoryFromFocus,
  defaultUploadKindForCategory,
  FILE_CATEGORY_TABS,
  filterFilesByCategory,
  getCategoryCounts,
  ORDER_FILE_KIND_LABELS,
  type FileCategoryFilter,
  type OrderFileItem,
} from "@/lib/order-files";
import type { Order, OrderFileKind } from "@/types";
import { cn } from "@/lib/utils";

function imprintKey(jobId: string, imprintId: string) {
  return `${jobId}:${imprintId}`;
}

export function OrderFilesTab({
  order,
  focusImprint,
  onFocusHandled,
}: {
  order: Order;
  focusImprint?: { jobId: string; imprintId: string } | null;
  onFocusHandled?: () => void;
}) {
  const {
    setArtworkStatus,
    uploadArtworkVersion,
    addOrderFile,
    sendProofToCustomer,
  } = useSchedule();

  const allFileItems = useMemo(() => buildOrderFileList(order), [order]);
  const categoryCounts = useMemo(
    () => getCategoryCounts(order, allFileItems),
    [order, allFileItems]
  );

  const [category, setCategory] = useState<FileCategoryFilter>(() =>
    categoryFromFocus(focusImprint)
  );

  const { pinned, others } = collectOrderMockups(order, focusImprint ?? undefined);
  const allEntries = useMemo(() => {
    const list = [...(pinned ? [pinned] : []), ...others];
    return list.length > 0
      ? list
      : order.jobs.flatMap((job) =>
          job.imprints.map((imprint) => ({ job, imprint }))
        );
  }, [order, pinned, others]);

  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (focusImprint) {
      return imprintKey(focusImprint.jobId, focusImprint.imprintId);
    }
    return allEntries[0]
      ? imprintKey(allEntries[0].job.id, allEntries[0].imprint.id)
      : null;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orderFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImprintUpload, setPendingImprintUpload] = useState<{
    jobId: string;
    imprintId: string;
    kind: OrderFileKind;
  } | null>(null);

  useEffect(() => {
    if (focusImprint) {
      setSelectedKey(imprintKey(focusImprint.jobId, focusImprint.imprintId));
      setCategory("mockups");
    }
  }, [focusImprint]);

  const filteredList = useMemo(
    () => filterFilesByCategory(allFileItems, category),
    [allFileItems, category]
  );

  const selectedEntry = allEntries.find(
    (e) => imprintKey(e.job.id, e.imprint.id) === selectedKey
  );

  const showMockupGallery = category === "mockups";

  const handleSelect = (entry: MockupEntry) => {
    setSelectedKey(imprintKey(entry.job.id, entry.imprint.id));
    if (focusImprint) onFocusHandled?.();
  };

  const triggerImprintUpload = (
    jobId: string,
    imprintId: string,
    kind: OrderFileKind = "production_art"
  ) => {
    setPendingImprintUpload({ jobId, imprintId, kind });
    fileInputRef.current?.click();
  };

  const handleImprintFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImprintUpload) return;
    uploadArtworkVersion(
      order.id,
      pendingImprintUpload.jobId,
      pendingImprintUpload.imprintId,
      file.name,
      undefined,
      pendingImprintUpload.kind
    );
    setPendingImprintUpload(null);
    e.target.value = "";
  };

  const handleOrderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addOrderFile(order.id, {
      name: file.name,
      kind: defaultUploadKindForCategory(category),
      uploadedBy: "Shop",
    });
    e.target.value = "";
  };

  const uploadLabel =
    category === "mockups" || category === "artwork"
      ? "Upload artwork"
      : `Upload ${FILE_CATEGORY_TABS.find((t) => t.id === category)?.label.toLowerCase() ?? "file"}`;

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.dst,.svg"
        onChange={handleImprintFileChange}
      />
      <input
        ref={orderFileInputRef}
        type="file"
        className="hidden"
        onChange={handleOrderFileChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILE_CATEGORY_TABS.map((tab) => {
            const count = categoryCounts[tab.id];
            const selected = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                    : "border-border bg-white text-brand-muted hover:border-brand-primary/30 hover:text-brand-ink"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-muted text-brand-muted"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full shrink-0"
          onClick={() => {
            if (category === "mockups" || category === "artwork") {
              const target = selectedEntry ?? allEntries[0];
              if (target) {
                triggerImprintUpload(
                  target.job.id,
                  target.imprint.id,
                  category === "mockups" ? "mockup" : "production_art"
                );
              } else {
                orderFileInputRef.current?.click();
              }
            } else {
              orderFileInputRef.current?.click();
            }
          }}
        >
          <Upload className="size-3.5" />
          {uploadLabel}
        </Button>
      </div>

      {showMockupGallery ? (
        allEntries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Add production events first — each location gets a mockup and proof
              workflow.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Mockups by location
              </p>
              <div className="space-y-3">
                {allEntries.map((entry) => (
                  <MockupPreview
                    key={imprintKey(entry.job.id, entry.imprint.id)}
                    entry={entry}
                    pinned={
                      pinned?.imprint.id === entry.imprint.id &&
                      pinned.job.id === entry.job.id
                    }
                    selected={
                      selectedKey ===
                      imprintKey(entry.job.id, entry.imprint.id)
                    }
                    onClick={() => handleSelect(entry)}
                    compact
                  />
                ))}
              </div>
            </div>

            {selectedEntry && (
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {selectedEntry.imprint.label}
                        </CardTitle>
                        <CardDescription>
                          {selectedEntry.job.name} ·{" "}
                          {decorationLabel(selectedEntry.imprint.decoration)}
                        </CardDescription>
                      </div>
                      <ArtworkStatusBadge
                        status={selectedEntry.imprint.artwork.status}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {selectedEntry.imprint.notes && (
                      <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-2">
                        {selectedEntry.imprint.notes.colors && (
                          <p>
                            <span className="font-medium">Colors:</span>{" "}
                            {selectedEntry.imprint.notes.colors}
                          </p>
                        )}
                        {selectedEntry.imprint.notes.dimensions && (
                          <p>
                            <span className="font-medium">Placement:</span>{" "}
                            {selectedEntry.imprint.notes.dimensions}
                          </p>
                        )}
                        {selectedEntry.imprint.notes.instructions && (
                          <p>
                            <span className="font-medium">Notes:</span>{" "}
                            {selectedEntry.imprint.notes.instructions}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          setArtworkStatus(
                            order.id,
                            selectedEntry.job.id,
                            selectedEntry.imprint.id,
                            "approved"
                          )
                        }
                        disabled={
                          selectedEntry.imprint.artwork.status === "approved"
                        }
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          setArtworkStatus(
                            order.id,
                            selectedEntry.job.id,
                            selectedEntry.imprint.id,
                            "revision_requested"
                          )
                        }
                      >
                        <RotateCcw className="size-3.5" />
                        Request revision
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          sendProofToCustomer(
                            order.id,
                            selectedEntry.job.id,
                            selectedEntry.imprint.id
                          )
                        }
                      >
                        <Send className="size-3.5" />
                        Send proof
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          triggerImprintUpload(
                            selectedEntry.job.id,
                            selectedEntry.imprint.id,
                            "mockup"
                          )
                        }
                      >
                        <FileUp className="size-3.5" />
                        New version
                      </Button>
                    </div>

                    {(selectedEntry.imprint.artwork.history?.length ?? 0) >
                      0 && (
                      <div>
                        <p className="text-sm font-semibold mb-3">
                          Version history
                        </p>
                        <MockupCompare
                          current={selectedEntry.imprint.artwork}
                          history={
                            selectedEntry.imprint.artwork.history ?? []
                          }
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="size-4" />
              {FILE_CATEGORY_TABS.find((t) => t.id === category)?.label ??
                "Files"}
            </CardTitle>
            <CardDescription>
              {category === "all"
                ? "Every document tied to this order — artwork, mockups, POs, and more."
                : `Files in this category for ${order.number}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No files in this category yet. Use Upload to add one.
              </p>
            ) : category === "all" ? (
              <AllFilesGrouped
                items={filteredList}
                onUploadImprint={triggerImprintUpload}
              />
            ) : category === "artwork" ? (
              <ArtworkByLocation
                items={filteredList}
                onUpload={triggerImprintUpload}
              />
            ) : (
              <FileList items={filteredList} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FileList({ items }: { items: OrderFileItem[] }) {
  return (
    <div>
      {items.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </div>
  );
}

function AllFilesGrouped({
  items,
  onUploadImprint,
}: {
  items: OrderFileItem[];
  onUploadImprint: (jobId: string, imprintId: string, kind: OrderFileKind) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, OrderFileItem[]>();
    for (const item of items) {
      const key = ORDER_FILE_KIND_LABELS[item.kind];
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-6">
      {groups.map(([label, groupItems]) => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
            {label}
          </p>
          <div>
            {groupItems.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onUpload={
                  file.source === "imprint" &&
                  file.jobId &&
                  file.imprintId &&
                  !file.archived
                    ? () =>
                        onUploadImprint(
                          file.jobId!,
                          file.imprintId!,
                          file.kind
                        )
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArtworkByLocation({
  items,
  onUpload,
}: {
  items: OrderFileItem[];
  onUpload: (jobId: string, imprintId: string, kind: OrderFileKind) => void;
}) {
  const byLocation = useMemo(() => {
    const map = new Map<string, OrderFileItem[]>();
    for (const item of items) {
      if (item.source !== "imprint" || !item.imprintLabel) continue;
      const key = `${item.jobName} · ${item.imprintLabel}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  if (byLocation.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production artwork yet. Add events on the Production tab or switch to
        Mockups to upload proofs.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {byLocation.map(([label, groupItems]) => {
        const current = groupItems.find((f) => !f.archived);
        const jobId = current?.jobId;
        const imprintId = current?.imprintId;
        return (
          <div
            key={label}
            className="rounded-xl border border-border/60 overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-2.5 border-b border-border/60">
              <p className="text-sm font-semibold">{label}</p>
              {jobId && imprintId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={() => onUpload(jobId, imprintId, "production_art")}
                >
                  <Upload className="size-3" />
                  Upload
                </Button>
              )}
            </div>
            <div className="px-4">
              {groupItems.map((file) => (
                <FileRow key={file.id} file={file} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FileRow({
  file,
  onUpload,
}: {
  file: OrderFileItem;
  onUpload?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0",
        file.archived && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {ORDER_FILE_KIND_LABELS[file.kind]}
          {file.imprintLabel && ` · ${file.imprintLabel}`}
          {file.version != null && ` · v${file.version}`}
          {" · "}
          {formatDateTime(file.uploadedAt)}
          {file.uploadedBy && ` · ${file.uploadedBy}`}
          {file.notes && ` · ${file.notes}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {file.status && <ArtworkStatusBadge status={file.status} />}
        {onUpload && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={onUpload}
          >
            Replace
          </Button>
        )}
      </div>
    </div>
  );
}
