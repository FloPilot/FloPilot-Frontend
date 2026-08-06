"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
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
import { OrderFileCategoryDialog } from "@/components/orders/order-file-category-dialog";
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
import { formatOrderDisplayLine } from "@/lib/order-display";
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
import { getProofSlides } from "@/lib/proof-slides";
import type { Order, OrderFileKind } from "@/types";
import { cn } from "@/lib/utils";

function imprintKey(jobId: string, imprintId: string) {
  return `${jobId}:${imprintId}`;
}

type DownloadSelection = Record<string, { name: string; url: string }>;

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
    addProofSlide,
    uploadOrderFile,
    updateOrderFile,
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
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [selectedDownloads, setSelectedDownloads] = useState<
    Record<string, { name: string; url: string }>
  >({});
  const [categoryFile, setCategoryFile] = useState<OrderFileItem | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

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
    const files = Array.from(e.target.files ?? []);
    const target = pendingImprintUpload;
    e.target.value = "";
    if (files.length === 0 || !target) return;

    setUploadingFiles(true);
    setUploadFeedback(null);
    try {
      if (target.kind === "mockup" && files.length > 1) {
        for (const file of files) {
          const { previewUrl, error } = await readImagePreviewDataUrl(file);
          if (!previewUrl) throw new Error(error || `${file.name} is not an image.`);
          await addProofSlide(order.id, target.jobId, target.imprintId, {
            fileName: file.name,
            previewUrl,
            label: file.name.replace(/\.[^./\\]+$/, ""),
          });
        }
      } else if (target.kind === "mockup") {
        const file = files[0];
        const { previewUrl } = await readImagePreviewDataUrl(file);
        await uploadArtworkVersion(
          order.id,
          target.jobId,
          target.imprintId,
          file.name,
          undefined,
          target.kind,
          previewUrl || undefined
        );
      } else {
        for (const file of files) {
          const { base64, contentType, error } = await readUploadContent(file);
          if (error) throw new Error(error);
          await uploadOrderFile(order.id, {
            name: file.name,
            kind: target.kind,
            uploadedBy: "Shop",
            contentBase64: base64,
            contentType,
            jobId: target.jobId,
            imprintId: target.imprintId,
          });
        }
      }
      setUploadFeedback(
        `${files.length} file${files.length === 1 ? "" : "s"} uploaded.`
      );
    } catch (err) {
      setUploadFeedback(
        err instanceof Error ? err.message : "Could not upload the selected files."
      );
    } finally {
      setPendingImprintUpload(null);
      setUploadingFiles(false);
    }
  };

  const handleOrderFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploadingFiles(true);
    setUploadFeedback(null);
    try {
      for (const file of files) {
        const { base64, contentType, error } = await readUploadContent(file);
        if (error) throw new Error(error);
        await uploadOrderFile(order.id, {
          name: file.name,
          kind: defaultUploadKindForCategory(category),
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
        });
      }
      setUploadFeedback(
        `${files.length} file${files.length === 1 ? "" : "s"} uploaded.`
      );
    } catch (err) {
      setUploadFeedback(
        err instanceof Error ? err.message : "Could not upload the selected files."
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const toggleDownload = (
    key: string,
    item: { name: string; url: string }
  ) => {
    setSelectedDownloads((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
  };

  const handleBulkDownload = () => {
    const selected = Object.values(selectedDownloads);
    selected.forEach((file, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, index * 150);
    });
    setSelectedDownloads({});
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

  const openFileDetails = (file: OrderFileItem) => {
    setCategoryError(null);
    setCategoryFile(file);
  };

  const handleSaveFileCategory = async (updates: {
    kinds: OrderFileKind[];
    kind: OrderFileKind;
    notes: string | null;
  }) => {
    if (!categoryFile || categoryFile.source !== "order") return;
    setSavingCategory(true);
    setCategoryError(null);
    try {
      await updateOrderFile(order.id, categoryFile.id, updates);
      setCategoryFile(null);
    } catch (err) {
      setCategoryError(
        err instanceof Error
          ? err.message
          : "Could not update this file. Please try again."
      );
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.dst,.svg"
        multiple
        onChange={handleImprintFileChange}
      />
      <input
        ref={orderFileInputRef}
        type="file"
        className="hidden"
        multiple
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

      {uploadFeedback ? (
        <div className="rounded-xl border border-[#d8e4f7] bg-[#f4f7fd] px-4 py-3 text-sm text-[#305d9b]">
          {uploadFeedback}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILE_CATEGORY_TABS.map((tab) => {
            const count = categoryCounts[tab.id];
            const selected = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategory(tab.id);
                  setSelectedDownloads({});
                }}
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

        <div className="flex shrink-0 items-center gap-2">
          {Object.keys(selectedDownloads).length > 0 ? (
            <Button
              className={cn(dashboardControlClass, "h-8 text-[12px]")}
              onClick={handleBulkDownload}
            >
              <Download className="size-3.5" />
              Download {Object.keys(selectedDownloads).length}
            </Button>
          ) : null}
          <Button
            className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
            disabled={uploadingFiles}
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
            {uploadingFiles ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploadingFiles ? "Uploading…" : uploadLabel}
          </Button>
        </div>
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
                {allEntries.map((entry) => {
                  const key = `mockup:${entry.job.id}:${entry.imprint.id}`;
                  const slide = getProofSlides(entry.imprint.artwork)[0];
                  const downloadUrl = slide?.previewUrl;
                  return (
                    <div
                      key={imprintKey(entry.job.id, entry.imprint.id)}
                      className="relative"
                    >
                      {downloadUrl ? (
                        <label
                          className="absolute left-3 top-3 z-20 flex size-7 cursor-pointer items-center justify-center rounded-md border border-[#d8d8d8] bg-white/95 shadow-sm"
                          title="Select for download"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-[#2c6ecb]"
                            checked={Boolean(selectedDownloads[key])}
                            onChange={() =>
                              toggleDownload(key, {
                                name: entry.imprint.artwork.name,
                                url: downloadUrl,
                              })
                            }
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${entry.imprint.artwork.name} for download`}
                          />
                        </label>
                      ) : null}
                      <MockupPreview
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
                    </div>
                  );
                })}
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
                      {selectedEntry.imprint.artwork.previewUrl ? (
                        <a
                          href={selectedEntry.imprint.artwork.previewUrl}
                          download={selectedEntry.imprint.artwork.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            dashboardControlClass,
                            "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
                          )}
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      ) : null}
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
                : `Files in this category for ${formatOrderDisplayLine(order)}.`}
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
                onOpenFile={openFileDetails}
                replacingId={replacingId}
                selectedDownloads={selectedDownloads}
                onToggleDownload={toggleDownload}
              />
            ) : category === "artwork" ? (
              <ArtworkByLocation
                items={filteredList}
                onUpload={triggerImprintUpload}
                onOpenFile={openFileDetails}
                selectedDownloads={selectedDownloads}
                onToggleDownload={toggleDownload}
              />
            ) : (
              <FileList
                items={filteredList}
                onReplaceOrderFile={triggerOrderFileReplace}
                onOpenFile={openFileDetails}
                replacingId={replacingId}
                selectedDownloads={selectedDownloads}
                onToggleDownload={toggleDownload}
              />
            )}
          </CardContent>
        </Card>
      )}

      <OrderFileCategoryDialog
        open={Boolean(categoryFile)}
        file={categoryFile}
        saving={savingCategory}
        error={categoryError}
        onOpenChange={(open) => {
          if (!open && !savingCategory) {
            setCategoryFile(null);
            setCategoryError(null);
          }
        }}
        onSave={handleSaveFileCategory}
      />
    </div>
  );
}

function FileList({
  items,
  onReplaceOrderFile,
  onOpenFile,
  replacingId,
  selectedDownloads,
  onToggleDownload,
}: {
  items: OrderFileItem[];
  onReplaceOrderFile?: (file: OrderFileItem) => void;
  onOpenFile?: (file: OrderFileItem) => void;
  replacingId?: string | null;
  selectedDownloads: DownloadSelection;
  onToggleDownload: (
    key: string,
    item: { name: string; url: string }
  ) => void;
}) {
  return (
    <div>
      {items.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          onOpen={onOpenFile ? () => onOpenFile(file) : undefined}
          onReplace={
            onReplaceOrderFile && file.source === "order"
              ? () => onReplaceOrderFile(file)
              : undefined
          }
          replacing={replacingId === file.id}
          selected={Boolean(selectedDownloads[`file:${file.source}:${file.id}`])}
          onToggleSelect={() => {
            const url = file.downloadUrl || file.previewUrl;
            if (url) {
              onToggleDownload(`file:${file.source}:${file.id}`, {
                name: file.name,
                url,
              });
            }
          }}
        />
      ))}
    </div>
  );
}

function AllFilesGrouped({
  items,
  onUploadImprint,
  onReplaceOrderFile,
  onOpenFile,
  replacingId,
  selectedDownloads,
  onToggleDownload,
}: {
  items: OrderFileItem[];
  onUploadImprint: (jobId: string, imprintId: string, kind: OrderFileKind) => void;
  onReplaceOrderFile?: (file: OrderFileItem) => void;
  onOpenFile?: (file: OrderFileItem) => void;
  replacingId?: string | null;
  selectedDownloads: DownloadSelection;
  onToggleDownload: (
    key: string,
    item: { name: string; url: string }
  ) => void;
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
                onOpen={onOpenFile ? () => onOpenFile(file) : undefined}
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
                selected={Boolean(
                  selectedDownloads[`file:${file.source}:${file.id}`]
                )}
                onToggleSelect={() => {
                  const url = file.downloadUrl || file.previewUrl;
                  if (url) {
                    onToggleDownload(`file:${file.source}:${file.id}`, {
                      name: file.name,
                      url,
                    });
                  }
                }}
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
  onOpenFile,
  selectedDownloads,
  onToggleDownload,
}: {
  items: OrderFileItem[];
  onUpload: (jobId: string, imprintId: string, kind: OrderFileKind) => void;
  onOpenFile?: (file: OrderFileItem) => void;
  selectedDownloads: DownloadSelection;
  onToggleDownload: (
    key: string,
    item: { name: string; url: string }
  ) => void;
}) {
  const byLocation = useMemo(() => {
    const map = new Map<string, OrderFileItem[]>();
    for (const item of items) {
      if (!item.imprintLabel) continue;
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
                <FileRow
                  key={`${file.source}:${file.id}`}
                  file={file}
                  onOpen={onOpenFile ? () => onOpenFile(file) : undefined}
                  selected={Boolean(
                    selectedDownloads[`file:${file.source}:${file.id}`]
                  )}
                  onToggleSelect={() => {
                    const url = file.downloadUrl || file.previewUrl;
                    if (url) {
                      onToggleDownload(`file:${file.source}:${file.id}`, {
                        name: file.name,
                        url,
                      });
                    }
                  }}
                />
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
  onOpen,
  onUpload,
  onReplace,
  replacing,
  selected,
  onToggleSelect,
}: {
  file: OrderFileItem;
  onOpen?: () => void;
  onUpload?: () => void;
  onReplace?: () => void;
  replacing?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0",
        file.archived && "opacity-60",
        onOpen &&
          "cursor-pointer rounded-lg px-2 -mx-2 transition-colors hover:bg-[#f6f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/40"
      )}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">
        {(file.downloadUrl || file.previewUrl) && onToggleSelect ? (
          <input
            type="checkbox"
            className="size-4 shrink-0 cursor-pointer accent-[#2c6ecb]"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={onToggleSelect}
            aria-label={`Select ${file.name} for download`}
          />
        ) : null}
        {file.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.previewUrl}
            alt=""
            className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.kinds?.length ? file.kinds : [file.kind])
              .map((kind) => ORDER_FILE_KIND_LABELS[kind])
              .join(" · ")}
            {file.imprintLabel && ` · ${file.imprintLabel}`}
            {file.version != null && ` · v${file.version}`}
            {" · "}
            {formatDateTime(file.uploadedAt)}
            {file.uploadedBy && ` · ${file.uploadedBy}`}
            {file.notes && ` · ${file.notes}`}
            {onOpen && file.source === "order" ? (
              <span className="text-[#2c6ecb]"> · Edit category</span>
            ) : null}
          </p>
        </div>
      </div>
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(event) => event.stopPropagation()}
      >
        {file.status && <ArtworkStatusBadge status={file.status} />}
        {file.downloadUrl || file.previewUrl ? (
          <a
            href={file.downloadUrl || file.previewUrl}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              dashboardControlClass,
              "inline-flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
            )}
          >
            <Download className="size-3" />
            Download
          </a>
        ) : null}
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
