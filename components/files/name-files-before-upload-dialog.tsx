"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  buildNamedUploadFiles,
  joinFileName,
  splitFileName,
  type NamedUploadFile,
} from "@/lib/file-naming";
import { cn } from "@/lib/utils";

export type NameFilesBeforeUploadDialogProps = {
  open: boolean;
  files: File[];
  uploading?: boolean;
  title?: string;
  description?: string;
  /** Locked prefix shown before the editable name, e.g. SO1063 */
  namePrefix?: string | null;
  confirmLabel?: string;
  onConfirm: (named: NamedUploadFile[]) => void;
  onCancel: () => void;
};

export function NameFilesBeforeUploadDialog({
  open,
  files,
  uploading = false,
  title,
  description,
  namePrefix,
  confirmLabel,
  onConfirm,
  onCancel,
}: NameFilesBeforeUploadDialogProps) {
  const prefix = (namePrefix || "").trim();
  const fileParts = useMemo(
    () => files.map((file) => splitFileName(file.name)),
    [files]
  );
  const [names, setNames] = useState<string[]>(() =>
    fileParts.map(({ base }) => base)
  );

  useEffect(() => {
    if (!open) return;
    setNames(fileParts.map(({ base }) => base));
  }, [open, fileParts]);

  const previewNames = fileParts.map(({ ext }, index) =>
    joinFileName(names[index] || "", ext, { prefix: prefix || null })
  );

  const canSave =
    files.length > 0 &&
    names.every((name) => name.trim().length > 0) &&
    !uploading;

  const resolvedTitle =
    title ||
    (files.length > 1
      ? `Name ${files.length} files`
      : "Name this file");

  const resolvedDescription =
    description ||
    (prefix
      ? "Choose a clear name before uploading. The order prefix is added automatically."
      : "Choose a clear name before uploading so this file is easy to find later.");

  const resolvedConfirm =
    confirmLabel ||
    (files.length > 1 ? `Upload ${files.length} files` : "Upload");

  const handleConfirm = () => {
    if (!canSave) return;
    onConfirm(buildNamedUploadFiles(files, names, { prefix: prefix || null }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !uploading) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={!uploading}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 text-left">
          <DialogTitle className={dashboardTaskTitleClass}>
            {resolvedTitle}
          </DialogTitle>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {resolvedDescription}
          </p>
        </DialogHeader>

        <div className="scrollbar-none max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4">
          {fileParts.map(({ ext }, index) => (
            <div key={`${files[index]?.name}-${index}`} className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                {files.length > 1 ? `File ${index + 1}` : "File name"}
              </Label>
              <div className="flex items-center gap-1 rounded-lg border border-[#e3e3e3] bg-white px-2 transition-colors focus-within:border-[#2c6ecb]">
                {prefix ? (
                  <span className="shrink-0 py-2 pl-1 text-[13px] font-semibold tabular-nums text-[#616161]">
                    {prefix} -
                  </span>
                ) : null}
                <input
                  autoFocus={index === 0}
                  value={names[index] || ""}
                  disabled={uploading}
                  onChange={(event) =>
                    setNames((current) =>
                      current.map((name, nameIndex) =>
                        nameIndex === index ? event.target.value : name
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canSave) handleConfirm();
                  }}
                  placeholder="e.g. front-left-chest"
                  className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[#303030] outline-none placeholder:text-[#b0b0b0] disabled:opacity-60"
                />
                {ext ? (
                  <span className="shrink-0 py-2 pr-1 text-[13px] text-[#8a8a8a]">
                    {ext}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[12px] text-[#8a8a8a]">
                Saves as{" "}
                <span className="font-medium text-[#303030]">
                  {previewNames[index]}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={uploading}
            className="h-9 rounded-lg text-[13px] text-[#616161]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
            onClick={handleConfirm}
          >
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading
                {files.length > 1 ? ` ${files.length} files…` : "…"}
              </>
            ) : (
              resolvedConfirm
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
