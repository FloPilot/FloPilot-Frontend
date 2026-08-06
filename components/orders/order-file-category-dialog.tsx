"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import {
  ORDER_FILE_CATEGORY_OPTIONS,
  ORDER_FILE_KIND_LABELS,
  normalizeOrderFileKinds,
  type OrderFileItem,
} from "@/lib/order-files";
import type { OrderFileKind } from "@/types";
import { cn } from "@/lib/utils";

function kindsEqual(a: OrderFileKind[], b: OrderFileKind[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((kind, index) => kind === b[index]);
}

export function OrderFileCategoryDialog({
  open,
  file,
  saving,
  error,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  file: OrderFileItem | null;
  saving?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: {
    kinds: OrderFileKind[];
    kind: OrderFileKind;
    notes: string | null;
  }) => Promise<void> | void;
}) {
  const [kinds, setKinds] = useState<OrderFileKind[]>(["internal"]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!file || !open) return;
    setKinds(normalizeOrderFileKinds(file));
    setNotes(file.notes || "");
  }, [file, open]);

  const canEdit = file?.source === "order";
  const originalKinds = useMemo(
    () => (file ? normalizeOrderFileKinds(file) : []),
    [file]
  );
  const dirty =
    !!file &&
    (!kindsEqual(kinds, originalKinds) ||
      (notes.trim() || "") !== (file.notes || ""));

  const toggleKind = (kind: OrderFileKind) => {
    setKinds((current) => {
      if (current.includes(kind)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== kind);
      }
      return [...current, kind];
    });
  };

  const kindSummary = kinds.map((kind) => ORDER_FILE_KIND_LABELS[kind]).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,640px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#1f2430]">
            File details
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-[#5a6478]">
            {canEdit
              ? "Assign one or more categories so this file shows up in the right places."
              : "This file is tied to a decoration location, so its category can’t be changed here."}
          </DialogDescription>
        </DialogHeader>

        {file ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 px-5 pt-4">
              <div className="flex items-start gap-3 rounded-xl border border-[#ebebeb] bg-[#fafafa] p-3">
                {file.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.previewUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg border border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    File
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#1f2430]">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    {kindSummary || ORDER_FILE_KIND_LABELS[file.kind]}
                    {" · "}
                    {formatDateTime(file.uploadedAt)}
                    {file.uploadedBy ? ` · ${file.uploadedBy}` : ""}
                  </p>
                  {file.downloadUrl || file.previewUrl ? (
                    <a
                      href={file.downloadUrl || file.previewUrl}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2c6ecb] hover:underline"
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-5">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a8a]">
                  Categories
                </p>
                <p className="text-[11px] text-[#8a8a8a]">
                  {kinds.length} selected
                </p>
              </div>
              <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 pb-1">
                {ORDER_FILE_CATEGORY_OPTIONS.map((option) => {
                  const selected = kinds.includes(option.kind);
                  return (
                    <button
                      key={option.kind}
                      type="button"
                      disabled={!canEdit || saving}
                      onClick={() => toggleKind(option.kind)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-[#2c6ecb] bg-[#f4f7fd]"
                          : "border-[#ebebeb] bg-white hover:border-[#c9cccf]",
                        (!canEdit || saving) && "cursor-default opacity-80"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                          selected
                            ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
                            : "border-[#d4d4d4] bg-white text-transparent"
                        )}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[#303030]">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-[#8a8a8a]">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {canEdit ? (
              <div className="shrink-0 px-5 pt-3">
                <label
                  htmlFor="order-file-notes"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a8a]"
                >
                  Notes{" "}
                  <span className="font-normal normal-case tracking-normal text-[#b0b0b5]">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="order-file-notes"
                  value={notes}
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything the team should know about this file…"
                  className="mt-2 min-h-[72px] rounded-xl border-[#e3e3e3] text-[13px]"
                />
              </div>
            ) : null}

            {error ? (
              <p className="mx-5 mt-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-[#ebebeb] bg-white px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "h-9")}
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit ? (
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={saving || !dirty || kinds.length === 0}
              onClick={() =>
                void onSave({
                  kinds,
                  kind: kinds[0],
                  notes: notes.trim() ? notes.trim() : null,
                })
              }
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save categories"
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
