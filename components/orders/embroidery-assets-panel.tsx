"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, FileUp, Loader2 } from "lucide-react";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { Button } from "@/components/ui/button";
import { readUploadContent } from "@/lib/artwork-preview";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { filePreviewSource } from "@/lib/file-preview";
import { formatDateTime } from "@/lib/format";
import {
  ORDER_FILE_KIND_LABELS,
  normalizeOrderFileKinds,
} from "@/lib/order-files";
import type { Job, JobImprint, Order, OrderFile, OrderFileKind } from "@/types";
import { cn } from "@/lib/utils";

function filesForImprintKind(
  order: Order,
  jobId: string,
  imprintId: string,
  kind: OrderFileKind
): OrderFile[] {
  return (order.files || []).filter((file) => {
    if (file.jobId !== jobId || file.imprintId !== imprintId) return false;
    return normalizeOrderFileKinds(file).includes(kind);
  });
}

function EmbroideryUploadRow({
  orderId,
  jobId,
  imprintId,
  kind,
  title,
  hint,
  accept,
  files,
  readOnly,
}: {
  orderId: string;
  jobId: string;
  imprintId: string;
  kind: OrderFileKind;
  title: string;
  hint: string;
  accept: string;
  files: OrderFile[];
  readOnly?: boolean;
}) {
  const { uploadOrderFile } = useSchedule();
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    subtitle?: string;
  } | null>(null);

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!list.length || readOnly || uploading) return;

    const named = await promptRename(list, {
      title: list.length > 1 ? `Name ${list.length} files` : `Name this ${title.toLowerCase()}`,
      description: hint,
    });
    if (!named?.length) return;

    setUploading(true);
    setError(null);
    try {
      for (const { file, name } of named) {
        const { base64, contentType, error: readError } =
          await readUploadContent(file);
        if (readError) throw new Error(readError);
        await uploadOrderFile(orderId, {
          name,
          kind,
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
          jobId,
          imprintId,
          notes: title,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Could not upload the ${title.toLowerCase()}.`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn(dashboardInsetSurfaceClass, "space-y-2.5 px-3 py-3")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#303030]">{title}</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{hint}</p>
        </div>
        {!readOnly ? (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={(event) => void handleUpload(event)}
            />
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileUp className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-[#e7b4b4] bg-[#fdf2f2] px-2.5 py-1.5 text-[12px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#303030]">
                  {file.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                  {ORDER_FILE_KIND_LABELS[kind]} · {formatDateTime(file.uploadedAt)}
                </p>
              </div>
              {filePreviewSource(file) ? (
                <button
                  type="button"
                  onClick={() =>
                    setPreview({
                      url: filePreviewSource(file)!,
                      name: file.name,
                      subtitle: ORDER_FILE_KIND_LABELS[kind],
                    })
                  }
                  className={cn(
                    dashboardControlClass,
                    "inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-[12px]"
                  )}
                >
                  <Eye className="size-3.5" />
                  Preview
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[#8a8a8a]">Nothing uploaded yet.</p>
      )}

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
    </div>
  );
}

export function EmbroideryAssetsPanel({
  order,
  job,
  imprint,
  readOnly = false,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  readOnly?: boolean;
}) {
  const pdfFiles = useMemo(
    () =>
      filesForImprintKind(order, job.id, imprint.id, "embroidery_file"),
    [order, job.id, imprint.id]
  );
  const sewoutFiles = useMemo(
    () =>
      filesForImprintKind(order, job.id, imprint.id, "embroidery_sewout"),
    [order, job.id, imprint.id]
  );

  if (imprint.decoration !== "embroidery") return null;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Embroidery package
        </p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Embroidery needs a digitizing PDF plus a sewout photo for the floor
          and customer review.
        </p>
      </div>
      <EmbroideryUploadRow
        orderId={order.id}
        jobId={job.id}
        imprintId={imprint.id}
        kind="embroidery_file"
        title="Digitizing PDF / file"
        hint="Upload the stitch PDF or machine file for this location."
        accept=".pdf,.dst,.pes,.exp,.jef,.xxx,image/*"
        files={pdfFiles}
        readOnly={readOnly}
      />
      <EmbroideryUploadRow
        orderId={order.id}
        jobId={job.id}
        imprintId={imprint.id}
        kind="embroidery_sewout"
        title="Sewout photo"
        hint="Photo of the physical sewout sample for approval."
        accept="image/*"
        files={sewoutFiles}
        readOnly={readOnly}
      />
    </div>
  );
}
