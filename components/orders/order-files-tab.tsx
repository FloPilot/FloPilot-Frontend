"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  FolderOpen,
  Loader2,
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
import { readImagePreviewDataUrl, readUploadContent } from "@/lib/artwork-preview";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
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
    uploadOrderFile,
    deleteOrderFile,
    sendProofToCustomer,
  } = useSchedule();

  const allFileItems = useMemo(() => buildOrderFileList(order), [order]);
  const categoryCounts = useMemo(
    () => getCategoryCounts(order, allFileItems),
    [order, allFileItems]
  );

  const [sendingProof, setSendingProof] = useState(false);
  const [proofFeedback, setProofFeedback] = useState<string | null>(null);

  const handleSendProof = async (jobId: string, imprintId: string) => {
    setSendingProof(true);
    setProofFeedback(null);
    try {
      const email = await sendProofToCustomer(order.id, jobId, imprintId);
      setProofFeedback(`Proof emailed to ${email.to}.`);
      window.setTimeout(() => setProofFeedback(null), 5000);
    } catch (err) {
      setProofFeedback(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again."
      );
    } finally {
      setSendingProof(false);
    }
  };

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
  const [category, setCategory] = useState<FileCategoryFilter>(() =>
    categoryFromFocus(focusImprint) ?? "mockups"
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orderFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImprintUpload, setPendingImprintUpload] = useState<{
    jobId: string;
    imprintId: string;
    kind: OrderFileKind;
  } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<OrderFileItem | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);

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

  const handleImprintFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImprintUpload) return;
    const { previewUrl } = await readImagePreviewDataUrl(file);
    uploadArtworkVersion(
      order.id,
      pendingImprintUpload.jobId,
      pendingImprintUpload.imprintId,
      file.name,
      undefined,
      pendingImprintUpload.kind,
      previewUrl || undefined
    );
    setPendingImprintUpload(null);
    e.target.value = "";
  };

  const handleOrderFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { previewUrl } = await readImagePreviewDataUrl(file);
    addOrderFile(order.id, {
      name: file.name,
      kind: defaultUploadKindForCategory(category),
      uploadedBy: "Shop",
      previewUrl: previewUrl || undefined,
    });
    e.target.value = "";
  };

  const triggerOrderFileReplace = (file: OrderFileItem) => {
    setReplaceError(null);
    setReplaceTarget(file);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const target = replaceTarget;
    e.target.value = "";
    if (!file || !target) {
      setReplaceTarget(null);
      return;
    }

    setReplacingId(target.id);
    setReplaceError(null);
    try {
      const { base64, contentType, error } = await readUploadContent(file);
      if (error) {
        setReplaceError(error);
        return;
      }

      // Keep the original logical name (e.g. "SO1048 - FRONT LEFT CHEST") but
      // adopt the new file's extension so the listing stays accurate.
      const base = target.name.replace(/\.[^./\\]+$/, "");
      const newExt =
        file.name.match(/\.[^./\\]+$/)?.[0] ??
        target.name.match(/\.[^./\\]+$/)?.[0] ??
        "";
      const newName = `${base}${newExt}`;

      await uploadOrderFile(order.id, {
        name: newName,
        kind: target.kind,
        uploadedBy: "Shop",
        contentBase64: base64,
        contentType,
        notes: target.notes,
      });
      await deleteOrderFile(order.id, target.id);
    } catch {
      setReplaceError("Could not replace this file. Please try again.");
    } finally {
      setReplacingId(null);
      setReplaceTarget(null);
    }
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
      <input
        ref={replaceFileInputRef}
        type="file"
        className="hidden"
        onChange={handleReplaceFileChange}
      />

      {replaceError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {replaceError}
        </div>
      )}

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
                  dashboardControlClass,
                  "h-8 shrink-0 px-2.5 text-[12px]",
                  selected && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    selected
                      ? "bg-[#2c6ecb]/12 text-[#2c6ecb]"
                      : "bg-[#f0f0f0] text-[#616161]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
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
                        className={cn(
                          dashboardPrimaryButtonClass,
                          "h-8 text-[12px]"
                        )}
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
                        className={cn(dashboardControlClass, "h-8 text-[12px]")}
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
                        className={cn(dashboardControlClass, "h-8 text-[12px]")}
                        disabled={sendingProof}
                        onClick={() =>
                          void handleSendProof(
                            selectedEntry.job.id,
                            selectedEntry.imprint.id
                          )
                        }
                      >
                        <Send className="size-3.5" />
                        {sendingProof ? "Sending…" : "Send proof"}
                      </Button>
                      <Button
                        className={cn(dashboardControlClass, "h-8 text-[12px]")}
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

                    {proofFeedback ? (
                      <p className="text-[13px] font-medium text-[#616161]">
                        {proofFeedback}
                      </p>
                    ) : null}

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
                onReplaceOrderFile={triggerOrderFileReplace}
                replacingId={replacingId}
              />
            ) : category === "artwork" ? (
              <ArtworkByLocation
                items={filteredList}
                onUpload={triggerImprintUpload}
              />
            ) : (
              <FileList
                items={filteredList}
                onReplaceOrderFile={triggerOrderFileReplace}
                replacingId={replacingId}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FileList({
  items,
  onReplaceOrderFile,
  replacingId,
}: {
  items: OrderFileItem[];
  onReplaceOrderFile?: (file: OrderFileItem) => void;
  replacingId?: string | null;
}) {
  return (
    <div>
      {items.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          onReplace={
            onReplaceOrderFile && file.source === "order"
              ? () => onReplaceOrderFile(file)
              : undefined
          }
          replacing={replacingId === file.id}
        />
      ))}
    </div>
  );
}

function AllFilesGrouped({
  items,
  onUploadImprint,
  onReplaceOrderFile,
  replacingId,
}: {
  items: OrderFileItem[];
  onUploadImprint: (jobId: string, imprintId: string, kind: OrderFileKind) => void;
  onReplaceOrderFile?: (file: OrderFileItem) => void;
  replacingId?: string | null;
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
                onReplace={
                  onReplaceOrderFile && file.source === "order"
                    ? () => onReplaceOrderFile(file)
                    : undefined
                }
                replacing={replacingId === file.id}
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
                  className={cn(dashboardControlClass, "h-8 text-[12px]")}
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
  onReplace,
  replacing,
}: {
  file: OrderFileItem;
  onUpload?: () => void;
  onReplace?: () => void;
  replacing?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0",
        file.archived && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">
        {file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt=""
            className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
          />
        ) : null}
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
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {file.status && <ArtworkStatusBadge status={file.status} />}
        {onUpload && (
          <Button
            className={cn(dashboardControlClass, "h-7 text-[12px]")}
            onClick={onUpload}
          >
            <RotateCcw className="size-3" />
            Replace
          </Button>
        )}
        {onReplace && (
          <Button
            className={cn(dashboardControlClass, "h-7 text-[12px]")}
            onClick={onReplace}
            disabled={replacing}
          >
            {replacing ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Replacing
              </>
            ) : (
              <>
                <RotateCcw className="size-3" />
                Replace
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
