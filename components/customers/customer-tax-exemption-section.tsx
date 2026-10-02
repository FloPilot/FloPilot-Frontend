"use client";

import { useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { CustomerTaxDocument } from "@/types";
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

function documentKindLabel(kind: CustomerTaxDocument["kind"]) {
  return kind === "sales_certificate" ? "Sales certificate" : "Supporting doc";
}

type DraftTaxDocument = CustomerPageDraft["taxDocuments"][number];

export function CustomerTaxExemptionSection({
  taxExempt,
  taxExemptNumber,
  taxDocuments,
  onChange,
  className,
}: {
  taxExempt: boolean;
  taxExemptNumber: string;
  taxDocuments: DraftTaxDocument[];
  onChange: (patch: {
    taxExempt?: boolean;
    taxExemptNumber?: string;
    taxDocuments?: DraftTaxDocument[];
    removedTaxDocumentIds?: string[];
  }) => void;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();

  const documents = useMemo(() => {
    return [...taxDocuments].sort((a, b) => {
      const aAt = isPendingCustomerUpload(a)
        ? "pending"
        : a.uploadedAt || "";
      const bAt = isPendingCustomerUpload(b)
        ? "pending"
        : b.uploadedAt || "";
      if (aAt === "pending" && bAt !== "pending") return -1;
      if (bAt === "pending" && aAt !== "pending") return 1;
      return bAt.localeCompare(aAt);
    });
  }, [taxDocuments]);

  const stageUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const named = await promptRename([file], {
      title: "Name this tax document",
      description:
        "Choose a clear name before attaching the sales certificate or supporting doc.",
    });
    if (!named?.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStaging(true);
    setError(null);
    try {
      const { file: namedFile, name } = named[0];
      const { base64, contentType, error: readError } =
        await readUploadContent(namedFile);
      if (readError) throw new Error(readError);

      const pending: CustomerPendingUpload & {
        kind: "sales_certificate";
        pending: true;
      } = {
        localId: createPendingUploadId(),
        name,
        contentBase64: base64,
        contentType,
        size: namedFile.size,
        preferInline: shouldPreferInlineCustomerFile(contentType, namedFile.size),
        previewUrl: contentType.startsWith("image/")
          ? `data:${contentType};base64,${base64}`
          : undefined,
        kind: "sales_certificate",
        pending: true,
      };

      onChange({
        taxExempt: true,
        taxDocuments: [pending, ...taxDocuments],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stage file.");
    } finally {
      setStaging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (entry: DraftTaxDocument) => {
    setError(null);
    if (isPendingCustomerUpload(entry)) {
      onChange({
        taxDocuments: taxDocuments.filter(
          (doc) =>
            !(isPendingCustomerUpload(doc) && doc.localId === entry.localId)
        ),
      });
      return;
    }
    onChange({
      taxDocuments: taxDocuments.filter(
        (doc) => isPendingCustomerUpload(doc) || doc.id !== entry.id
      ),
      removedTaxDocumentIds: [entry.id],
    });
  };

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
          <Receipt className="size-4 text-[#2c6ecb]" />
          Tax exemption
        </h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          Mark this account tax exempt and keep the sales certificate on file.
          Changes save when you click Save at the top.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
            taxExempt
              ? "border-[#cfe0ff] bg-[#f4f7fd]"
              : "border-[#ebebeb] bg-white hover:bg-[#fafafa]"
          )}
        >
          <input
            type="checkbox"
            checked={taxExempt}
            onChange={(event) => onChange({ taxExempt: event.target.checked })}
            className="mt-0.5 size-4 rounded border-[#c9c9c9] text-[#2c6ecb]"
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[#303030]">
              Tax exempt account
            </span>
            <span className={cn("mt-0.5 block", dashboardTaskDetailClass)}>
              Orders for this customer will not include sales tax.
            </span>
          </span>
        </label>

        <div
          className={cn(
            "space-y-3 transition-opacity",
            taxExempt ? "opacity-100" : "opacity-60"
          )}
        >
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Tax exempt / certificate number
            </Label>
            <Input
              value={taxExemptNumber}
              onChange={(event) =>
                onChange({ taxExemptNumber: event.target.value })
              }
              className="h-9 rounded-lg border-[#e3e3e3]"
            />
          </div>

          <div className={cn(dashboardInsetSurfaceClass, "rounded-lg p-3.5")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-[#303030]">
                  Sales certificate
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                  PDF or image. Small images store inline; larger files go to
                  storage when you save.
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
                accept=".pdf,image/*"
                className="hidden"
                onChange={(event) => void stageUpload(event.target.files)}
              />
            </div>

            {documents.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-4 text-center text-[12px] text-[#616161]">
                No certificate on file yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documents.map((doc) => {
                  const pending = isPendingCustomerUpload(doc);
                  const key = pending ? doc.localId : doc.id;
                  const href = customerFileHref(doc);
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
                              <>Pending save · {documentKindLabel(doc.kind)}</>
                            ) : (
                              <>
                                {documentKindLabel(doc.kind)} ·{" "}
                                {formatUploadedAt(doc.uploadedAt)}
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
                          onClick={() => removeDocument(doc)}
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
