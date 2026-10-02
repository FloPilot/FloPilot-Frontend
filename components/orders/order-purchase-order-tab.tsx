"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { OrderCustomerPoField } from "@/components/orders/order-customer-po-field";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { Button } from "@/components/ui/button";
import { readUploadContent } from "@/lib/artwork-preview";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { filePreviewSource } from "@/lib/file-preview";
import { formatDateTime } from "@/lib/format";
import {
  buildOrderFileList,
  filterFilesByCategory,
} from "@/lib/order-files";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type PendingPoUpload = {
  localId: string;
  name: string;
  contentBase64: string;
  contentType: string;
  previewUrl: string | null;
};

function createLocalId() {
  return `pending-po-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OrderPurchaseOrderTab({ order }: { order: Order }) {
  const {
    uploadOrderFile,
    deleteOrderFile,
    updateOrderCustomerPoNumber,
  } = useSchedule();
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [poNumberDraft, setPoNumberDraft] = useState(
    () => order.customerPoNumber ?? ""
  );
  const [pendingUploads, setPendingUploads] = useState<PendingPoUpload[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    subtitle?: string;
  } | null>(null);

  useEffect(() => {
    setPoNumberDraft(order.customerPoNumber ?? "");
    setPendingUploads((current) => {
      for (const entry of current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
      return [];
    });
    setPendingDeleteIds([]);
    setError(null);
  }, [order.id]);

  useEffect(() => {
    setPoNumberDraft(order.customerPoNumber ?? "");
  }, [order.customerPoNumber]);

  const pendingUploadsRef = useRef(pendingUploads);
  pendingUploadsRef.current = pendingUploads;
  useEffect(() => {
    return () => {
      for (const entry of pendingUploadsRef.current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
    };
  }, []);

  const savedPoFiles = useMemo(
    () =>
      filterFilesByCategory(
        buildOrderFileList(order),
        "purchase_order"
      ).filter((file) => file.source === "order" && !file.archived),
    [order]
  );

  const visiblePoFiles = useMemo(
    () =>
      savedPoFiles.filter((file) => !pendingDeleteIds.includes(file.id)),
    [savedPoFiles, pendingDeleteIds]
  );

  const poNumberDirty =
    poNumberDraft.trim() !== (order.customerPoNumber?.trim() ?? "");
  const filesDirty =
    pendingUploads.length > 0 || pendingDeleteIds.length > 0;
  const dirty = poNumberDirty || filesDirty;

  const discardChanges = useCallback(() => {
    setPoNumberDraft(order.customerPoNumber ?? "");
    setPendingUploads((current) => {
      for (const entry of current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
      return [];
    });
    setPendingDeleteIds([]);
    setError(null);
  }, [order.customerPoNumber]);

  const saveChanges = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      if (poNumberDirty) {
        await updateOrderCustomerPoNumber(order.id, poNumberDraft.trim());
      }
      for (const fileId of pendingDeleteIds) {
        await deleteOrderFile(order.id, fileId);
      }
      for (const entry of pendingUploads) {
        await uploadOrderFile(order.id, {
          name: entry.name,
          kind: "purchase_order",
          uploadedBy: "Shop",
          contentBase64: entry.contentBase64,
          contentType: entry.contentType,
        });
      }
      setPendingUploads((current) => {
        for (const entry of current) {
          if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
        }
        return [];
      });
      setPendingDeleteIds([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save purchase order changes."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    dirty,
    poNumberDirty,
    poNumberDraft,
    pendingDeleteIds,
    pendingUploads,
    order.id,
    updateOrderCustomerPoNumber,
    deleteOrderFile,
    uploadOrderFile,
  ]);

  useRegisterUnsavedChanges(
    dirty
      ? {
          dirty: true,
          saving,
          label: "Unsaved purchase order",
          persistAcrossTabs: false,
          onSave: () => saveChanges(),
          onDiscard: discardChanges,
        }
      : null,
    `order-purchase-order-${order.id}`
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const named = await promptRename(files, {
      title:
        files.length > 1
          ? `Name ${files.length} purchase orders`
          : "Name this purchase order",
      description:
        "Choose a clear name — files upload when you save from the top bar.",
    });
    if (!named?.length) return;

    setStaging(true);
    setError(null);
    try {
      const staged: PendingPoUpload[] = [];
      for (const { file, name } of named) {
        const { base64, contentType, error: readError } =
          await readUploadContent(file);
        if (readError) throw new Error(readError);
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null;
        staged.push({
          localId: createLocalId(),
          name,
          contentBase64: base64,
          contentType,
          previewUrl,
        });
      }
      setPendingUploads((current) => [...current, ...staged]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not stage these files."
      );
    } finally {
      setStaging(false);
    }
  };

  const removePendingUpload = (localId: string) => {
    setPendingUploads((current) => {
      const target = current.find((entry) => entry.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.localId !== localId);
    });
  };

  const queueDelete = (fileId: string) => {
    setPendingDeleteIds((current) =>
      current.includes(fileId) ? current : [...current, fileId]
    );
  };

  const hasVisibleFiles =
    visiblePoFiles.length > 0 || pendingUploads.length > 0;

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Purchase order</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Add the customer PO number and upload the PO document. Changes save
          from the top bar.
        </p>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          multiple
          onChange={(event) => void handleUpload(event)}
        />

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2.5 text-[13px] font-medium text-[#8f1f1f]"
          >
            {error}
          </div>
        ) : null}

        <OrderCustomerPoField
          value={poNumberDraft}
          onChange={setPoNumberDraft}
          disabled={saving}
          className="max-w-md"
        />

        {!hasVisibleFiles ? (
          <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
            <FileText className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
            <p className="text-[13px] font-medium text-[#303030]">
              No purchase order uploaded yet
            </p>
            <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
              Choose a PO PDF or image — it uploads when you save from the top
              bar.
            </p>
            <Button
              type="button"
              disabled={staging || saving}
              className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
              onClick={() => fileInputRef.current?.click()}
            >
              {staging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {staging ? "Adding…" : "Upload PO"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-[#303030]">
                Uploaded PO files
              </p>
              <Button
                type="button"
                disabled={staging || saving}
                className={cn(dashboardControlClass, "h-8 text-[12px]")}
                onClick={() => fileInputRef.current?.click()}
              >
                {staging ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {staging ? "Adding…" : "Upload another"}
              </Button>
            </div>

            <ul className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#ebebeb]">
              {visiblePoFiles.map((file) => {
                const url = filePreviewSource(file);
                return (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center gap-3 bg-white px-3.5 py-3"
                  >
                    <FileText className="size-4 shrink-0 text-[#8a8a8a]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#303030]">
                        {file.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                        {formatDateTime(file.uploadedAt)}
                        {file.uploadedBy ? ` · ${file.uploadedBy}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              url,
                              name: file.name,
                              subtitle: "Purchase order",
                            })
                          }
                          className={cn(
                            dashboardControlClass,
                            "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]"
                          )}
                        >
                          <Eye className="size-3.5" />
                          Preview
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => queueDelete(file.id)}
                        className={cn(
                          dashboardControlClass,
                          "h-8 px-2 text-[#b42318] hover:bg-[#fdf2f2]"
                        )}
                        aria-label={`Remove ${file.name}`}
                        title="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}

              {pendingUploads.map((entry) => (
                <li
                  key={entry.localId}
                  className="flex flex-wrap items-center gap-3 bg-[#f8faff] px-3.5 py-3"
                >
                  <FileText className="size-4 shrink-0 text-[#2c6ecb]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-[#303030]">
                        {entry.name}
                      </p>
                      <span className="rounded-md bg-[#e8f0fb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                        Pending save
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      Uploads when you save from the top bar
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.previewUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            url: entry.previewUrl!,
                            name: entry.name,
                            subtitle: "Purchase order (pending)",
                          })
                        }
                        className={cn(
                          dashboardControlClass,
                          "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]"
                        )}
                      >
                        <Eye className="size-3.5" />
                        Preview
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => removePendingUpload(entry.localId)}
                      className={cn(
                        dashboardControlClass,
                        "h-8 px-2 text-[#b42318] hover:bg-[#fdf2f2]"
                      )}
                      aria-label={`Remove ${entry.name}`}
                      title="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <FilePreviewDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.name || "File"}
        subtitle={preview?.subtitle}
        url={preview?.url ?? null}
        filename={preview?.name}
      />
      {nameFilesDialog}
    </section>
  );
}
