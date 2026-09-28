"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { OrderCustomerPoField } from "@/components/orders/order-customer-po-field";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { readUploadContent } from "@/lib/artwork-preview";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import {
  buildOrderFileList,
  filterFilesByCategory,
} from "@/lib/order-files";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderPurchaseOrderTab({ order }: { order: Order }) {
  const {
    uploadOrderFile,
    deleteOrderFile,
    updateOrderCustomerPoNumber,
  } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poFiles = useMemo(
    () =>
      filterFilesByCategory(
        buildOrderFileList(order),
        "purchase_order"
      ).filter((file) => file.source === "order" && !file.archived),
    [order]
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setFeedback(null);
    try {
      for (const file of files) {
        const { base64, contentType, error: readError } =
          await readUploadContent(file);
        if (readError) throw new Error(readError);
        await uploadOrderFile(order.id, {
          name: file.name,
          kind: "purchase_order",
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
        });
      }
      setFeedback(
        `${files.length} PO file${files.length === 1 ? "" : "s"} uploaded.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload the PO file."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    setError(null);
    try {
      await deleteOrderFile(order.id, fileId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove this PO file."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Purchase order</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Add the customer PO number and upload the PO document for this order.
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

        {feedback ? (
          <div className="rounded-lg border border-[#d8e4f7] bg-[#f4f7fd] px-3 py-2.5 text-[13px] text-[#305d9b]">
            {feedback}
          </div>
        ) : null}

        <OrderCustomerPoField
          order={order}
          onSave={(value) => updateOrderCustomerPoNumber(order.id, value)}
          className="max-w-md"
        />

        {poFiles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
            <FileText className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
            <p className="text-[13px] font-medium text-[#303030]">
              No purchase order uploaded yet
            </p>
            <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
              Upload the customer PO PDF or image so it stays with this order.
            </p>
            <Button
              type="button"
              disabled={uploading}
              className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload PO"}
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
                disabled={uploading}
                className={cn(dashboardControlClass, "h-8 text-[12px]")}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {uploading ? "Uploading…" : "Upload another"}
              </Button>
            </div>

            <ul className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#ebebeb]">
              {poFiles.map((file) => {
                const url = file.downloadUrl || file.previewUrl;
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
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            dashboardControlClass,
                            "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]"
                          )}
                        >
                          {file.previewUrl && !file.downloadUrl ? (
                            <ExternalLink className="size-3.5" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          Open
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={deletingId === file.id}
                        onClick={() => void handleDelete(file.id)}
                        className={cn(
                          dashboardControlClass,
                          "h-8 px-2 text-[#b42318] hover:bg-[#fdf2f2]"
                        )}
                        aria-label={`Remove ${file.name}`}
                        title="Remove"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
