"use client";

import { useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { readUploadContent } from "@/lib/artwork-preview";
import {
  createPendingUploadId,
  customerFileHref,
  isPendingCustomerUpload,
  shouldPreferInlineCustomerFile,
  type CustomerPageDraft,
  type CustomerPendingUpload,
} from "@/lib/customer-page-draft";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function formatUploadedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(size?: number) {
  if (typeof size !== "number" || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type DraftFile = CustomerPageDraft["files"][number];

export function CustomerFilesSection({
  files,
  onChange,
  className,
}: {
  files: DraftFile[];
  onChange: (patch: {
    files?: DraftFile[];
    removedFileIds?: string[];
  }) => void;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();

  const documents = useMemo(() => {
    return [...files].sort((a, b) => {
      const aPending = isPendingCustomerUpload(a);
      const bPending = isPendingCustomerUpload(b);
      if (aPending && !bPending) return -1;
      if (bPending && !aPending) return 1;
      const aAt = aPending ? "" : a.uploadedAt || "";
      const bAt = bPending ? "" : b.uploadedAt || "";
      return bAt.localeCompare(aAt);
    });
  }, [files]);

  const stageUpload = async (fileList: FileList | null) => {
    const selected = fileList ? Array.from(fileList) : [];
    if (selected.length === 0) return;

    const named = await promptRename(selected, {
      title:
        selected.length > 1
          ? `Name ${selected.length} files`
          : "Name this file",
      description:
        "Choose a clear name before attaching supporting documents to this customer.",
    });
    if (!named?.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStaging(true);
    setError(null);
    try {
      const staged: DraftFile[] = [];
      for (const { file, name } of named) {
        const { base64, contentType, error: readError } =
          await readUploadContent(file);
        if (readError) throw new Error(readError);

        const pending: CustomerPendingUpload & {
          kind: "supporting";
          pending: true;
        } = {
          localId: createPendingUploadId(),
          name,
          contentBase64: base64,
          contentType,
          size: file.size,
          preferInline: shouldPreferInlineCustomerFile(contentType, file.size),
          previewUrl: contentType.startsWith("image/")
            ? `data:${contentType};base64,${base64}`
            : undefined,
          kind: "supporting",
          pending: true,
        };
        staged.push(pending);
      }
      onChange({ files: [...staged, ...files] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stage file.");
    } finally {
      setStaging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (entry: DraftFile) => {
    setError(null);
    if (isPendingCustomerUpload(entry)) {
      onChange({
        files: files.filter(
          (doc) =>
            !(isPendingCustomerUpload(doc) && doc.localId === entry.localId)
        ),
      });
      return;
    }
    onChange({
      files: files.filter(
        (doc) => isPendingCustomerUpload(doc) || doc.id !== entry.id
      ),
      removedFileIds: [entry.id],
    });
  };

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
          <FolderOpen className="size-4 text-[#2c6ecb]" />
          Files
        </h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          Additional supporting documents for this account. Small images save
          inline; larger files go to storage when you click Save.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className={cn(dashboardInsetSurfaceClass, "rounded-lg p-3.5")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-[#303030]">
                Supporting documents
              </p>
              <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                Contracts, briefs, W-9s, or other account files.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-8 text-[12px]")}
              disabled={staging}
              onClick={() => fileInputRef.current?.click()}
            >
              {staging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {staging ? "Adding…" : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
              className="hidden"
              onChange={(event) => void stageUpload(event.target.files)}
            />
          </div>

          {documents.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-4 text-center text-[12px] text-[#616161]">
              No supporting files yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc) => {
                const pending = isPendingCustomerUpload(doc);
                const key = pending ? doc.localId : doc.id;
                const href = customerFileHref(doc);
                const sizeLabel = formatBytes(
                  pending ? doc.size : "size" in doc ? doc.size : undefined
                );
                return (
                  <li
                    key={key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f7fd] text-[#2c6ecb]">
                        <FileText className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#303030]">
                          {doc.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                          {pending ? (
                            <>
                              Pending save
                              {sizeLabel ? ` · ${sizeLabel}` : ""}
                            </>
                          ) : (
                            <>
                              {formatUploadedAt(doc.uploadedAt)}
                              {sizeLabel ? ` · ${sizeLabel}` : ""}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            dashboardControlClass,
                            "inline-flex h-8 items-center px-2.5 text-[12px]"
                          )}
                        >
                          <ExternalLink className="size-3.5" />
                          View
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          dashboardControlClass,
                          "h-8 px-2.5 text-[#b42318] hover:bg-[#fdf2f2]"
                        )}
                        onClick={() => removeFile(doc)}
                        aria-label={`Remove ${doc.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      {nameFilesDialog}
    </section>
  );
}
